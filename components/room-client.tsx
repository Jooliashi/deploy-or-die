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
  database: '◉',
  success: '✦',
};

const promptGlyph: Record<string, string> = {
  queued: '!',
  active: '>',
  resolved: '+',
  failed: 'x',
};

type ControlSkin =
  | 'browser'
  | 'toggle'
  | 'flag'
  | 'chart'
  | 'terminal'
  | 'switch'
  | 'globe'
  | 'cache'
  | 'database'
  | 'kv'
  | 'blob'
  | 'queue'
  | 'social'
  | 'reply'
  | 'vendor'
  | 'broadcast';

function compactLabel(control: string) {
  return control
    .replace('Rebuild ', '')
    .replace('Replay ', '')
    .replace('Shift ', '')
    .replace('Patch ', '')
    .replace('Reconnect ', '')
    .replace('Override ', '')
    .replace('Sync ', '')
    .replace('Purge ', '')
    .replace('Restore ', '')
    .replace('Promote ', '')
    .replace('Backfill ', '')
    .replace('Post ', '')
    .replace('Reply to ', '')
    .replace('Ping ', '')
    .replace('Send ', '')
    .replace('Challenge ', '')
    .replace('Drain ', '')
    .replace('Preview Deployment', 'PREVIEW')
    .replace('Toolbar Comments', 'COMMENTS')
    .replace('Flags Explorer', 'FLAGS')
    .replace('Web Analytics', 'ANALYTICS')
    .replace('Edge Config', 'CONFIG')
    .replace('Cron Run', 'CRON')
    .replace('Function Region', 'REGION')
    .replace('Runtime Cache', 'CACHE')
    .replace('Postgres Replica', 'POSTGRES')
    .replace('KV Drift', 'KV')
    .replace('Blob Asset', 'BLOB')
    .replace('Session Store', 'SESSION')
    .replace('Launch Thread', 'LAUNCH')
    .replace('Enterprise Ticket', 'TICKET')
    .replace('Integration Vendor', 'VENDOR')
    .replace('How-To Blast', 'HOWTO');
}

function getControlSkin(control: string): ControlSkin {
  switch (control) {
    case 'Rebuild Preview Deployment':
      return 'browser';
    case 'Patch Toolbar Comments':
      return 'toggle';
    case 'Override Flags Explorer':
      return 'flag';
    case 'Reconnect Web Analytics':
      return 'chart';
    case 'Sync Edge Config':
      return 'terminal';
    case 'Replay Cron Run':
      return 'switch';
    case 'Shift Function Region':
      return 'globe';
    case 'Purge Runtime Cache':
      return 'cache';
    case 'Promote Postgres Replica':
      return 'database';
    case 'Purge KV Drift':
      return 'kv';
    case 'Restore Blob Asset':
      return 'blob';
    case 'Backfill Session Store':
      return 'queue';
    case 'Post Launch Thread':
      return 'social';
    case 'Reply to Enterprise Ticket':
      return 'reply';
    case 'Ping Integration Vendor':
      return 'vendor';
    default:
      return 'broadcast';
  }
}

function getControlCodes(skin: ControlSkin): [string, string] {
  switch (skin) {
    case 'browser':
      return ['PV', '01'];
    case 'toggle':
      return ['CM', '02'];
    case 'flag':
      return ['FG', '03'];
    case 'chart':
      return ['AN', '04'];
    case 'terminal':
      return ['EC', '05'];
    case 'switch':
      return ['CR', '06'];
    case 'globe':
      return ['RG', '07'];
    case 'cache':
      return ['RC', '08'];
    case 'database':
      return ['PG', '09'];
    case 'kv':
      return ['KV', '10'];
    case 'blob':
      return ['BL', '11'];
    case 'queue':
      return ['SS', '12'];
    case 'social':
      return ['TW', '13'];
    case 'reply':
      return ['CS', '14'];
    case 'vendor':
      return ['VN', '15'];
    default:
      return ['HT', '16'];
  }
}

function ControlFace({ skin, label, hasPrompt }: { skin: ControlSkin; label: string; hasPrompt: boolean }) {
  const [codeA, codeB] = getControlCodes(skin);

  switch (skin) {
    case 'browser':
      return (
        <div className="control-face control-face-browser">
          <div className="browser-top">
            <span />
            <span />
            <span />
          </div>
          <div className="browser-window" />
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'toggle':
      return (
        <div className="control-face control-face-toggle">
          <div className={`toggle-pill${hasPrompt ? ' on' : ''}`}>
            <span />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'flag':
      return (
        <div className="control-face control-face-flag">
          <div className="flag-columns">
            <span />
            <span className={hasPrompt ? 'active' : ''} />
            <span />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'chart':
      return (
        <div className="control-face control-face-chart">
          <div className="chart-bars">
            <span />
            <span />
            <span className={hasPrompt ? 'active' : ''} />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'terminal':
      return (
        <div className="control-face control-face-terminal">
          <div className="terminal-screen">&gt; sync env</div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'switch':
      return (
        <div className="control-face control-face-switch">
          <div className={`rocker${hasPrompt ? ' active' : ''}`} />
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'globe':
      return (
        <div className="control-face control-face-globe">
          <div className={`globe-icon${hasPrompt ? ' active' : ''}`}>
            <span className="globe-ring" />
            <span className="globe-lat" />
            <span className="globe-lat bottom" />
            <span className="globe-meridian left" />
            <span className="globe-meridian right" />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'cache':
      return (
        <div className="control-face control-face-cache">
          <div className="dial-ring">
            <div className="dial-core" />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'database':
      return (
        <div className="control-face control-face-database">
          <div className="db-stack">
            <span />
            <span />
            <span className={hasPrompt ? 'active' : ''} />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'kv':
      return (
        <div className="control-face control-face-kv">
          <div className="kv-grid">
            <span className={hasPrompt ? 'active' : ''} />
            <span />
            <span />
            <span />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'blob':
      return (
        <div className="control-face control-face-blob">
          <div className="blob-shape" />
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'queue':
      return (
        <div className="control-face control-face-queue">
          <div className="queue-lines">
            <span />
            <span className={hasPrompt ? 'active' : ''} />
            <span />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'social':
      return (
        <div className="control-face control-face-social">
          <div className="social-burst">@</div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'reply':
      return (
        <div className="control-face control-face-reply">
          <div className="reply-bubble" />
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'vendor':
      return (
        <div className="control-face control-face-vendor">
          <div className="vendor-nodes">
            <span />
            <span className={hasPrompt ? 'active' : ''} />
            <span />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    default:
      return (
        <div className="control-face control-face-broadcast">
          <div className="broadcast-cone" />
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
  }
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

  // "Started" prompts have createdAt > 0 (activated by the host).
  // Prompts with createdAt = 0 are waiting in the queue.
  const startedPrompts = state.deploy.prompts.filter(
    p => (p.status === 'queued' || p.status === 'active') && p.createdAt > 0,
  );

  // Alerts: started prompts assigned to THIS player.
  const myAlerts = startedPrompts
    .filter(p => p.assignedTo === playerId)
    .slice(0, MAX_VISIBLE_ALERTS);

  // Buttons respond to any started prompt whose actionLabel matches the
  // player's controls, regardless of who the alert was assigned to.
  const actionablePrompts = startedPrompts;

  // Count only started prompts for the display.
  const allLiveCount = startedPrompts.length;
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
    <main className={`panel room-shell station-shell role-theme role-${role.id}`}>
      <section className="top-rail">
        <div className={`pilot-card pilot-card-${role.id}`}>
          <div className="pilot-row">
            <span className="eyebrow">Room {displayCode}</span>
            <span className={`role-glyph role-glyph-${role.id}`} aria-hidden="true">
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
          <div className="count-chip">{allLiveCount} live tasks</div>
        </div>
      </section>

      <div className="station-body stack">
        <section className="prompt-overlay">
          {myAlerts.length > 0 ? (
            myAlerts.map(prompt => {
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
            })
          ) : (
            <div className="prompt-banner prompt-empty">
              <div className="prompt-topline">
                <div className="prompt-icon status-queued">...</div>
                <div className="prompt-meta">
                  <span>Standby</span>
                </div>
              </div>
              <h3 className="prompt-title">Waiting for next task...</h3>
            </div>
          )}
        </section>

        <section className={`station stack station-${role.id}`}>
          <div className="console-head">
            <span className="eyebrow">Station Controls</span>
            <h2 style={{ marginTop: 8 }}>{role.name} Console</h2>
          </div>
          <div className="command-board">
            {controls.map(control => {
              const prompt = actionablePrompts.find(p => p.actionLabel === control);
              const isActive = selectedPrompt?.id === prompt?.id;
              const hasPrompt = !!prompt;
              const skin = getControlSkin(control);

              return (
                <div
                  className={[
                    'panel-muted button-card',
                    `button-card-${role.id}`,
                    isActive ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  key={control}
                >
                  <button
                    className={`control-button control-button-${role.id} control-skin-${skin}${hasPrompt ? ' ready' : ''}`}
                    disabled={!hasPrompt}
                    onClick={() => {
                      if (!prompt) return;
                      adapter.claimPrompt(prompt.id, playerId);
                      setSelectedPrompt(prompt);
                    }}
                    type="button"
                  >
                    <ControlFace skin={skin} label={compactLabel(control)} hasPrompt={hasPrompt} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {selectedPrompt ? (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div className="mini-backdrop" onClick={handleBackdropClick}>
            <section className={`mini-stage mini-stage-${role.id}`} ref={miniStageRef}>
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
