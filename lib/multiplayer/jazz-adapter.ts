import { co } from 'jazz-tools';
import { demoDeployState, roles } from '@/lib/game/data';
import type { DeployState, PromptDefinition, PromptStatus, RoleId } from '@/lib/game/types';
import {
  JazzDeployState,
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

  return { deploy, players };
}

// ---------------------------------------------------------------------------
// JazzMultiplayerAdapter
// ---------------------------------------------------------------------------

export class JazzMultiplayerAdapter implements MultiplayerAdapter {
  #room: LoadedJazzRoom;
  #listeners = new Set<(state: SharedRoomState) => void>();
  #unsubscribe: (() => void) | null = null;

  constructor(room: LoadedJazzRoom) {
    this.#room = room;

    // Subscribe to changes from Jazz and forward to local listeners.
    this.#unsubscribe = JazzRoom.subscribe(
      room.$jazz.id,
      { resolve: { deploy: { prompts: { $each: true } }, players: { $each: true } } },
      (updated) => {
        this.#room = updated;
        this.#emit();
      },
    );
  }

  getInitialState(): SharedRoomState {
    return coRoomToState(this.#room);
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
    }
  }

  failPrompt(promptId: string): void {
    const prompt = this.#room.deploy.prompts.find(p => p.promptId === promptId);
    if (prompt) {
      prompt.$jazz.set('status', 'failed');
      const newHealth = Math.max(this.#room.deploy.deployHealth - 14, 0);
      this.#room.deploy.$jazz.set('deployHealth', newHealth);
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
    this.#listeners.clear();
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

export function createJazzRoom(): LoadedJazzRoom {
  const prompts = JazzPromptList.create(
    demoDeployState.prompts.map(p => ({
      promptId: p.id,
      label: p.label,
      hint: p.hint,
      ownerRole: p.ownerRole,
      actionLabel: p.actionLabel,
      miniGameId: p.miniGameId,
      timerSeconds: p.timerSeconds,
      status: p.status,
    })),
  );

  const deploy = JazzDeployState.create({
    roomCode: demoDeployState.roomCode,
    deployHealth: demoDeployState.deployHealth,
    phaseLabel: demoDeployState.phaseLabel,
    timeRemainingSeconds: demoDeployState.timeRemainingSeconds,
    prompts,
  });

  const players = JazzPlayerList.create(
    roles.map((role, i) => ({
      playerId: `p${i + 1}`,
      name: ['Alex', 'Jules', 'Mina'][i],
      role: role.id,
    })),
  );

  // The room and all nested CoValues were just created in-memory, so they are
  // guaranteed to be fully loaded. The cast is safe because Jazz types mark
  // nested refs as MaybeLoaded to account for network loading, which doesn't
  // apply to freshly-created local data.
  return JazzRoom.create({ deploy, players }) as unknown as LoadedJazzRoom;
}
