'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MiniGamePanel } from '@/components/minigames';
import { WaitingRoom } from '@/components/waiting-room';
import { roles } from '@/lib/game/data';
import type { PromptDefinition } from '@/lib/game/types';
import { createJazzRoom, DEMO_ROOM_CODE, JazzMultiplayerAdapter } from '@/lib/multiplayer/jazz-adapter';
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
  const isDemo = roomCode === DEMO_ROOM_CODE;

  // In demo mode, the player gets assigned "frontend" (first role).
  // We pass it to the adapter so prompts are scoped to that role.
  const demoRole = isDemo ? roles[0].id : undefined;

  // Create the Jazz room + adapter once on mount.
  const adapter = useMemo<MultiplayerAdapter>(() => {
    const room = createJazzRoom(roomCode, demoRole);
    const jazzAdapter = new JazzMultiplayerAdapter(room, demoRole);
    adapterRef.current = jazzAdapter;
    return jazzAdapter;
  }, [roomCode, demoRole]);

  const [state, setState] = useState<SharedRoomState>(
    adapter.getInitialState()
  );
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDefinition | null>(null);
  const [meterFlash, setMeterFlash] = useState(false);
  const [now, setNow] = useState(Date.now());
  const prevHealthRef = useRef(state.deploy.deployHealth);

  // Tick every second for live countdowns.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Flash the health meter when it changes.
  useEffect(() => {
    if (state.deploy.deployHealth !== prevHealthRef.current) {
      prevHealthRef.current = state.deploy.deployHealth;
      setMeterFlash(true);
      const t = setTimeout(() => setMeterFlash(false), 400);
      return () => clearTimeout(t);
    }
  }, [state.deploy.deployHealth]);

  useEffect(() => {
    // Join the room as a player.
    adapter.addPlayer(playerName);

    const unsubscribe = adapter.subscribe(setState);
    return () => {
      unsubscribe();
      adapter.removePlayer(playerName);
      adapterRef.current?.dispose();
    };
  }, [adapter, playerName]);

  // Show waiting room until the game is started with enough players.
  if (!state.gameStarted) {
    return (
      <WaitingRoom
        roomCode={roomCode}
        playerName={playerName}
        state={state}
        adapter={adapter}
      />
    );
  }

  const currentRole = state.players.find(player => player.name === playerName)?.role ?? 'frontend';
  const role = roles.find(entry => entry.id === currentRole) ?? roles[0];

  // Only show prompts that are still live (queued or active).
  const livePrompts = state.deploy.prompts.filter(
    p => p.status === 'queued' || p.status === 'active',
  );

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
            <div className={`signal ${state.deploy.deployHealth > 50 ? 'good' : state.deploy.deployHealth > 20 ? 'warn' : 'danger'}`} />
            <div className="stat-label">Health</div>
          </div>
          <div className="stat-value">{state.deploy.deployHealth}%</div>
          <div className={`meter${meterFlash ? ' meter-flash' : ''}${state.deploy.deployHealth <= 20 ? ' meter-critical' : state.deploy.deployHealth <= 50 ? ' meter-low' : ''}`}>
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
          {livePrompts.map(prompt => {
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
            {role.controls.map(control => {
              const prompt = livePrompts.find(
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
