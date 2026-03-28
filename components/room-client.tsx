'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DebugMenu } from '@/components/debug-menu';
import { hasMiniGame, MiniGamePanel } from '@/components/minigames';
import { Sparkline } from '@/components/sparkline';
import { WaitingRoom } from '@/components/waiting-room';
import { getLevelConfig, roles } from '@/lib/game/data';
import type { ControlDefinition, PromptDefinition } from '@/lib/game/types';
import { Group } from 'jazz-tools';
import {
  createJazzRoom,
  DEMO_BUTTON_COUNT,
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
  | 'configs'
  | 'statuspage'
  | 'terminal'
  | 'switch'
  | 'function'
  | 'cache'
  | 'clickhouse'
  | 'dynamodb'
  | 'cosmosdb'
  | 'tinybird'
  | 'social'
  | 'reply'
  | 'vendor'
  | 'it'
  | 'kubernetes'
  | 'networking'
  | 'billing'
  | 'security'
  | 'broadcast';

/** Display label for a control button. The labels from data.ts are already
 *  short enough to use directly. */
function compactLabel(control: string) {
  return control;
}

function formatSubControlLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getControlSkin(control: string): ControlSkin {
  switch (control) {
    case 'Instant Rollback':
      return 'browser';
    case 'UI':
      return 'toggle';
    case 'Flags':
      return 'flag';
    case 'Configs':
      return 'configs';
    case 'Edge Config':
      return 'terminal';
    case 'Workflow':
      return 'switch';
    case 'Vercel Function':
      return 'function';
    case 'Cache':
      return 'cache';
    case 'ClickHouse':
      return 'clickhouse';
    case 'DynamoDB':
      return 'dynamodb';
    case 'Cosmos DB':
      return 'cosmosdb';
    case 'Tinybird':
      return 'tinybird';
    case 'Social Media':
      return 'social';
    case 'Customer Ticket':
      return 'reply';
    case 'Vendor':
      return 'vendor';
    case 'Status Page':
      return 'statuspage';
    case 'IT':
      return 'it';
    case 'Kubernetes':
      return 'kubernetes';
    case 'Networking':
      return 'networking';
    case 'Billing':
      return 'billing';
    case 'Security':
      return 'security';
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
    case 'configs':
      return ['CF', '04'];
    case 'statuspage':
      return ['SP', '18'];
    case 'terminal':
      return ['EC', '05'];
    case 'switch':
      return ['CR', '06'];
    case 'function':
      return ['FN', '07'];
    case 'cache':
      return ['RC', '08'];
    case 'clickhouse':
      return ['PG', '09'];
    case 'dynamodb':
      return ['KV', '10'];
    case 'cosmosdb':
      return ['BL', '11'];
    case 'tinybird':
      return ['SS', '12'];
    case 'social':
      return ['TW', '13'];
    case 'reply':
      return ['CS', '14'];
    case 'vendor':
      return ['VN', '15'];
    case 'it':
      return ['IT', '17'];
    case 'kubernetes':
      return ['K8', '19'];
    case 'networking':
      return ['NW', '20'];
    case 'billing':
      return ['BL', '21'];
    case 'security':
      return ['SC', '22'];
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
    case 'configs':
      return (
        <div className="control-face control-face-configs">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <rect x="18" y="20" width="84" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="42" cy="26" r="8" fill="currentColor" />
            <rect x="18" y="44" width="84" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="78" cy="50" r="8" fill="currentColor" />
            <rect x="18" y="68" width="84" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="58" cy="74" r="8" fill="currentColor" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'statuspage':
      return (
        <div className="control-face control-face-statuspage">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <path
              d="M12 56h18l10-22 16 40 14-28 10 10h18"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="56" r="5" fill="currentColor" />
            <circle cx="98" cy="56" r="5" fill="currentColor" />
          </svg>
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
    case 'function':
      return (
        <div className="control-face control-face-function">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <path d="M22 28h52" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <path d="M54 28c-10 0-18 8-18 18s8 18 18 18h44" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <path d="M76 58l20 0" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <path d="M84 18l18 10-18 10" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
    case 'clickhouse':
      return (
        <div className="control-face control-face-clickhouse">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <rect x="18" y="16" width="16" height="60" rx="4" fill="#F6C549" />
            <rect x="42" y="34" width="16" height="42" rx="4" fill="#FF5E57" />
            <rect x="66" y="34" width="16" height="42" rx="4" fill="#F6C549" />
            <rect x="90" y="16" width="16" height="60" rx="4" fill="#FF5E57" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'dynamodb':
      return (
        <div className="control-face control-face-dynamodb">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <ellipse cx="60" cy="22" rx="28" ry="10" fill="#8FD3FF" opacity="0.25" stroke="#8FD3FF" strokeWidth="4" />
            <path d="M32 22v38c0 6 12 12 28 12s28-6 28-12V22" fill="rgba(143,211,255,0.12)" stroke="#8FD3FF" strokeWidth="4" />
            <ellipse cx="60" cy="41" rx="28" ry="10" fill="none" stroke="#8FD3FF" strokeWidth="4" />
            <ellipse cx="60" cy="60" rx="28" ry="10" fill="none" stroke="#8FD3FF" strokeWidth="4" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'cosmosdb':
      return (
        <div className="control-face control-face-cosmosdb">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <circle cx="58" cy="48" r="18" fill="#3EA8FF" />
            <ellipse
              cx="58"
              cy="48"
              rx="34"
              ry="12"
              fill="none"
              stroke="#9DD8FF"
              strokeWidth="4"
              transform="rotate(-20 58 48)"
            />
            <circle cx="88" cy="22" r="4" fill="#E6F7FF" />
            <circle cx="28" cy="70" r="3" fill="#E6F7FF" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'tinybird':
      return (
        <div className="control-face control-face-tinybird">
          <div className={`tinybird-mark${hasPrompt ? ' active' : ''}`}>
            <span className="tb-body" />
            <span className="tb-wing" />
            <span className="tb-beak" />
            <span className="tb-eye" />
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
    case 'it':
      return (
        <div className="control-face control-face-it">
          <div className={`it-console${hasPrompt ? ' active' : ''}`}>
            <span className="it-screen" />
            <span className="it-base" />
            <span className="it-badge" />
          </div>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'kubernetes':
      return (
        <div className="control-face control-face-kubernetes">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <circle cx="60" cy="48" r="12" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="60" cy="16" r="7" fill="currentColor" />
            <circle cx="88" cy="32" r="7" fill="currentColor" />
            <circle cx="88" cy="64" r="7" fill="currentColor" />
            <circle cx="60" cy="80" r="7" fill="currentColor" />
            <circle cx="32" cy="64" r="7" fill="currentColor" />
            <circle cx="32" cy="32" r="7" fill="currentColor" />
            <path d="M60 28V22M72 36l10-6M72 60l10 6M60 68v6M48 60l-10 6M48 36l-10-6" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'networking':
      return (
        <div className="control-face control-face-networking">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <circle cx="24" cy="48" r="8" fill="currentColor" />
            <circle cx="60" cy="24" r="8" fill="currentColor" />
            <circle cx="60" cy="72" r="8" fill="currentColor" />
            <circle cx="96" cy="48" r="8" fill="currentColor" />
            <path d="M32 48h56M60 32v32M30 44l24-16M30 52l24 16M66 32l24 16M66 64l24-16" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'billing':
      return (
        <div className="control-face control-face-billing">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <rect x="16" y="22" width="88" height="52" rx="10" fill="none" stroke="currentColor" strokeWidth="6" />
            <rect x="16" y="34" width="88" height="10" fill="currentColor" opacity="0.9" />
            <rect x="28" y="56" width="24" height="8" rx="4" fill="currentColor" opacity="0.7" />
            <rect x="62" y="56" width="26" height="8" rx="4" fill="currentColor" />
          </svg>
          <div className="face-label">{label}</div>
          <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
        </div>
      );
    case 'security':
      return (
        <div className="control-face control-face-security">
          <svg
            aria-hidden="true"
            className={`brand-mark${hasPrompt ? ' active' : ''}`}
            viewBox="0 0 120 96"
          >
            <path d="M60 16l28 10v22c0 18-11 29-28 34-17-5-28-16-28-34V26l28-10z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
            <path d="M48 48a12 12 0 1 1 24 0v10H48V48z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <rect x="44" y="56" width="32" height="18" rx="6" fill="none" stroke="currentColor" strokeWidth="6" />
          </svg>
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





function getControlDefinition(label: string): ControlDefinition | undefined {
  for (const role of roles) {
    const match = role.controls.find(control => control.label === label);
    if (match) {
      return match;
    }
  }
  return undefined;
}

function requiresSubControlChoice(control: ControlDefinition | undefined): boolean {
  if (!control) {
    return false;
  }

  const keys = Object.keys(control.subControls);
  return !(keys.length === 1 && keys[0] === 'default');
}

function pickRandomControls(count: number): string[] {
  const labels = roles.flatMap(role => role.controls.map(control => control.label));
  return [...labels].sort(() => Math.random() - 0.5).slice(0, count);
}

export function RoomClient({ roomCode, playerName, isHost }: RoomClientProps) {
  const adapterRef = useRef<JazzMultiplayerAdapter | null>(null);
  const isDemo = roomCode === DEMO_ROOM_CODE;
  const demoControls = useMemo(
    () => (isDemo ? pickRandomControls(DEMO_BUTTON_COUNT) : []),
    [isDemo],
  );

  // Stable unique player ID for this browser session.
  const playerId = useRef(`p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const [adapter, setAdapter] = useState<MultiplayerAdapter | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<SharedRoomState | null>(
    adapter?.getInitialState() ?? null,
  );
  const [openSubControl, setOpenSubControl] = useState<string | null>(null);
  const [activeMiniGamePrompt, setActiveMiniGamePrompt] = useState<PromptDefinition | null>(null);
  const [minigameSuccess, setMinigameSuccess] = useState(false);
  const [misfiredControl, setMisfiredControl] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [now, setNow] = useState(Date.now());
  const subcontrolStageRef = useRef<HTMLElement>(null);
  const minigameStageRef = useRef<HTMLElement>(null);
  const successAudioRef = useRef<AudioContext | null>(null);
  const warningAudioRef = useRef<AudioContext | null>(null);
  const misfireAudioRef = useRef<AudioContext | null>(null);
  const lastWarningSecondRef = useRef<string | null>(null);
  const removedPlayerRef = useRef(false);

  // Get this player's controls from the shared state.
  const stateControls = state?.players.find(p => p.id === playerId)?.controls ?? [];
  const levelConfig = getLevelConfig(state?.deploy.currentLevel ?? 1);
  const baseControls = isDemo ? stateControls : stateControls.slice(0, levelConfig.buttonCount);

  // If a debug prompt is locked, ensure its control is visible in the buttons.
  const debugLockedControl = adapter?.debugGetLockedControl() ?? null;
  const controls = debugLockedControl && !baseControls.includes(debugLockedControl)
    ? [...baseControls, debugLockedControl]
    : baseControls;
  const openControlDefinition = openSubControl ? getControlDefinition(openSubControl) : undefined;

  // Create the solo demo adapter immediately.
  useEffect(() => {
    if (!isDemo || adapter) return;
    const { room, ownerGroup } = createJazzRoom({
      roomCode,
      isDemo: true,
      playerControls: demoControls,
    });
    const a = new JazzMultiplayerAdapter(room, {
      playerControls: demoControls,
      isHost: true,
      ownerGroup,
    });
    adapterRef.current = a;
    setAdapter(a);
  }, [adapter, demoControls, isDemo, roomCode]);

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
      // Get the room's owning group so new CoValues (like player controls)
      // inherit the same public access.
      const ownerGroup = room.$jazz.owner as Group | undefined;
      const a = new JazzMultiplayerAdapter(room, { isHost, ownerGroup });
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

  // Toggle debug menu with Ctrl+D / Cmd+D (demo mode only).
  useEffect(() => {
    if (!isDemo) return;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
      if (e.key === 'Escape' && showDebug) {
        setShowDebug(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDemo, showDebug]);

  useEffect(() => {
    if (!misfiredControl) return;
    const timeout = window.setTimeout(() => setMisfiredControl(null), 320);

    // Play "uh-uhh" error sound — two descending tones.
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = misfireAudioRef.current ?? new AudioContextClass();
        misfireAudioRef.current = ctx;
        if (ctx.state === 'suspended') void ctx.resume();

        const t = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        // First tone — higher pitch
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(440, t);
        osc1.frequency.exponentialRampToValueAtTime(380, t + 0.12);
        osc1.connect(gain);
        osc1.start(t);
        osc1.stop(t + 0.14);

        // Second tone — lower pitch, slight pause
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(330, t + 0.18);
        osc2.frequency.exponentialRampToValueAtTime(220, t + 0.38);
        osc2.connect(gain);
        osc2.start(t + 0.18);
        osc2.stop(t + 0.4);
      }
    }

    return () => window.clearTimeout(timeout);
  }, [misfiredControl]);

  useEffect(() => () => {
    void successAudioRef.current?.close();
    successAudioRef.current = null;
    void misfireAudioRef.current?.close();
    misfireAudioRef.current = null;
    void warningAudioRef.current?.close();
    warningAudioRef.current = null;
  }, []);

  // Join the room and subscribe to state.
  useEffect(() => {
    if (!adapter) return;
    removedPlayerRef.current = false;
    adapter.addPlayer(playerId, playerName);
    const unsubscribe = adapter.subscribe(setState);

    const removeSelf = () => {
      if (removedPlayerRef.current) {
        return;
      }
      removedPlayerRef.current = true;
      adapter.removePlayer(playerId);
    };

    const handlePageExit = () => {
      removeSelf();
    };

    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);

    return () => {
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
      unsubscribe();
      removeSelf();
      adapterRef.current?.dispose();
    };
  }, [adapter, playerId, playerName]);

  const closeSubControls = useCallback(() => setOpenSubControl(null), []);
  const closeMiniGame = useCallback(() => {
    setActiveMiniGamePrompt(null);
    setMinigameSuccess(false);
  }, []);

  useEffect(() => {
    closeSubControls();
    closeMiniGame();
  }, [closeMiniGame, closeSubControls, state?.deploy.currentLevel, state?.deploy.levelPhase]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }

      if (activeMiniGamePrompt) {
        closeMiniGame();
        return;
      }

      closeSubControls();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeMiniGamePrompt, closeMiniGame, closeSubControls]);

  const handleSubcontrolBackdropClick = useCallback((e: React.MouseEvent) => {
    if (subcontrolStageRef.current && !subcontrolStageRef.current.contains(e.target as Node)) {
      closeSubControls();
    }
  }, [closeSubControls]);

  const handleMiniGameBackdropClick = useCallback((e: React.MouseEvent) => {
    if (minigameStageRef.current && !minigameStageRef.current.contains(e.target as Node)) {
      closeMiniGame();
    }
  }, [closeMiniGame]);

  const launchMiniGame = useCallback((prompt: PromptDefinition) => {
    if (!adapter) {
      return;
    }

    if (!hasMiniGame(prompt.miniGameId)) {
      adapter.resolvePrompt(prompt.id);
      setOpenSubControl(null);
      return;
    }

    setOpenSubControl(null);
    setMinigameSuccess(false);
    setActiveMiniGamePrompt(prompt);
  }, [adapter]);

  useEffect(() => {
    if (!minigameSuccess || typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const ctx = successAudioRef.current ?? new AudioContextClass();
    successAudioRef.current = ctx;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    const notes = [
      { frequency: 523.25, start: 0 },
      { frequency: 659.25, start: 0.08 },
      { frequency: 783.99, start: 0.16 },
    ];

    notes.forEach(note => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(note.frequency, now + note.start);
      oscillator.connect(gain);
      oscillator.start(now + note.start);
      oscillator.stop(now + note.start + 0.16);
    });
  }, [minigameSuccess]);

  useEffect(() => {
    if (!activeMiniGamePrompt || !minigameSuccess || !adapter) {
      return;
    }

    const timeout = window.setTimeout(() => {
      adapter.resolvePrompt(activeMiniGamePrompt.id);
      closeMiniGame();
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [activeMiniGamePrompt, adapter, closeMiniGame, minigameSuccess]);

  // Play a sound when a level is completed (phase transitions from 'playing' to 'briefing').
  const levelCompleteAudioRef = useRef<AudioContext | null>(null);
  const prevLevelPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPhase = state?.deploy.levelPhase ?? null;
    const prevPhase = prevLevelPhaseRef.current;
    prevLevelPhaseRef.current = currentPhase;

    // Detect transition: was playing, now briefing (level survived).
    if (prevPhase === 'playing' && currentPhase === 'briefing' && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = levelCompleteAudioRef.current ?? new AudioContextClass();
      levelCompleteAudioRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();

      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

      // Ascending fanfare — 5 notes, slightly different from the 3-note success chime.
      const notes = [
        { freq: 440, start: 0 },       // A4
        { freq: 554.37, start: 0.08 },  // C#5
        { freq: 659.25, start: 0.16 },  // E5
        { freq: 880, start: 0.28 },     // A5
        { freq: 1108.73, start: 0.38 }, // C#6
      ];

      notes.forEach(note => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, t + note.start);
        osc.connect(gain);
        osc.start(t + note.start);
        osc.stop(t + note.start + 0.18);
      });
    }
  }, [state?.deploy.levelPhase]);

  const warningPrompt = state?.gameStarted
    ? state.deploy.prompts
      .filter(p => p.assignedTo === playerId && (p.status === 'queued' || p.status === 'active') && p.createdAt > 0)
      .sort((a, b) => a.createdAt - b.createdAt)[0] ?? null
    : null;
  const warningRemaining = warningPrompt
    ? Math.max(0, warningPrompt.timerSeconds - Math.floor((now - warningPrompt.createdAt) / 1000))
    : null;

  useEffect(() => {
    if (typeof window === 'undefined' || !warningPrompt || warningRemaining === null || warningRemaining > 5 || warningRemaining <= 0) {
      if (!warningPrompt || warningRemaining === null || warningRemaining > 5) {
        lastWarningSecondRef.current = null;
      }
      return;
    }

    const beepKey = `${warningPrompt.id}:${warningRemaining}`;
    if (lastWarningSecondRef.current === beepKey) {
      return;
    }
    lastWarningSecondRef.current = beepKey;

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const ctx = warningAudioRef.current ?? new AudioContextClass();
    warningAudioRef.current = ctx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const currentTime = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, currentTime + 0.12);

    gain.gain.setValueAtTime(0.0001, currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.14);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.15);
  }, [warningPrompt, warningRemaining]);

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

  const meReady = state.players.find(p => p.id === playerId)?.ready ?? false;
  const readyCount = state.players.filter(p => p.ready).length;
  const playerCount = state.players.length;

  if (!isDemo && state.deploy.levelPhase === 'briefing') {
    return (
      <main className="panel room-shell waiting-shell">
        <div className="waiting-content level-briefing-content">
          <div className="waiting-header">
            <span className="eyebrow">Level {state.deploy.currentLevel}</span>
            <h1 className="waiting-title">Prepare the Stack</h1>
            <p className="waiting-sub">
              Survive this round with {levelConfig.buttonCount} controls for {Math.floor(levelConfig.durationSeconds / 60)} minute{levelConfig.durationSeconds >= 120 ? 's' : ''}.
            </p>
          </div>

          <div className="level-briefing-stats">
            <div className="panel-muted level-briefing-card">
              <span className="stat-label">Controls</span>
              <strong>{levelConfig.buttonCount}</strong>
            </div>
            <div className="panel-muted level-briefing-card">
              <span className="stat-label">Timer</span>
              <strong>{Math.floor(levelConfig.durationSeconds / 60)}:{String(levelConfig.durationSeconds % 60).padStart(2, '0')}</strong>
            </div>
            <div className="panel-muted level-briefing-card">
              <span className="stat-label">Ready</span>
              <strong>{readyCount}/{playerCount}</strong>
            </div>
          </div>

          <div className="level-briefing-actions">
            <div className="callout panel-muted">
              Click ready to start Level {state.deploy.currentLevel}.
            </div>
            <button
              className={`button waiting-launch${meReady ? ' waiting-ready-active' : ''}`}
              onClick={() => adapter.toggleReady(playerId)}
              type="button"
            >
              {meReady ? 'Not Ready' : 'Ready'}
            </button>
          </div>
        </div>
      </main>
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
  const activeAlert = myAlerts[0] ?? null;

  // Buttons should respond to ANY started prompt that matches, not just the
  // player's own alert. In Spaceteam, Player A sees a task and tells Player B
  // to press a button — Player B needs that button to light up even though
  // the prompt is assigned to Player A.
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

  if (state.deploy.levelPhase === 'complete') {
    return (
      <main className="panel room-shell game-over-shell">
        <div className="game-over-content">
          <span className="eyebrow">Victory</span>
          <h1 className="game-over-title">DEPLOYED</h1>
          <p className="game-over-sub">
            {isDemo
              ? 'You kept the stack alive through the full solo run and got the app into production.'
              : `The team survived ${state.deploy.currentLevel} levels and got the app into production.`}
          </p>
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
    <main className="panel room-shell station-shell role-theme">
      <section className="top-rail">
        <div className="top-bar">
          <div className="top-bar-left">
            <span className="top-name">{playerName}</span>
            {isDemo ? (
              <span className="tag">solo • {controls.length}/{DEMO_BUTTON_COUNT} controls</span>
            ) : (
              <span className="tag">level {state.deploy.currentLevel}</span>
            )}
          </div>
          <div className="top-bar-right">
            <span className="top-timer">
              {Math.floor(state.deploy.timeRemainingSeconds / 60)}:{String(state.deploy.timeRemainingSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="panel-muted valuation-card">
          <div className="valuation-row">
            <div className="status-head">
              <div className={`signal ${trending === 'up' ? 'good' : 'danger'}`} />
              <div className="stat-label">Market Cap</div>
            </div>
            <div className={`stat-value valuation-value ${trending}`}>
              {formatValuation(valuation)}
            </div>
          </div>
          <Sparkline data={valuationHistory} height={32} />
        </div>
      </section>

      <div className="station-body stack">
        <section className="prompt-overlay">
          {activeAlert ? (
            (() => {
              const prompt = activeAlert;
              const remaining = Math.max(
                0,
                prompt.timerSeconds - Math.floor((now - prompt.createdAt) / 1000),
              );
              const urgent = remaining <= 5;

              return (
                <div
                  className={[
                    'prompt-banner',
                    'prompt-banner-full',
                    openSubControl === prompt.actionLabel ? 'active' : '',
                    urgent ? 'urgent' : '',
                  ].filter(Boolean).join(' ')}
                  key={prompt.id}
                >
                  <div className="prompt-topline">
                    <div className={`prompt-icon status-${prompt.status}`}>
                      {promptGlyph[prompt.status]}
                    </div>
                    <div className="prompt-meta">
                      <div className="prompt-control-target">
                        <span className="prompt-control-kicker">Control</span>
                        <strong className="prompt-control-name">{prompt.actionLabel}</strong>
                      </div>
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
            })()
          ) : (
            <div className="prompt-banner prompt-banner-full prompt-empty">
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

        <section className="station stack">
          <div className="command-board">
            {controls.map(control => {
              const prompt = actionablePrompts.find(p => p.actionLabel === control);
              const controlDef = getControlDefinition(control);
              const hasPrompt = !!prompt;
              const skin = getControlSkin(control);

              return (
                <button
                  className={[
                    `control-button control-skin-${skin}`,
                    hasPrompt ? 'ready' : '',
                    openSubControl === control ? 'active' : '',
                    misfiredControl === control ? 'misfired' : '',
                  ].filter(Boolean).join(' ')}
                  key={control}
                  onClick={() => {
                    if (!prompt) {
                      adapter.misfireControl(playerId, control);
                      setMisfiredControl(control);
                      return;
                    }

                    if (requiresSubControlChoice(controlDef)) {
                      setOpenSubControl(current => (current === control ? null : control));
                      return;
                    }

                    launchMiniGame(prompt);
                  }}
                  type="button"
                >
                  <ControlFace skin={skin} label={compactLabel(control)} hasPrompt={hasPrompt} />
                </button>
              );
            })}
          </div>
        </section>

        {openSubControl && openControlDefinition ? (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div className="mini-backdrop" onClick={handleSubcontrolBackdropClick}>
            <section className="mini-stage subcontrol-stage" ref={subcontrolStageRef}>
              <div>
                <span className="eyebrow">Choose Action</span>
                <h3 style={{ marginTop: 8 }}>{openSubControl}</h3>
              </div>
              <div className="subcontrol-list modal-subcontrol-list">
                {Object.keys(openControlDefinition.subControls).map(subControlKey => {
                  const subLabel =
                    subControlKey === 'default' ? 'Confirm' : formatSubControlLabel(subControlKey);
                  const prompt = actionablePrompts.find(p => p.actionLabel === openSubControl);
                  const isMatch =
                    subControlKey === 'default'
                      ? !prompt?.selectionLabel
                      : prompt?.selectionLabel === formatSubControlLabel(subControlKey);

                  return (
                    <button
                      className="subcontrol-button"
                      key={subControlKey}
                      onClick={() => {
                        if (!prompt) {
                          adapter.misfireControl(playerId, openSubControl);
                          setMisfiredControl(openSubControl);
                          setOpenSubControl(null);
                          return;
                        }

                        if (isMatch) {
                          launchMiniGame(prompt);
                        } else {
                          adapter.misfireControl(playerId, `${openSubControl}:${subControlKey}`);
                          setMisfiredControl(openSubControl);
                        }
                        setOpenSubControl(null);
                      }}
                      type="button"
                    >
                      {subLabel}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {activeMiniGamePrompt ? (
          <div className="mini-backdrop mini-backdrop-game" onClick={handleMiniGameBackdropClick}>
            <section
              aria-modal="true"
              className="mini-stage mini-stage-game"
              ref={minigameStageRef}
              role="dialog"
            >
              <div className="mini-stage-head">
                <div>
                  <span className="eyebrow">Mini Game</span>
                  <h3 className="mini-stage-title">{activeMiniGamePrompt.actionLabel}</h3>
                </div>
                <div className="mini-chip">
                  {activeMiniGamePrompt.selectionLabel || activeMiniGamePrompt.miniGameId}
                </div>
              </div>

              <MiniGamePanel
                miniGameId={activeMiniGamePrompt.miniGameId}
                onResolve={() => {
                  setMinigameSuccess(true);
                }}
              />

              {minigameSuccess ? (
                <div className="minigame-success">
                  <div className="minigame-success-badge">Success!</div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>

      {showDebug && isDemo && adapter && state && (
        <DebugMenu
          adapter={adapter}
          state={state}
          playerId={playerId}
          onClose={() => setShowDebug(false)}
        />
      )}
    </main>
  );
}
