import { co } from 'jazz-tools';
import { demoDeployState, pickRandomPrompts, roles, STARTING_VALUATION } from '@/lib/game/data';
import type { DeployState, PromptDefinition, PromptStatus, RoleId } from '@/lib/game/types';
import {
  JazzDeployState,
  JazzPlayer,
  JazzPlayerList,
  JazzPromptList,
  JazzRoom,
  JazzValuationHistory,
} from '@/lib/multiplayer/schema';
import type { MultiplayerAdapter, PlayerPresence, SharedRoomState } from '@/lib/multiplayer/types';

// ---------------------------------------------------------------------------
// Helpers to convert between Jazz CoValues and plain game types
// ---------------------------------------------------------------------------

/** A JazzRoom with deploy.prompts, valuationHistory, and players deeply loaded. */
type LoadedJazzRoom = co.loaded<typeof JazzRoom, {
  deploy: { prompts: { $each: true }; valuationHistory: true };
  players: { $each: true };
}>;

/** Available roles that get assigned round-robin as players join. */
const availableRoles: RoleId[] = roles.map(r => r.id);

function coRoomToState(room: LoadedJazzRoom): SharedRoomState {
  const prompts: PromptDefinition[] = room.deploy.prompts.map(p => ({
    id: p.promptId,
    label: p.label,
    hint: p.hint,
    ownerRole: p.ownerRole as RoleId,
    actionLabel: p.actionLabel,
    miniGameId: p.miniGameId as PromptDefinition['miniGameId'],
    timerSeconds: p.timerSeconds,
    status: p.status as PromptStatus,
    createdAt: p.createdAt,
  }));

  const deploy: DeployState = {
    roomCode: room.deploy.roomCode,
    valuation: room.deploy.valuation,
    valuationHistory: [...room.deploy.valuationHistory],
    timeRemainingSeconds: room.deploy.timeRemainingSeconds,
    prompts,
    bankrupt: room.deploy.bankrupt,
  };

  const players: PlayerPresence[] = room.players.map(p => ({
    id: p.playerId,
    name: p.name,
    role: p.role as RoleId,
  }));

  return { deploy, players, gameStarted: room.gameStarted };
}

// ---------------------------------------------------------------------------
// JazzMultiplayerAdapter
// ---------------------------------------------------------------------------

export class JazzMultiplayerAdapter implements MultiplayerAdapter {
  #room: LoadedJazzRoom;
  #listeners = new Set<(state: SharedRoomState) => void>();
  #unsubscribe: (() => void) | null = null;
  #tickInterval: ReturnType<typeof setInterval> | null = null;
  /** The set of actionLabels the local player can handle. When set, spawned
   *  prompts are filtered to only those the player has buttons for. */
  #playerControls: string[] | undefined;

  constructor(room: LoadedJazzRoom, playerControls?: string[]) {
    this.#room = room;
    this.#playerControls = playerControls;

    // Subscribe to changes from Jazz and forward to local listeners.
    this.#unsubscribe = JazzRoom.subscribe(
      room.$jazz.id,
      { resolve: { deploy: { prompts: { $each: true }, valuationHistory: true }, players: { $each: true } } },
      (updated) => {
        this.#room = updated;
        this.#emit();
      },
    );

    // Start the game tick — runs every second while the game is active.
    this.#tickInterval = setInterval(() => this.#tick(), 1000);
  }

  getInitialState(): SharedRoomState {
    return coRoomToState(this.#room);
  }

  addPlayer(name: string): void {
    // Don't add duplicates.
    const exists = this.#room.players.some(p => p.name === name);
    if (exists) return;

    const role = availableRoles[this.#room.players.length % availableRoles.length];
    const id = `p${Date.now()}`;
    this.#room.players.$jazz.push({
      playerId: id,
      name,
      role,
    });
  }

  removePlayer(name: string): void {
    const idx = this.#room.players.findIndex(p => p.name === name);
    if (idx !== -1) {
      this.#room.players.$jazz.splice(idx, 1);
    }
  }

  startGame(): void {
    this.#room.$jazz.set('gameStarted', true);
  }

  claimPrompt(promptId: string, _playerId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'active');
    }
  }

  resolvePrompt(promptId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'resolved');
      this.#adjustValuation(50_000);
      this.#spawnIfNeeded();
    }
  }

  failPrompt(promptId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'failed');
      this.#adjustValuation(-120_000);
      this.#spawnIfNeeded();
    }
  }

  subscribe(listener: (state: SharedRoomState) => void): () => void {
    this.#listeners.add(listener);
    listener(coRoomToState(this.#room));
    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    this.#unsubscribe?.();
    if (this.#tickInterval) clearInterval(this.#tickInterval);
    this.#listeners.clear();
  }

  /** Adjust valuation by delta, record in history, check for bankruptcy. */
  #adjustValuation(delta: number): void {
    const newVal = Math.max(this.#room.deploy.valuation + delta, 0);
    this.#room.deploy.$jazz.set('valuation', newVal);
    this.#room.deploy.valuationHistory.$jazz.push(newVal);

    if (newVal <= 0 && !this.#room.deploy.bankrupt) {
      this.#room.deploy.$jazz.set('bankrupt', true);
    }
  }

  /** Game tick — runs every second. Expires overdue prompts and updates timers. */
  #tick(): void {
    if (!this.#room.gameStarted || this.#room.deploy.bankrupt) return;

    const now = Date.now();
    let valuationDelta = 0;
    let expired = false;

    // Check each live prompt for expiration.
    for (let i = 0; i < this.#room.deploy.prompts.length; i++) {
      const p = this.#room.deploy.prompts[i];
      if (p.status !== 'queued' && p.status !== 'active') continue;
      const elapsed = (now - p.createdAt) / 1000;
      if (elapsed >= p.timerSeconds) {
        p.$jazz.set('status', 'expired');
        valuationDelta -= 80_000;
        expired = true;
      }
    }

    // Apply valuation changes from expirations.
    if (valuationDelta !== 0) {
      this.#adjustValuation(valuationDelta);
    }

    // Small natural valuation drift (slight upward when stable).
    const liveCount = this.#room.deploy.prompts.filter(
      p => p.status === 'queued' || p.status === 'active',
    ).length;
    if (liveCount > 0 && valuationDelta === 0) {
      // Slight random drift: tends down under pressure.
      const drift = (Math.random() - 0.6) * 8_000;
      this.#adjustValuation(drift);
    }

    // Decrement global timer.
    if (this.#room.deploy.timeRemainingSeconds > 0) {
      this.#room.deploy.$jazz.set(
        'timeRemainingSeconds',
        this.#room.deploy.timeRemainingSeconds - 1,
      );
    }

    // Spawn replacements for expired prompts.
    if (expired) {
      this.#spawnIfNeeded();
    }
  }

  /** Keep at least 3 live (queued/active) prompts in play. */
  #spawnIfNeeded(): void {
    const live = this.#room.deploy.prompts.filter(
      p => p.status === 'queued' || p.status === 'active',
    );
    const deficit = 3 - live.length;
    if (deficit <= 0) return;

    // Only spawn prompts that match the player's available controls.
    const newPrompts = pickRandomPrompts(deficit, this.#playerControls);
    for (const p of newPrompts) {
      this.#room.deploy.prompts.$jazz.push({
        promptId: p.id,
        label: p.label,
        hint: p.hint,
        ownerRole: p.ownerRole,
        actionLabel: p.actionLabel,
        miniGameId: p.miniGameId,
        timerSeconds: p.timerSeconds,
        status: p.status,
        createdAt: p.createdAt,
      });
    }
  }

  #emit(): void {
    const state = coRoomToState(this.#room);
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}

// ---------------------------------------------------------------------------
// Room creation helper — builds initial CoValues from demo data
// ---------------------------------------------------------------------------

/** Well-known demo room code that skips the waiting room. */
export const DEMO_ROOM_CODE = 'SHIP-42';

export function createJazzRoom(roomCode: string, playerControls?: string[]): LoadedJazzRoom {
  const isDemo = roomCode === DEMO_ROOM_CODE;

  // In demo mode, seed prompts that match the player's controls only.
  const initialPrompts = isDemo && playerControls
    ? pickRandomPrompts(3, playerControls)
    : demoDeployState.prompts;

  const prompts = JazzPromptList.create(
    initialPrompts.map(p => ({
      promptId: p.id,
      label: p.label,
      hint: p.hint,
      ownerRole: p.ownerRole,
      actionLabel: p.actionLabel,
      miniGameId: p.miniGameId,
      timerSeconds: p.timerSeconds,
      status: p.status,
      createdAt: p.createdAt,
    })),
  );

  const valuationHistory = JazzValuationHistory.create([STARTING_VALUATION]);

  const deploy = JazzDeployState.create({
    roomCode,
    valuation: STARTING_VALUATION,
    valuationHistory,
    timeRemainingSeconds: demoDeployState.timeRemainingSeconds,
    prompts,
    bankrupt: false,
  });

  // Demo rooms start with pre-seeded players and gameStarted=true so a single
  // player can explore the UI immediately. Private rooms start empty.
  const players = isDemo
    ? JazzPlayerList.create(
        roles.map((role, i) => ({
          playerId: `p${i + 1}`,
          name: ['Alex', 'Jules', 'Mina'][i],
          role: role.id,
        })),
      )
    : JazzPlayerList.create([]);

  // The room and all nested CoValues were just created in-memory, so they are
  // guaranteed to be fully loaded. The cast is safe because Jazz types mark
  // nested refs as MaybeLoaded to account for network loading, which doesn't
  // apply to freshly-created local data.
  return JazzRoom.create({ deploy, players, gameStarted: isDemo }) as unknown as LoadedJazzRoom;
}
