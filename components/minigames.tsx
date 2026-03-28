'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniGameId } from '@/lib/game/types';

interface MiniGamePanelProps {
  miniGameId: MiniGameId;
  onResolve: () => void;
}

interface FlagEntry {
  country: string;
  flag: string;
}

const FLAG_BANK: FlagEntry[] = [
  { country: 'Argentina', flag: '🇦🇷' },
  { country: 'Australia', flag: '🇦🇺' },
  { country: 'Belgium', flag: '🇧🇪' },
  { country: 'Brazil', flag: '🇧🇷' },
  { country: 'Canada', flag: '🇨🇦' },
  { country: 'Chile', flag: '🇨🇱' },
  { country: 'Colombia', flag: '🇨🇴' },
  { country: 'Denmark', flag: '🇩🇰' },
  { country: 'Finland', flag: '🇫🇮' },
  { country: 'France', flag: '🇫🇷' },
  { country: 'Germany', flag: '🇩🇪' },
  { country: 'Greece', flag: '🇬🇷' },
  { country: 'India', flag: '🇮🇳' },
  { country: 'Indonesia', flag: '🇮🇩' },
  { country: 'Ireland', flag: '🇮🇪' },
  { country: 'Italy', flag: '🇮🇹' },
  { country: 'Japan', flag: '🇯🇵' },
  { country: 'Mexico', flag: '🇲🇽' },
  { country: 'Netherlands', flag: '🇳🇱' },
  { country: 'New Zealand', flag: '🇳🇿' },
  { country: 'Nigeria', flag: '🇳🇬' },
  { country: 'Norway', flag: '🇳🇴' },
  { country: 'Peru', flag: '🇵🇪' },
  { country: 'Poland', flag: '🇵🇱' },
  { country: 'Portugal', flag: '🇵🇹' },
  { country: 'Singapore', flag: '🇸🇬' },
  { country: 'South Korea', flag: '🇰🇷' },
  { country: 'Spain', flag: '🇪🇸' },
  { country: 'Sweden', flag: '🇸🇪' },
  { country: 'Switzerland', flag: '🇨🇭' },
  { country: 'Thailand', flag: '🇹🇭' },
  { country: 'United Kingdom', flag: '🇬🇧' },
  { country: 'United States', flag: '🇺🇸' },
  { country: 'Vietnam', flag: '🇻🇳' },
];

interface GuessRound {
  answer: FlagEntry;
  distractor: FlagEntry;
  options: string[];
}

interface RgbTarget {
  label: string;
  rgb: [number, number, number];
}

interface RgbRound {
  target: RgbTarget;
  channelOptions: {
    r: number[];
    g: number[];
    b: number[];
  };
}

const CHANNEL_BANK = [0, 64, 128, 192, 255];

const RGB_TARGETS: RgbTarget[] = [
  { label: 'electric coral', rgb: [255, 64, 64] },
  { label: 'warm amber', rgb: [255, 192, 64] },
  { label: 'signal lime', rgb: [192, 255, 64] },
  { label: 'mint wave', rgb: [64, 255, 192] },
  { label: 'sky ping', rgb: [64, 192, 255] },
  { label: 'deep cobalt', rgb: [64, 64, 255] },
  { label: 'violet beam', rgb: [192, 64, 255] },
  { label: 'hot pink', rgb: [255, 64, 192] },
  { label: 'soft gray', rgb: [192, 192, 192] },
  { label: 'midnight', rgb: [0, 64, 128] },
  { label: 'sea green', rgb: [64, 192, 128] },
  { label: 'sunset orange', rgb: [255, 128, 64] },
];

interface RegionAttempt {
  value: string;
  accepted: boolean;
}

interface MathRound {
  left: number;
  right: number;
  operator: '+' | '-';
  answer: number;
}

const CODE_SNIPPETS = [
  "const deploy = await ship({ target: 'production' });",
  "export const runtime = 'edge';",
  "if (!flags.newDashboard) return redirect('/home');",
  "const latencyMs = Math.round(performance.now() - startTime);",
  "await revalidateTag('pricing-page');",
  "const config = await edgeConfig.get('checkout_theme');",
  "return Response.json({ ok: true, region: 'iad1' });",
  "const retries = Math.min(attempt + 1, 3);",
  "router.push(`/deployments/${deploymentId}`);",
  "const healthy = status === 'ready' && errors.length === 0;",
  "await logDrain.flush({ force: true });",
  "const nextRegion = regions.find(region => region !== currentRegion);",
  "headers.set('x-vercel-cache', 'MISS');",
  "const sessionKey = `${teamId}:${userId}:${Date.now()}`;",
  "const body = JSON.stringify({ feature: 'toolbar-comments' });",
  "return flags.rolloutPercent >= 50 ? 'open' : 'closed';",
  "const response = await fetch('/api/ship', { method: 'POST' });",
  "const ratio = Number((requests / errors).toFixed(2));",
  "if (uptime < 99.9) triggerIncident('customer-impacting');",
  "await invalidateByPrefix('preview:landing-page');",
  "const edgeRegion = process.env.VERCEL_REGION ?? 'iad1';",
  "const owner = team.slug.replace(/-/g, '_');",
];

const VALID_VERCEL_REGION_CODES = [
  'arn1',
  'bom1',
  'cdg1',
  'cle1',
  'cpt1',
  'dub1',
  'dxb1',
  'fra1',
  'gru1',
  'hkg1',
  'hnd1',
  'iad1',
  'icn1',
  'kix1',
  'lhr1',
  'pdx1',
  'sfo1',
  'sin1',
  'syd1',
  'yul1',
];

const VALID_VERCEL_REGION_SET = new Set(VALID_VERCEL_REGION_CODES);

function randomIndex(length: number, except?: number): number {
  if (length <= 1) {
    return 0;
  }

  let next = Math.floor(Math.random() * length);
  while (next === except) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function buildGuessRound(exceptCountry?: string): GuessRound {
  const filteredAnswers = exceptCountry
    ? FLAG_BANK.filter(entry => entry.country !== exceptCountry)
    : FLAG_BANK;
  const answer = filteredAnswers[randomIndex(filteredAnswers.length)];
  const distractorPool = FLAG_BANK.filter(entry => entry.country !== answer.country);
  const distractor = distractorPool[randomIndex(distractorPool.length)];
  const options = Math.random() > 0.5
    ? [answer.country, distractor.country]
    : [distractor.country, answer.country];

  return {
    answer,
    distractor,
    options,
  };
}

function buildChannelOptions(value: number): number[] {
  const distractors = CHANNEL_BANK
    .filter(entry => entry !== value)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return [value, ...distractors].sort(() => Math.random() - 0.5);
}

function buildRgbRound(exceptLabel?: string): RgbRound {
  const targetPool = exceptLabel
    ? RGB_TARGETS.filter(entry => entry.label !== exceptLabel)
    : RGB_TARGETS;
  const target = targetPool[randomIndex(targetPool.length)];
  const [r, g, b] = target.rgb;

  return {
    target,
    channelOptions: {
      r: buildChannelOptions(r),
      g: buildChannelOptions(g),
      b: buildChannelOptions(b),
    },
  };
}

function buildMathRound(previous?: string): MathRound {
  let operator: '+' | '-' = Math.random() > 0.45 ? '+' : '-';
  let left = 100 + Math.floor(Math.random() * 900);
  let right = 100 + Math.floor(Math.random() * 900);

  if (operator === '-' && right > left) {
    [left, right] = [right, left];
  }

  const key = `${left}${operator}${right}`;
  if (key === previous) {
    return buildMathRound(previous);
  }

  return {
    left,
    right,
    operator,
    answer: operator === '+' ? left + right : left - right,
  };
}

function GuessTheCountryGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<GuessRound>(() => buildGuessRound());
  const options = useMemo(() => round.options, [round]);

  return (
    <div className="mini-shell mini-shell-country">
      <div className="mini-callout mini-callout-country">
        Which country is this flag?
      </div>

      <div className="flag-card" aria-label="Flag to identify">
        <div className="flag-card-inner">
          <span className="flag-emoji" role="img" aria-label={`${round.answer.country} flag`}>
            {round.answer.flag}
          </span>
        </div>
      </div>

      <div className="country-choice-grid">
        {options.map(option => (
          <button
            className="country-choice"
            key={`${round.answer.flag}-${round.distractor.country}-${option}`}
            onClick={() => {
              if (option === round.answer.country) {
                onResolve();
                return;
              }

              setRound(buildGuessRound(round.answer.country));
            }}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function GuessTheHexGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<RgbRound>(() => buildRgbRound());
  const [selection, setSelection] = useState<{ r: number | null; g: number | null; b: number | null }>({
    r: null,
    g: null,
    b: null,
  });

  const preview = {
    r: selection.r ?? 0,
    g: selection.g ?? 0,
    b: selection.b ?? 0,
  };
  const previewColor = `rgb(${preview.r}, ${preview.g}, ${preview.b})`;
  const targetColor = `rgb(${round.target.rgb[0]}, ${round.target.rgb[1]}, ${round.target.rgb[2]})`;

  useEffect(() => {
    const matched =
      selection.r === round.target.rgb[0] &&
      selection.g === round.target.rgb[1] &&
      selection.b === round.target.rgb[2];

    if (matched) {
      onResolve();
    }
  }, [onResolve, round.target.rgb, selection.b, selection.g, selection.r]);

  return (
    <div className="mini-shell mini-shell-hex">
      <div className="mini-callout mini-callout-hex">
        Match the target color by choosing the right RGB values.
      </div>

      <div className="rgb-duel">
        <div className="hex-card" aria-label={`Target color ${round.target.label}`}>
          <div className="hex-card-inner">
            <div className="swatch-stack">
              <div className="swatch-label">Target</div>
              <div className="hex-swatch" style={{ background: targetColor }} />
            </div>
          </div>
        </div>

        <div className="hex-card hex-card-preview" aria-label="Current mixed color">
          <div className="hex-card-inner">
            <div className="swatch-stack">
              <div className="swatch-label">Your Mix</div>
              <div className="hex-swatch" style={{ background: previewColor }} />
            </div>
          </div>
        </div>
      </div>

      <div className="rgb-channel-grid">
        {(['r', 'g', 'b'] as const).map(channel => (
          <div className={`rgb-channel rgb-channel-${channel}`} key={channel}>
            <div className="rgb-channel-head">
              <span className="rgb-channel-name">{channel.toUpperCase()}</span>
              <span className="rgb-channel-value">{selection[channel] ?? '--'}</span>
            </div>
            <div className="rgb-option-row">
              {round.channelOptions[channel].map(value => (
                <button
                  className={`rgb-option${selection[channel] === value ? ' selected' : ''}`}
                  key={`${round.target.label}-${channel}-${value}`}
                  onClick={() => {
                    setSelection(current => ({ ...current, [channel]: value }));
                  }}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NameFiveVercelRegionGame({ onResolve }: { onResolve: () => void }) {
  const [value, setValue] = useState('');
  const [attempts, setAttempts] = useState<RegionAttempt[]>([]);
  const acceptedValues = useMemo(
    () => attempts.filter(attempt => attempt.accepted).map(attempt => attempt.value),
    [attempts],
  );
  const acceptedSet = useMemo(() => new Set(acceptedValues), [acceptedValues]);
  const acceptedCount = acceptedSet.size;

  useEffect(() => {
    if (acceptedCount >= 5) {
      onResolve();
    }
  }, [acceptedCount, onResolve]);

  const submitValue = () => {
    const next = value.trim().toLowerCase();
    if (!next) {
      return;
    }

    const accepted = VALID_VERCEL_REGION_SET.has(next) && !acceptedSet.has(next);
    setAttempts(current => [{ value: next, accepted }, ...current].slice(0, 10));
    setValue('');
  };

  return (
    <div className="mini-shell mini-shell-region">
      <div className="mini-callout mini-callout-region">
        Type 5 Vercel region codes. Example: iad1
      </div>

      <div className="region-terminal">
        <div className="region-terminal-head">
          <span>accepted {acceptedCount}/5</span>
          <span>example iad1</span>
        </div>

        <div className="region-input-row">
          <span className="region-prompt">&gt;</span>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className="region-input"
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitValue();
              }
            }}
            placeholder="type a region code"
            spellCheck={false}
            type="text"
            value={value}
          />
          <button className="region-submit" onClick={submitValue} type="button">
            Enter
          </button>
        </div>

        <div className="region-log">
          {attempts.length > 0 ? (
            attempts.map((attempt, index) => (
              <div className={`region-attempt${attempt.accepted ? ' accepted' : ' rejected'}`} key={`${attempt.value}-${index}`}>
                <span className="region-attempt-mark">{attempt.accepted ? '✓' : '×'}</span>
                <span className="region-attempt-value">{attempt.value}</span>
              </div>
            ))
          ) : (
            <div className="region-attempt region-attempt-empty">
              <span className="region-attempt-mark">…</span>
              <span className="region-attempt-value">No regions entered yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MathGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<MathRound>(() => buildMathRound());
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    if (result !== 'wrong') {
      return;
    }

    const timeout = window.setTimeout(() => setResult('idle'), 420);
    return () => window.clearTimeout(timeout);
  }, [result]);

  const submitValue = () => {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    if (parsed === round.answer) {
      setResult('correct');
      onResolve();
      return;
    }

    setResult('wrong');
    setValue('');
    setRound(current => buildMathRound(`${current.left}${current.operator}${current.right}`));
  };

  return (
    <div className="mini-shell mini-shell-math">
      <div className="mini-callout mini-callout-math">
        Solve the equation. Three-digit arithmetic only.
      </div>

      <div className={`math-board${result === 'wrong' ? ' wrong' : ''}`}>
        <div className="math-expression">
          <span>{round.left}</span>
          <span className="math-operator">{round.operator}</span>
          <span>{round.right}</span>
        </div>

        <div className="math-input-row">
          <span className="math-equals">=</span>
          <input
            className="math-input"
            inputMode="numeric"
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitValue();
              }
            }}
            placeholder="answer"
            type="text"
            value={value}
          />
          <button className="math-submit" onClick={submitValue} type="button">
            Check
          </button>
        </div>
      </div>
    </div>
  );
}

function MonkeyTypeGame({ onResolve }: { onResolve: () => void }) {
  const [snippet, setSnippet] = useState(() => CODE_SNIPPETS[randomIndex(CODE_SNIPPETS.length)]);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'wrong'>('idle');

  useEffect(() => {
    if (status !== 'wrong') {
      return;
    }

    const timeout = window.setTimeout(() => setStatus('idle'), 520);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const submitValue = () => {
    const normalizedInput = value.replace(/\r\n/g, '\n');
    const normalizedSnippet = snippet.replace(/\r\n/g, '\n');

    if (normalizedInput === normalizedSnippet) {
      onResolve();
      return;
    }

    setStatus('wrong');
  };

  return (
    <div className="mini-shell mini-shell-monkeytype">
      <div className="mini-callout mini-callout-monkeytype">
        Type the snippet exactly and submit to pass.
      </div>

      <div className="typing-board">
        <pre className="typing-snippet">{snippet}</pre>

        <textarea
          className={`typing-input${status === 'wrong' ? ' wrong' : ''}`}
          onChange={event => setValue(event.target.value)}
          placeholder="type the snippet exactly"
          spellCheck={false}
          value={value}
        />

        <div className="typing-actions">
          <div className="typing-meta">{CODE_SNIPPETS.length} snippets in rotation</div>
          <button className="typing-submit" onClick={submitValue} type="button">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

interface BugSprite {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hue: number;
}

const BUG_FIELD_WIDTH = 420;
const BUG_FIELD_HEIGHT = 240;
const BUG_COUNT = 5;

function createBug(index: number): BugSprite {
  return {
    id: `bug-${index}-${Math.random().toString(36).slice(2, 7)}`,
    x: 28 + Math.random() * (BUG_FIELD_WIDTH - 56),
    y: 30 + Math.random() * (BUG_FIELD_HEIGHT - 60),
    dx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4),
    dy: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.3),
    hue: 320 + Math.floor(Math.random() * 40),
  };
}

function BugBashGame({ onResolve }: { onResolve: () => void }) {
  const [bugs, setBugs] = useState<BugSprite[]>(() =>
    Array.from({ length: BUG_COUNT }, (_, index) => createBug(index)),
  );
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSquash = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const ctx = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = ctx;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(190 + Math.random() * 70, now);
    oscillator.frequency.exponentialRampToValueAtTime(68, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  };

  useEffect(() => {
    if (bugs.length === 0) {
      onResolve();
      return;
    }

    const interval = window.setInterval(() => {
      setBugs(current =>
        current.map(bug => {
          let nextX = bug.x + bug.dx;
          let nextY = bug.y + bug.dy;
          let nextDx = bug.dx;
          let nextDy = bug.dy;

          if (nextX <= 10 || nextX >= BUG_FIELD_WIDTH - 42) {
            nextDx *= -1;
            nextX = Math.max(10, Math.min(BUG_FIELD_WIDTH - 42, nextX));
          }

          if (nextY <= 10 || nextY >= BUG_FIELD_HEIGHT - 42) {
            nextDy *= -1;
            nextY = Math.max(10, Math.min(BUG_FIELD_HEIGHT - 42, nextY));
          }

          return {
            ...bug,
            x: nextX,
            y: nextY,
            dx: nextDx,
            dy: nextDy,
          };
        }),
      );
    }, 48);

    return () => window.clearInterval(interval);
  }, [bugs.length, onResolve]);

  useEffect(() => () => {
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  return (
    <div className="mini-shell mini-shell-bugbash">
      <div className="mini-callout mini-callout-bugbash">
        Smash every bug in the release before it ships.
      </div>

      <div className="bug-arena">
        <div className="bug-grid" aria-hidden="true" />
        {bugs.map(bug => (
          <button
            className="bug-sprite"
            key={bug.id}
            onClick={() => {
              playSquash();
              setBugs(current => current.filter(entry => entry.id !== bug.id));
            }}
            style={
              {
                '--bug-x': `${bug.x}px`,
                '--bug-y': `${bug.y}px`,
                '--bug-hue': `${bug.hue}`,
              } as CSSProperties
            }
            type="button"
          >
            <span className="bug-body" />
            <span className="bug-wing left" />
            <span className="bug-wing right" />
            <span className="bug-eye left" />
            <span className="bug-eye right" />
          </button>
        ))}

        <div className="bug-counter">
          <span>bugs left</span>
          <strong>{bugs.length}</strong>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Find the Logs — word search in a 10×10 grid of scrambled-case gibberish
// ---------------------------------------------------------------------------

const LOG_WORDS = [
  'ERROR', 'FATAL', 'PANIC', 'ABORT', 'CRASH',
  'TIMEOUT', 'REJECT', 'FAILED', 'BROKEN', 'STALE',
  'DENIED', 'LEAKED', 'ORPHAN', 'STUCK', 'DRAIN',
];

const GRID_SIZE = 10;
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?><;:';

function scrambleCase(s: string): string {
  return s.split('').map(c => (Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase())).join('');
}

interface LogGrid {
  cells: string[][];
  word: string;
  wordCells: Set<string>; // "row,col" keys
}

function generateLogGrid(): LogGrid {
  const word = LOG_WORDS[Math.floor(Math.random() * LOG_WORDS.length)];

  // Fill grid with random chars, all with scrambled case.
  const cells: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)],
    ),
  );

  // Place the word in a random direction.
  const directions: [number, number][] = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  let placed = false;
  const wordCells = new Set<string>();
  const scrambled = scrambleCase(word);

  for (let attempt = 0; attempt < 200 && !placed; attempt++) {
    const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);

    // Check bounds.
    const endRow = startRow + dr * (scrambled.length - 1);
    const endCol = startCol + dc * (scrambled.length - 1);
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

    // Place it.
    wordCells.clear();
    for (let i = 0; i < scrambled.length; i++) {
      const r = startRow + dr * i;
      const c = startCol + dc * i;
      cells[r][c] = scrambled[i];
      wordCells.add(`${r},${c}`);
    }
    placed = true;
  }

  return { cells, word, wordCells };
}

function FindTheLogsGame({ onResolve }: { onResolve: () => void }) {
  const [grid, setGrid] = useState<LogGrid>(generateLogGrid);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState(false);

  const toggle = useCallback((key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Check if the selection matches the word cells.
  useEffect(() => {
    if (selected.size === 0) return;
    if (selected.size !== grid.wordCells.size) return;

    const isCorrect = [...selected].every(k => grid.wordCells.has(k));
    if (isCorrect) {
      onResolve();
    } else if (selected.size === grid.wordCells.size) {
      // Wrong selection — flash and reset.
      setWrongFlash(true);
      const t = setTimeout(() => {
        setWrongFlash(false);
        setSelected(new Set());
        setGrid(generateLogGrid());
      }, 600);
      return () => clearTimeout(t);
    }
  }, [selected, grid.wordCells, onResolve]);

  return (
    <div className="mini-shell mini-shell-logs">
      <div className="mini-callout mini-callout-logs">
        Find the word in the logs
      </div>

      <div className="logs-target">
        <span className="logs-target-word">{grid.word}</span>
        <span className="logs-target-hint">{selected.size} / {grid.wordCells.size} selected</span>
      </div>

      <div className={`logs-grid${wrongFlash ? ' logs-wrong' : ''}`}>
        {grid.cells.map((row, ri) =>
          row.map((char, ci) => {
            const key = `${ri},${ci}`;
            const isSel = selected.has(key);
            return (
              <button
                className={`logs-cell${isSel ? ' logs-cell-selected' : ''}`}
                key={key}
                onClick={() => toggle(key)}
                type="button"
              >
                {char}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

const IMPLEMENTED_MINIGAMES = new Set<MiniGameId>([
  'bug-bash',
  'find-the-logs',
  'guess-the-country',
  'guess-the-hex',
  'math',
  'monkey-type',
  'name-five-aws-region',
]);

export function hasMiniGame(miniGameId: MiniGameId | undefined): miniGameId is MiniGameId {
  return !!miniGameId && IMPLEMENTED_MINIGAMES.has(miniGameId);
}

export function MiniGamePanel({
  miniGameId,
  onResolve,
}: MiniGamePanelProps) {
  if (miniGameId === 'bug-bash') {
    return <BugBashGame onResolve={onResolve} />;
  }

  if (miniGameId === 'guess-the-country') {
    return <GuessTheCountryGame onResolve={onResolve} />;
  }

  if (miniGameId === 'find-the-logs') {
    return <FindTheLogsGame onResolve={onResolve} />;
  }

  if (miniGameId === 'guess-the-hex') {
    return <GuessTheHexGame onResolve={onResolve} />;
  }

  if (miniGameId === 'name-five-aws-region') {
    return <NameFiveVercelRegionGame onResolve={onResolve} />;
  }

  if (miniGameId === 'math') {
    return <MathGame onResolve={onResolve} />;
  }

  if (miniGameId === 'monkey-type') {
    return <MonkeyTypeGame onResolve={onResolve} />;
  }

  return null;
}
