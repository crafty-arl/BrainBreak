import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Add interface for score structure
interface Score {
  score: number;
  // Add other score properties if they exist
}

export async function POST(request: Request) {
  try {
    const score = await request.json();
    const filePath = path.join(process.cwd(), 'src/app/data/leaderboard.json');
    
    // Read current scores
    const data = await fs.readFile(filePath, 'utf-8');
    const leaderboard = JSON.parse(data);
    
    // Add new score
    leaderboard.scores.push(score);
    
    // Sort by score (highest first)
    leaderboard.scores.sort((a: Score, b: Score) => b.score - a.score);
    
    // Keep top 100 scores
    leaderboard.scores = leaderboard.scores.slice(0, 100);
    
    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(leaderboard, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/app/data/leaderboard.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const leaderboard = JSON.parse(fileContent);
    
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error reading scores:', error);
    return NextResponse.json({ error: 'Failed to read scores' }, { status: 500 });
  }
}
