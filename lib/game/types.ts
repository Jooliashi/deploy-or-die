export type RoleId = 'frontend' | 'backend' | 'infra';

export type MiniGameId =
  | 'visual-patch'
  | 'route-repair'
  | 'traffic-balance';

export type PromptStatus = 'queued' | 'active' | 'resolved' | 'failed' | 'expired';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  summary: string;
  controls: string[];
  miniGames: MiniGameId[];
}

export interface PromptDefinition {
  id: string;
  label: string;
  hint: string;
  ownerRole: RoleId;
  actionLabel: string;
  miniGameId: MiniGameId;
  timerSeconds: number;
  status: PromptStatus;
  createdAt: number;
  /** The playerId of the player who sees this alert. */
  assignedTo: string;
}

export interface DeployState {
  roomCode: string;
  /** Company valuation in dollars. Starts at 1_000_000. Bankruptcy at 0. */
  valuation: number;
  /** Recent valuation snapshots for the stock chart (one per tick). */
  valuationHistory: number[];
  timeRemainingSeconds: number;
  prompts: PromptDefinition[];
  /** True once valuation hits 0 — game over. */
  bankrupt: boolean;
}

