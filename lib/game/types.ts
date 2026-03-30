export type RoleId = 'frontend' | 'backend' | 'database' | 'success' | 'infra' | 'billing' | 'security';

export type MiniGameId = string;
export type LevelPhase = 'briefing' | 'playing';

export type PromptStatus = 'queued' | 'active' | 'resolved' | 'failed' | 'expired';

export interface PromptTemplateDefinition {
  label: string;
  timerSeconds: number;
}

export interface ControlDefinition {
  label: string;
  miniGameId?: MiniGameId;
  subControls: Record<string, PromptTemplateDefinition[]>;
}

export interface RoleDefinition {
  id: RoleId;
  name: string;
  summary: string;
  controls: ControlDefinition[];
}

export interface PromptDefinition {
  id: string;
  label: string;
  ownerRole: RoleId;
  actionLabel: string;
  selectionLabel: string;
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
  currentLevel: number;
  levelPhase: LevelPhase;
  timeRemainingSeconds: number;
  prompts: PromptDefinition[];
  consecutiveFailures: number;
  failureThreshold: number;
  /** True once valuation hits 0 — game over. */
  bankrupt: boolean;
}
