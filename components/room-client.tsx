'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniGamePanel } from '@/components/minigames';
import { Sparkline } from '@/components/sparkline';
import { WaitingRoom } from '@/components/waiting-room';
import { roles } from '@/lib/game/data';
import type { PromptDefinition } from '@/lib/game/types';
import {
  createJazzRoom,
  DEMO_ROOM_CODE,
  JazzMultiplayerAdapter,
  loadJazzRoom,
  MAX_VISIBLE_ALERTS,
} from '@/lib/multiplayer/jazz-adapter';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

interface RoomClientProps {
  roomCode: string;
  playerName: string;
  /** Whether this client created the room and should run the game tick loop. */
  isHost: boolean;
}

const roleGlyph: Record<string, string> = {
  frontend: '◫',
  backend: '◎',
  infra: '▣',
};

const promptGlyph: Record<string, string> = {
  queued: '!',
  active: '>',
  resolved: '+',
  failed: 'x',
};

function compactLabel(control: string) {
  return control
    .replace('Client ', '')
    .replace('Deploy ', '')
    .replace('Restore ', '')
    .replace('Repair ', '')
    .replace('Rebuild ', '')
    .replace('Restart ', '')
    .replace('Replay ', '')
    .replace('Reopen ', '')
    .replace('Shift ', '')
    .replace('Patch ', '')
    .replace('Throttle ', '')
    .replace('Edge ', '')
    .replace('Region ', '')
    .replace('Worker ', 'WRK ')
    .replace('Route ', 'RTE ')
    .replace('Traffic ', 'TRF ')
    .replace('Labels', 'LBL')
    .replace('Bundle', 'BNDL')
    .replace('Graph', 'MAP')
    .replace('Weight', 'WT')
    .replace('Pipeline', 'PIPE');
}

function formatValuation(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function getPlayerControls(roleId: string): string[] {
  const own = roles.find(r => r.id === roleId);
  const others = roles.filter(r => r.id !== roleId);
  const extra = others.flatMap(r => r.controls).sort(() => Math.random() - 0.5).slice(0, 2);
  return [...(own?.controls ?? []), ...extra];
}

export function RoomClient({ roomCode, playerName, isHost }: RoomClientProps) {
  const adapterRef = useRef<JazzMultiplayerAdapter | null>(null);
  const isDemo = roomCode === DEMO_ROOM_CODE;

  // Stable unique player ID for this browser session.
  const playerId = useRef(`p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const demoRoleId = isDemo ? roles[0].id : undefined;
  const playerControls = useMemo(
    () => (demoRoleId ? getPlayerControls(demoRoleId) : undefined),
    [demoRoleId],
  );

  const [adapter, setAdapter] = useState<MultiplayerAdapter | null>(() => {
    if (isDemo) {
      const { room } = createJazzRoom({ roomCode, isDemo: true, playerControls });
      const a = new JazzMultiplayerAdapter(room, {
        playerControls,
        isHost: true, // demo is always host
      });
      adapterRef.current = a;
      return a;
    }
    return null;
  });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<SharedRoomState | null>(
    adapter?.getInitialState() ?? null,
  );
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDefinition | null>(null);
  const [now, setNow] = useState(Date.now());
  const miniStageRef = useRef<HTMLElement>(null);

  // Derive role and controls unconditionally (before any early returns) to
  // satisfy the Rules of Hooks.
  const currentRole = state?.players.find(p => p.id === playerId)?.role ?? 'frontend';
  const role = roles.find(r => r.id === currentRole) ?? roles[0];
  const controls = useMemo(
    () => playerControls ?? getPlayerControls(currentRole),
    [playerControls, currentRole],
  );

  // Async load for multiplayer rooms.
  useEffect(() => {
    if (isDemo || adapter) return;
    let cancelled = false;
    (async () => {
      const room = await loadJazzRoom(roomCode);
      if (cancelled) return;
      if (!room) {
        setLoadError('Room not found. The code may be invalid or the room may have expired.');
        return;
      }
      const a = new JazzMultiplayerAdapter(room, { isHost });
      adapterRef.current = a;
      setAdapter(a);
    })();
    return () => { cancelled = true; };
  }, [isDemo, roomCode, adapter]);

  // Tick every second for live countdowns.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Join the room and subscribe to state.
  useEffect(() => {
    if (!adapter) return;
    adapter.addPlayer(playerId, playerName);
    const unsubscribe = adapter.subscribe(setState);
    return () => {
      unsubscribe();
      adapter.removePlayer(playerId);
      adapterRef.current?.dispose();
    };
  }, [adapter, playerId, playerName]);

  // Close mini-game on Escape.
  const closeMiniGame = useCallback(() => setSelectedPrompt(null), []);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMiniGame();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeMiniGame]);

  // Close mini-game on click outside.
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (miniStageRef.current && !miniStageRef.current.contains(e.target as Node)) {
      closeMiniGame();
    }
  }, [closeMiniGame]);

  // ── Render gates (no hooks below this point) ──────────────

  // Loading / error state.
  if (!adapter || !state) {
    return (
      <main className="panel room-shell game-over-shell">
        <div className="game-over-content">
          {loadError ? (
            <>
              <span className="eyebrow">Error</span>
              <h2>{loadError}</h2>
              <div className="cta-row" style={{ justifyContent: 'center' }}>
                <a className="button" href="/">Back to Lobby</a>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">Connecting</span>
              <h2>Joining room...</h2>
              <p className="game-over-sub">Syncing with Jazz Cloud</p>
            </>
          )}
        </div>
      </main>
    );
  }

  // Waiting room.
  if (!state.gameStarted) {
    return (
      <WaitingRoom
        roomCode={roomCode}
        playerId={playerId}
        playerName={playerName}
        state={state}
        adapter={adapter}
      />
    );
  }

  // All live prompts in the shared room.
  const allLivePrompts = state.deploy.prompts.filter(
    p => p.status === 'queued' || p.status === 'active',
  );

  // Alerts: prompts assigned to THIS player (they read them out loud).
  const myAlerts = allLivePrompts
    .filter(p => p.assignedTo === playerId)
    .slice(0, MAX_VISIBLE_ALERTS);

  // Buttons respond to any live prompt whose actionLabel matches the player's
  // controls, regardless of who the alert was assigned to.
  const actionablePrompts = allLivePrompts;
  const { valuation, valuationHistory, bankrupt } = state.deploy;
  const prevVal = valuationHistory.length >= 2 ? valuationHistory[valuationHistory.length - 2] : valuation;
  const trending = valuation >= prevVal ? 'up' : 'down';

  // Game over.
  if (bankrupt) {
    return (
      <main className="panel room-shell game-over-shell">
        <div className="game-over-content">
          <span className="eyebrow">Game Over</span>
          <h1 className="game-over-title">BANKRUPT</h1>
          <p className="game-over-sub">
            The company valuation hit $0. The board has called an emergency meeting.
            All engineers have been let go.
          </p>
          <div className="game-over-chart">
            <Sparkline data={valuationHistory} height={80} />
          </div>
          <div className="cta-row" style={{ justifyContent: 'center' }}>
            <a className="button" href="/">Back to Lobby</a>
          </div>
        </div>
      </main>
    );
  }

  const displayCode = roomCode.length > 12
    ? `${roomCode.slice(0, 6)}...${roomCode.slice(-4)}`
    : roomCode;

  return (
    <main className="panel room-shell station-shell">
      <section className="top-rail">
        <div className="pilot-card">
          <div className="pilot-row">
            <span className="eyebrow">Room {displayCode}</span>
            <span className="role-glyph" aria-hidden="true">
              {roleGlyph[role.id]}
            </span>
          </div>
          <h2 style={{ marginTop: 8 }}>{role.name}</h2>
          <div className="tag-row">
            <span className="tag">{playerName}</span>
            <span className="tag">station live</span>
          </div>
        </div>

        <div className="panel-muted stat-card compact-stat valuation-card">
          <div className="status-head">
            <div className={`signal ${trending === 'up' ? 'good' : 'danger'}`} />
            <div className="stat-label">Valuation</div>
          </div>
          <div className={`stat-value valuation-value ${trending}`}>
            {formatValuation(valuation)}
          </div>
          <Sparkline data={valuationHistory} height={36} />
        </div>

        <div className="panel-muted stat-card compact-stat">
          <div className="status-head">
            <div className="signal warn" />
            <div className="stat-label">Time</div>
          </div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {Math.floor(state.deploy.timeRemainingSeconds / 60)}:{String(state.deploy.timeRemainingSeconds % 60).padStart(2, '0')}
          </div>
          <div className="count-chip">{allLivePrompts.length} live tasks</div>
        </div>
      </section>

      <div className="station-body stack">
        <section className="prompt-overlay">
          {myAlerts.map(prompt => {
            const remaining = Math.max(
              0,
              prompt.timerSeconds - Math.floor((now - prompt.createdAt) / 1000),
            );
            const urgent = remaining <= 5;

            return (
              <div
                className={[
                  'prompt-banner',
                  selectedPrompt?.id === prompt.id ? 'active' : '',
                  urgent ? 'urgent' : '',
                ].filter(Boolean).join(' ')}
                key={prompt.id}
              >
                <div className="prompt-topline">
                  <div className={`prompt-icon status-${prompt.status}`}>
                    {promptGlyph[prompt.status]}
                  </div>
                  <div className="prompt-meta">
                    <span>{prompt.actionLabel}</span>
                    <span className={`prompt-timer${urgent ? ' timer-urgent' : ''}`}>
                      {remaining}s
                    </span>
                  </div>
                </div>
                <h3 className="prompt-title">{prompt.label}</h3>
                <div className="prompt-timer-bar">
                  <span style={{ width: `${(remaining / prompt.timerSeconds) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="station stack">
          <div className="console-head">
            <span className="eyebrow">Station Controls</span>
            <h2 style={{ marginTop: 8 }}>{role.name} Console</h2>
          </div>
          <div className="command-board">
            {controls.map(control => {
              const prompt = actionablePrompts.find(p => p.actionLabel === control);
              const isActive = selectedPrompt?.id === prompt?.id;
              const hasPrompt = !!prompt;

              return (
                <div
                  className={[
                    'panel-muted button-card',
                    isActive ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  key={control}
                >
                  <div className="button-deck">
                    <div className="button-panel">
                      <div className={`signal ${hasPrompt ? 'warn' : 'idle'}`} />
                      <div className="button-caption">{compactLabel(control)}</div>
                    </div>
                    <div className="toggle-row" aria-hidden="true">
                      <span />
                      <span className={hasPrompt ? 'active' : ''} />
                      <span />
                    </div>
                  </div>
                  <button
                    className={`control-button${hasPrompt ? ' ready' : ''}`}
                    disabled={!hasPrompt}
                    onClick={() => {
                      if (!prompt) return;
                      adapter.claimPrompt(prompt.id, playerId);
                      setSelectedPrompt(prompt);
                    }}
                    type="button"
                  >
                    <span className="control-core" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {selectedPrompt ? (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div className="mini-backdrop" onClick={handleBackdropClick}>
            <section className="mini-stage" ref={miniStageRef}>
              <div>
                <span className="eyebrow">Mini-Game</span>
                <h3 style={{ marginTop: 8 }}>{selectedPrompt.actionLabel}</h3>
              </div>
              <MiniGamePanel
                miniGameId={selectedPrompt.miniGameId}
                onResolve={() => {
                  adapter.resolvePrompt(selectedPrompt.id);
                  setSelectedPrompt(null);
                }}
                onFail={() => {
                  adapter.failPrompt(selectedPrompt.id);
                  setSelectedPrompt(null);
                }}
              />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
