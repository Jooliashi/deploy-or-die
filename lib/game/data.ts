import type {
  ControlDefinition,
  DeployState,
  PromptDefinition,
  PromptTemplateDefinition,
  RoleDefinition,
  RoleId,
} from '@/lib/game/types';

interface FlattenedPromptTemplate extends PromptTemplateDefinition {
  ownerRole: RoleId;
  actionLabel: string;
  selectionLabel: string;
  miniGameId: PromptDefinition['miniGameId'];
}

/** Predefined levels. After these, levels are generated infinitely with
 *  escalating difficulty (more buttons, shorter timers). */
export const LEVELS = [
  { level: 1, buttonCount: 3, durationSeconds: 120 },
  { level: 2, buttonCount: 4, durationSeconds: 120 },
  { level: 3, buttonCount: 5, durationSeconds: 120 },
];

/** Generate a level config for any level number. Uses predefined levels for
 *  1-3, then scales difficulty infinitely beyond that. */
export function getLevelConfig(level: number): { level: number; buttonCount: number; durationSeconds: number } {
  if (level <= LEVELS.length) {
    return LEVELS[level - 1];
  }
  // Beyond predefined levels: keep adding buttons (max 8) and keep duration at 120s.
  const buttonCount = Math.min(3 + level - 1, 8);
  return { level, buttonCount, durationSeconds: 120 };
}

function formatSubControlLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export const roles: RoleDefinition[] = [
  {
    id: 'frontend',
    name: 'Frontend',
    summary: 'Owns Preview Deployments, Toolbar surfaces, UI regressions, and release toggles.',
    controls: [
      {
        label: 'Instant Rollback',
        miniGameId: 'bug-bash',
        subControls: {
          default: [
            { label: 'The newly deployed page is crashing', timerSeconds: 18 },
            { label: 'After a version update, the entire dashboard is crashing', timerSeconds: 16 },
          ],
        },
      },
      {
        label: 'UI',
        miniGameId: 'guess-the-hex',
        subControls: {
          default: [
            { label: 'The button on the upgrade banner does not work', timerSeconds: 20 },
            { label: 'A link on the docs site is pointing to the wrong destination', timerSeconds: 17 },
          ],
        },
      },
      {
        label: 'Flags',
        miniGameId: 'guess-the-country',
        subControls: {
          turnOn: [
            { label: 'We need to roll out the new feature behind the flag right now', timerSeconds: 19 },
          ],
          turnOff: [
            { label: 'The wrong customers are flagged in the new feature experiment', timerSeconds: 15 },
          ],
        },
      },
      {
        label: 'Configs',
        subControls: {
          envVariable: [
            { label: 'The current Stripe token has been leaked', timerSeconds: 18 },
          ],
          teamMemberManagement: [
            { label: 'A new hire needs access to the Vercel team', timerSeconds: 14 },
          ],
        },
      },
    ],
  },
  {
    id: 'backend',
    name: 'Backend',
    summary: 'Owns Edge Config, Workflow, Functions, and runtime cache behavior.',
    controls: [
      {
        label: 'Edge Config',
        miniGameId: 'find-the-logs',
        subControls: {
          default: [
            { label: 'Edge Config updates are not propagating to all regions', timerSeconds: 18 },
            { label: 'Edge Config is being blocked by the firewall', timerSeconds: 16 },
          ],
        },
      },
      {
        label: 'Workflow',
        subControls: {
          default: [
            { label: 'The nightly workflow missed a revalidation run', timerSeconds: 20 },
            { label: 'A deploy hook is looping the workflow queue', timerSeconds: 17 },
          ],
        },
      },
      {
        label: 'Vercel Function',
        miniGameId: 'name-five-aws-region',
        subControls: {
          default: [
            { label: 'Critical functions are cold-starting in the wrong region', timerSeconds: 21 },
            { label: 'Function logs show the auth handler routing to an old build', timerSeconds: 16 },
          ],
        },
      },
      {
        label: 'Cache',
        miniGameId: 'cache-knowledge',
        subControls: {
          default: [
            { label: 'The runtime cache is pinning stale session data in production', timerSeconds: 15 },
            { label: 'A cached payload is shadowing the latest config response', timerSeconds: 18 },
          ],
        },
      },
    ],
  },
  {
    id: 'database',
    name: 'Database',
    summary: 'Owns analytics stores, cloud databases, replicas, and data recovery actions.',
    controls: [
      {
        label: 'Tinybird',
        subControls: {
          createMV: [
            { label: 'A Tinybird query is timing out and running inefficiently', timerSeconds: 18 },
          ],
          scaleDown: [
            { label: 'The Tinybird bill was $100 million last month', timerSeconds: 18 },
          ],
          restoreBackup: [
            { label: 'Someone accidentally deleted a data source in Tinybird', timerSeconds: 18 },
          ],
        },
      },
      {
        label: 'ClickHouse',
        miniGameId: 'math',
        subControls: {
          default: [
            { label: 'ClickHouse query replicas are split across inconsistent shards', timerSeconds: 20 },
            { label: 'An analytics shard is overloaded after the latest launch spike', timerSeconds: 17 },
          ],
        },
      },
      {
        label: 'Cosmos DB',
        subControls: {
          scaleUp: [
            { label: 'Cosmos DB is throttling writes during a deploy spike', timerSeconds: 15 },
          ],
          addReplica: [
            { label: 'Cosmos DB failover coverage is missing a secondary replica', timerSeconds: 18 },
          ],
          failover: [
            { label: 'The primary Cosmos DB region is erroring on every write', timerSeconds: 14 },
          ],
        },
      },
      {
        label: 'DynamoDB',
        subControls: {
          default: [
            { label: 'The metadata service table is throttling and will not scale up', timerSeconds: 16 },
            { label: 'DynamoDB is down in the dxb1 region', timerSeconds: 19 },
          ],
        },
      },
    ],
  },
  {
    id: 'success',
    name: 'Success',
    summary: 'Owns public comms, support tickets, vendor contact, and status messaging.',
    controls: [
      {
        label: 'Social Media',
        miniGameId: 'monkey-type',
        subControls: {
          default: [
            { label: 'A new feature needs to be announced on social media', timerSeconds: 18 },
            { label: 'A tech influencer is complaining about pricing on X', timerSeconds: 20 },
          ],
        },
      },
      {
        label: 'Customer Ticket',
        miniGameId: 'match-the-customer',
        subControls: {
          reply: [
            { label: 'An enterprise customer is having issues with the dashboard', timerSeconds: 20 },
          ],
          guide: [
            { label: 'A wave of customers need a how-to guide for the new flow', timerSeconds: 17 },
          ],
        },
      },
      {
        label: 'Vendor',
        miniGameId: 'match-the-vendor',
        subControls: {
          escalate: [
            { label: 'A third-party vendor is timing out on webhook delivery', timerSeconds: 16 },
          ],
          followUp: [
            { label: 'A partner provider never confirmed the incident mitigation', timerSeconds: 18 },
          ],
        },
      },
      {
        label: 'Status Page',
        subControls: {
          default: [
            { label: 'The status page still shows green while customers report downtime', timerSeconds: 15 },
            { label: 'Recovery is completed but the status banner never cleared', timerSeconds: 14 },
          ],
        },
      },
      {
        label: 'IT',
        miniGameId: 'it-maze',
        subControls: {
          default: [
            { label: 'Someone on the team needs a new laptop before the next deploy', timerSeconds: 16 },
            { label: 'A teammate requested admin access on their workstation', timerSeconds: 18 },
          ],
        },
      },
    ],
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    summary: 'Owns Kubernetes, networking, DNS, and load balancing.',
    controls: [
      {
        label: 'Kubernetes',
        // Mini-game idea: "pod doctor" — drag env vars into a pod spec to fix it
        miniGameId: 'pod-doctor',
        subControls: {
          restartPod: [
            { label: 'A pod is stuck in CrashLoopBackOff because an environment variable is missing', timerSeconds: 18 },
            { label: 'The liveness probe is failing and the pod keeps getting killed', timerSeconds: 16 },
          ],
          scaleUp: [
            { label: 'The service is overloaded because autoscaling is not configured', timerSeconds: 20 },
            { label: 'CPU usage is at 98% and new pods are not being scheduled', timerSeconds: 17 },
          ],
          drainNode: [
            { label: 'A node is running out of memory and needs to be drained', timerSeconds: 15 },
          ],
          rollback: [
            { label: 'The latest deployment rolled out a broken image tag', timerSeconds: 16 },
          ],
        },
      },
      {
        label: 'Networking',
        miniGameId: 'load-balancer-split',
        subControls: {
          fixDNS: [
            { label: 'DNS propagation is stuck and the new domain is not resolving', timerSeconds: 19 },
            { label: 'A wildcard record is routing all subdomains to the wrong origin', timerSeconds: 16 },
          ],
          fixLoadBalancer: [
            { label: 'One origin server is receiving 95% of all traffic', timerSeconds: 16 },
            { label: 'The load balancer health check is failing for the primary region', timerSeconds: 18 },
          ],
          fixCertificate: [
            { label: 'The TLS certificate expired and the site is showing a security warning', timerSeconds: 14 },
          ],
        },
      },

    ],
  },
  {
    id: 'billing',
    name: 'Billing',
    summary: 'Owns payments, subscriptions, invoicing, and financial incidents.',
    controls: [
      {
        label: 'Billing',
        // Mini-game idea: "refund rush" — match invoices to correct refund amounts
        miniGameId: 'refund-rush',
        subControls: {
          issueRefund: [
            { label: 'A bug accidentally charged every customer $1 million', timerSeconds: 14 },
            { label: 'Duplicate charges went out to all pro-tier subscribers', timerSeconds: 16 },
          ],
          fixSubscription: [
            { label: 'Hundreds of customers are being downgraded to the free tier', timerSeconds: 17 },
            { label: 'The trial expiration job ran twice and locked out paying customers', timerSeconds: 15 },
          ],
          regenerateInvoice: [
            { label: 'Last month\'s invoices all show the wrong tax amount', timerSeconds: 18 },
            { label: 'A batch of enterprise invoices never got delivered', timerSeconds: 16 },
          ],
          handleChargeback: [
            { label: 'A wave of credit card chargebacks just came in from the payment processor', timerSeconds: 15 },
            { label: 'The chargeback rate spiked above 1% and the processor is threatening to cut us off', timerSeconds: 18 },
          ],
        },
      },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    summary: 'Owns threat detection, access control, DDoS mitigation, and incident response.',
    controls: [
      {
        label: 'Security',
        // Mini-game idea: "traffic filter" — tap red (malicious) requests,
        // let green (legitimate) ones through
        miniGameId: 'traffic-filter',
        subControls: {
          blockDDoS: [
            { label: 'A massive DDoS attack is flooding the API with 50k requests per second', timerSeconds: 14 },
            { label: 'A botnet from a single region is hammering the login endpoint', timerSeconds: 16 },
          ],
          stopBots: [
            { label: 'Bots are scraping the entire product catalog at 1000 pages per minute', timerSeconds: 18 },
            { label: 'Automated signups are creating thousands of spam accounts', timerSeconds: 16 },
          ],
          revokeAccess: [
            { label: 'A leaked API key with admin privileges is being used from an unknown IP', timerSeconds: 14 },
            { label: 'An ex-employee\'s access token was never revoked and is still active', timerSeconds: 16 },
          ],
          patchVulnerability: [
            { label: 'SQL injection attempts are bypassing the current firewall rules', timerSeconds: 16 },
            { label: 'A zero-day exploit is being actively used against the auth endpoint', timerSeconds: 14 },
          ],
          rotateSecrets: [
            { label: 'All production secrets need to be rotated after a credential exposure', timerSeconds: 18 },
          ],
        },
      },
    ],
  },
];

function flattenControlPrompts(
  ownerRole: RoleId,
  control: ControlDefinition,
): FlattenedPromptTemplate[] {
  // Controls without a miniGameId still generate prompts — they resolve
  // directly on button press (or via sub-control choice) with no mini-game.
  const miniGameId = control.miniGameId ?? '';

  return Object.entries(control.subControls).flatMap(([subControlKey, promptTemplates]) =>
    promptTemplates.map(prompt => ({
      ...prompt,
      ownerRole,
      actionLabel: control.label,
      selectionLabel: subControlKey === 'default' ? '' : formatSubControlLabel(subControlKey),
      miniGameId,
    })),
  );
}

export function getControlLabels(roleId: RoleId): string[] {
  return roles.find(role => role.id === roleId)?.controls.map(control => control.label) ?? [];
}


export const promptPool: FlattenedPromptTemplate[] = roles.flatMap(role =>
  role.controls.flatMap(control => flattenControlPrompts(role.id, control)),
);

let promptCounter = 0;

export function pickRandomPrompts(
  count: number,
  forControls?: string[],
  excludeLabels?: Iterable<string>,
): PromptDefinition[] {
  const pool = forControls
    ? promptPool.filter(template => forControls.includes(template.actionLabel))
    : promptPool;
  const excluded = new Set(excludeLabels);
  const available = pool.filter(template => !excluded.has(template.label));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(template => {
    promptCounter += 1;
    return {
      ...template,
      id: `prompt-${Date.now()}-${promptCounter}`,
      status: 'queued' as const,
      createdAt: Date.now(),
      assignedTo: '',
    };
  });
}

export const STARTING_VALUATION = 1_000_000;

export const demoDeployState: DeployState = {
  roomCode: 'SHIP-42',
  valuation: STARTING_VALUATION,
  valuationHistory: [STARTING_VALUATION],
  currentLevel: 1,
  levelPhase: 'briefing',
  timeRemainingSeconds: LEVELS[0].durationSeconds,
  prompts: [],
  consecutiveFailures: 0,
  failureThreshold: 3,
  bankrupt: false,
};
