'use client';

import dynamic from 'next/dynamic';
import GameBoyArcade from '@/components/GameBoyArcade';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-pulse text-xl">Loading game...</div>
    </div>
  )
});

// Add type definition for the game instance
interface PhaserGame {
  destroy: (removeCanvas: boolean) => void;
}

// Properly declare the window game property
declare global {
  interface Window {
    game?: PhaserGame;
  }
}

export default function BounceBallPage() {
  const router = useRouter();

  useEffect(() => {
    return () => {
      // No need for type assertion since we declared the type globally
      if (window.game) {
        window.game.destroy(true);
        window.game = undefined;
      }
      
      localStorage.removeItem('bestTime');
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col p-4">
      <div className="flex justify-start mb-4">
        <button
          onClick={() => router.push('/')}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200 font-playfair-display shadow-lg"
        >
          Return Home
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <h1 className="sr-only">Bounce Ball Game</h1>
          
          <div className="relative" role="main" aria-label="Game container">
            <GameBoyArcade>
              <Game />
            </GameBoyArcade>
          </div>
        </div>
      </div>
    </div>
  );
}
