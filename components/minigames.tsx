'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniGameId } from '@/lib/game/types';

interface MiniGamePanelProps {
  miniGameId: MiniGameId;
  onResolve: () => void;
}

interface FlagRound {
  country: string;
  flag: string;
  wrongAnswer: string;
}

const FLAG_ROUNDS: FlagRound[] = [
  { country: 'Japan', flag: '🇯🇵', wrongAnswer: 'Bangladesh' },
  { country: 'Ireland', flag: '🇮🇪', wrongAnswer: 'Italy' },
  { country: 'Germany', flag: '🇩🇪', wrongAnswer: 'Belgium' },
  { country: 'Nigeria', flag: '🇳🇬', wrongAnswer: 'Italy' },
  { country: 'Sweden', flag: '🇸🇪', wrongAnswer: 'Norway' },
  { country: 'Brazil', flag: '🇧🇷', wrongAnswer: 'Mexico' },
  { country: 'Canada', flag: '🇨🇦', wrongAnswer: 'Peru' },
  { country: 'France', flag: '🇫🇷', wrongAnswer: 'Netherlands' },
];

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

function GuessTheCountryGame({ onResolve }: { onResolve: () => void }) {
  const [roundIndex, setRoundIndex] = useState(() => randomIndex(FLAG_ROUNDS.length));
  const round = FLAG_ROUNDS[roundIndex];
  const options = useMemo(() => {
    const choices = [round.country, round.wrongAnswer];
    return Math.random() > 0.5 ? choices : [choices[1], choices[0]];
  }, [round]);

  return (
    <div className="mini-shell mini-shell-country">
      <div className="mini-callout mini-callout-country">
        Which country is this flag?
      </div>

      <div className="flag-card" aria-label="Flag to identify">
        <div className="flag-card-inner">
          <span className="flag-emoji" role="img" aria-label={`${round.country} flag`}>
            {round.flag}
          </span>
        </div>
      </div>

      <div className="country-choice-grid">
        {options.map(option => (
          <button
            className="country-choice"
            key={`${round.flag}-${option}`}
            onClick={() => {
              if (option === round.country) {
                onResolve();
                return;
              }

              setRoundIndex(current => randomIndex(FLAG_ROUNDS.length, current));
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

const IMPLEMENTED_MINIGAMES = new Set<MiniGameId>([
  'bug-bash',
  'guess-the-country',
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

  return null;
}
