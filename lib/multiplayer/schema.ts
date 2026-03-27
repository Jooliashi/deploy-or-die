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
  status: z.string(), // 'queued' | 'active' | 'resolved' | 'failed'
});

export const JazzPromptList = co.list(JazzPrompt);

/** Shared deploy state visible to all players in the room. */
export const JazzDeployState = co.map({
  roomCode: z.string(),
  deployHealth: z.number(),
  phaseLabel: z.string(),
  timeRemainingSeconds: z.number(),
  prompts: JazzPromptList,
});

/** A single player's presence in the room. */
export const JazzPlayer = co.map({
  playerId: z.string(),
  name: z.string(),
  role: z.string(), // RoleId
});

export const JazzPlayerList = co.list(JazzPlayer);

/** Top-level room CoValue that holds the full shared state. */
export const JazzRoom = co.map({
  deploy: JazzDeployState,
  players: JazzPlayerList,
});
