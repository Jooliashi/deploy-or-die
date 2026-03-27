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
}

export interface DeployState {
  roomCode: string;
  deployHealth: number;
  phaseLabel: string;
  timeRemainingSeconds: number;
  prompts: PromptDefinition[];
}

