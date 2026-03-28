import { co, Group, type ID } from 'jazz-tools';
import { demoDeployState, LEVELS, pickRandomPrompts, promptPool, roles, STARTING_VALUATION } from '@/lib/game/data';
import type { DeployState, LevelPhase, PromptDefinition, PromptStatus } from '@/lib/game/types';
import {
  JazzControlList,
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
  players: { $each: { controls: true } },
} as const;

/** A JazzRoom with deploy.prompts, valuationHistory, and players deeply loaded. */
type LoadedJazzRoom = co.loaded<typeof JazzRoom, typeof ROOM_RESOLVE>;

/** All control labels from the full pool. */
const ALL_CONTROL_LABELS = [...new Set(promptPool.map(t => t.actionLabel))];

/** Number of controls each player gets. */
const CONTROLS_PER_PLAYER = LEVELS[LEVELS.length - 1].buttonCount;

let promptCounter = 0;

/** Max alerts shown to each individual player at once. Change to 2 or 3
 *  if you want players to juggle multiple tasks simultaneously. */
export const MAX_VISIBLE_ALERTS = 1;

/** How many queued prompts to keep in the backlog per player so there's
 *  always a next task ready the instant the current one completes. */
const QUEUE_DEPTH = 5;
const MIN_PROMPT_TIMER_SECONDS = 30;
const EXTRA_SECONDS_PER_ADDITIONAL_PLAYER = 5;
const RESOLVE_VALUATION_DELTA = 50_000;
const FAIL_VALUATION_DELTA = -200_000;
const EXPIRE_VALUATION_DELTA = -150_000;
const MISFIRE_VALUATION_DELTA = -50_000;

function scalePromptTimer(timerSeconds: number, playerCount: number): number {
  const base = Math.max(timerSeconds, MIN_PROMPT_TIMER_SECONDS);
  const extraPlayers = Math.max(0, playerCount - 2);
  return base + extraPlayers * EXTRA_SECONDS_PER_ADDITIONAL_PLAYER;
}

function getFailureThreshold(playerCount: number): number {
  return Math.max(3, playerCount + 1);
}

function getLevelConfig(level: number) {
  return LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))];
}

function coRoomToState(room: LoadedJazzRoom): SharedRoomState {
  const prompts: PromptDefinition[] = room.deploy.prompts.map(p => ({
    id: p.promptId,
    label: p.label,
    ownerRole: p.ownerRole as PromptDefinition['ownerRole'],
    actionLabel: p.actionLabel,
    selectionLabel: p.selectionLabel,
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
    currentLevel: room.deploy.currentLevel,
    levelPhase: room.deploy.levelPhase as LevelPhase,
    timeRemainingSeconds: room.deploy.timeRemainingSeconds,
    prompts,
    consecutiveFailures: room.deploy.consecutiveFailures,
    failureThreshold: room.deploy.failureThreshold,
    bankrupt: room.deploy.bankrupt,
  };

  const players: PlayerPresence[] = room.players.map(p => ({
    id: p.playerId,
    name: p.name,
    ready: p.ready,
    controls: [...p.controls],
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
  /** Whether this client is the host (runs the tick/spawn loop). */
  #isHost: boolean;
  /** The owning Group for this room (for creating CoValues with correct access). */
  #ownerGroup: Group | undefined;

  constructor(room: LoadedJazzRoom, options?: {
    playerControls?: string[];
    isHost?: boolean;
    ownerGroup?: Group;
  }) {
    this.#room = room;
    this.#playerControls = options?.playerControls;
    this.#isHost = options?.isHost ?? true;
    this.#ownerGroup = options?.ownerGroup;

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
    // Controls are assigned by the host when the game starts (or pre-set in demo).
    const ownerOpt = this.#ownerGroup ? { owner: this.#ownerGroup } : undefined;
    const controls = JazzControlList.create([], ownerOpt);
    this.#room.players.$jazz.push({
      playerId,
      name,
      ready: false,
      controls,
    });
  }

  toggleReady(playerId: string): void {
    const player = this.#room.players.find(p => p.playerId === playerId);
    if (player) {
      player.$jazz.set('ready', !player.ready);
      this.#checkProgressionReady();
    }
  }

  removePlayer(playerId: string): void {
    const idx = this.#room.players.findIndex(p => p.playerId === playerId);
    if (idx !== -1) {
      this.#room.players.$jazz.splice(idx, 1);
    }
  }

  startGame(): void {
    if (this.#isHost) {
      this.#distributeControls();
      this.#setLevelBriefing(1);
    }
    this.#room.$jazz.set('gameStarted', true);
  }

  /** Distribute controls evenly across all players. Each player gets
   *  CONTROLS_PER_PLAYER controls. Controls are shuffled and dealt round-robin
   *  so no two players share the same control (as much as possible). */
  #distributeControls(): void {
    const players = this.#room.players;
    if (players.length === 0) return;

    const shuffled = [...ALL_CONTROL_LABELS].sort(() => Math.random() - 0.5);
    const totalNeeded = players.length * CONTROLS_PER_PLAYER;

    // If we need more controls than available, cycle through the pool.
    const pool: string[] = [];
    while (pool.length < totalNeeded) {
      pool.push(...shuffled);
    }

    for (let pi = 0; pi < players.length; pi++) {
      const player = players[pi];
      // Clear existing controls.
      while (player.controls.length > 0) {
        player.controls.$jazz.splice(0, 1);
      }
      // Deal round-robin: player 0 gets indices 0,n,2n,... player 1 gets 1,n+1,2n+1,...
      for (let ci = 0; ci < CONTROLS_PER_PLAYER; ci++) {
        const idx = ci * players.length + pi;
        player.controls.$jazz.push(pool[idx % pool.length]);
      }
    }
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
      this.#room.deploy.$jazz.set('consecutiveFailures', 0);
      this.#adjustValuation(RESOLVE_VALUATION_DELTA);
      if (this.#isHost && this.#room.deploy.levelPhase === 'playing') {
        // Immediately activate the next queued prompt so there's zero gap.
        this.#activateNextPrompts();
        this.#spawnIfNeeded();
      }
    }
  }

  failPrompt(promptId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'failed');
      this.#recordFailure();
      this.#adjustValuation(FAIL_VALUATION_DELTA);
      if (this.#isHost && this.#room.deploy.levelPhase === 'playing') {
        this.#activateNextPrompts();
        this.#spawnIfNeeded();
      }
    }
  }

  misfireControl(_playerId: string, _controlLabel: string): void {
    this.#adjustValuation(MISFIRE_VALUATION_DELTA);
    if (this.#isHost && this.#room.deploy.levelPhase === 'playing') {
      this.#activateNextPrompts();
      this.#spawnIfNeeded();
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

  #recordFailure(): void {
    const threshold = getFailureThreshold(Math.max(this.#room.players.length, 1));
    this.#room.deploy.$jazz.set('failureThreshold', threshold);
    const nextFailures = this.#room.deploy.consecutiveFailures + 1;
    this.#room.deploy.$jazz.set('consecutiveFailures', nextFailures);
    if (nextFailures >= threshold && !this.#room.deploy.bankrupt) {
      this.#room.deploy.$jazz.set('bankrupt', true);
    }
  }

  #tick(): void {
    if (!this.#room.gameStarted || this.#room.deploy.bankrupt) return;
    if (this.#room.deploy.levelPhase !== 'playing') return;

    const now = Date.now();
    let valuationDelta = 0;

    for (let i = 0; i < this.#room.deploy.prompts.length; i++) {
      const p = this.#room.deploy.prompts[i];
      if (p.status !== 'queued' && p.status !== 'active') continue;
      // Only expire prompts that have been activated (createdAt > 0).
      if (p.createdAt === 0) continue;
      const elapsed = (now - p.createdAt) / 1000;
      if (elapsed >= p.timerSeconds) {
        p.$jazz.set('status', 'expired');
        this.#recordFailure();
        valuationDelta += EXPIRE_VALUATION_DELTA;
      }
    }

    if (valuationDelta !== 0) {
      this.#adjustValuation(valuationDelta);
    }

    const startedCount = this.#room.deploy.prompts.filter(
      p => (p.status === 'queued' || p.status === 'active') && p.createdAt > 0,
    ).length;
    if (startedCount > 0 && valuationDelta === 0) {
      const drift = (Math.random() - 0.6) * 8_000;
      this.#adjustValuation(drift);
    }

    if (this.#room.deploy.timeRemainingSeconds > 0) {
      const nextTime = this.#room.deploy.timeRemainingSeconds - 1;
      this.#room.deploy.$jazz.set('timeRemainingSeconds', nextTime);
      if (nextTime <= 0) {
        this.#completeCurrentLevel();
        return;
      }
    }

    // Activate next prompts for any player that has no visible task.
    this.#activateNextPrompts();
    // Top up the queue.
    this.#spawnIfNeeded();
  }

  /** Keep a deep queue per player. Prompts in the queue have createdAt = 0
   *  (not yet started). The tick activates the next one when a player has no
   *  active prompt. This means the next task appears instantly. */
  #spawnIfNeeded(): void {
    const players = this.#room.players;
    if (players.length === 0) return;

    const isDemo = !!this.#playerControls;
    const scaledPlayerCount = Math.max(players.length, 1);
    const activeButtonCount = getLevelConfig(this.#room.deploy.currentLevel).buttonCount;
    this.#room.deploy.$jazz.set('failureThreshold', getFailureThreshold(scaledPlayerCount));

    // Collect all controls across all players (for cross-player assignment).
    const allPlayerControls = new Set<string>();
    for (let i = 0; i < players.length; i++) {
      const visibleControls = [...players[i].controls].slice(0, activeButtonCount);
      for (let j = 0; j < visibleControls.length; j++) {
        allPlayerControls.add(visibleControls[j]);
      }
    }

    for (let pi = 0; pi < players.length; pi++) {
      const player = players[pi];
      const playerCtrls = [...player.controls].slice(0, activeButtonCount);

      // Pipeline = all queued/active prompts for this player.
      const pipeline = this.#room.deploy.prompts.filter(
        p => p.assignedTo === player.playerId &&
          (p.status === 'queued' || p.status === 'active'),
      );
      const needed = QUEUE_DEPTH - pipeline.length;
      if (needed <= 0) continue;

      // Once a prompt label has appeared anywhere in the room, don't ask it again.
      const usedLabels = new Set(this.#room.deploy.prompts.map(p => p.label));

      for (let d = 0; d < needed; d++) {
        const template = this.#pickTemplate(isDemo, playerCtrls, allPlayerControls, usedLabels);
        if (!template) continue;
        usedLabels.add(template.label);

        promptCounter += 1;
        this.#room.deploy.prompts.$jazz.push({
          promptId: `prompt-${Date.now()}-${promptCounter}`,
          label: template.label,
          ownerRole: template.ownerRole,
          actionLabel: template.actionLabel,
          selectionLabel: template.selectionLabel,
          miniGameId: template.miniGameId,
          timerSeconds: scalePromptTimer(template.timerSeconds, scaledPlayerCount),
          status: 'queued',
          createdAt: 0,
          assignedTo: player.playerId,
        });
      }
    }
  }

  /** Pick a prompt template. In demo: from the player's own controls. In
   *  multiplayer: from controls the player does NOT have (so they must
   *  communicate). Avoids recently used labels. */
  #pickTemplate(
    isDemo: boolean,
    playerCtrls: string[],
    allPlayerControls: Set<string>,
    usedLabels: Set<string>,
  ) {
    let pool: typeof promptPool;

    if (isDemo) {
      // Demo: player sees tasks for their own controls.
      pool = this.#playerControls
        ? promptPool.filter(t => this.#playerControls!.slice(0, getLevelConfig(this.#room.deploy.currentLevel).buttonCount).includes(t.actionLabel))
        : promptPool;
    } else {
      // Multiplayer: pick prompts for controls this player does NOT have
      // but that some other player does (so someone can act on it).
      const otherControls = [...allPlayerControls].filter(c => !playerCtrls.includes(c));
      if (otherControls.length > 0) {
        pool = promptPool.filter(t => otherControls.includes(t.actionLabel));
      } else {
        // Fallback: all controls in the game.
        pool = promptPool.filter(t => allPlayerControls.has(t.actionLabel));
      }
    }

    if (pool.length === 0) return null;

    const fresh = pool.filter(t => !usedLabels.has(t.label));
    if (fresh.length === 0) return null;

    return fresh[Math.floor(Math.random() * fresh.length)];
  }

  /** For each player, if they have no "started" prompt (createdAt > 0 and
   *  still queued/active), activate the next one from their queue. */
  #activateNextPrompts(): void {
    const now = Date.now();
    const players = this.#room.players;

    for (let pi = 0; pi < players.length; pi++) {
      const player = players[pi];

      // Count how many started (createdAt > 0) and still live prompts they have.
      const started = this.#room.deploy.prompts.filter(
        p => p.assignedTo === player.playerId &&
          (p.status === 'queued' || p.status === 'active') &&
          p.createdAt > 0,
      ).length;

      if (started >= MAX_VISIBLE_ALERTS) continue;

      // Find the next queued prompt with createdAt = 0 and activate it.
      for (let i = 0; i < this.#room.deploy.prompts.length; i++) {
        const p = this.#room.deploy.prompts[i];
        if (
          p.assignedTo === player.playerId &&
          p.status === 'queued' &&
          p.createdAt === 0
        ) {
          p.$jazz.set('createdAt', now);
          break;
        }
      }
    }
  }

  #clearPrompts(): void {
    while (this.#room.deploy.prompts.length > 0) {
      this.#room.deploy.prompts.$jazz.splice(0, 1);
    }
  }

  #resetReady(): void {
    for (let i = 0; i < this.#room.players.length; i++) {
      this.#room.players[i].$jazz.set('ready', false);
    }
  }

  #setLevelBriefing(level: number): void {
    const config = getLevelConfig(level);
    this.#clearPrompts();
    this.#room.deploy.$jazz.set('currentLevel', config.level);
    this.#room.deploy.$jazz.set('levelPhase', 'briefing');
    this.#room.deploy.$jazz.set('timeRemainingSeconds', config.durationSeconds);
    this.#room.deploy.$jazz.set('consecutiveFailures', 0);
    this.#resetReady();
  }

  #startLevel(level: number): void {
    const config = getLevelConfig(level);
    this.#clearPrompts();
    this.#room.deploy.$jazz.set('currentLevel', config.level);
    this.#room.deploy.$jazz.set('levelPhase', 'playing');
    this.#room.deploy.$jazz.set('timeRemainingSeconds', config.durationSeconds);
    this.#room.deploy.$jazz.set('consecutiveFailures', 0);
    this.#spawnIfNeeded();
    this.#activateNextPrompts();
  }

  #completeCurrentLevel(): void {
    const currentLevel = this.#room.deploy.currentLevel;
    if (currentLevel >= LEVELS.length) {
      this.#clearPrompts();
      this.#room.deploy.$jazz.set('levelPhase', 'complete');
      return;
    }

    this.#setLevelBriefing(currentLevel + 1);
  }

  /** Start the game or advance a level once everyone is ready. */
  #checkProgressionReady(): void {
    if (!this.#isHost) return;
    const players = this.#room.players;
    if (!this.#room.gameStarted && players.length < 2) return;
    const allReady = players.every(p => p.ready);
    if (!allReady) return;

    if (!this.#room.gameStarted) {
      this.#distributeControls();
      this.#setLevelBriefing(1);
      this.#room.$jazz.set('gameStarted', true);
      return;
    }

    if (this.#room.deploy.levelPhase === 'briefing') {
      this.#startLevel(this.#room.deploy.currentLevel);
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
}): { room: LoadedJazzRoom; id: string; ownerGroup: Group | undefined } {
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
  const initialPrompts: PromptDefinition[] = [];

  const prompts = JazzPromptList.create(
    initialPrompts.map(p => ({
      promptId: p.id,
      label: p.label,
      ownerRole: p.ownerRole,
      actionLabel: p.actionLabel,
      selectionLabel: p.selectionLabel,
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
    currentLevel: 1,
    levelPhase: 'briefing',
    timeRemainingSeconds: LEVELS[0].durationSeconds,
    prompts,
    consecutiveFailures: 0,
    failureThreshold: getFailureThreshold(isDemo ? 1 : 2),
    bankrupt: false,
  }, ownerOpt);

  // Always start with an empty player list. In demo, the single real player
  // is added via addPlayer() on mount, avoiding ghost players that conflict
  // with prompt assignment.
  const players = JazzPlayerList.create([], ownerOpt);

  const room = JazzRoom.create(
    { deploy, players, gameStarted: !!isDemo },
    ownerOpt,
  ) as unknown as LoadedJazzRoom;

  return { room, id: room.$jazz.id, ownerGroup };
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
