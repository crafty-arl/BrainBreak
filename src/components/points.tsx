'use client';

import { type Scene } from 'phaser';

type OrbColor = 'lightPink' | 'pink' | 'hotPink' | 'deepPink' | 'magenta';

interface OrbColorConfig {
  color: number;
  points: number;
}

// Define the color configurations using the interfaces
const orbColors: Record<OrbColor, OrbColorConfig> = {
    lightPink: { color: 0xFFB6C1, points: 10 },
    pink: { color: 0xFFC0CB, points: 20 },
    hotPink: { color: 0xFF69B4, points: 30 },
    deepPink: { color: 0xFF1493, points: 40 },
    magenta: { color: 0xFF00FF, points: 50 }
};

export class PointOrb extends Phaser.GameObjects.Container {
    public pointValue: number;

    constructor(scene: Phaser.Scene, x: number, y: number, color: OrbColor) {
        super(scene, x, y);
        
        // Use the orbColors configuration
        this.pointValue = orbColors[color].points;
        
        // Add the orb sprite/shape to the container
        const orb = scene.add.circle(0, 0, 8, orbColors[color].color);
        this.add(orb);
        
        // Add to scene
        scene.add.existing(this);
    }
    
    public collect(): void {
        // Add collection animation/effect here if desired
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: 'Power2'
        });
    }
}

// Update helper function to use OrbColor type
export function createPointOrbs(scene: Scene) {
    const orbs: PointOrb[] = [];
    
    // Create one of each color orb
    const positions: [OrbColor, number][] = [
        ['lightPink', 100],
        ['pink', 200],
        ['hotPink', 300],
        ['deepPink', 400],
        ['magenta', 500]
    ];
    
    positions.forEach(([color, x]) => {
        orbs.push(new PointOrb(scene, x, 100, color));
    });

    return orbs;
}
