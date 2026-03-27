import type { DeployState, MiniGameId, PromptDefinition, RoleDefinition, RoleId } from '@/lib/game/types';

export const roles: RoleDefinition[] = [
  {
    id: 'frontend',
    name: 'Frontend',
    summary: 'Owns the release surface, client labels, and visual patch commands.',
    controls: [
      'Rebuild Client Bundle',
      'Patch CTA Labels',
      'Rehydrate Preview Shell',
      'Flush Edge Cache',
    ],
    miniGames: ['visual-patch'],
  },
  {
    id: 'backend',
    name: 'Backend',
    summary: 'Owns APIs, worker routing, and request-path stabilization tasks.',
    controls: [
      'Replay Auth Queue',
      'Repair Route Graph',
      'Restart Worker Pool',
      'Seal Payment Webhook',
    ],
    miniGames: ['route-repair'],
  },
  {
    id: 'infra',
    name: 'Infra',
    summary: 'Owns deployment rails, regional traffic, and production health.',
    controls: [
      'Shift Region Weight',
      'Reopen Canary Window',
      'Restore Deploy Pipeline',
      'Throttle Error Storm',
    ],
    miniGames: ['traffic-balance'],
  },
];

// ---------------------------------------------------------------------------
// Prompt pool — used to randomly generate new prompts during the game.
// Each entry omits `id` and `status` because those are assigned at spawn time.
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  label: string;
  hint: string;
  ownerRole: RoleId;
  actionLabel: string;
  miniGameId: MiniGameId;
  timerSeconds: number;
}

export const promptPool: PromptTemplate[] = [
  // ── Frontend ────────────────────────────────────────────────
  {
    label: 'Broken launch banner on production preview',
    hint: 'The correct control belongs to the role that owns client visuals.',
    ownerRole: 'frontend',
    actionLabel: 'Patch CTA Labels',
    miniGameId: 'visual-patch',
    timerSeconds: 22,
  },
  {
    label: 'Client bundle exceeds size budget by 340 KB',
    hint: 'Whoever owns the release surface needs to trim the build.',
    ownerRole: 'frontend',
    actionLabel: 'Rebuild Client Bundle',
    miniGameId: 'visual-patch',
    timerSeconds: 20,
  },
  {
    label: 'Preview shell stuck in hydration loop',
    hint: 'The client-side renderer is stalling. Fix the preview surface.',
    ownerRole: 'frontend',
    actionLabel: 'Rehydrate Preview Shell',
    miniGameId: 'visual-patch',
    timerSeconds: 18,
  },
  {
    label: 'Stale assets served from edge after deploy',
    hint: 'Cached files from the last deploy are still being served.',
    ownerRole: 'frontend',
    actionLabel: 'Flush Edge Cache',
    miniGameId: 'visual-patch',
    timerSeconds: 16,
  },

  // ── Backend ─────────────────────────────────────────────────
  {
    label: 'Auth callbacks looping in eu-west',
    hint: 'Route graph mismatch. Find the engineer who owns request flow.',
    ownerRole: 'backend',
    actionLabel: 'Repair Route Graph',
    miniGameId: 'route-repair',
    timerSeconds: 18,
  },
  {
    label: 'Webhook signature validation failing for payments',
    hint: 'Payment callbacks are being rejected. Seal the webhook endpoint.',
    ownerRole: 'backend',
    actionLabel: 'Seal Payment Webhook',
    miniGameId: 'route-repair',
    timerSeconds: 20,
  },
  {
    label: 'Auth queue backed up with 12k pending tokens',
    hint: 'Someone needs to drain the auth replay queue before it overflows.',
    ownerRole: 'backend',
    actionLabel: 'Replay Auth Queue',
    miniGameId: 'route-repair',
    timerSeconds: 22,
  },
  {
    label: 'Worker pool exhausted — zero idle threads',
    hint: 'All background workers are saturated. Restart the pool.',
    ownerRole: 'backend',
    actionLabel: 'Restart Worker Pool',
    miniGameId: 'route-repair',
    timerSeconds: 15,
  },

  // ── Infra ───────────────────────────────────────────────────
  {
    label: 'Canary region taking 94% of live traffic',
    hint: 'Someone must rebalance regional load before health falls further.',
    ownerRole: 'infra',
    actionLabel: 'Shift Region Weight',
    miniGameId: 'traffic-balance',
    timerSeconds: 15,
  },
  {
    label: 'Deploy pipeline stuck in rollback loop',
    hint: 'The CI/CD pipeline keeps reverting. Restore it manually.',
    ownerRole: 'infra',
    actionLabel: 'Restore Deploy Pipeline',
    miniGameId: 'traffic-balance',
    timerSeconds: 20,
  },
  {
    label: 'Canary window closed prematurely — no rollback path',
    hint: 'Reopen the canary window so a safe rollback is possible.',
    ownerRole: 'infra',
    actionLabel: 'Reopen Canary Window',
    miniGameId: 'traffic-balance',
    timerSeconds: 18,
  },
  {
    label: 'Error rate spike at 23% — alerting threshold breached',
    hint: 'Throttle the error storm before cascading failures spread.',
    ownerRole: 'infra',
    actionLabel: 'Throttle Error Storm',
    miniGameId: 'traffic-balance',
    timerSeconds: 14,
  },
];

/** Pick `count` random prompts from the pool and assign them IDs + queued status.
 *  If `forControls` is provided, only pick prompts whose actionLabel is in the set. */
let promptCounter = 0;
export function pickRandomPrompts(count: number, forControls?: string[]): PromptDefinition[] {
  const pool = forControls
    ? promptPool.filter(t => forControls.includes(t.actionLabel))
    : promptPool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(template => {
    promptCounter += 1;
    return {
      ...template,
      id: `prompt-${Date.now()}-${promptCounter}`,
      status: 'queued' as const,
      createdAt: Date.now(),
      assignedTo: '', // set by the caller
    };
  });
}

// pickSpreadPrompts removed — the adapter now handles role-aware spawning
// directly using promptPool and player data.

export const STARTING_VALUATION = 1_000_000;

export const demoDeployState: DeployState = {
  roomCode: 'SHIP-42',
  valuation: STARTING_VALUATION,
  valuationHistory: [STARTING_VALUATION],
  timeRemainingSeconds: 300,
  prompts: [],
  bankrupt: false,
};

