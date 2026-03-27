import { co } from 'jazz-tools';
import { demoDeployState, pickRandomPrompts, roles } from '@/lib/game/data';
import type { DeployState, PromptDefinition, PromptStatus, RoleId } from '@/lib/game/types';
import {
  JazzDeployState,
  JazzPlayer,
  JazzPlayerList,
  JazzPromptList,
  JazzRoom,
} from '@/lib/multiplayer/schema';
import type { MultiplayerAdapter, PlayerPresence, SharedRoomState } from '@/lib/multiplayer/types';

// ---------------------------------------------------------------------------
// Helpers to convert between Jazz CoValues and plain game types
// ---------------------------------------------------------------------------

/** A JazzRoom with deploy.prompts and players deeply loaded. */
type LoadedJazzRoom = co.loaded<typeof JazzRoom, {
  deploy: { prompts: { $each: true } };
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
    deployHealth: room.deploy.deployHealth,
    phaseLabel: room.deploy.phaseLabel,
    timeRemainingSeconds: room.deploy.timeRemainingSeconds,
    prompts,
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

/** Map health ranges to phase labels. */
function phaseForHealth(health: number): string {
  if (health > 80) return 'Smooth Sailing';
  if (health > 60) return 'Incident Spiral';
  if (health > 40) return 'Fire Drill';
  if (health > 20) return 'Meltdown';
  return 'Total Collapse';
}

export class JazzMultiplayerAdapter implements MultiplayerAdapter {
  #room: LoadedJazzRoom;
  #listeners = new Set<(state: SharedRoomState) => void>();
  #unsubscribe: (() => void) | null = null;
  #tickInterval: ReturnType<typeof setInterval> | null = null;
  #demoRole: RoleId | undefined;

  constructor(room: LoadedJazzRoom, demoRole?: RoleId) {
    this.#room = room;
    this.#demoRole = demoRole;

    // Subscribe to changes from Jazz and forward to local listeners.
    this.#unsubscribe = JazzRoom.subscribe(
      room.$jazz.id,
      { resolve: { deploy: { prompts: { $each: true } }, players: { $each: true } } },
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
      const newHealth = Math.min(this.#room.deploy.deployHealth + 6, 100);
      this.#room.deploy.$jazz.set('deployHealth', newHealth);
      this.#spawnIfNeeded();
    }
  }

  failPrompt(promptId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'failed');
      const newHealth = Math.max(this.#room.deploy.deployHealth - 14, 0);
      this.#room.deploy.$jazz.set('deployHealth', newHealth);
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

  /** Game tick — runs every second. Expires overdue prompts and updates timers. */
  #tick(): void {
    if (!this.#room.gameStarted) return;

    const now = Date.now();
    let healthDelta = 0;
    let expired = false;

    // Check each live prompt for expiration.
    for (let i = 0; i < this.#room.deploy.prompts.length; i++) {
      const p = this.#room.deploy.prompts[i];
      if (p.status !== 'queued' && p.status !== 'active') continue;
      const elapsed = (now - p.createdAt) / 1000;
      if (elapsed >= p.timerSeconds) {
        p.$jazz.set('status', 'expired');
        healthDelta -= 10;
        expired = true;
      }
    }

    // Apply health changes from expirations.
    if (healthDelta !== 0) {
      const newHealth = Math.max(this.#room.deploy.deployHealth + healthDelta, 0);
      this.#room.deploy.$jazz.set('deployHealth', newHealth);
    }

    // Update phase label based on current health.
    const currentPhase = phaseForHealth(this.#room.deploy.deployHealth);
    if (this.#room.deploy.phaseLabel !== currentPhase) {
      this.#room.deploy.$jazz.set('phaseLabel', currentPhase);
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

    // In demo mode, only spawn prompts for the player's role so all prompts
    // are actionable from their single station.
    const newPrompts = pickRandomPrompts(deficit, this.#demoRole);
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

export function createJazzRoom(roomCode: string, demoRole?: RoleId): LoadedJazzRoom {
  const isDemo = roomCode === DEMO_ROOM_CODE;

  // In demo mode, seed prompts for the player's specific role only.
  const initialPrompts = isDemo && demoRole
    ? pickRandomPrompts(3, demoRole)
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

  const deploy = JazzDeployState.create({
    roomCode,
    deployHealth: demoDeployState.deployHealth,
    phaseLabel: demoDeployState.phaseLabel,
    timeRemainingSeconds: demoDeployState.timeRemainingSeconds,
    prompts,
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
