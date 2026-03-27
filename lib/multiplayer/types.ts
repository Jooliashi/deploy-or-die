import type { DeployState, PromptDefinition, RoleId } from '@/lib/game/types';

export interface PlayerPresence {
  id: string;
  name: string;
  role: RoleId;
}

export interface SharedRoomState {
  deploy: DeployState;
  players: PlayerPresence[];
  gameStarted: boolean;
}

export interface MultiplayerAdapter {
  getInitialState(): SharedRoomState;
  addPlayer(name: string): void;
  removePlayer(name: string): void;
  startGame(): void;
  claimPrompt(promptId: string, playerId: string): void;
  resolvePrompt(promptId: string): void;
  failPrompt(promptId: string): void;
  subscribe(listener: (state: SharedRoomState) => void): () => void;
}

export interface ClaimedPrompt extends PromptDefinition {
  claimedBy?: string;
}

