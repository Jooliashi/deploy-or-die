'use client';

import { useCallback, useState } from 'react';
import { roles } from '@/lib/game/data';
import { hasMiniGame } from '@/components/minigames';
import { ControlIcon, getControlSkin } from '@/components/room-client';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

/** All unique control labels for the gallery. */
const allControls = roles.flatMap(r => r.controls.map(c => c.label));

interface DebugMenuProps {
  adapter: MultiplayerAdapter;
  state: SharedRoomState;
  playerId: string;
  onClose: () => void;
}

function formatSubControlLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function DebugMenu({ adapter, state, playerId, onClose }: DebugMenuProps) {
  const [lockedPrompt, setLockedPrompt] = useState<string | null>(null);

  const handlePromptClick = useCallback((label: string) => {
    if (lockedPrompt === label) {
      setLockedPrompt(null);
      adapter.debugForcePrompt(null, playerId);
    } else {
      setLockedPrompt(label);
      adapter.debugForcePrompt(label, playerId);
    }
  }, [lockedPrompt, adapter, playerId]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const totalPrompts = roles.reduce(
    (sum, r) => sum + r.controls.reduce(
      (cs, c) => cs + Object.values(c.subControls).reduce((ss, arr) => ss + arr.length, 0),
      0,
    ),
    0,
  );

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

        {/* Task tree */}
        <section className="debug-section">
          <h3 className="debug-section-title">
            Tasks
            <span className="debug-count-badge">{totalPrompts} prompts</span>
            {lockedPrompt && <span className="debug-locked-badge">Locked</span>}
          </h3>
          <div className="debug-tree">
            {roles.map(role => (
              <div key={role.id} className="debug-tree-category">
                <div className="debug-tree-category-head">
                  <span className="debug-tree-icon">▸</span>
                  <span className="debug-tree-category-name">{role.name}</span>
                  <span className="debug-tree-meta">{role.controls.length} controls</span>
                </div>

                {role.controls.map(control => {
                  const subKeys = Object.keys(control.subControls);
                  const promptCount = Object.values(control.subControls).reduce((s, arr) => s + arr.length, 0);
                  const hasGame = hasMiniGame(control.miniGameId);

                  return (
                    <div key={control.label} className="debug-tree-control">
                      <div className="debug-tree-control-head">
                        <span className="debug-tree-icon debug-tree-icon-sm">▹</span>
                        <span className="debug-tree-control-name">{control.label}</span>
                        {control.miniGameId ? (
                          <span className={`debug-tree-tag ${hasGame ? 'debug-tree-tag-game' : 'debug-tree-tag-none'}`}>
                            {control.miniGameId}
                          </span>
                        ) : (
                          <span className="debug-tree-tag debug-tree-tag-none">no game</span>
                        )}
                        <span className="debug-tree-meta">{promptCount}p</span>
                      </div>

                      {subKeys.map(subKey => {
                        const prompts = control.subControls[subKey];
                        const subLabel = subKey === 'default' ? null : formatSubControlLabel(subKey);

                        return (
                          <div key={subKey} className="debug-tree-sub">
                            {subLabel && (
                              <div className="debug-tree-sub-head">
                                <span className="debug-tree-icon debug-tree-icon-xs">·</span>
                                <span className="debug-tree-sub-name">{subLabel}</span>
                              </div>
                            )}
                            {prompts.map(prompt => (
                              <button
                                key={prompt.label}
                                className={`debug-tree-prompt${lockedPrompt === prompt.label ? ' debug-tree-prompt-active' : ''}`}
                                onClick={() => handlePromptClick(prompt.label)}
                                type="button"
                              >
                                <span className="debug-tree-prompt-text">{prompt.label}</span>
                                <span className="debug-tree-prompt-timer">{prompt.timerSeconds}s</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* Button gallery */}
        <section className="debug-section">
          <h3 className="debug-section-title">
            Button Gallery
            <span className="debug-count-badge">{allControls.length} buttons</span>
          </h3>
          <div className="debug-gallery">
            {allControls.map(label => {
              const skin = getControlSkin(label);
              return (
                <div key={label} className="debug-gallery-item">
                  <ControlIcon skin={skin} hasPrompt={false} />
                  <span className="debug-gallery-label">{label}</span>
                  <span className="debug-gallery-skin">{skin}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
