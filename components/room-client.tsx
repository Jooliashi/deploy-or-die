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

export function getControlSkin(control: string): ControlSkin {
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
      return 'switch';
    case 'Workflow':
      return 'terminal';
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

/** All icons use SVG with the same viewBox for consistent scaling. */
export function ControlIcon({ skin, hasPrompt }: { skin: ControlSkin; hasPrompt: boolean }) {
  const cls = `icon-svg${hasPrompt ? ' icon-active' : ''}`;
  switch (skin) {
    // Instant Rollback — circular arrow
    case 'browser':
      return (<svg className={cls} viewBox="0 0 48 48"><path d="M24 8a16 16 0 1 1-14 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M10 6v10h10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    // UI — macOS window
    case 'toggle':
      return (<svg className={cls} viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="3"/><line x1="4" y1="16" x2="44" y2="16" stroke="currentColor" strokeWidth="3"/><circle cx="10" cy="12" r="1.5" fill="#ff5f57"/><circle cx="15" cy="12" r="1.5" fill="#febc2e"/><circle cx="20" cy="12" r="1.5" fill="#28c840"/></svg>);
    // Flags — flag on pole
    case 'flag':
      return (<svg className={cls} viewBox="0 0 48 48"><line x1="12" y1="8" x2="12" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M12 8h22l-6 8 6 8H12z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>);
    // Configs — sliders
    case 'configs':
      return (<svg className={cls} viewBox="0 0 48 48"><line x1="8" y1="14" x2="40" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><circle cx="20" cy="14" r="3" fill="currentColor"/><line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><circle cx="32" cy="24" r="3" fill="currentColor"/><line x1="8" y1="34" x2="40" y2="34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><circle cx="16" cy="34" r="3" fill="currentColor"/></svg>);
    // Status Page — heartbeat line
    case 'statuspage':
      return (<svg className={cls} viewBox="0 0 48 48"><path d="M4 26h8l4-10 6 20 5-14 4 4h13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    // Workflow/Terminal — terminal prompt
    case 'terminal':
      return (<svg className={cls} viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M12 20l6 4-6 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><line x1="22" y1="28" x2="32" y2="28" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>);
    // Edge Config — {;}
    case 'switch':
      return (<svg className={cls} viewBox="0 0 48 48"><text x="24" y="32" textAnchor="middle" fontSize="22" fontFamily="monospace" fontWeight="700" fill="currentColor">{'{;}'}</text></svg>);
    // Vercel Function — ƒ
    case 'function':
      return (<svg className={cls} viewBox="0 0 48 48"><text x="24" y="34" textAnchor="middle" fontSize="32" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="400" fill="currentColor">ƒ</text></svg>);
    // Cache — circular arrows
    case 'cache':
      return (<svg className={cls} viewBox="0 0 48 48"><path d="M32 12a14 14 0 0 1 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M16 36a14 14 0 0 1 0-24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M30 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 40l-4-4 4-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    // ClickHouse — bar chart
    case 'clickhouse':
      return (<svg className={cls} viewBox="0 0 48 48"><rect x="8" y="10" width="6" height="28" rx="2" fill="#F6C549"/><rect x="18" y="20" width="6" height="18" rx="2" fill="#FF5E57"/><rect x="28" y="16" width="6" height="22" rx="2" fill="#F6C549"/><rect x="38" y="24" width="6" height="14" rx="2" fill="#FF5E57"/></svg>);
    // DynamoDB — stacked disks
    case 'dynamodb':
      return (<svg className={cls} viewBox="0 0 48 48"><ellipse cx="24" cy="14" rx="14" ry="5" fill="none" stroke="#8FD3FF" strokeWidth="3"/><path d="M10 14v10c0 3 6 6 14 6s14-3 14-6V14" fill="none" stroke="#8FD3FF" strokeWidth="3"/><ellipse cx="24" cy="24" rx="14" ry="5" fill="none" stroke="#8FD3FF" strokeWidth="3"/><path d="M10 24v10c0 3 6 6 14 6s14-3 14-6V24" fill="none" stroke="#8FD3FF" strokeWidth="3"/></svg>);
    // Cosmos DB — planet with ring
    case 'cosmosdb':
      return (<svg className={cls} viewBox="0 0 48 48"><circle cx="24" cy="24" r="8" fill="#3EA8FF"/><ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke="#9DD8FF" strokeWidth="2.5" transform="rotate(-20 24 24)"/><circle cx="38" cy="14" r="2" fill="#E6F7FF"/></svg>);
    // Tinybird — golden bird (tight crop for ~15% larger appearance)
    case 'tinybird':
      return (<svg className={cls} viewBox="70 60 270 200">
        <ellipse cx="180" cy="180" rx="80" ry="60" fill="#ffcc33"/>
        <ellipse cx="230" cy="140" rx="60" ry="65" fill="#ffd966"/>
        <circle cx="230" cy="145" r="10" fill="#261a0d"/>
        <polygon points="260,140 310,180 260,200" fill="#f68121"/>
      </svg>);
    // Social Media — @
    case 'social':
      return (<svg className={cls} viewBox="0 0 48 48"><text x="24" y="34" textAnchor="middle" fontSize="30" fontFamily="monospace" fontWeight="700" fill="currentColor">@</text></svg>);
    // Customer Ticket — speech bubble
    case 'reply':
      return (<svg className={cls} viewBox="0 0 48 48"><path d="M8 10h32a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H16l-8 6V12a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><line x1="16" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="16" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>);
    // Vendor — handshake / link
    case 'vendor':
      return (<svg className={cls} viewBox="0 0 48 48"><path d="M8 24h8l4-4h8l4 4h8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="24" r="4" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="36" cy="24" r="4" fill="none" stroke="currentColor" strokeWidth="3"/></svg>);
    // IT — monitor with wrench
    case 'it':
      return (<svg className={cls} viewBox="0 0 48 48"><rect x="6" y="8" width="36" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="3"/><line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><line x1="24" y1="32" x2="24" y2="36" stroke="currentColor" strokeWidth="3"/><path d="M20 16l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    // Kubernetes — helm wheel
    case 'kubernetes':
      return (<svg className={cls} viewBox="0 0 48 48"><circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="24" cy="8" r="3.5" fill="currentColor"/><circle cx="38" cy="16" r="3.5" fill="currentColor"/><circle cx="38" cy="32" r="3.5" fill="currentColor"/><circle cx="24" cy="40" r="3.5" fill="currentColor"/><circle cx="10" cy="32" r="3.5" fill="currentColor"/><circle cx="10" cy="16" r="3.5" fill="currentColor"/><path d="M24 18v-6.5M30 21l5-3M30 27l5 3M24 30v6.5M18 27l-5 3M18 21l-5-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>);
    // Networking — connected nodes
    case 'networking':
      return (<svg className={cls} viewBox="0 0 48 48"><circle cx="12" cy="24" r="4" fill="currentColor"/><circle cx="24" cy="12" r="4" fill="currentColor"/><circle cx="24" cy="36" r="4" fill="currentColor"/><circle cx="36" cy="24" r="4" fill="currentColor"/><line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="2.5"/><line x1="24" y1="16" x2="24" y2="32" stroke="currentColor" strokeWidth="2.5"/><line x1="15" y1="21" x2="21" y2="15" stroke="currentColor" strokeWidth="2.5"/><line x1="27" y1="15" x2="33" y2="21" stroke="currentColor" strokeWidth="2.5"/><line x1="15" y1="27" x2="21" y2="33" stroke="currentColor" strokeWidth="2.5"/><line x1="27" y1="33" x2="33" y2="27" stroke="currentColor" strokeWidth="2.5"/></svg>);
    // Billing — credit card
    case 'billing':
      return (<svg className={cls} viewBox="0 0 48 48"><rect x="4" y="12" width="40" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="3"/><line x1="4" y1="20" x2="44" y2="20" stroke="currentColor" strokeWidth="3"/><line x1="10" y1="28" x2="20" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="26" y1="28" x2="32" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>);
    // Security — shield with lock
    case 'security':
      return (<svg className={cls} viewBox="0 0 48 48"><path d="M24 6l16 6v12c0 10-7 16-16 18C15 40 8 34 8 24V12l16-6z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><rect x="18" y="24" width="12" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M20 24v-3a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>);
    default:
      return (<svg className={cls} viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="24" cy="24" r="4" fill="currentColor"/></svg>);
  }
}

function ControlFace({ skin, label, hasPrompt }: { skin: ControlSkin; label: string; hasPrompt: boolean }) {
  const [codeA, codeB] = getControlCodes(skin);
  return (
    <div className="control-face">
      <ControlIcon skin={skin} hasPrompt={hasPrompt} />
      <div className="face-label">{label}</div>
      <div className="face-codes"><span>{codeA}</span><span>{codeB}</span></div>
    </div>
  );
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

  const playSuccessSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = successAudioRef.current ?? new AudioContextClass();
    successAudioRef.current = ctx;
    if (ctx.state === 'suspended') void ctx.resume();

    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

    // Quick two-note chime — bright and short.
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, t);
    osc1.connect(gain);
    osc1.start(t);
    osc1.stop(t + 0.1);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, t + 0.08);
    osc2.connect(gain);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.2);
  }, []);

  const launchMiniGame = useCallback((prompt: PromptDefinition) => {
    if (!adapter) {
      return;
    }

    if (!hasMiniGame(prompt.miniGameId)) {
      adapter.resolvePrompt(prompt.id);
      playSuccessSound();
      setOpenSubControl(null);
      return;
    }

    setOpenSubControl(null);
    setMinigameSuccess(false);
    setActiveMiniGamePrompt(prompt);
  }, [adapter]);

  useEffect(() => {
    if (!minigameSuccess) return;
    playSuccessSound();
  }, [minigameSuccess, playSuccessSound]);

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
              <div className="window-titlebar">
                <div className="window-dots">
                  <button className="window-dot window-dot-red" type="button" onClick={() => setOpenSubControl(null)} aria-label="Close" />
                  <span className="window-dot window-dot-yellow" />
                  <span className="window-dot window-dot-green" />
                </div>
                <span className="window-title">Choose Action</span>
                <div className="window-dots-spacer" />
              </div>
              <div className="window-body">
                <h3 className="window-heading">{openSubControl}</h3>
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
              <div className="window-titlebar">
                <div className="window-dots">
                  <button className="window-dot window-dot-red" type="button" onClick={closeMiniGame} aria-label="Close" />
                  <span className="window-dot window-dot-yellow" />
                  <span className="window-dot window-dot-green" />
                </div>
                <span className="window-title">{activeMiniGamePrompt.actionLabel}</span>
                <div className="window-dots-spacer" />
              </div>

              <div className="window-body">
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
              </div>
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
