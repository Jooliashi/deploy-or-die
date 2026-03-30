import type { DeployState, PromptDefinition } from '@/lib/game/types';

export interface PlayerPresence {
  id: string;
  name: string;
  ready: boolean;
  /** The control labels assigned to this player. */
  controls: string[];
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
  /** Report final score to the leaderboard. Returns true if reported. */
  reportScore(): Promise<boolean>;
  // Debug methods (only used in demo/dev)
  debugAdjustValuation(delta: number): void;
  debugResetTimer(): void;
  debugForcePrompt(label: string | null, playerId: string): void;
  /** Returns the actionLabel of the debug-locked prompt, or null. */
  debugGetLockedControl(): string | null;
}

export interface ClaimedPrompt extends PromptDefinition {
  claimedBy?: string;
}
