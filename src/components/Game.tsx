'use client';

import { useEffect, useState } from 'react';
import * as Phaser from 'phaser';
import { Ball } from './ball-char';
import { PointOrb } from './points';
import MobileDPad from './mobile-dpad';
import LetterKeyboard from './letter-keyboard';
import Leaderboard from './leaderboard';
import { FaPause, FaPlay } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

// Add these type definitions after the imports
interface GameWindow extends Window {
  game?: Phaser.Game;
}

// Update the GameSceneType interface to include score and finalHeight
interface GameSceneType extends Phaser.Scene {
  player?: Ball;
  score: number;
  finalHeight: number;
  resetGame: () => void;
  togglePause: () => void;
}

export default function Game() {
  const router = useRouter();

  // Add state to track mobile device
  const [isMobile, setIsMobile] = useState(false);

  // Add state for showing keyboard and name
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [playerName, setPlayerName] = useState('');

  // Add this state near your other useState declarations
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Add state for pause button
  const [isPaused, setIsPaused] = useState(false);

  const [showEndGameOptions, setShowEndGameOptions] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update the direction handler with proper type checking
  const handleDirectionChange = (direction: { x: number; y: number }) => {
    const gameWindow = window as unknown as GameWindow;
    if (!gameWindow.game) return;
    
    const scene = gameWindow.game.scene.scenes[0];
    if (!scene || !('player' in scene)) return;
    
    (scene as unknown as { player: Ball }).player.setDirection({
      x: direction.x,
      y: direction.y
    });
  };

  useEffect(() => {
    /**
     * Main game scene class that handles core gameplay mechanics
     */
    class GameScene extends Phaser.Scene {
      // Replace existing platform-related properties with GameMap properties
      private readonly config = {
        width: 800,
        height: 600,
        platformWidth: 120,
        platformHeight: 20,
        ballRadius: 16,
        superJumpForce: -1200,
        initialHeight: 600,
        heightIncrement: 150,
        platformBuffer: 2000,
        minPlatformsAhead: 8
      } as const;

      private currentHeight: number = 0;
      private highestPlatformY: number = 0;
      private readonly EXTENDED_HEIGHT = 1000000; // 10km high

      // Strongly typed class properties with initialization
      platforms!: Phaser.Physics.Arcade.StaticGroup; 
      player!: Ball;
      pointOrbs: PointOrb[] = [];
      lastPlatformY: number = 500;
      score: number = 0;
      scoreText!: Phaser.GameObjects.Text;
      private gameStartTime: number = 0;
      private timeRemaining: number = 0;
      private timeText!: Phaser.GameObjects.Text;
      private heightMilestones: Set<number> = new Set();
      private readonly TIME_BONUS = 5; // Seconds added per milestone
      private readonly HEIGHT_MILESTONE_INTERVAL = 10; // Every 10 meters

      // Cache frequently used values
      private readonly WORLD_HEIGHT = 1000000;
      private readonly PLATFORM_CLEANUP_THRESHOLD = 2000;
      private readonly PLATFORM_SPAWN_THRESHOLD = 2000;
      private readonly ORB_SPAWN_CHANCE = 30;
      private readonly TIME_LIMIT = 120; // Changed from 60 to 120 seconds
      private readonly FALL_THRESHOLD = 800; // Adjust this value based on your needs

      // Add new properties for height zones
      private readonly HEIGHT_ZONES = {
        NORMAL: { max: 1000, multiplier: 1 },
        DOUBLE: { max: 2000, multiplier: 2 },
        TRIPLE: { max: 3000, multiplier: 3 },
        QUADRUPLE: { max: Infinity, multiplier: 4 }
      };

      // Add base points for each orb color
      private readonly ORB_POINTS = {
        lightPink: 1,
        pink: 2,
        hotPink: 3,
        deepPink: 4,
        magenta: 5
      } as const;

      // Update these properties
      private nameInput!: HTMLInputElement;
      private readonly MAX_NAME_LENGTH = 5;

      // Add isPaused property
      private isPaused: boolean = false;
      private pauseText!: Phaser.GameObjects.Text;

      // Add spatial grid for efficient collision detection
      private spatialGrid: Map<string, Array<Phaser.GameObjects.GameObject>> = new Map();
      private readonly GRID_SIZE = 200; // Adjust based on your game's scale

      // Add object pools at the class level
      private platformPool: Phaser.GameObjects.Rectangle[] = [];
      private orbPool: PointOrb[] = [];
      private readonly INITIAL_POOL_SIZE = 50;

      // Add property to track active platforms
      private activePlatforms: Set<Phaser.GameObjects.Rectangle> = new Set();

      // Add this with the other class properties at the top
      private fpsText!: Phaser.GameObjects.Text;

      // Add this with the other class properties at the top
      private finalHeight: number = 0;

      constructor() {
        super({ key: 'GameScene' });
      }

      /**
       * Reset all game state variables to initial values
       */
      private resetGameState(): void {
        this.score = 0;
        this.lastPlatformY = 500;
        this.timeRemaining = this.TIME_LIMIT;
        this.gameStartTime = this.time.now;
        this.heightMilestones.clear();
        this.pointOrbs.forEach(orb => orb.destroy());
        this.pointOrbs = [];
      }

      create() {
        // Add a simple black background instead
        this.add.rectangle(
          0,
          -this.EXTENDED_HEIGHT,
          this.config.width,
          this.EXTENDED_HEIGHT * 2,
          0x000000
        ).setOrigin(0, 0);
        
        // Reset game state at the start of each game
        this.resetGameState();
        
        // Initialize core game objects and physics
        this.initializeWorld();
        this.createPlayer();
        this.generatePlatforms();
        this.setupCollisions();
        this.setupCamera();
        this.setupUI();

        // Make game instance globally accessible for mobile controls
        (window as GameWindow).game = this.game;

        // Add keyboard listener for Escape key
        this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
        
        // Create pause text (hidden by default)
        this.pauseText = this.add.text(400, 300, 'PAUSED\nPress ESC to resume', {
          fontSize: '48px',
          color: '#ffffff',
          align: 'center'
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1000) // Ensure it's above other elements
        .setVisible(false);

        // Initialize object pools
        this.initializePools();
        
        // Enable FPS display for debugging
        this.fpsText = this.add.text(10, 10, '', { fontSize: '16px', color: '#00ff00' })
          .setScrollFactor(0)
          .setDepth(1000);
      }

      private initializePools(): void {
        // Pre-create platforms
        for (let i = 0; i < this.INITIAL_POOL_SIZE; i++) {
          const platform = this.add.rectangle(0, 0, 100, 20, 0xFFA500);
          this.physics.add.existing(platform, true);
          platform.setActive(false).setVisible(false);
          this.platformPool.push(platform);
        }

        // Pre-create orbs
        for (let i = 0; i < this.INITIAL_POOL_SIZE; i++) {
          const orb = new PointOrb(this, 0, 0, 'pink');
          orb.setActive(false).setVisible(false);
          this.orbPool.push(orb);
        }
      }

      /**
       * Initialize the game world, bounds and initial platforms
       */
      private initializeWorld(): void {
        // Create simple black background
        this.add.rectangle(
          0,
          -this.EXTENDED_HEIGHT,
          this.config.width,
          this.EXTENDED_HEIGHT * 2,
          0x000000
        ).setOrigin(0, 0);
        
        // Initialize physics and platforms
        this.platforms = this.physics.add.staticGroup();
        this.physics.world.setBounds(0, -this.EXTENDED_HEIGHT, this.config.width, this.EXTENDED_HEIGHT + 600);
        
        // Create ground platform
        const ground = this.add.rectangle(
          this.config.width / 2,
          580,
          this.config.width,
          40,
          0xFFA500
        ).setStrokeStyle(2, 0xFF69B4);
        
        this.physics.add.existing(ground, true);
        this.platforms.add(ground);
        
        this.currentHeight = this.config.initialHeight;
        this.highestPlatformY = this.config.height - 200;
      }

      /**
       * Create and initialize the player character
       */
      private createPlayer(): void {
        this.player = new Ball(this, {
          x: 400,
          y: 500,
          radius: 16,
          speed: 300,
          color: 0xff0000
        });

        // Enable physics on the ball container
        const playerBall = this.player.getBall();
        this.physics.world.enable(playerBall);
      } 

      /**
       * Setup collision handlers between game objects
       */
      private setupCollisions(): void {
        const playerBall = this.player.getBall();
        
        this.physics.add.collider(
          playerBall,
          this.platforms,
          undefined,
          undefined,
          this
        );
        
        this.pointOrbs.forEach(orb => {
          this.physics.add.overlap(
            playerBall,
            orb,
            ((_player, _orb) => this.handleOrbCollection(_orb as PointOrb)) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
          );
        });
      }

      /**
       * Handle point orb collection and scoring
       */
      private handleOrbCollection(orb: PointOrb): void {
        if (!orb) return;
        
        // Rest of the collection logic remains the same
        orb.collect();
        
        // Calculate points with height multiplier
        const height = Math.abs(orb.y);
        let multiplier = this.HEIGHT_ZONES.NORMAL.multiplier;
        
        if (height > this.HEIGHT_ZONES.TRIPLE.max) {
          multiplier = this.HEIGHT_ZONES.QUADRUPLE.multiplier;
        } else if (height > this.HEIGHT_ZONES.DOUBLE.max) {
          multiplier = this.HEIGHT_ZONES.TRIPLE.multiplier;
        } else if (height > this.HEIGHT_ZONES.NORMAL.max) {
          multiplier = this.HEIGHT_ZONES.DOUBLE.multiplier;
        }

        // Fix: Ensure pointValue exists and is a number
        const points = (orb.pointValue || 1) * multiplier;
        this.score += points;
        
        // Show points gained with multiplier indicator
        this.showPointsGained(orb.x, orb.y, points, multiplier);
        
        // Remove orb from array before destroying
        this.pointOrbs = this.pointOrbs.filter(o => o !== orb);
        orb.destroy();
      }

      /**
       * Display points gained when collecting an orb
       */
      private showPointsGained(x: number, y: number, points: number, multiplier: number): void {
        const pointsText = this.add.text(x, y, 
          `+${points}\n${multiplier > 1 ? `x${multiplier}` : ''}`, {
          fontSize: '24px',
          color: '#ffff00',
          align: 'center'
        })
        .setOrigin(0.5);

        this.tweens.add({
          targets: pointsText,
          y: y - 50,
          alpha: 0,
          duration: 1000,
          ease: 'Power2',
          onComplete: () => pointsText.destroy()
        });
      }

      /**
       * Setup camera following behavior
       */
      private setupCamera(): void {
        this.cameras.main.startFollow(this.player.getBall(), true, 0, 1);
        this.cameras.main.setLerp(0, 0.1);
        this.cameras.main.roundPixels = true;
        this.cameras.main.useBounds = true;
        this.cameras.main.setBounds(0, -this.WORLD_HEIGHT, 800, this.WORLD_HEIGHT + 600);
      }

      /**
       * Setup UI elements like score display
       */
      private setupUI(): void {
        this.scoreText = this.add.text(16, 16, 
          `Score: 0\nHeight: 0m`, {
          fontSize: '32px',
          color: '#ffffff',
        }).setScrollFactor(0);

        this.timeText = this.add.text(16, 100, 
          `Time: ${this.TIME_LIMIT}s`, {
          fontSize: '32px',
          color: '#ffffff',
        }).setScrollFactor(0);
      }

      /**
       * Generate platforms with improved spawning logic
       */
      private generatePlatforms(): void {
        const playerY = this.player?.getBall().y || 0;
        const visibleRange = this.config.platformBuffer;
        const targetY = playerY - visibleRange;
        
        while (this.highestPlatformY > targetY) {
          // Calculate platform density based on height
          const heightZone = Math.abs(this.highestPlatformY) / 100; // Convert to meters
          let platformChance = 1; // Base chance

          if (heightZone > 500) {
            platformChance = 0.2; // Very sparse platforms above 500m
          } else if (heightZone > 200) {
            platformChance = 0.3; // Sparse platforms 200-500m
          } else if (heightZone > 100) {
            platformChance = 0.5; // Medium density 100-200m
          } else if (heightZone > 50) {
            platformChance = 0.7; // Higher density 50-100m
          } else {
            platformChance = 0.9; // Dense platforms 0-50m
          }

          if (Math.random() < platformChance) {
            const numPlatforms = Math.max(1, Math.floor(Math.random() * 3) - Math.floor(heightZone / 200));
            
            for (let i = 0; i < numPlatforms; i++) {
              // Adjust platform width based on height
              const width = Math.max(
                80,
                this.config.platformWidth * (1 - heightZone / 300)
              );
              
              // Adjust platform positions based on height
              const minX = 50 + (heightZone > 200 ? 50 : 0);
              const maxX = this.config.width - width - (50 + (heightZone > 200 ? 50 : 0));
              const x = Math.floor(minX + Math.random() * (maxX - minX));

              const platform = this.getPlatformFromPool();
              platform.setPosition(x, this.highestPlatformY)
                     .setSize(width, this.config.platformHeight)
                     .setOrigin(0, 0)
                     .setStrokeStyle(2, 0xFF69B4);
              
              const body = platform.body as Phaser.Physics.Arcade.StaticBody;
              body.setSize(width, this.config.platformHeight)
                  .setOffset(0, 0)
                  .updateFromGameObject();
              
              this.activePlatforms.add(platform);
              this.platforms.add(platform);

              // Spawn orbs with adjusted probability based on height
              const orbChance = this.ORB_SPAWN_CHANCE * (1 - heightZone / 1000);
              if (Phaser.Math.Between(1, 100) <= orbChance) {
                this.spawnPointOrb(x + width / 2, this.highestPlatformY - 30);
              }
            }
          }

          // Adjust gap between platforms based on height
          const baseGap = this.config.heightIncrement;
          const heightFactor = 1 + (heightZone / 40);
          this.highestPlatformY -= baseGap * heightFactor;
        }
      }

      private getGridKey(x: number, y: number): string {
        const gridX = Math.floor(x / this.GRID_SIZE);
        const gridY = Math.floor(y / this.GRID_SIZE);
        return `${gridX},${gridY}`;
      }

      /**
       * Spawn a point orb with random properties
       */
      private spawnPointOrb(x: number, y: number): void {
        const orbColors = ['lightPink', 'pink', 'hotPink', 'deepPink', 'magenta'] as const;
        const randomColor = orbColors[Phaser.Math.Between(0, orbColors.length - 1)];
        const orb = new PointOrb(this, x, y - 30, randomColor);
        
        // Enable physics for the orb
        this.physics.world.enable(orb);
        const orbBody = orb.body as Phaser.Physics.Arcade.Body;
        orbBody.setAllowGravity(false);
        orbBody.setImmovable(true);
        
        this.pointOrbs.push(orb);
        
        // Only setup overlap if player exists
        if (this.player) {
          const playerBall = this.player.getBall();
          this.physics.add.overlap(
            playerBall,
            orb,
            (_player, _orb) => {
              if (_orb instanceof PointOrb) {
                this.handleOrbCollection(_orb);
              }
            },
            undefined,
            this
          );
        }
      }

      update(): void {
        if (this.isPaused) return;
        if (!this.player) return;

        // Update time and UI less frequently
        if (this.game.loop.frame % 30 === 0) {
          this.timeRemaining = Math.max(0, this.TIME_LIMIT - 
            Math.floor((this.time.now - this.gameStartTime) / 1000));
          this.timeText.setText(`Time: ${this.timeRemaining}s`);
          
          if (this.timeRemaining <= 0) {
            this.handleGameOver('Time\'s Up!');
          }
        }

        this.player.update();
        
        // Update score less frequently
        if (this.game.loop.frame % 10 === 0) {
          this.updateScore();
        }

        // Platform management - Modified to check more frequently
        const playerY = this.player.getBall().y;
        if (-playerY < this.lastPlatformY + this.PLATFORM_SPAWN_THRESHOLD) {
          this.generatePlatforms();
        }

        // Cleanup less frequently
        if (this.game.loop.frame % 60 === 0) {
          this.cleanupGameObjects();
          this.checkFallGameOver();
        }

        // Update FPS counter less frequently
        if (this.game.loop.frame % 30 === 0) {
          this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
        }
      }

      private updateNearbyCollisions(): void {
        const playerX = this.player.getBall().x;
        const playerY = this.player.getBall().y;
        
        // Check only nearby grid cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const gridX = Math.floor(playerX / this.GRID_SIZE) + dx;
            const gridY = Math.floor(playerY / this.GRID_SIZE) + dy;
            const key = `${gridX},${gridY}`;
            const objects = this.spatialGrid.get(key) || [];
            
            // Process only active objects in nearby cells
            objects.forEach(obj => {
              if (obj.active) {
                // Perform your collision checks here
              }
            });
          }
        }
      }

      /**
       * Update score and height display
       */
      private updateScore(): void {
        // Update finalHeight whenever score is updated
        this.finalHeight = Math.max(0, Math.floor((-this.player.getBall().y + 500) / 100));
        this.scoreText.setText(
          `Score: ${this.score}\nHeight: ${this.finalHeight}m`
        );

        // Check for height milestones and award time
        const currentMilestone = Math.floor(this.finalHeight / this.HEIGHT_MILESTONE_INTERVAL);
        if (currentMilestone > 0 && !this.heightMilestones.has(currentMilestone)) {
          this.heightMilestones.add(currentMilestone);
          this.timeRemaining += this.TIME_BONUS;
          
          // Show bonus time notification
          this.showTimeBonus();
        }
      }

      /**
       * Display a temporary notification when time bonus is awarded
       */
      private showTimeBonus(): void {
        const bonusText = this.add.text(400, 200, `+${this.TIME_BONUS}s`, {
          fontSize: '32px',
          color: '#00ff00',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

        this.tweens.add({
          targets: bonusText,
          y: 150,
          alpha: 0,
          duration: 1500,
          ease: 'Power2',
          onComplete: () => bonusText.destroy()
        });
      }

      /**
       * Manage platform generation based on player position
       */
      private managePlatformGeneration(): void {
        if (-this.player.getBall().y < this.lastPlatformY + this.PLATFORM_SPAWN_THRESHOLD) {
          this.generatePlatforms();
        }
      }

      /**
       * Clean up off-screen game objects for memory optimization
       */
      private cleanupGameObjects(): void {
        const playerY = this.player.getBall().y;
        const cleanupY = playerY + this.config.platformBuffer;
        
        for (const platform of this.activePlatforms) {
          if (platform.y > cleanupY) {
            this.returnPlatformToPool(platform);
            this.activePlatforms.delete(platform);
          }
        }
        
        this.pointOrbs = this.pointOrbs.filter(orb => {
          if (orb.y > cleanupY) {
            orb.destroy();
            return false;
          }
          return true;
        });
      }

      private checkFallGameOver(): void {
        if (this.player.getBall().y > this.FALL_THRESHOLD) {
          this.handleGameOver('You Fell Too Far!');
        }
      }

      /**
       * Handle game over scenarios
       */
      private async handleGameOver(message: string): Promise<void> {
        this.input.keyboard?.off('keydown-ESC', this.togglePause);
        
        // Show game over text with message
        this.add.text(400, 250, message, {
          fontSize: '48px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
        
        // Show final stats
        const statsText = `Final Score: ${this.score}\nHeight: ${this.finalHeight}m`;
        this.add.text(400, 320, statsText, {
          fontSize: '32px',
          color: '#ffffff',
          align: 'center'
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

        // Show name input prompt
        setShowKeyboard(true);

        this.physics.pause();
      }

      private togglePause = (): void => {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
          // Pause the game
          this.physics.pause();
          
          // Create pause menu container
          const menuContainer = this.add.container(400, 300);
          
          // Add semi-transparent background overlay
          const overlay = this.add.rectangle(
            0, 0,
            this.cameras.main.width * 2,
            this.cameras.main.height * 2,
            0x000000, 0.5
          )
          .setScrollFactor(0)
          .setDepth(999);
          
          // Add pause text
          const pauseText = this.add.text(0, -50, 'PAUSED\nPress ESC to resume', {
            fontSize: '48px',
            color: '#ffffff',
            align: 'center'
          })
          .setOrigin(0.5);
          
          // Update reset button to handle React state
          const resetButton = this.add.text(0, 50, 'RESET GAME', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 20, y: 10 }
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => resetButton.setAlpha(0.8))
          .on('pointerout', () => resetButton.setAlpha(1))
          .on('pointerdown', () => {
            // Reset game state
            this.resetGame();
            
            // Update React state
            setIsPaused(false);
            setShowKeyboard(false);
            setShowEndGameOptions(false);
            setShowLeaderboard(false);
          });
          
          menuContainer.add([pauseText, resetButton]);
          menuContainer.setDepth(1000);
          menuContainer.setScrollFactor(0);
          
          this.pauseText.setData('overlay', overlay);
          this.pauseText.setData('menuContainer', menuContainer);
        } else {
          // Resume the game
          this.physics.resume();
          this.pauseText.setVisible(false);
          
          // Remove the overlay and menu container
          const overlay = this.pauseText.getData('overlay');
          const menuContainer = this.pauseText.getData('menuContainer');
          if (overlay) overlay.destroy();
          if (menuContainer) menuContainer.destroy();
        }
      }

      /**
       * Reset the game to initial state
       */
      private resetGame(): void {
        // Clear all existing UI text elements
        this.children.list
          .filter((child: Phaser.GameObjects.GameObject) => {
            const textChild = child as Phaser.GameObjects.Text;
            return textChild.type === 'Text' && 
              (textChild.text.includes('Time\'s Up') || 
               textChild.text.includes('You Fell') ||
               textChild.text.includes('Final Score'));
          })
          .forEach((text: Phaser.GameObjects.GameObject) => 
            (text as Phaser.GameObjects.Text).destroy()
          );

        // Unpause the game
        this.isPaused = false;
        this.physics.resume();
        
        // Clean up pause menu
        const overlay = this.pauseText.getData('overlay');
        const menuContainer = this.pauseText.getData('menuContainer');
        if (overlay) overlay.destroy();
        if (menuContainer) menuContainer.destroy();
        
        // Reset game state
        this.resetGameState();
        
        // Reset platform generation state
        this.highestPlatformY = this.config.height - 200;
        this.currentHeight = this.config.initialHeight;
        
        // Reset player position and velocity
        const playerBall = this.player.getBall();
        if (playerBall.body) {
          playerBall.setPosition(400, 500);
          (playerBall.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
        
        // Reset camera position
        this.cameras.main.scrollY = 0;
        
        // Clear ALL existing platforms
        this.activePlatforms.forEach(platform => {
          this.returnPlatformToPool(platform);
        });
        this.activePlatforms.clear();
        this.platforms.clear(false, false);
        
        // Clear ALL point orbs
        this.pointOrbs.forEach(orb => orb.destroy());
        this.pointOrbs = [];
        
        // Create initial ground platform
        const ground = this.add.rectangle(
          this.config.width / 2,
          580,
          this.config.width,
          40,
          0xFFA500
        ).setStrokeStyle(2, 0xFF69B4);
        this.physics.add.existing(ground, true);
        this.platforms.add(ground);
        
        // Generate new initial platforms
        this.lastPlatformY = 500;
        this.generatePlatforms();
        
        // Reset time
        this.gameStartTime = this.time.now;
        this.timeRemaining = this.TIME_LIMIT;
        
        // Re-enable ESC key listener
        this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
        
        // Update UI
        this.scoreText.setText('Score: 0\nHeight: 0m');
        this.timeText.setText(`Time: ${this.TIME_LIMIT}s`);
      }

      private cleanup(): void {
        // Clear pools
        this.platformPool = [];
        this.orbPool = [];
        
        // Clear spatial grid
        this.spatialGrid.clear();
        
        // Clear active platforms
        this.activePlatforms.clear();
        
        // Clear platform group
        this.platforms.clear(true, true);
        
        // Clear point orbs
        this.pointOrbs.forEach(orb => orb.destroy());
        this.pointOrbs = [];
        
        // Clear physics
        this.physics.world.shutdown();
      }

      private getPlatformFromPool(): Phaser.GameObjects.Rectangle {
        let platform = this.platformPool.pop();
        if (!platform) {
          // Create new platform if pool is empty
          platform = this.add.rectangle(0, 0, 100, 20, 0xFFA500);
          this.physics.add.existing(platform, true);
        } else {
          // Re-enable existing platform
          platform.setActive(true).setVisible(true);
          if (platform.body) {
            (platform.body as Phaser.Physics.Arcade.StaticBody).enable = true;
          }
        }
        return platform;
      }

      private returnPlatformToPool(platform: Phaser.GameObjects.Rectangle): void {
        platform.setActive(false).setVisible(false);
        if (platform.body) {
          (platform.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        }
        this.platformPool.push(platform);
      }
    }

    // Game configuration with optimized settings
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: '#2d2d2d',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'phaser-game',
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300, x: 0 },
          debug: false,
          fps: 60,
          timeScale: 1,
          skipQuadTree: false,
          overlapBias: 4,
          tileBias: 16,
          fixedStep: true,
          maxSubSteps: 1,
          useTree: true
        }
      },
      render: {
        powerPreference: 'high-performance',
        antialias: false,
        pixelArt: true,
        roundPixels: true,
        batchSize: 2048
      },
      dom: {
        createContainer: true
      },
      scene: GameScene
    };

    // Initialize game instance
    const game = new Phaser.Game(config);

    // Efficient window resize handling with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => game.scale.refresh(), 100);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      game.destroy(true);
    };
  }, []);

  // Update the pause handler to use GameSceneType
  const handlePauseClick = () => {
    const gameWindow = window as GameWindow;
    const scene = gameWindow.game?.scene?.scenes[0] as GameSceneType;
    if (scene && scene.togglePause) {
      scene.togglePause();
      setIsPaused(!isPaused);
    }
  };

  // Add new handler for when leaderboard is closed
  const handleLeaderboardClose = () => {
    setShowLeaderboard(false);
    setShowEndGameOptions(true);
  };

  // Add new handler for play again
  const handlePlayAgain = () => {
    setShowEndGameOptions(false);
    setShowKeyboard(false);
    
    const gameWindow = window as GameWindow;
    const scene = gameWindow.game?.scene?.scenes[0] as GameSceneType;
    
    if (scene && typeof scene.resetGame === 'function') {
      // Remove any existing game over text
      scene.children.list
        .filter((child: Phaser.GameObjects.GameObject) => {
          const textChild = child as Phaser.GameObjects.Text;
          return textChild.type === 'Text' && 
            (textChild.text === 'GAME OVER' || textChild.text.includes('Final Score'));
        })
        .forEach((text: Phaser.GameObjects.GameObject) => 
          (text as Phaser.GameObjects.Text).destroy()
        );
      
      // Reset the game
      scene.resetGame();
    }
  };

  // Add keyboard submission handler
  const handleSubmitScore = async (name: string) => {
    const gameWindow = window as GameWindow;
    const scene = gameWindow.game?.scene?.scenes[0] as GameSceneType;
    if (!scene) return;

    // Generate a unique ID for the score
    const uniqueId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Submit score to API
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: uniqueId,
          name,
          score: scene.score,
          height: scene.finalHeight,
          timestamp: new Date().toISOString()
        })
      });
      
      // Show leaderboard after submission
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
    
    setShowKeyboard(false);
  };

  return (
    <div className="relative w-full h-full">
      <div id="phaser-game" className="w-full h-full flex items-center justify-center" />
      
      {/* Add pause button */}
      <button 
        onClick={handlePauseClick}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        aria-label={isPaused ? "Resume game" : "Pause game"}
      >
        {isPaused ? <FaPlay className="w-6 h-6" /> : <FaPause className="w-6 h-6" />}
      </button>

      {showKeyboard && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <LetterKeyboard
            value={playerName}
            onChange={setPlayerName}
            onSubmit={handleSubmitScore}
            maxLength={5}
          />
        </div>
      )}
      {isMobile && !showKeyboard && !showEndGameOptions && (
        <MobileDPad 
          onDirectionChange={handleDirectionChange}
          onAPress={() => {
            console.log('A button pressed');
            const scene = ((window as GameWindow).game?.scene?.scenes[0] as GameSceneType);
            if (scene?.player) {
              scene.player.handleAPress();
            }
          }}
          onARelease={() => {
            console.log('A button released');
            const scene = ((window as GameWindow).game?.scene?.scenes[0] as GameSceneType);
            if (scene?.player) {
              scene.player.handleARelease();
            }
          }}
          onBPress={() => {
            console.log('B button pressed');
            const scene = ((window as GameWindow).game?.scene?.scenes[0] as GameSceneType);
            if (scene?.player) {
              scene.player.handleBPress();
            }
          }}
          onBRelease={() => {
            console.log('B button released');
            const scene = ((window as GameWindow).game?.scene?.scenes[0] as GameSceneType);
            if (scene?.player) {
              scene.player.handleBRelease();
            }
          }}
        />
      )}
      {showLeaderboard && (
        <Leaderboard 
          visible={showLeaderboard}
          onClose={handleLeaderboardClose}
        />
      )}

      {showEndGameOptions && (
        <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg flex flex-col gap-4">
            <button
              onClick={handlePlayAgain}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-lg font-semibold transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}