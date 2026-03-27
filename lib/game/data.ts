import type { DeployState, MiniGameId, PromptDefinition, RoleDefinition, RoleId } from '@/lib/game/types';

export const roles: RoleDefinition[] = [
  {
    id: 'frontend',
    name: 'Frontend',
    summary: 'Owns Preview Deployments, Vercel Toolbar, Flags Explorer, and Web Analytics surfaces.',
    controls: [
      'Rebuild Preview Deployment',
      'Patch Toolbar Comments',
      'Override Flags Explorer',
      'Reconnect Web Analytics',
    ],
    miniGames: ['visual-patch'],
  },
  {
    id: 'backend',
    name: 'Backend',
    summary: 'Owns Edge Config, Functions, Cron Jobs, and runtime cache operations.',
    controls: [
      'Sync Edge Config',
      'Replay Cron Run',
      'Shift Function Region',
      'Purge Runtime Cache',
    ],
    miniGames: ['route-repair'],
  },
  {
    id: 'database',
    name: 'Database',
    summary: 'Owns Vercel Postgres, KV, Blob, and the data plane during rollout incidents.',
    controls: [
      'Promote Postgres Replica',
      'Purge KV Drift',
      'Restore Blob Asset',
      'Backfill Session Store',
    ],
    miniGames: ['traffic-balance'],
  },
  {
    id: 'success',
    name: 'Success',
    summary: 'Owns customer messaging, incident updates, vendor follow-ups, and launch comms.',
    controls: [
      'Post Launch Thread',
      'Reply to Enterprise Ticket',
      'Ping Integration Vendor',
      'Send How-To Blast',
    ],
    miniGames: ['message-triage'],
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
    label: 'Preview Deployment is serving the wrong marketing shell',
    hint: 'The team needs the control that rebuilds the preview surface.',
    ownerRole: 'frontend',
    actionLabel: 'Rebuild Preview Deployment',
    miniGameId: 'visual-patch',
    timerSeconds: 22,
  },
  {
    label: 'Toolbar Comments overlay vanished from the preview URL',
    hint: 'Use the Toolbar control, not the deploy one.',
    ownerRole: 'frontend',
    actionLabel: 'Patch Toolbar Comments',
    miniGameId: 'visual-patch',
    timerSeconds: 20,
  },
  {
    label: 'Flags Explorer override stuck on checkout-redesign',
    hint: 'Someone has to reset the feature flag surface before rollout leaks.',
    ownerRole: 'frontend',
    actionLabel: 'Override Flags Explorer',
    miniGameId: 'visual-patch',
    timerSeconds: 18,
  },
  {
    label: 'Web Analytics stopped ingesting custom events after deploy',
    hint: 'Reconnect the analytics surface before the dashboard goes dark.',
    ownerRole: 'frontend',
    actionLabel: 'Reconnect Web Analytics',
    miniGameId: 'visual-patch',
    timerSeconds: 16,
  },

  // ── Backend ─────────────────────────────────────────────────
  {
    label: 'Edge Config reads are serving stale rollout values',
    hint: 'The config layer needs a fresh sync before flags drift further.',
    ownerRole: 'backend',
    actionLabel: 'Sync Edge Config',
    miniGameId: 'route-repair',
    timerSeconds: 18,
  },
  {
    label: 'Nightly Cron Job never fired for revalidation',
    hint: 'Replay the missed run before data starts aging out.',
    ownerRole: 'backend',
    actionLabel: 'Replay Cron Run',
    miniGameId: 'route-repair',
    timerSeconds: 20,
  },
  {
    label: 'Functions are cold-starting in the wrong region',
    hint: 'Move the hot path back to the intended Function region.',
    ownerRole: 'backend',
    actionLabel: 'Shift Function Region',
    miniGameId: 'route-repair',
    timerSeconds: 22,
  },
  {
    label: 'Runtime cache is pinning stale session data in production',
    hint: 'Purge the runtime layer before the bad state spreads.',
    ownerRole: 'backend',
    actionLabel: 'Purge Runtime Cache',
    miniGameId: 'route-repair',
    timerSeconds: 15,
  },

  // ── Database ────────────────────────────────────────────────
  {
    label: 'Primary Postgres node is lagging behind the replica set',
    hint: 'The data team needs to promote the healthy replica before writes stall.',
    ownerRole: 'database',
    actionLabel: 'Promote Postgres Replica',
    miniGameId: 'traffic-balance',
    timerSeconds: 15,
  },
  {
    label: 'KV cache drift is serving stale feature state to production',
    hint: 'Purge the inconsistent KV layer before rollout values diverge further.',
    ownerRole: 'database',
    actionLabel: 'Purge KV Drift',
    miniGameId: 'traffic-balance',
    timerSeconds: 20,
  },
  {
    label: 'Blob-backed media is returning missing assets on the landing page',
    hint: 'Restore the affected Blob objects before previews start breaking.',
    ownerRole: 'database',
    actionLabel: 'Restore Blob Asset',
    miniGameId: 'traffic-balance',
    timerSeconds: 18,
  },
  {
    label: 'Session store backfill failed during the latest deployment',
    hint: 'Replay the session data path before customers get logged out.',
    ownerRole: 'database',
    actionLabel: 'Backfill Session Store',
    miniGameId: 'traffic-balance',
    timerSeconds: 14,
  },

  // ── Success ─────────────────────────────────────────────────
  {
    label: 'Launch copy is missing for the new product rollout thread',
    hint: 'The comms role needs to publish the public launch update.',
    ownerRole: 'success',
    actionLabel: 'Post Launch Thread',
    miniGameId: 'message-triage',
    timerSeconds: 18,
  },
  {
    label: 'An enterprise customer opened a blocker ticket during deploy',
    hint: 'Someone needs to answer the enterprise queue with the right macro.',
    ownerRole: 'success',
    actionLabel: 'Reply to Enterprise Ticket',
    miniGameId: 'message-triage',
    timerSeconds: 20,
  },
  {
    label: 'A third-party integration vendor is timing out on webhook delivery',
    hint: 'Contact the vendor team before partner traffic fully backs up.',
    ownerRole: 'success',
    actionLabel: 'Ping Integration Vendor',
    miniGameId: 'message-triage',
    timerSeconds: 16,
  },
  {
    label: 'Customers are confused by the new flow and support volume is spiking',
    hint: 'Ship a clear how-to blast before the ticket queue overflows.',
    ownerRole: 'success',
    actionLabel: 'Send How-To Blast',
    miniGameId: 'message-triage',
    timerSeconds: 17,
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
