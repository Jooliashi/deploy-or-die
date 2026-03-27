'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MiniGamePanel } from '@/components/minigames';
import { roles } from '@/lib/game/data';
import type { PromptDefinition } from '@/lib/game/types';
import { createJazzRoom, JazzMultiplayerAdapter } from '@/lib/multiplayer/jazz-adapter';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

interface RoomClientProps {
  roomCode: string;
  playerName: string;
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

export function RoomClient({ roomCode, playerName }: RoomClientProps) {
  const adapterRef = useRef<JazzMultiplayerAdapter | null>(null);

  // Create the Jazz room + adapter once on mount.
  const adapter = useMemo<MultiplayerAdapter>(() => {
    const room = createJazzRoom();
    const jazzAdapter = new JazzMultiplayerAdapter(room);
    adapterRef.current = jazzAdapter;
    return jazzAdapter;
  }, []);

  const [state, setState] = useState<SharedRoomState>(
    adapter.getInitialState()
  );
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDefinition | null>(null);

  useEffect(() => {
    const unsubscribe = adapter.subscribe(setState);
    return () => {
      unsubscribe();
      adapterRef.current?.dispose();
    };
  }, [adapter]);

  const currentRole = state.players.find(player => player.name === playerName)?.role ?? 'frontend';
  const role = roles.find(entry => entry.id === currentRole) ?? roles[0];

  return (
    <main className="panel room-shell station-shell">
      <section className="top-rail">
        <div className="pilot-card">
          <div className="pilot-row">
            <span className="eyebrow">Room {roomCode}</span>
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
        <div className="panel-muted stat-card compact-stat">
          <div className="status-head">
            <div className="signal good" />
            <div className="stat-label">Health</div>
          </div>
          <div className="stat-value">{state.deploy.deployHealth}%</div>
          <div className="meter">
            <span style={{ width: `${state.deploy.deployHealth}%` }} />
          </div>
        </div>
        <div className="panel-muted stat-card compact-stat">
          <div className="status-head">
            <div className="signal warn" />
            <div className="stat-label">Phase</div>
          </div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {state.deploy.phaseLabel}
          </div>
          <div className="count-chip">{state.deploy.timeRemainingSeconds}s</div>
        </div>
      </section>

      <div className="station-body stack">
        <section className="prompt-overlay">
          {state.deploy.prompts.map(prompt => (
            <div
              className={`prompt-banner${selectedPrompt?.id === prompt.id ? ' active' : ''}`}
              key={prompt.id}
            >
              <div className="prompt-topline">
                <div className={`prompt-icon status-${prompt.status}`}>
                  {promptGlyph[prompt.status]}
                </div>
                <div className="prompt-meta">
                  <span>{prompt.actionLabel}</span>
                  <span>{prompt.timerSeconds}s</span>
                </div>
              </div>
              <h3 className="prompt-title">{prompt.label}</h3>
            </div>
          ))}
        </section>

        <section className="station stack">
          <div className="console-head">
            <span className="eyebrow">Station Controls</span>
            <h2 style={{ marginTop: 8 }}>{role.name} Console</h2>
          </div>
          <div className="command-board">
            {role.controls.map(control => {
              const prompt = state.deploy.prompts.find(
                entry => entry.actionLabel === control
              );
              const isActive = selectedPrompt?.id === prompt?.id;

              return (
                <div
                  className={`panel-muted button-card${isActive ? ' active' : ''}`}
                  key={control}
                >
                  <div className="button-deck">
                    <div className="button-panel">
                      <div className={`signal ${prompt ? 'warn' : 'idle'}`} />
                      <div className="button-caption">{compactLabel(control)}</div>
                    </div>
                    <div className="toggle-row" aria-hidden="true">
                      <span />
                      <span className={prompt ? 'active' : ''} />
                      <span />
                    </div>
                  </div>
                  <button
                    className={`control-button${prompt ? ' ready' : ''}`}
                    disabled={!prompt}
                    onClick={() => {
                      if (!prompt) {
                        return;
                      }
                      adapter.claimPrompt(prompt.id, playerName);
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
          <section className="mini-stage">
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
        ) : null}
      </div>
    </main>
  );
}
