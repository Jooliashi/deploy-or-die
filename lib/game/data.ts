import type { DeployState, RoleDefinition } from '@/lib/game/types';

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

export const demoDeployState: DeployState = {
  roomCode: 'SHIP-42',
  deployHealth: 74,
  phaseLabel: 'Incident Spiral',
  timeRemainingSeconds: 178,
  prompts: [
    {
      id: 'prompt-1',
      label: 'Broken launch banner on production preview',
      hint: 'The correct control belongs to the role that owns client visuals.',
      ownerRole: 'frontend',
      actionLabel: 'Patch CTA Labels',
      miniGameId: 'visual-patch',
      timerSeconds: 22,
      status: 'queued',
    },
    {
      id: 'prompt-2',
      label: 'Auth callbacks looping in eu-west',
      hint: 'Route graph mismatch. Find the engineer who owns request flow.',
      ownerRole: 'backend',
      actionLabel: 'Repair Route Graph',
      miniGameId: 'route-repair',
      timerSeconds: 18,
      status: 'queued',
    },
    {
      id: 'prompt-3',
      label: 'Canary region taking 94% of live traffic',
      hint: 'Someone must rebalance regional load before health falls further.',
      ownerRole: 'infra',
      actionLabel: 'Shift Region Weight',
      miniGameId: 'traffic-balance',
      timerSeconds: 15,
      status: 'queued',
    },
  ],
};

