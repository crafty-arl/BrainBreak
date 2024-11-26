'use client'

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"

interface GameBoyArcadeProps {
  children: React.ReactNode
}

// Add interface for keyboard event options
interface KeyboardEventOptions extends KeyboardEventInit {
  key: string;
  code: string;
  keyCode?: number;
  shiftKey?: boolean;
  altKey?: boolean;
}

// Export the function if it will be used elsewhere, or remove if unused
export const createKeyboardEvent = (type: 'keydown' | 'keyup', options: KeyboardEventOptions) => {
  const events = [];
  events.push(new KeyboardEvent(type, {
    bubbles: true, 
    cancelable: true, 
    view: window,
    keyCode: options.keyCode || getKeyCode(options.key),
    shiftKey: options.shiftKey || false,
    altKey: options.altKey || false,
    ...options
  }));

  const secondaryKey = getSecondaryKey(options.key);
  if (secondaryKey) {
    // Create new options object without the original key
    const secondaryOptions = {
      ...options,
      key: secondaryKey,
      code: getSecondaryCode(secondaryKey),
      keyCode: getKeyCode(secondaryKey)
    };

    events.push(new KeyboardEvent(type, {
      bubbles: true, 
      cancelable: true, 
      view: window,
      shiftKey: options.shiftKey || false,
      altKey: options.altKey || false,
      ...secondaryOptions
    }));
  }
  return events;
};

const getKeyCode = (key: string): number => {
  const keyCodes: { [key: string]: number } = {
    'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39,
    'w': 87, 's': 83, 'a': 65, 'd': 68, ' ': 32
  };
  return keyCodes[key] || 0;
};

const getSecondaryKey = (key: string): string | null => {
  const keyMap: { [key: string]: string } = {
    'ArrowUp': 'w', 'ArrowDown': 's', 'ArrowLeft': 'a', 'ArrowRight': 'd',
    'w': 'ArrowUp', 's': 'ArrowDown', 'a': 'ArrowLeft', 'd': 'ArrowRight'
  };
  return keyMap[key] || null;
};

const getSecondaryCode = (key: string): string => {
  const codeMap: { [key: string]: string } = {
    'w': 'KeyW', 's': 'KeyS', 'a': 'KeyA', 'd': 'KeyD', ' ': 'Space'
  };
  return codeMap[key] || key;
};

// Modified Screen component
const GameBoyScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full max-w-[800px] aspect-[4/3] relative">
      {/* Outer bezel */}
      <Card className="absolute inset-0 bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
        <CardContent className="p-0 h-full">
          <div className="w-full h-full p-4 bg-gray-900">
            <div className="w-full h-full bg-black rounded-sm overflow-hidden">
              {/* Game container is now a sibling to the bezel */}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Game content rendered on top */}
      <div className="relative z-10 w-full h-full" id="phaser-container">
        {children}
      </div>
    </div>
  );
};

// Enhanced Controls component with all game instructions
const GameControls = () => {
  const [showControls, setShowControls] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPoints, setShowPoints] = useState(false);

  return (
    <div className="mt-4 text-white text-center">
      <div className="flex justify-center gap-4 mb-4">
        <button 
          onClick={() => setShowControls(!showControls)}
          className="text-2xl hover:text-blue-400 transition-colors"
          title="Show Controls"
        >
          ❓ Controls
        </button>
        <button 
          onClick={() => setShowRules(!showRules)}
          className="text-2xl hover:text-blue-400 transition-colors"
          title="Show Rules"
        >
          ❓ Rules
        </button>
        <button 
          onClick={() => setShowPoints(!showPoints)}
          className="text-2xl hover:text-blue-400 transition-colors"
          title="Show Points"
        >
          ❓ Points
        </button>
      </div>

      {showControls && (
        <div className="mb-4 animate-fade-in">
          <h3 className="text-xl font-bold mb-2">Controls</h3>
          
          {/* Desktop Controls */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p><span className="font-bold">Move Left:</span> A or ←</p>
              <p><span className="font-bold">Move Right:</span> D or →</p>
            </div>
            <div>
              <p><span className="font-bold">Jump:</span> W or ↑</p>
              <p><span className="font-bold">Super Jump Toggle:</span> SPACE</p>
            </div>
          </div>

          {/* Mobile Controls */}
          <div>
            <h4 className="text-lg font-bold mb-2">Mobile Controls</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><span className="font-bold">D-Pad:</span> Move & Jump</p>
                <p><span className="font-bold">Center Press:</span> Quick Jump</p>
              </div>
              <div>
                <p><span className="font-bold">A Button:</span> Super Jump Toggle</p>
                <p><span className="font-bold">B Button:</span> Alternative Action</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="mb-4 animate-fade-in">
          <h4 className="text-lg font-bold mb-2">Game Rules</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-bold">Time Limit:</span> 120 seconds</p>
              <p><span className="font-bold">Time Bonus:</span> +5s per milestone</p>
            </div>
            <div>
              <p><span className="font-bold">Height Milestone:</span> Every 10m</p>
              <p><span className="font-bold">Score Zones:</span> Higher = More Points</p>
            </div>
          </div>
        </div>
      )}

      {showPoints && (
        <div className="animate-fade-in">
          <h4 className="text-lg font-bold mb-2">Point System</h4>
          <div>
            <h5 className="font-bold mb-1">Point Orbs</h5>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <p>Light Pink: 1pt</p>
              <p>Pink: 2pts</p>
              <p>Hot Pink: 3pts</p>
              <p>Deep Pink: 4pts</p>
              <p>Magenta: 5pts</p>
            </div>
            
            <h5 className="font-bold mt-2 mb-1">Height Multipliers</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>0-1000m: 1x</p>
              <p>1000-2000m: 2x</p>
              <p>2000-3000m: 3x</p>
              <p>3000m+: 4x</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function GameBoyArcade({ children }: GameBoyArcadeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 p-4">
      <GameBoyScreen>
        {children}
      </GameBoyScreen>
      <GameControls />
    </div>
  );
}
