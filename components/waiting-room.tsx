'use client';

import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

interface WaitingRoomProps {
  roomCode: string;
  playerName: string;
  state: SharedRoomState;
  adapter: MultiplayerAdapter;
}

const MIN_PLAYERS = 2;

const roleGlyph: Record<string, string> = {
  frontend: '◫',
  backend: '◎',
  infra: '▣',
};

export function WaitingRoom({ roomCode, playerName, state, adapter }: WaitingRoomProps) {
  const playerCount = state.players.length;
  const canStart = playerCount >= MIN_PLAYERS;

  return (
    <main className="panel room-shell waiting-shell">
      <div className="waiting-content">
        <div className="waiting-header">
          <span className="eyebrow">Waiting Room</span>
          <h1 className="waiting-title">Room {roomCode}</h1>
          <p className="waiting-sub">
            Share this room code with teammates. The game starts when the host
            hits launch.
          </p>
        </div>

        <div className="waiting-players">
          <div className="waiting-section-head">
            <span className="stat-label">Players ({playerCount}/{MIN_PLAYERS} minimum)</span>
          </div>
          <div className="player-list">
            {state.players.length === 0 ? (
              <div className="panel-muted player-slot empty">
                <span className="text-muted">No players yet</span>
              </div>
            ) : (
              state.players.map(player => (
                <div className="panel-muted player-slot" key={player.id}>
                  <span className="role-glyph" aria-hidden="true">
                    {roleGlyph[player.role] ?? '?'}
                  </span>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="tag">{player.role}</span>
                  </div>
                  {player.name === playerName && <span className="tag you-tag">you</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="waiting-actions">
          {!canStart && (
            <div className="callout panel-muted">
              Need at least {MIN_PLAYERS} players to launch.
              {MIN_PLAYERS - playerCount > 0 &&
                ` Waiting for ${MIN_PLAYERS - playerCount} more...`}
            </div>
          )}
          <button
            className={`button waiting-launch${canStart ? '' : ' disabled'}`}
            disabled={!canStart}
            onClick={() => adapter.startGame()}
            type="button"
          >
            {canStart ? 'Launch Deploy' : `Waiting for players...`}
          </button>
        </div>
      </div>
    </main>
  );
}
