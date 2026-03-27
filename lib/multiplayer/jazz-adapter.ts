import { co, Group, type ID } from 'jazz-tools';
import { demoDeployState, pickRandomPrompts, promptPool, roles, STARTING_VALUATION } from '@/lib/game/data';
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

/** Resolution spec for deeply loading a JazzRoom. */
const ROOM_RESOLVE = {
  deploy: { prompts: { $each: true }, valuationHistory: true },
  players: { $each: true },
} as const;

/** A JazzRoom with deploy.prompts, valuationHistory, and players deeply loaded. */
type LoadedJazzRoom = co.loaded<typeof JazzRoom, typeof ROOM_RESOLVE>;

/** Available roles that get assigned round-robin as players join. */
const availableRoles: RoleId[] = roles.map(r => r.id);

let promptCounter = 0;

/** Max alerts assigned to each individual player at once. Change to 2 or 3
 *  if you want players to juggle multiple tasks simultaneously. */
export const MAX_VISIBLE_ALERTS = 1;

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
    assignedTo: p.assignedTo,
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
    ready: p.ready,
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
  #playerControls: string[] | undefined;
  /** Whether this client is the host (runs the tick/spawn loop).
   *  In demo mode, always true. In multiplayer, true for the room creator. */
  #isHost: boolean;

  constructor(room: LoadedJazzRoom, options?: {
    playerControls?: string[];
    isHost?: boolean;
  }) {
    this.#room = room;
    this.#playerControls = options?.playerControls;
    this.#isHost = options?.isHost ?? true;

    this.#unsubscribe = JazzRoom.subscribe(
      room.$jazz.id,
      { resolve: ROOM_RESOLVE },
      (updated) => {
        this.#room = updated;
        this.#emit();
      },
    );

    // Only the host runs the game tick to avoid duplicate spawns/expirations.
    if (this.#isHost) {
      this.#tickInterval = setInterval(() => this.#tick(), 1000);
    }
  }

  getInitialState(): SharedRoomState {
    return coRoomToState(this.#room);
  }

  addPlayer(playerId: string, name: string): void {
    const exists = this.#room.players.some(p => p.playerId === playerId);
    if (exists) return;
    const role = availableRoles[this.#room.players.length % availableRoles.length];
    this.#room.players.$jazz.push({
      playerId,
      name,
      role,
      ready: false,
    });
  }

  toggleReady(playerId: string): void {
    const player = this.#room.players.find(p => p.playerId === playerId);
    if (player) {
      player.$jazz.set('ready', !player.ready);
      this.#checkAutoStart();
    }
  }

  removePlayer(playerId: string): void {
    const idx = this.#room.players.findIndex(p => p.playerId === playerId);
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
      // Only the host spawns replacements to avoid duplicates across clients.
      if (this.#isHost) this.#spawnIfNeeded();
    }
  }

  failPrompt(promptId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'failed');
      this.#adjustValuation(-120_000);
      if (this.#isHost) this.#spawnIfNeeded();
    }
  }

  subscribe(listener: (state: SharedRoomState) => void): () => void {
    this.#listeners.add(listener);
    listener(coRoomToState(this.#room));
    return () => { this.#listeners.delete(listener); };
  }

  dispose(): void {
    this.#unsubscribe?.();
    if (this.#tickInterval) clearInterval(this.#tickInterval);
    this.#listeners.clear();
  }

  #adjustValuation(delta: number): void {
    const newVal = Math.max(this.#room.deploy.valuation + delta, 0);
    this.#room.deploy.$jazz.set('valuation', newVal);
    this.#room.deploy.valuationHistory.$jazz.push(newVal);
    if (newVal <= 0 && !this.#room.deploy.bankrupt) {
      this.#room.deploy.$jazz.set('bankrupt', true);
    }
  }

  #tick(): void {
    if (!this.#room.gameStarted || this.#room.deploy.bankrupt) return;

    const now = Date.now();
    let valuationDelta = 0;
    let expired = false;

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

    if (valuationDelta !== 0) {
      this.#adjustValuation(valuationDelta);
    }

    const liveCount = this.#room.deploy.prompts.filter(
      p => p.status === 'queued' || p.status === 'active',
    ).length;
    if (liveCount > 0 && valuationDelta === 0) {
      const drift = (Math.random() - 0.6) * 8_000;
      this.#adjustValuation(drift);
    }

    if (this.#room.deploy.timeRemainingSeconds > 0) {
      this.#room.deploy.$jazz.set(
        'timeRemainingSeconds',
        this.#room.deploy.timeRemainingSeconds - 1,
      );
    }

    // Always check if new prompts need spawning (covers both expirations and
    // prompts resolved/failed by other clients).
    this.#spawnIfNeeded();
  }

  /** Ensure every player always has at least MAX_VISIBLE_ALERTS live prompts
   *  assigned to them. Spawns one prompt per player that's missing one. */
  #spawnIfNeeded(): void {
    const live = this.#room.deploy.prompts.filter(
      p => p.status === 'queued' || p.status === 'active',
    );

    const players = this.#room.players;
    if (players.length === 0) return;

    const isDemo = !!this.#playerControls;
    const rolesInGame = [...new Set(players.map(p => p.role as RoleId))];

    // For each player, check if they have enough live alerts.
    for (let pi = 0; pi < players.length; pi++) {
      const player = players[pi];
      const theirAlerts = live.filter(p => p.assignedTo === player.playerId).length;
      if (theirAlerts >= MAX_VISIBLE_ALERTS) continue;

      const deficit = MAX_VISIBLE_ALERTS - theirAlerts;
      for (let d = 0; d < deficit; d++) {
        if (isDemo) {
          // Demo: spawn for the player's own controls.
          const newPrompts = pickRandomPrompts(1, this.#playerControls);
          if (newPrompts.length === 0) continue;
          const p = newPrompts[0];
          this.#room.deploy.prompts.$jazz.push({
            promptId: p.id, label: p.label, hint: p.hint,
            ownerRole: p.ownerRole, actionLabel: p.actionLabel,
            miniGameId: p.miniGameId, timerSeconds: p.timerSeconds,
            status: p.status, createdAt: p.createdAt,
            assignedTo: player.playerId,
          });
          continue;
        }

        // Multiplayer: pick a role that this player does NOT have, so they
        // can't solve it themselves and must communicate.
        const otherRoles = rolesInGame.filter(r => r !== player.role);
        const targetRole = otherRoles.length > 0
          ? otherRoles[Math.floor(Math.random() * otherRoles.length)]
          : rolesInGame[Math.floor(Math.random() * rolesInGame.length)];

        const rolePool = promptPool.filter(t => t.ownerRole === targetRole);
        if (rolePool.length === 0) continue;
        const template = rolePool[Math.floor(Math.random() * rolePool.length)];

        promptCounter += 1;
        this.#room.deploy.prompts.$jazz.push({
          promptId: `prompt-${Date.now()}-${promptCounter}`,
          label: template.label,
          hint: template.hint,
          ownerRole: template.ownerRole,
          actionLabel: template.actionLabel,
          miniGameId: template.miniGameId,
          timerSeconds: template.timerSeconds,
          status: 'queued',
          createdAt: Date.now(),
          assignedTo: player.playerId,
        });
      }
    }
  }

  /** Auto-start the game when >= 2 players and all are ready. */
  #checkAutoStart(): void {
    if (this.#room.gameStarted) return;
    const players = this.#room.players;
    if (players.length < 2) return;
    const allReady = players.every(p => p.ready);
    if (allReady) {
      this.#room.$jazz.set('gameStarted', true);
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
// Room creation & loading
// ---------------------------------------------------------------------------

/** Well-known demo room code that skips the waiting room. */
export const DEMO_ROOM_CODE = 'SHIP-42';

/**
 * Create a new Jazz room. For multiplayer rooms, uses a public Group so any
 * player can join and write. Returns the LoadedJazzRoom and its Jazz CoValue ID.
 */
export function createJazzRoom(options: {
  roomCode: string;
  isDemo?: boolean;
  playerControls?: string[];
}): { room: LoadedJazzRoom; id: string } {
  const { roomCode, isDemo, playerControls } = options;

  // For multiplayer rooms, create a public group so anyone can join.
  // For demo, default ownership is fine (single player).
  const ownerGroup = isDemo ? undefined : (() => {
    const g = Group.create();
    g.addMember('everyone', 'writer');
    return g;
  })();

  const ownerOpt = ownerGroup ? { owner: ownerGroup } : undefined;

  // Demo: seed 1 prompt for the player. Multiplayer: start empty — the host
  // will spawn prompts once the game starts and player roles are known.
  const initialPrompts = isDemo && playerControls
    ? pickRandomPrompts(1, playerControls)
    : [];

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
      assignedTo: 'p1', // demo player
    })),
    ownerOpt,
  );

  const valuationHistory = JazzValuationHistory.create(
    [STARTING_VALUATION],
    ownerOpt,
  );

  const deploy = JazzDeployState.create({
    roomCode,
    valuation: STARTING_VALUATION,
    valuationHistory,
    timeRemainingSeconds: 300,
    prompts,
    bankrupt: false,
  }, ownerOpt);

  const players = isDemo
    ? JazzPlayerList.create(
        roles.map((role, i) => ({
          playerId: `p${i + 1}`,
          name: ['Alex', 'Jules', 'Mina'][i],
          role: role.id,
          ready: true,
        })),
        ownerOpt,
      )
    : JazzPlayerList.create([], ownerOpt);

  const room = JazzRoom.create(
    { deploy, players, gameStarted: !!isDemo },
    ownerOpt,
  ) as unknown as LoadedJazzRoom;

  return { room, id: room.$jazz.id };
}

/**
 * Load an existing Jazz room by its CoValue ID.
 * Returns null if the room can't be found/loaded/accessible.
 */
export async function loadJazzRoom(
  jazzId: string,
): Promise<LoadedJazzRoom | null> {
  try {
    const result = await JazzRoom.load(jazzId as ID<typeof JazzRoom>, {
      resolve: ROOM_RESOLVE,
    });
    if (!result || !result.$isLoaded) return null;
    return result as LoadedJazzRoom;
  } catch {
    return null;
  }
}
