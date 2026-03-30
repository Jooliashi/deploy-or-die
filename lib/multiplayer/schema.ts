import { co, z } from 'jazz-tools';

/** A single deploy prompt that players must claim and resolve. */
export const JazzPrompt = co.map({
  promptId: z.string(),
  label: z.string(),
  ownerRole: z.string(),
  actionLabel: z.string(),
  selectionLabel: z.string(),
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
  currentLevel: z.number(),
  levelPhase: z.string(),
  timeRemainingSeconds: z.number(),
  prompts: JazzPromptList,
  consecutiveFailures: z.number(),
  failureThreshold: z.number(),
  bankrupt: z.boolean(),
});

export const JazzControlList = co.list(z.string());

/** A single player's presence in the room. */
export const JazzPlayer = co.map({
  playerId: z.string(),
  name: z.string(),
  ready: z.boolean(),
  /** The control labels assigned to this player. */
  controls: JazzControlList,
});

export const JazzPlayerList = co.list(JazzPlayer);

/** Top-level room CoValue that holds the full shared state. */
export const JazzRoom = co.map({
  deploy: JazzDeployState,
  players: JazzPlayerList,
  gameStarted: z.boolean(),
  /** Timestamp when the room was created. Used for leaderboard validation. */
  createdAt: z.number(),
  /** Peak market cap achieved during the game. */
  peakValuation: z.number(),
  /** Whether the score was already reported to the leaderboard. */
  scoreReported: z.boolean(),
});
