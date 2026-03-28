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
            { label: 'After version update, the whole dashboard is crashing', timerSeconds: 16 },
          ],
        },
      },
      {
        label: 'UI',
        miniGameId: 'guess-the-hex',
        subControls: {
          default: [
            { label: 'The button on upgrade banner does not work', timerSeconds: 20 },
            { label: 'The link in docs website is linking to the wrong destination', timerSeconds: 17 },
          ],
        },
      },
      {
        label: 'Flags',
        miniGameId: 'guess-the-country',
        subControls: {
          turnOn: [
            { label: 'We need to roll out the new feature behind the flag right NOW', timerSeconds: 19 },
          ],
          turnOff: [
            { label: 'The wrong customers are flagged in our new feature experiment', timerSeconds: 15 },
          ],
        },
      },
      {
        label: 'Configs',
        subControls: {
          envVariable: [
            { label: 'current Stripe token is leaked!', timerSeconds: 18 },
          ],
          teamMemberManagement: [
            { label: 'We have a new hire that needs access to Vercel Team', timerSeconds: 14 },
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
            { label: 'Edge Config was blocked by the firewall', timerSeconds: 16 },
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
            { label: 'Critical Functions are cold-starting in the wrong region', timerSeconds: 21 },
            { label: 'Function logs show the auth handler routing to an old build', timerSeconds: 16 },
          ],
        },
      },
      {
        label: 'Cache',
        miniGameId: 'cache-knowledge',
        subControls: {
          default: [
            { label: 'Runtime cache is pinning stale session data in production', timerSeconds: 15 },
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
            { label: 'A Tinybird query is timing out and inefficient', timerSeconds: 18 },
          ],
          scaleDown: [
            { label: 'Tinybird bill was 100 million dollars last month', timerSeconds: 18 },
          ],
          restoreBackup: [
            { label: 'Matheus accidentally deleted a datasource in Tinybird', timerSeconds: 18 },
          ],
        },
      },
      {
        label: 'Clickhouse',
        miniGameId: 'math',
        subControls: {
          default: [
            { label: 'Clickhouse query replicas are split across inconsistent shards', timerSeconds: 20 },
            { label: 'An analytics shard is overloaded after the latest launch spike', timerSeconds: 17 },
          ],
        },
      },
      {
        label: 'Cosmodb',
        subControls: {
          scaleUp: [
            { label: 'Cosmodb is throttling writes during a deploy spike', timerSeconds: 15 },
          ],
          addReplica: [
            { label: 'Cosmodb failover coverage is missing a secondary replica', timerSeconds: 18 },
          ],
          failover: [
            { label: 'The primary Cosmodb region is erroring on every write', timerSeconds: 14 },
          ],
        },
      },
      {
        label: 'Dynamodb',
        subControls: {
          default: [
            { label: 'The metadata service table is throtteling and does not scale up', timerSeconds: 16 },
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
            { label: 'A new feature has to be announced on social media', timerSeconds: 18 },
            { label: 'A tech influencer is complaining about pricing', timerSeconds: 20 },
          ],
        },
      },
      {
        label: 'Customer Ticket',
        miniGameId: 'match-the-customer',
        subControls: {
          reply: [
            { label: 'An enterprise customer has issues with the dashboard', timerSeconds: 20 },
          ],
          guide: [
            { label: 'A wave of customers needs a how-to guide for the new flow', timerSeconds: 17 },
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
            { label: 'Recovery completed but the status banner never cleared', timerSeconds: 14 },
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

export function pickRandomPrompts(count: number, forControls?: string[]): PromptDefinition[] {
  const pool = forControls
    ? promptPool.filter(template => forControls.includes(template.actionLabel))
    : promptPool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
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
  timeRemainingSeconds: 300,
  prompts: [],
  bankrupt: false,
};
