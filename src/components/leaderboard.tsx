'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Score {
  name: string;
  score: number;
  height: number;
  timestamp: string;
}

interface LeaderboardProps {
  visible: boolean;
  onClose?: () => void;
}

export default function Leaderboard({ visible, onClose }: LeaderboardProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'height'>('score');

  useEffect(() => {
    if (visible) {
      fetchScores();
    }
  }, [visible]);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scores');
      const data = await response.json();
      setScores(data.scores);
      setError(null);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error fetching scores:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedScores = scores
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 10);

  // Split scores into two columns
  const leftColumnScores = sortedScores.slice(0, 5);
  const rightColumnScores = sortedScores.slice(5);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="sticky top-0 z-10 bg-card border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Leaderboard</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'score' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSortBy('score')}
              >
                Score
              </Button>
              <Button
                variant={sortBy === 'height' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('height')}
              >
                Height
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : error ? (
            <div className="text-destructive text-center py-4">{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-2">
                {leftColumnScores.map((score, index) => (
                  <div
                    key={`${score.name}-${score.timestamp}`}
                    className="flex justify-between items-center p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-6">{index + 1}.</span>
                      <div>
                        <div className="font-medium">{score.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Height: {score.height}m
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-primary">{score.score}</div>
                  </div>
                ))}
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {rightColumnScores.map((score, index) => (
                  <div
                    key={`${score.name}-${score.timestamp}`}
                    className="flex justify-between items-center p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-6">{index + 6}.</span>
                      <div>
                        <div className="font-medium">{score.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Height: {score.height}m
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-primary">{score.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
