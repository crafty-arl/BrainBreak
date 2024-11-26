'use client';

import { Scene } from 'phaser';

interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameConfig {
  width: number;
  height: number;
  platformWidth: number;
  platformHeight: number;
  ballRadius: number;
  superJumpForce: number;
  initialHeight: number;
  heightIncrement: number;
  platformBuffer: number;
  minPlatformsAhead: number;
}

class GameMap {
  public readonly config: GameConfig = {
    width: 1200,
    height: 800,
    platformWidth: 200,
    platformHeight: 20,
    ballRadius: 16,
    superJumpForce: -1200,
    initialHeight: 800,
    heightIncrement: 200,
    platformBuffer: 2000,
    minPlatformsAhead: 8
  } as const;

  private currentHeight: number;
  private highestPlatformY: number;
  private score: number;
  private readonly EXTENDED_HEIGHT = 1000000; // 10,000m * 100 units per meter (10km high!)
  private extendedPlatforms: PlatformConfig[] = [];

  constructor() {
    this.currentHeight = this.config.initialHeight;
    this.highestPlatformY = this.config.height - 200;
    this.score = 0;
  }

  private generateInitialPlatforms(): PlatformConfig[] {
    const platforms: PlatformConfig[] = [];
    
    const initialRows = Math.ceil(this.config.platformBuffer / this.config.heightIncrement);
    for (let i = 0; i < initialRows; i++) {
      const y = this.config.height - 200 - (i * this.config.heightIncrement);
      this.addPlatformRow(platforms, y);
      this.highestPlatformY = Math.min(this.highestPlatformY, y);
    }

    return platforms;
  }

  public generateNewPlatforms(playerY: number): PlatformConfig[] {
    const platforms: PlatformConfig[] = [];
    
    const bufferThreshold = playerY - this.config.platformBuffer;
    while (this.highestPlatformY > bufferThreshold) {
      this.highestPlatformY -= this.config.heightIncrement;
      this.addPlatformRow(platforms, this.highestPlatformY);
    }

    if (this.highestPlatformY > -this.EXTENDED_HEIGHT) {
      const extendedPlatforms = this.generateExtendedPlatforms(
        this.highestPlatformY,
        bufferThreshold
      );
      platforms.push(...extendedPlatforms);
    }

    this.updateScore(playerY);
    return platforms;
  }

  private updateScore(playerY: number) {
    const newScore = Math.max(0, Math.floor((this.config.height - playerY) / 100));
    if (newScore > this.score) {
      this.score = newScore;
    }
  }

  public getScore(): number {
    return this.score;
  }

  private addPlatformRow(platforms: PlatformConfig[], y: number) {
    const numPlatforms = Math.floor(Math.random() * 2) + 2;
    const usedPositions = new Set<number>();
    
    for (let i = 0; i < numPlatforms; i++) {
      const minX = 100;
      const maxX = this.config.width - this.config.platformWidth - 100;
      let x;
      
      do {
        x = Math.floor(minX + Math.random() * (maxX - minX));
      } while (this.isPositionTaken(x, usedPositions));
      
      usedPositions.add(x);
      
      platforms.push({
        x,
        y,
        width: this.config.platformWidth,
        height: this.config.platformHeight
      });
    }
  }

  private isPositionTaken(x: number, usedPositions: Set<number>): boolean {
    const buffer = this.config.platformWidth + 50;
    return Array.from(usedPositions).some(usedX => 
      Math.abs(x - usedX) < buffer
    );
  }

  public createPlatforms(scene: Scene): Phaser.Physics.Arcade.StaticGroup {
    const platforms = scene.physics.add.staticGroup();
    const initialPlatforms = this.generateInitialPlatforms();
    const extendedPlatforms = this.generateExtendedPlatforms(
      this.highestPlatformY,
      -this.EXTENDED_HEIGHT
    );
    
    const graphics = scene.add.graphics();
    graphics.lineStyle(2, 0x00ff00);
    graphics.fillStyle(0x00ff00);

    const addPlatformsToScene = (platformConfigs: PlatformConfig[]) => {
      platformConfigs.forEach((platform) => {
        const plt = platforms.create(
          platform.x + platform.width / 2,
          platform.y,
          ''
        ) as Phaser.Physics.Arcade.Sprite;

        plt.setDisplaySize(platform.width, platform.height);
        graphics.fillRect(
          platform.x,
          platform.y - platform.height/2,
          platform.width,
          platform.height
        );
        plt.refreshBody();
        plt.setImmovable(true);
        plt.setVisible(false);
      });
    };

    addPlatformsToScene(initialPlatforms);
    addPlatformsToScene(extendedPlatforms);

    scene.data.set('addPlatformsToScene', addPlatformsToScene);
    
    return platforms;
  }

  public getGroundPlatformY(): number {
    return this.config.height - this.config.platformHeight;
  }

  private generateExtendedPlatforms(startY: number, targetY: number): PlatformConfig[] {
    const platforms: PlatformConfig[] = [];
    let currentY = startY;

    while (currentY > targetY && currentY > -this.EXTENDED_HEIGHT) {
      const heightZone = Math.abs(currentY) / 100; // Convert to meters
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
          const width = Math.max(
            80,
            this.config.platformWidth * (1 - heightZone / 300)
          );
          
          const minX = 50 + (heightZone > 200 ? 50 : 0);
          const maxX = this.config.width - width - (50 + (heightZone > 200 ? 50 : 0));
          const x = Math.floor(minX + Math.random() * (maxX - minX));

          platforms.push({
            x,
            y: currentY,
            width,
            height: this.config.platformHeight
          });
        }
      }

      const baseGap = this.config.heightIncrement;
      const heightFactor = 1 + (heightZone / 40);
      currentY -= baseGap * heightFactor;
    }

    this.extendedPlatforms = platforms;
    return platforms;
  }

  public getExtendedPlatforms(): PlatformConfig[] {
    return this.extendedPlatforms;
  }
}

const gameMap = new GameMap();
export { gameMap };
export type { GameConfig, PlatformConfig };
