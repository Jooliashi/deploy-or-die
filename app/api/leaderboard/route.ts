import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

const LEADERBOARD_KEY = 'leaderboard:scores';
const SUBMITTED_KEY = 'leaderboard:submitted';
const MAX_ENTRIES = 100;
const STARTING_VALUATION = 1_000_000;
const LEVEL_DURATION_SECONDS = 120;
const RESOLVE_DELTA = 50_000;

interface ScoreEntry {
  roomId: string;
  players: string[];
  peakValuation: number;
  level: number;
  createdAt: number;
  endedAt: number;
  submittedAt: number;
}

// POST — submit a score
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, players, peakValuation, level, createdAt, endedAt } = body;

    // Basic validation.
    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }
    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'Missing players' }, { status: 400 });
    }
    if (typeof peakValuation !== 'number' || peakValuation < 0) {
      return NextResponse.json({ error: 'Invalid peakValuation' }, { status: 400 });
    }
    if (typeof level !== 'number' || level < 1) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }
    if (typeof createdAt !== 'number' || typeof endedAt !== 'number') {
      return NextResponse.json({ error: 'Invalid timestamps' }, { status: 400 });
    }

    // Check if this room already submitted.
    const alreadySubmitted = await redis.sismember(SUBMITTED_KEY, roomId);
    if (alreadySubmitted) {
      return NextResponse.json({ error: 'Score already submitted for this room' }, { status: 409 });
    }

    // Validation: check timing plausibility.
    // Each level is ~120 seconds. The reported level can't exceed what's possible
    // given the elapsed time, with some buffer for briefing screens.
    const elapsedMs = endedAt - createdAt;
    if (elapsedMs < 0) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
    }
    const maxPossibleLevels = Math.floor(elapsedMs / (LEVEL_DURATION_SECONDS * 1000)) + 2; // +2 for current partial + briefing
    if (level > maxPossibleLevels) {
      return NextResponse.json({ error: 'Level exceeds time-possible maximum' }, { status: 400 });
    }

    // Validation: peak valuation can't exceed starting + (generous upper bound of resolves).
    // Assume max ~2 resolves per second per player (generous).
    const maxResolves = (elapsedMs / 1000) * 2 * players.length;
    const maxPossibleValuation = STARTING_VALUATION + maxResolves * RESOLVE_DELTA;
    if (peakValuation > maxPossibleValuation) {
      return NextResponse.json({ error: 'Peak valuation exceeds possible maximum' }, { status: 400 });
    }

    const entry: ScoreEntry = {
      roomId,
      players: players.slice(0, 10).map((p: unknown) => String(p).slice(0, 50)),
      peakValuation,
      level,
      createdAt,
      endedAt,
      submittedAt: Date.now(),
    };

    // Mark as submitted.
    await redis.sadd(SUBMITTED_KEY, roomId);

    // Add to sorted set (score = peakValuation for ranking, higher is better).
    await redis.zadd(LEADERBOARD_KEY, {
      score: peakValuation,
      member: JSON.stringify(entry),
    });

    // Trim to top MAX_ENTRIES (remove lowest scores).
    const totalEntries = await redis.zcard(LEADERBOARD_KEY);
    if (totalEntries > MAX_ENTRIES) {
      await redis.zremrangebyrank(LEADERBOARD_KEY, 0, totalEntries - MAX_ENTRIES - 1);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET — fetch top scores
export async function GET() {
  try {
    // Get top entries, highest score first.
    const entries = await redis.zrange<string[]>(LEADERBOARD_KEY, 0, 49, { rev: true });

    const scores = entries.map(entry => {
      try {
        return typeof entry === 'string' ? JSON.parse(entry) as ScoreEntry : entry;
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ scores });
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json({ scores: [] });
  }
}
