'use client';

interface BallConfig {
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: number;
}

export class Ball {
  private ball: Phaser.GameObjects.Container;
  private ballGraphics: Phaser.GameObjects.Graphics;
  private chargeGraphics: Phaser.GameObjects.Graphics;
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed: number;
  private jumpForce: number = -600;
  private maxSpeed: number = 400;
  private canJump: boolean = true;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;
  private bounceCount: number = 0;
  private maxBounceBoost: number = 200;
  private chargeJumpStartTime: number = 0;
  private maxChargeTime: number = 1000;
  private minJumpForce: number = -400;
  private maxJumpForce: number = -800;
  private rotationSpeed: number = 0.1;
  private arrowAngle: number = -Math.PI / 4;
  private launchAngle: number = 0;
  private isCharging: boolean = false;
  private chargeStartPosition: { x: number; y: number } | null = null;
  private readonly CHARGE_RATE: number = 0.05;
  private readonly MIN_LAUNCH_SPEED: number = 600;
  private readonly MAX_LAUNCH_SPEED: number = 1200;
  private readonly ANGLE_ADJUST_SPEED: number = 0.03;
  private readonly MAX_ANGLE: number = Math.PI * 2;
  private readonly NORMAL_JUMP_FORCE: number = -600;
  private readonly MAX_JUMP_FORCE: number = -800;
  private pulseTime: number = 0;
  private chargeLevel: number = 0;
  private mobileDirection: { x: number; y: number } = { x: 0, y: 0 };
  private mobileCharging: boolean = false;
  private isChargeJumpMode: boolean = false;
  private readonly CHARGE_JUMP_MULTIPLIER: number = 1.5;
  private chargeJumpIndicator: Phaser.GameObjects.Graphics;
  private superJumpIndicator: Phaser.GameObjects.Graphics | null = null;
  private canDoubleJump: boolean = false;
  private readonly DOUBLE_JUMP_FORCE: number = -500;
  private spaceWasPressed: boolean = false;
  private physicsBody: Phaser.Physics.Arcade.Body;
  private isSuperJumpMode: boolean = false;

  constructor(scene: Phaser.Scene, config: BallConfig) {
    // Create a container for the ball and its graphics
    this.ball = scene.add.container(config.x, config.y);
    
    // Create ball graphics
    this.ballGraphics = scene.add.graphics();
    
    // Draw the circle with a line to show rotation
    this.ballGraphics.lineStyle(2, 0xFFFFFF, 1);
    this.ballGraphics.fillStyle(0xFF0000, 1);
    this.ballGraphics.beginPath();
    this.ballGraphics.arc(0, 0, config.radius, 0, Math.PI * 2);
    this.ballGraphics.closePath();
    this.ballGraphics.fillPath();
    this.ballGraphics.strokePath();
    
    // Add a line from center to edge to visualize rotation
    this.ballGraphics.lineStyle(2, 0xFFFFFF, 1);
    this.ballGraphics.beginPath();
    this.ballGraphics.moveTo(0, 0);
    this.ballGraphics.lineTo(config.radius, 0);
    this.ballGraphics.closePath();
    this.ballGraphics.strokePath();

    // Create charge animation graphics
    this.chargeGraphics = scene.add.graphics();
    this.pulseGraphics = scene.add.graphics();
    this.ball.add(this.pulseGraphics);
    this.ball.add(this.chargeGraphics);

    // Add graphics to container
    this.ball.add(this.ballGraphics);

    // Enable physics for the ball container
    scene.physics.world.enable(this.ball);
    this.physicsBody = this.ball.body as Phaser.Physics.Arcade.Body;
    
    // Configure physics body
    this.physicsBody.setCircle(config.radius);
    this.physicsBody.setCollideWorldBounds(true);
    this.physicsBody.setBounce(0.2);
    this.physicsBody.setDrag(50);
    this.physicsBody.setMaxVelocity(this.maxSpeed, 1000);
    this.physicsBody.setGravityY(800);

    // Create key objects
    const keyboard = scene.input.keyboard!;
    this.keyA = keyboard.addKey('A');
    this.keyD = keyboard.addKey('D');
    this.keyW = keyboard.addKey('W');
    this.keySpace = keyboard.addKey('SPACE');
    this.cursors = scene.input.keyboard!.createCursorKeys();

    // Rename superJumpIndicator to chargeJumpIndicator
    this.chargeJumpIndicator = scene.add.graphics();
    this.ball.add(this.chargeJumpIndicator);

    // Initialize speed from config
    this.speed = config.speed;
  }

  setDirection(direction: { x: number; y: number }) {
    this.mobileDirection = direction;
    
    // Start charging on swipe up
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    if (direction.y < -0.5 && !this.mobileCharging && ballBody.blocked.down) {
      this.mobileCharging = true;
      this.isCharging = true;
      this.chargeJumpStartTime = Date.now();
      this.chargeStartPosition = { x: this.ball.x, y: this.ball.y };
    }
    
    // Release charge on swipe down
    if (direction.y > 0.5 && this.mobileCharging) {
      this.mobileCharging = false;
      this.isCharging = false;
      const launchSpeed = this.MIN_LAUNCH_SPEED + (this.MAX_LAUNCH_SPEED - this.MIN_LAUNCH_SPEED) * Math.pow(this.chargeLevel, 1.5);
      const vx = Math.cos(this.arrowAngle) * launchSpeed;
      const vy = Math.sin(this.arrowAngle) * launchSpeed;
      ballBody.setVelocity(vx, vy);
      this.chargeStartPosition = null;
      this.chargeGraphics.clear();
      this.pulseGraphics.clear();
      this.chargeJumpStartTime = 0;
    }
  }

  update() {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    const isOnGround = ballBody.blocked.down;
    this.pulseTime += 0.1;

    if (isOnGround) {
      this.canJump = true;
      this.canDoubleJump = true;
      this.spaceWasPressed = false;
    }

    // Combine keyboard and mobile inputs for movement
    const moveLeft = this.keyA.isDown || 
                    this.cursors.left.isDown || 
                    this.mobileDirection.x < -0.5;
    const moveRight = this.keyD.isDown || 
                     this.cursors.right.isDown || 
                     this.mobileDirection.x > 0.5;

    // Handle keyboard charge controls
    if (this.keySpace.isDown && isOnGround && !this.isCharging) {
      this.isCharging = true;
      this.chargeJumpStartTime = Date.now();
      this.chargeStartPosition = { x: this.ball.x, y: this.ball.y };
      this.spaceWasPressed = true;
    } else if (this.keySpace.isDown && !isOnGround && !this.spaceWasPressed && this.canDoubleJump) {
      // Only double jump if we're in the air, space wasn't held from ground, and we have double jump available
      this.canDoubleJump = false;
      ballBody.setVelocityY(this.DOUBLE_JUMP_FORCE);
      this.createDoubleJumpEffect();
      this.spaceWasPressed = true;
    } else if (!this.keySpace.isDown) {
      this.spaceWasPressed = false;
      
      // Existing charge release logic
      if (this.isCharging && !this.mobileCharging) {
        const launchSpeed = this.MIN_LAUNCH_SPEED + (this.MAX_LAUNCH_SPEED - this.MIN_LAUNCH_SPEED) * Math.pow(this.chargeLevel, 1.5);
        const vx = Math.cos(this.arrowAngle) * launchSpeed;
        const vy = Math.sin(this.arrowAngle) * launchSpeed;
        ballBody.setVelocity(vx, vy);
        
        this.isCharging = false;
        this.chargeStartPosition = null;
        this.chargeGraphics.clear();
        this.pulseGraphics.clear();
        this.chargeJumpStartTime = 0;
      }
    }

    if (this.isCharging && isOnGround) {
      if (moveLeft) {
        this.arrowAngle += this.ANGLE_ADJUST_SPEED;
        if (this.arrowAngle > Math.PI) {
          this.arrowAngle = -Math.PI;
        }
      } else if (moveRight) {
        this.arrowAngle -= this.ANGLE_ADJUST_SPEED;
        if (this.arrowAngle < -Math.PI) {
          this.arrowAngle = Math.PI;
        }
      }

      this.chargeLevel = Math.min((Date.now() - this.chargeJumpStartTime) / this.maxChargeTime, 1);
      this.updateChargeVisuals(this.chargeLevel);

      if (this.chargeStartPosition) {
        ballBody.setVelocity(0, 0);
        this.ball.setPosition(this.chargeStartPosition.x, this.chargeStartPosition.y);
      }
    } else {
      if (!this.isCharging) {
        if (moveLeft) {
          const acceleration = isOnGround ? -this.speed : -this.speed * 0.5;
          ballBody.setAccelerationX(acceleration);
          this.ball.rotation -= this.rotationSpeed * (Math.abs(ballBody.velocity.x) / this.maxSpeed);
        } else if (moveRight) {
          const acceleration = isOnGround ? this.speed : this.speed * 0.5;
          ballBody.setAccelerationX(acceleration);
          this.ball.rotation += this.rotationSpeed * (Math.abs(ballBody.velocity.x) / this.maxSpeed);
        } else {
          ballBody.setAccelerationX(0);
          this.ball.rotation *= isOnGround ? 0.9 : 0.98;
        }
      }
    }

    if (this.superJumpIndicator) {
      this.updateSuperJumpIndicator();
    }
  }

  private updateChargeVisuals(chargePercent: number) {
    this.chargeGraphics.clear();
    this.pulseGraphics.clear();
    
    // Direction arrow
    const arrowLength = 40 + (chargePercent * 60);
    this.chargeGraphics.lineStyle(3, 0xff0000);
    this.chargeGraphics.beginPath();
    this.chargeGraphics.moveTo(0, 0);
    this.chargeGraphics.lineTo(
      Math.cos(this.arrowAngle) * arrowLength,
      Math.sin(this.arrowAngle) * arrowLength
    );
    this.chargeGraphics.strokePath();

    // Arrow head
    const headLength = 10 + (chargePercent * 10);
    const headAngle = 0.5;
    const tipX = Math.cos(this.arrowAngle) * arrowLength;
    const tipY = Math.sin(this.arrowAngle) * arrowLength;
    this.chargeGraphics.lineTo(
      tipX - headLength * Math.cos(this.arrowAngle - headAngle),
      tipY - headLength * Math.sin(this.arrowAngle - headAngle)
    );
    this.chargeGraphics.moveTo(tipX, tipY);
    this.chargeGraphics.lineTo(
      tipX - headLength * Math.cos(this.arrowAngle + headAngle),
      tipY - headLength * Math.sin(this.arrowAngle + headAngle)
    );
    this.chargeGraphics.strokePath();

    // Pulsating circle effect
    const basePulseRadius = 20 + (chargePercent * 20);
    const pulseOffset = Math.sin(this.pulseTime) * 5; // Pulsing effect
    const pulseRadius = basePulseRadius + pulseOffset;
    const pulseAlpha = 0.7 - (chargePercent * 0.3);
    
    // Inner pulse
    this.pulseGraphics.lineStyle(2, 0xffff00, pulseAlpha);
    this.pulseGraphics.beginPath();
    this.pulseGraphics.arc(0, 0, pulseRadius * 0.7, 0, Math.PI * 2);
    this.pulseGraphics.strokePath();
    
    // Outer pulse
    this.pulseGraphics.lineStyle(2, 0xffff00, pulseAlpha * 0.5);
    this.pulseGraphics.beginPath();
    this.pulseGraphics.arc(0, 0, pulseRadius, 0, Math.PI * 2);
    this.pulseGraphics.strokePath();
  }

  getBall(): Phaser.GameObjects.Container {
    return this.ball;
  }

  handleAPress() {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    
    // Start charging when A is pressed and on ground
    if (ballBody.blocked.down && !this.isCharging) {
      this.isCharging = true;
      this.chargeJumpStartTime = Date.now();
      this.chargeStartPosition = { x: this.ball.x, y: this.ball.y };
    }
  }

  handleARelease() {
    // Launch when A is released while charging
    if (this.isCharging) {
      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
      const launchSpeed = this.MIN_LAUNCH_SPEED + (this.MAX_LAUNCH_SPEED - this.MIN_LAUNCH_SPEED) * Math.pow(this.chargeLevel, 1.5);
      
      const vx = Math.cos(this.arrowAngle) * launchSpeed;
      const vy = Math.sin(this.arrowAngle) * launchSpeed;
      ballBody.setVelocity(vx, vy);

      this.isCharging = false;
      this.chargeStartPosition = null;
      this.chargeGraphics.clear();
      this.pulseGraphics.clear();
      this.chargeJumpStartTime = 0;
    }
  }

  handleBPress() {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    
    // Perform double jump if in air and available
    if (!ballBody.blocked.down && this.canDoubleJump) {
      this.canDoubleJump = false;
      ballBody.setVelocityY(this.DOUBLE_JUMP_FORCE);
      this.createDoubleJumpEffect();
    }
  }

  handleBRelease() {
    // No action needed on release for double jump
  }

  updateChargeJumpIndicator(isActive: boolean) {
    this.chargeJumpIndicator.clear();
    
    if (isActive) {
      // Draw an indicator when charge jump is available
      this.chargeJumpIndicator.lineStyle(2, 0x00ff00, 0.8);
      this.chargeJumpIndicator.beginPath();
      this.chargeJumpIndicator.arc(0, 0, 25, 0, Math.PI * 2);
      this.chargeJumpIndicator.strokePath();
      
      // Add some visual flair
      const innerRadius = 20;
      this.chargeJumpIndicator.lineStyle(2, 0x00ff00, 0.4);
      this.chargeJumpIndicator.beginPath();
      this.chargeJumpIndicator.arc(0, 0, innerRadius, 0, Math.PI * 2);
      this.chargeJumpIndicator.strokePath();
    }
  }

  updateSuperJumpIndicator(): void {
    if (!this.superJumpIndicator) {
      this.superJumpIndicator = this.ball.scene.add.graphics();
      this.ball.add(this.superJumpIndicator);
    }
    
    this.superJumpIndicator.clear();
    
    if (this.isSuperJumpMode) {
      this.superJumpIndicator.lineStyle(2, 0xffff00, 1);
      const radius = 30;
      this.superJumpIndicator.strokeCircle(0, 0, radius + 4);
    }
  }

  private createDoubleJumpEffect() {
    // Get the scene from the ball container
    const scene = this.ball.scene;
    const jumpEffect = scene.add.graphics();
    this.ball.add(jumpEffect);

    jumpEffect.lineStyle(2, 0x00ffff, 1);
    jumpEffect.beginPath();
    jumpEffect.arc(0, 0, 30, 0, Math.PI * 2);
    jumpEffect.strokePath();

    // Fade out and remove the effect
    scene.tweens.add({
        targets: jumpEffect,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 200,
        onComplete: () => jumpEffect.destroy()
    });
  }

  getPhysicsBody(): Phaser.Physics.Arcade.Body {
    return this.physicsBody;
  }
}
