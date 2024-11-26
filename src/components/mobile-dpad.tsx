'use client';

import { useState } from 'react';

interface DPadProps {
  onDirectionChange?: (direction: { x: number; y: number }) => void;
  onAPress?: () => void;
  onARelease?: () => void;
  onBPress?: () => void;
  onBRelease?: () => void;
}

export default function MobileDPad({ 
  onDirectionChange, 
  onAPress, 
  onARelease,
  onBPress,
  onBRelease 
}: DPadProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDirection, setCurrentDirection] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const touchStartPos = { x: touch.clientX, y: touch.clientY };
    setTouchStart(touchStartPos);

    // Get the touch target element
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    
    // Calculate center of d-pad
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Define center zone (16px radius from center)
    const distanceFromCenter = Math.sqrt(
      Math.pow(touch.clientX - centerX, 2) + 
      Math.pow(touch.clientY - centerY, 2)
    );

    // If touch is in center zone, trigger jump
    if (distanceFromCenter < 16) {
      onDirectionChange?.({ x: 0, y: -1 }); // Trigger jump
      // Reset direction after a short delay
      setTimeout(() => {
        onDirectionChange?.({ x: 0, y: 0 });
      }, 100);
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Calculate direction with threshold (20px)
    const direction = {
      x: Math.abs(deltaX) > 20 ? Math.sign(deltaX) : 0,
      y: Math.abs(deltaY) > 20 ? Math.sign(deltaY) : 0
    };

    // Only update if direction changed
    if (direction.x !== currentDirection.x || direction.y !== currentDirection.y) {
      setCurrentDirection(direction);
      onDirectionChange?.(direction);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setTouchStart(null);
    setCurrentDirection({ x: 0, y: 0 });
    onDirectionChange?.({ x: 0, y: 0 });
  };

  // Update A button handlers to match Ball class behavior
  const handleAButtonStart = () => {
    onAPress?.(); // This will trigger Ball.handleAPress() which toggles super jump
  };

  const handleAButtonEnd = () => {
    onARelease?.(); // Ball.handleARelease() is empty as A is a toggle
  };

  // Add touch handlers for A and B buttons
  const handleBButtonStart = () => {
    onBPress?.();
  };

  const handleBButtonEnd = () => {
    onBRelease?.();
  };

  return (
    <>
      {/* D-Pad */}
      <div 
        className="fixed bottom-8 left-8 w-32 h-32 rounded-full bg-black bg-opacity-50 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute left-1/2 top-1/2 w-8 h-8 rounded-full bg-gray-500 bg-opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div 
          className={`absolute w-16 h-16 rounded-full bg-gray-700 bg-opacity-80 transform transition-transform duration-100`}
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${currentDirection.x * 16}px, ${currentDirection.y * 16}px)`
          }}
        />
      </div>

      {/* A and B Buttons */}
      <div className="fixed bottom-8 right-8 flex gap-4">
        <button
          className="w-16 h-16 rounded-full bg-red-500 bg-opacity-50 text-white font-bold text-2xl touch-none active:bg-opacity-70"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBButtonStart();
          }}
          onContextMenu={(e) => e.preventDefault()}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBButtonEnd();
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBButtonEnd();
          }}
        >
          B
        </button>
        <button 
          className="w-16 h-16 rounded-full bg-green-500 bg-opacity-50 text-white font-bold text-2xl touch-none active:bg-opacity-70 transition-colors duration-200"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAButtonStart();
          }}
          onContextMenu={(e) => e.preventDefault()}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAButtonEnd();
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAButtonEnd();
          }}
        >
          A
        </button>
      </div>
    </>
  );
}
