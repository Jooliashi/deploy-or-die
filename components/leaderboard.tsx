'use client';

import { useEffect, useState } from 'react';

interface ScoreEntry {
  roomId: string;
  players: string[];
  peakValuation: number;
  level: number;
  createdAt: number;
  endedAt: number;
  submittedAt: number;
}

function formatValuation(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Leaderboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setScores(data.scores ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="leaderboard">
        <h3 className="leaderboard-title">Leaderboard</h3>
        <div className="leaderboard-loading">Loading scores...</div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="leaderboard">
        <h3 className="leaderboard-title">Leaderboard</h3>
        <div className="leaderboard-empty">No games played yet. Be the first!</div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h3 className="leaderboard-title">Leaderboard</h3>
      <div className="leaderboard-list">
        {scores.slice(0, 20).map((entry, i) => (
          <div key={entry.roomId} className="leaderboard-entry">
            <span className="leaderboard-rank">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <div className="leaderboard-info">
              <span className="leaderboard-players">
                {entry.players.join(' & ')}
              </span>
              <span className="leaderboard-meta">
                Level {entry.level} · {timeAgo(entry.submittedAt)}
              </span>
            </div>
            <span className="leaderboard-score">
              {formatValuation(entry.peakValuation)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
