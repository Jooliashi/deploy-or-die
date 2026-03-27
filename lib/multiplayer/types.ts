import type { DeployState, PromptDefinition, RoleId } from '@/lib/game/types';

export interface PlayerPresence {
  id: string;
  name: string;
  role: RoleId;
  ready: boolean;
}

export interface SharedRoomState {
  deploy: DeployState;
  players: PlayerPresence[];
  gameStarted: boolean;
}

export interface MultiplayerAdapter {
  getInitialState(): SharedRoomState;
  addPlayer(playerId: string, name: string): void;
  removePlayer(playerId: string): void;
  toggleReady(playerId: string): void;
  startGame(): void;
  claimPrompt(promptId: string, playerId: string): void;
  resolvePrompt(promptId: string): void;
  failPrompt(promptId: string): void;
  misfireControl(playerId: string, controlLabel: string): void;
  subscribe(listener: (state: SharedRoomState) => void): () => void;
}

export interface ClaimedPrompt extends PromptDefinition {
  claimedBy?: string;
}
