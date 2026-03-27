import { demoDeployState, roles } from '@/lib/game/data';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

const initialState: SharedRoomState = {
  deploy: demoDeployState,
  players: [
    { id: 'p1', name: 'Alex', role: roles[0].id },
    { id: 'p2', name: 'Jules', role: roles[1].id },
    { id: 'p3', name: 'Mina', role: roles[2].id },
  ],
  gameStarted: false,
};

export class MockMultiplayerAdapter implements MultiplayerAdapter {
  #state: SharedRoomState = initialState;

  #listeners = new Set<(state: SharedRoomState) => void>();

  getInitialState() {
    return this.#state;
  }

  addPlayer(name: string) {
    const exists = this.#state.players.some(p => p.name === name);
    if (exists) return;
    const role = roles[this.#state.players.length % roles.length].id;
    this.#state = {
      ...this.#state,
      players: [
        ...this.#state.players,
        { id: `p${Date.now()}`, name, role },
      ],
    };
    this.#emit();
  }

  removePlayer(name: string) {
    this.#state = {
      ...this.#state,
      players: this.#state.players.filter(p => p.name !== name),
    };
    this.#emit();
  }

  startGame() {
    this.#state = { ...this.#state, gameStarted: true };
    this.#emit();
  }

  claimPrompt(promptId: string, _playerId: string) {
    this.#state = {
      ...this.#state,
      deploy: {
        ...this.#state.deploy,
        prompts: this.#state.deploy.prompts.map(prompt =>
          prompt.id === promptId ? { ...prompt, status: 'active' } : prompt
        ),
      },
    };
    this.#emit();
  }

  resolvePrompt(promptId: string) {
    this.#state = {
      ...this.#state,
      deploy: {
        ...this.#state.deploy,
        deployHealth: Math.min(this.#state.deploy.deployHealth + 6, 100),
        prompts: this.#state.deploy.prompts.map(prompt =>
          prompt.id === promptId ? { ...prompt, status: 'resolved' } : prompt
        ),
      },
    };
    this.#emit();
  }

  failPrompt(promptId: string) {
    this.#state = {
      ...this.#state,
      deploy: {
        ...this.#state.deploy,
        deployHealth: Math.max(this.#state.deploy.deployHealth - 14, 0),
        prompts: this.#state.deploy.prompts.map(prompt =>
          prompt.id === promptId ? { ...prompt, status: 'failed' } : prompt
        ),
      },
    };
    this.#emit();
  }

  subscribe(listener: (state: SharedRoomState) => void) {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #emit() {
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}

// Replace this with a Jazz-powered room adapter once the room schema is locked.
export const multiplayerAdapter = new MockMultiplayerAdapter();
