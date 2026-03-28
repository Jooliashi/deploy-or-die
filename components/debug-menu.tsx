'use client';

import { useCallback, useState } from 'react';
import { promptPool } from '@/lib/game/data';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

interface DebugMenuProps {
  adapter: MultiplayerAdapter;
  state: SharedRoomState;
  playerId: string;
  onClose: () => void;
}

/** All unique prompt labels grouped by actionLabel (control name). */
const promptsByControl = (() => {
  const map = new Map<string, string[]>();
  for (const t of promptPool) {
    const existing = map.get(t.actionLabel) ?? [];
    existing.push(t.label);
    map.set(t.actionLabel, existing);
  }
  return map;
})();

const controlNames = [...promptsByControl.keys()].sort();

export function DebugMenu({ adapter, state, playerId, onClose }: DebugMenuProps) {
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [lockedPrompt, setLockedPrompt] = useState<string | null>(null);

  const handlePromptClick = useCallback((label: string) => {
    if (lockedPrompt === label) {
      // Unselect — unlock and resume normal spawning.
      setLockedPrompt(null);
      adapter.debugForcePrompt(null, playerId);
    } else {
      // Select — lock to this prompt.
      setLockedPrompt(label);
      adapter.debugForcePrompt(label, playerId);
    }
  }, [lockedPrompt, adapter, playerId]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div className="debug-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="debug-panel">
        <div className="debug-header">
          <h2 className="debug-title">Debug Menu</h2>
          <button className="debug-close" onClick={handleClose} type="button">
            Esc
          </button>
        </div>

        {/* Valuation controls */}
        <section className="debug-section">
          <h3 className="debug-section-title">Market Cap</h3>
          <div className="debug-row">
            <button className="debug-btn debug-btn-danger" onClick={() => adapter.debugAdjustValuation(-1_000_000)} type="button">
              -$1M
            </button>
            <button className="debug-btn debug-btn-danger" onClick={() => adapter.debugAdjustValuation(-100_000)} type="button">
              -$100K
            </button>
            <button className="debug-btn debug-btn-success" onClick={() => adapter.debugAdjustValuation(100_000)} type="button">
              +$100K
            </button>
            <button className="debug-btn debug-btn-success" onClick={() => adapter.debugAdjustValuation(1_000_000)} type="button">
              +$1M
            </button>
          </div>
        </section>

        {/* Timer controls */}
        <section className="debug-section">
          <h3 className="debug-section-title">Round Timer</h3>
          <div className="debug-row">
            <button className="debug-btn" onClick={() => adapter.debugResetTimer()} type="button">
              Reset Timer
            </button>
          </div>
          <div className="debug-info">
            Time remaining: {Math.floor(state.deploy.timeRemainingSeconds / 60)}:{String(state.deploy.timeRemainingSeconds % 60).padStart(2, '0')}
            {' · '}Level {state.deploy.currentLevel}
          </div>
        </section>

        {/* Spawn specific prompts */}
        <section className="debug-section">
          <h3 className="debug-section-title">
            Spawn Task
            {lockedPrompt && (
              <span className="debug-locked-badge">Locked</span>
            )}
          </h3>
          <div className="debug-task-list">
            {controlNames.map(control => {
              const prompts = promptsByControl.get(control) ?? [];
              const isExpanded = expandedControl === control;

              return (
                <div key={control} className="debug-task-group">
                  <button
                    className={`debug-task-control${isExpanded ? ' debug-task-expanded' : ''}`}
                    onClick={() => setExpandedControl(isExpanded ? null : control)}
                    type="button"
                  >
                    <span>{control}</span>
                    <span className="debug-task-count">{prompts.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="debug-task-prompts">
                      {prompts.map(label => (
                        <button
                          key={label}
                          className={`debug-task-prompt${lockedPrompt === label ? ' debug-task-active' : ''}`}
                          onClick={() => handlePromptClick(label)}
                          type="button"
                        >
                          {lockedPrompt === label && <span className="debug-active-dot" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
