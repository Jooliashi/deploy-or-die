import { co, z } from 'jazz-tools';

/** A single deploy prompt that players must claim and resolve. */
export const JazzPrompt = co.map({
  promptId: z.string(),
  label: z.string(),
  hint: z.string(),
  ownerRole: z.string(),
  actionLabel: z.string(),
  miniGameId: z.string(),
  timerSeconds: z.number(),
  status: z.string(), // 'queued' | 'active' | 'resolved' | 'failed' | 'expired'
  createdAt: z.number(), // Date.now() timestamp when the prompt was spawned
  /** The playerId of the player who sees this alert (reads it out loud). */
  assignedTo: z.string(),
});

export const JazzPromptList = co.list(JazzPrompt);

export const JazzValuationHistory = co.list(z.number());

/** Shared deploy state visible to all players in the room. */
export const JazzDeployState = co.map({
  roomCode: z.string(),
  valuation: z.number(),
  valuationHistory: JazzValuationHistory,
  timeRemainingSeconds: z.number(),
  prompts: JazzPromptList,
  bankrupt: z.boolean(),
});

/** A single player's presence in the room. */
export const JazzPlayer = co.map({
  playerId: z.string(),
  name: z.string(),
  role: z.string(), // RoleId
  ready: z.boolean(),
});

export const JazzPlayerList = co.list(JazzPlayer);

/** Top-level room CoValue that holds the full shared state. */
export const JazzRoom = co.map({
  deploy: JazzDeployState,
  players: JazzPlayerList,
  gameStarted: z.boolean(),
});
