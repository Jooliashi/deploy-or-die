'use client';

import { useCallback, useState } from 'react';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

interface WaitingRoomProps {
  roomCode: string;
  playerId: string;
  playerName: string;
  state: SharedRoomState;
  adapter: MultiplayerAdapter;
}

const MIN_PLAYERS = 2;

const roleGlyph: Record<string, string> = {
  frontend: '◫',
  backend: '◎',
  database: '◉',
  success: '✦',
};

export function WaitingRoom({ roomCode, playerId, playerName, state, adapter }: WaitingRoomProps) {
  const playerCount = state.players.length;
  const readyCount = state.players.filter(p => p.ready).length;
  const meReady = state.players.find(p => p.id === playerId)?.ready ?? false;
  const enoughPlayers = playerCount >= MIN_PLAYERS;
  const allReady = enoughPlayers && readyCount === playerCount;

  const [copied, setCopied] = useState(false);

  const copyRoomLink = useCallback(() => {
    const url = `${window.location.origin}/?join=${encodeURIComponent(roomCode)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomCode]);

  const displayCode = roomCode.length > 16
    ? `${roomCode.slice(0, 8)}...${roomCode.slice(-6)}`
    : roomCode;

  return (
    <main className="panel room-shell waiting-shell">
      <div className="waiting-content">
        <div className="waiting-header">
          <span className="eyebrow">Waiting Room</span>
          <h1 className="waiting-title">Room</h1>
          <p className="waiting-sub">
            Share the link below with teammates. The game starts
            automatically once everyone is ready.
          </p>
        </div>

        <button
          className="panel-muted waiting-room-id"
          type="button"
          onClick={copyRoomLink}
          title="Click to copy join link"
        >
          <span className="waiting-room-id-text">{displayCode}</span>
          <span className="tag">{copied ? 'Link copied!' : 'Copy invite link'}</span>
        </button>

        <div className="waiting-players">
          <div className="waiting-section-head">
            <span className="stat-label">
              Players ({readyCount}/{playerCount} ready
              {playerCount < MIN_PLAYERS ? ` — need ${MIN_PLAYERS} minimum` : ''})
            </span>
          </div>
          <div className="player-list">
            {state.players.length === 0 ? (
              <div className="panel-muted player-slot empty">
                <span className="text-muted">No players yet</span>
              </div>
            ) : (
              state.players.map(player => (
                <div
                  className={`panel-muted player-slot${player.ready ? ' player-ready' : ''}`}
                  key={player.id}
                >
                  <span
                    className={`signal ${player.ready ? 'good' : 'idle'}`}
                    aria-label={player.ready ? 'Ready' : 'Not ready'}
                  />
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="tag">{player.role}</span>
                  </div>
                  {player.id === playerId && <span className="tag you-tag">you</span>}
                  <span className={`tag ${player.ready ? 'ready-tag' : ''}`}>
                    {player.ready ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="waiting-actions">
          {allReady ? (
            <div className="callout panel-muted" style={{ borderColor: 'var(--success)' }}>
              All players ready — launching...
            </div>
          ) : !enoughPlayers ? (
            <div className="callout panel-muted">
              Need at least {MIN_PLAYERS} players to start.
              {` Waiting for ${MIN_PLAYERS - playerCount} more...`}
            </div>
          ) : (
            <div className="callout panel-muted">
              {readyCount}/{playerCount} players ready. Waiting for everyone...
            </div>
          )}
          <button
            className={`button waiting-launch${meReady ? ' waiting-ready-active' : ''}`}
            onClick={() => adapter.toggleReady(playerId)}
            type="button"
          >
            {meReady ? 'Not Ready' : 'Ready Up'}
          </button>
        </div>
      </div>
    </main>
  );
}
