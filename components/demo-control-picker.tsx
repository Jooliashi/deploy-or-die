'use client';

import { useCallback, useState } from 'react';
import { roles } from '@/lib/game/data';

const TARGET_COUNT = 5;

/** Flat list of all available control labels. */
const allControls = roles.flatMap(role =>
  role.controls.map(control => ({
    label: control.label,
  })),
);

/** Pick `count` random indices from the list. */
function pickRandom(count: number): Set<string> {
  const shuffled = [...allControls].sort(() => Math.random() - 0.5);
  return new Set(shuffled.slice(0, count).map(c => c.label));
}

interface DemoControlPickerProps {
  playerName: string;
  onConfirm: (controls: string[]) => void;
}

export function DemoControlPicker({ playerName, onConfirm }: DemoControlPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(() => pickRandom(TARGET_COUNT));

  const toggle = useCallback((label: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else if (next.size < TARGET_COUNT) {
        next.add(label);
      }
      return next;
    });
  }, []);

  const canProceed = selected.size === TARGET_COUNT;

  return (
    <main className="panel room-shell waiting-shell">
      <div className="picker-content">
        <div className="picker-header">
          <span className="eyebrow">Demo Setup</span>
          <h1 className="picker-title">Choose Your Controls</h1>
          <p className="picker-sub">
            Select {TARGET_COUNT} controls for your console, {playerName}. These will be the
            buttons you use during the game.
          </p>
        </div>

        <div className="picker-counter">
          <span className={`picker-count${canProceed ? ' picker-count-ready' : ''}`}>
            {selected.size}
          </span>
          <span className="picker-count-label">/ {TARGET_COUNT} selected</span>
        </div>

        <div className="picker-grid">
          {allControls.map(control => {
            const isSelected = selected.has(control.label);
            const isFull = selected.size >= TARGET_COUNT;

            return (
              <button
                key={control.label}
                className={[
                  'picker-card',
                  isSelected ? 'picker-card-selected' : '',
                  !isSelected && isFull ? 'picker-card-disabled' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => toggle(control.label)}
                type="button"
              >
                <span className="picker-card-label">{control.label}</span>
              </button>
            );
          })}
        </div>

        <button
          className={`button picker-launch${canProceed ? '' : ' disabled'}`}
          disabled={!canProceed}
          onClick={() => onConfirm([...selected])}
          type="button"
        >
          {canProceed ? 'Start Demo' : `Select ${TARGET_COUNT - selected.size} more`}
        </button>
      </div>
    </main>
  );
}
