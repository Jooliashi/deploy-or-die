import { demoDeployState } from '@/lib/game/data';
import type { MultiplayerAdapter, SharedRoomState } from '@/lib/multiplayer/types';

const initialState: SharedRoomState = {
  deploy: demoDeployState,
  players: [
    { id: 'p1', name: 'Alex', ready: false, controls: [] },
    { id: 'p2', name: 'Jules', ready: false, controls: [] },
    { id: 'p3', name: 'Mina', ready: false, controls: [] },
  ],
  gameStarted: false,
};

export class MockMultiplayerAdapter implements MultiplayerAdapter {
  #state: SharedRoomState = initialState;
  #listeners = new Set<(state: SharedRoomState) => void>();

  getInitialState() {
    return this.#state;
  }

  addPlayer(playerId: string, name: string) {
    const exists = this.#state.players.some(p => p.id === playerId);
    if (exists) return;
    this.#state = {
      ...this.#state,
      players: [
        ...this.#state.players,
        { id: playerId, name, ready: false, controls: [] },
      ],
    };
    this.#emit();
  }

  removePlayer(playerId: string) {
    this.#state = {
      ...this.#state,
      players: this.#state.players.filter(p => p.id !== playerId),
    };
    this.#emit();
  }

  toggleReady(playerId: string) {
    this.#state = {
      ...this.#state,
      players: this.#state.players.map(p =>
        p.id === playerId ? { ...p, ready: !p.ready } : p,
      ),
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
    const newVal = Math.min(this.#state.deploy.valuation + 50_000, 2_000_000);
    this.#state = {
      ...this.#state,
      deploy: {
        ...this.#state.deploy,
        valuation: newVal,
        valuationHistory: [...this.#state.deploy.valuationHistory, newVal],
        prompts: this.#state.deploy.prompts.map(prompt =>
          prompt.id === promptId ? { ...prompt, status: 'resolved' } : prompt
        ),
      },
    };
    this.#emit();
  }

  failPrompt(promptId: string) {
    const newVal = Math.max(this.#state.deploy.valuation - 120_000, 0);
    this.#state = {
      ...this.#state,
      deploy: {
        ...this.#state.deploy,
        valuation: newVal,
        valuationHistory: [...this.#state.deploy.valuationHistory, newVal],
        bankrupt: newVal <= 0,
        prompts: this.#state.deploy.prompts.map(prompt =>
          prompt.id === promptId ? { ...prompt, status: 'failed' } : prompt
        ),
      },
    };
    this.#emit();
  }

  misfireControl(_playerId: string, _controlLabel: string) {
    const newVal = Math.max(this.#state.deploy.valuation - 20_000, 0);
    this.#state = {
      ...this.#state,
      deploy: {
        ...this.#state.deploy,
        valuation: newVal,
        valuationHistory: [...this.#state.deploy.valuationHistory, newVal],
        bankrupt: newVal <= 0,
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

export const multiplayerAdapter = new MockMultiplayerAdapter();
