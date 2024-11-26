'use client';

import { useRouter } from 'next/navigation';
import Leaderboard from '@/components/leaderboard';
import { useState } from 'react';

export default function Page() {
  const router = useRouter();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-6xl font-bold text-center mb-4 text-yellow-400 animate-pulse font-playfair-display [text-shadow:_0_0_10px_rgb(250_204_21_/_0.5),_0_0_20px_rgb(250_204_21_/_0.3)]">
          Brain Break Games
        </h1>
        <p className="text-center text-gray-400 mb-16 font-playfair-display">Powered by Craft The Future</p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Bounce Ball Game Card */}
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-200">
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
              <div className="text-6xl">🎮</div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2 text-green-400 font-playfair-display [text-shadow:_0_0_10px_rgb(74_222_128_/_0.5)]">Bounce Ball</h2>
              <p className="text-gray-400 mb-4 font-playfair-display">
                Test your reflexes in this addictive arcade game. How high can you bounce?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/bounce-ball')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 font-playfair-display"
                >
                  Play Now
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 font-playfair-display"
                >
                  Scores
                </button>
              </div>
            </div>
          </div>

          {/* Coming Soon Cards */}
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-900/50 rounded-xl overflow-hidden shadow-lg">
              <div className="aspect-video bg-gray-800/50 flex items-center justify-center">
                <div className="text-6xl opacity-50">🎲</div>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-500">Coming Soon</h2>
                <p className="text-gray-600 mb-4">
                  More exciting arcade games are on their way!
                </p>
                <button
                  disabled
                  className="w-full bg-gray-700/50 text-gray-500 font-bold py-3 px-6 rounded-lg cursor-not-allowed"
                >
                  Stay Tuned
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center">
        <button
          onClick={() => setShowLeaderboard(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200 font-playfair-display shadow-lg"
        >
          View Leaderboard
        </button>
      </div>

      <Leaderboard 
        visible={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  );
}
