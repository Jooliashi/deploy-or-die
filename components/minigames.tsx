'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniGameId } from '@/lib/game/types';

interface MiniGamePanelProps {
  miniGameId: MiniGameId;
  onResolve: () => void;
}

interface FlagEntry {
  country: string;
  flag: string;
}

const FLAG_BANK: FlagEntry[] = [
  { country: 'Argentina', flag: '🇦🇷' },
  { country: 'Australia', flag: '🇦🇺' },
  { country: 'Belgium', flag: '🇧🇪' },
  { country: 'Brazil', flag: '🇧🇷' },
  { country: 'Canada', flag: '🇨🇦' },
  { country: 'Chile', flag: '🇨🇱' },
  { country: 'Colombia', flag: '🇨🇴' },
  { country: 'Denmark', flag: '🇩🇰' },
  { country: 'Finland', flag: '🇫🇮' },
  { country: 'France', flag: '🇫🇷' },
  { country: 'Germany', flag: '🇩🇪' },
  { country: 'Greece', flag: '🇬🇷' },
  { country: 'India', flag: '🇮🇳' },
  { country: 'Indonesia', flag: '🇮🇩' },
  { country: 'Ireland', flag: '🇮🇪' },
  { country: 'Italy', flag: '🇮🇹' },
  { country: 'Japan', flag: '🇯🇵' },
  { country: 'Mexico', flag: '🇲🇽' },
  { country: 'Netherlands', flag: '🇳🇱' },
  { country: 'New Zealand', flag: '🇳🇿' },
  { country: 'Nigeria', flag: '🇳🇬' },
  { country: 'Norway', flag: '🇳🇴' },
  { country: 'Peru', flag: '🇵🇪' },
  { country: 'Poland', flag: '🇵🇱' },
  { country: 'Portugal', flag: '🇵🇹' },
  { country: 'Singapore', flag: '🇸🇬' },
  { country: 'South Korea', flag: '🇰🇷' },
  { country: 'Spain', flag: '🇪🇸' },
  { country: 'Sweden', flag: '🇸🇪' },
  { country: 'Switzerland', flag: '🇨🇭' },
  { country: 'Thailand', flag: '🇹🇭' },
  { country: 'United Kingdom', flag: '🇬🇧' },
  { country: 'United States', flag: '🇺🇸' },
  { country: 'Vietnam', flag: '🇻🇳' },
];

interface GuessRound {
  answer: FlagEntry;
  distractor: FlagEntry;
  options: string[];
}

interface RgbTarget {
  label: string;
  rgb: [number, number, number];
}

interface RgbRound {
  target: RgbTarget;
  channelOptions: {
    r: number[];
    g: number[];
    b: number[];
  };
}

const CHANNEL_BANK = [0, 64, 128, 192, 255];

const RGB_TARGETS: RgbTarget[] = [
  { label: 'electric coral', rgb: [255, 64, 64] },
  { label: 'warm amber', rgb: [255, 192, 64] },
  { label: 'signal lime', rgb: [192, 255, 64] },
  { label: 'mint wave', rgb: [64, 255, 192] },
  { label: 'sky ping', rgb: [64, 192, 255] },
  { label: 'deep cobalt', rgb: [64, 64, 255] },
  { label: 'violet beam', rgb: [192, 64, 255] },
  { label: 'hot pink', rgb: [255, 64, 192] },
  { label: 'soft gray', rgb: [192, 192, 192] },
  { label: 'midnight', rgb: [0, 64, 128] },
  { label: 'sea green', rgb: [64, 192, 128] },
  { label: 'sunset orange', rgb: [255, 128, 64] },
];

interface RegionAttempt {
  value: string;
  accepted: boolean;
}

interface MathRound {
  left: number;
  right: number;
  operator: '+' | '-';
  answer: number;
}

interface VendorCompany {
  name: string;
  description: string;
}

interface VendorRound {
  answer: VendorCompany;
  options: string[];
}

interface CustomerProfile {
  id: string;
  name: string;
  avatar: string;
}

interface MazeState {
  rows: string[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
}

const CODE_SNIPPETS = [
  "const deploy = await ship({ target: 'production' });",
  "export const runtime = 'edge';",
  "if (!flags.newDashboard) return redirect('/home');",
  "const latencyMs = Math.round(performance.now() - startTime);",
  "await revalidateTag('pricing-page');",
  "const config = await edgeConfig.get('checkout_theme');",
  "return Response.json({ ok: true, region: 'iad1' });",
  "const retries = Math.min(attempt + 1, 3);",
  "router.push(`/deployments/${deploymentId}`);",
  "const healthy = status === 'ready' && errors.length === 0;",
  "await logDrain.flush({ force: true });",
  "const nextRegion = regions.find(region => region !== currentRegion);",
  "headers.set('x-vercel-cache', 'MISS');",
  "const sessionKey = `${teamId}:${userId}:${Date.now()}`;",
  "const body = JSON.stringify({ feature: 'toolbar-comments' });",
  "return flags.rolloutPercent >= 50 ? 'open' : 'closed';",
  "const response = await fetch('/api/ship', { method: 'POST' });",
  "const ratio = Number((requests / errors).toFixed(2));",
  "if (uptime < 99.9) triggerIncident('customer-impacting');",
  "await invalidateByPrefix('preview:landing-page');",
  "const edgeRegion = process.env.VERCEL_REGION ?? 'iad1';",
  "const owner = team.slug.replace(/-/g, '_');",
];

const VENDOR_COMPANIES: VendorCompany[] = [
  { name: 'Apple', description: 'Consumer tech company known for the iPhone, Mac, and App Store ecosystem.' },
  { name: 'Microsoft', description: 'Software giant behind Windows, Office, Azure, and GitHub.' },
  { name: 'Google', description: 'Search, ads, Android, Chrome, and cloud infrastructure company.' },
  { name: 'Amazon', description: 'E-commerce and cloud company that operates AWS.' },
  { name: 'Meta', description: 'Social platform company behind Facebook, Instagram, and WhatsApp.' },
  { name: 'Netflix', description: 'Streaming platform famous for original series and recommendation algorithms.' },
  { name: 'NVIDIA', description: 'Chip company best known for GPUs used in gaming and AI workloads.' },
  { name: 'Adobe', description: 'Creative software company behind Photoshop, Illustrator, and Acrobat.' },
  { name: 'Salesforce', description: 'Enterprise CRM and business cloud software platform.' },
  { name: 'Oracle', description: 'Enterprise database, cloud, and business software company.' },
  { name: 'SAP', description: 'German enterprise software company focused on ERP systems.' },
  { name: 'IBM', description: 'Legacy enterprise tech company active in consulting, hybrid cloud, and AI.' },
  { name: 'Intel', description: 'Semiconductor company long known for PC and server CPUs.' },
  { name: 'AMD', description: 'Chip company competing in CPUs and GPUs for PCs, servers, and consoles.' },
  { name: 'Cisco', description: 'Networking company known for routers, switches, and enterprise security.' },
  { name: 'Qualcomm', description: 'Wireless chip and modem company heavily tied to mobile devices.' },
  { name: 'Uber', description: 'Ride-hailing and delivery platform company.' },
  { name: 'Airbnb', description: 'Travel platform for short-term stays and property rentals.' },
  { name: 'Shopify', description: 'Commerce platform used by merchants to run online stores.' },
  { name: 'Stripe', description: 'Payments infrastructure company used by developers and internet businesses.' },
  { name: 'Block', description: 'Fintech company behind Square point-of-sale tools and Cash App.' },
  { name: 'PayPal', description: 'Digital payments company used for online checkout and transfers.' },
  { name: 'Spotify', description: 'Music streaming company with playlists and podcast distribution.' },
  { name: 'Dropbox', description: 'Cloud file storage and sync company.' },
  { name: 'Slack', description: 'Work messaging platform now owned by Salesforce.' },
  { name: 'Zoom', description: 'Video meeting platform widely used for remote work.' },
  { name: 'Atlassian', description: 'Team software company behind Jira, Confluence, and Trello.' },
  { name: 'Datadog', description: 'Cloud observability company for logs, metrics, and traces.' },
  { name: 'Snowflake', description: 'Cloud data warehouse and analytics platform.' },
  { name: 'Cloudflare', description: 'Edge network company offering CDN, DNS, and security services.' },
  { name: 'GitHub', description: 'Code hosting and collaboration platform using Git.' },
  { name: 'GitLab', description: 'DevOps platform combining source control, CI, and deployment tooling.' },
  { name: 'Twilio', description: 'Communications API company for SMS, voice, and authentication.' },
  { name: 'HubSpot', description: 'Marketing, CRM, and sales automation software company.' },
  { name: 'ServiceNow', description: 'Enterprise workflow and IT service management platform.' },
  { name: 'MongoDB', description: 'Database company known for a popular document-oriented database.' },
  { name: 'Confluent', description: 'Data streaming company built around Apache Kafka.' },
  { name: 'Elastic', description: 'Search and observability company behind Elasticsearch.' },
  { name: 'Redis', description: 'In-memory data platform associated with caching and fast key-value workloads.' },
  { name: 'HashiCorp', description: 'Infrastructure automation company behind Terraform and Vault.' },
  { name: 'Databricks', description: 'Data and AI platform company built around lakehouse workflows.' },
  { name: 'OpenAI', description: 'AI lab and product company behind ChatGPT and large language models.' },
  { name: 'Anthropic', description: 'AI company focused on Claude and model safety.' },
  { name: 'Figma', description: 'Collaborative product design tool used for interface mockups and prototyping.' },
  { name: 'Canva', description: 'Visual design platform for lightweight graphics, presentations, and social posts.' },
  { name: 'Notion', description: 'Workspace app mixing docs, wikis, and lightweight databases.' },
  { name: 'Asana', description: 'Project management software company for team task tracking.' },
  { name: 'Linear', description: 'Issue tracking tool popular with software product teams.' },
  { name: 'Vercel', description: 'Frontend cloud platform focused on deployment, preview environments, and Next.js.' },
  { name: 'Netlify', description: 'Web deployment platform known for JAMstack hosting and previews.' },
  { name: 'Supabase', description: 'Developer platform offering hosted Postgres, auth, and storage.' },
  { name: 'PlanetScale', description: 'MySQL-compatible serverless database platform based on Vitess.' },
  { name: 'Cockroach Labs', description: 'Distributed SQL database company behind CockroachDB.' },
  { name: 'DigitalOcean', description: 'Cloud infrastructure provider popular with startups and developers.' },
  { name: 'Akamai', description: 'Internet delivery and security company known for CDN infrastructure.' },
  { name: 'Fastly', description: 'Edge cloud and CDN company focused on programmable delivery.' },
  { name: 'Okta', description: 'Identity and access management company for enterprise login flows.' },
  { name: 'Auth0', description: 'Developer-focused authentication platform owned by Okta.' },
  { name: 'Sentry', description: 'Application monitoring company known for error tracking.' },
  { name: 'New Relic', description: 'Observability platform for application performance monitoring.' },
  { name: 'Splunk', description: 'Data platform historically known for log search and security analytics.' },
  { name: 'PagerDuty', description: 'Incident response and on-call management platform.' },
  { name: 'Miro', description: 'Collaborative online whiteboard platform.' },
  { name: 'DocuSign', description: 'Electronic signature and agreement workflow company.' },
  { name: 'Box', description: 'Enterprise cloud content storage and collaboration platform.' },
  { name: 'Proton', description: 'Privacy-focused company behind encrypted email and productivity tools.' },
  { name: 'Discord', description: 'Community chat platform centered around servers, voice, and gaming groups.' },
  { name: 'Telegram', description: 'Messaging platform known for large channels and bot support.' },
  { name: 'Signal', description: 'Encrypted messaging app with a privacy-first reputation.' },
  { name: 'Snap', description: 'Company behind Snapchat and camera-first social apps.' },
  { name: 'Pinterest', description: 'Visual discovery and bookmarking social platform.' },
  { name: 'Reddit', description: 'Community forum platform organized into topic-based subcommunities.' },
  { name: 'X', description: 'Short-form social posting platform formerly known as Twitter.' },
  { name: 'TikTok', description: 'Short-video social platform owned by ByteDance.' },
  { name: 'Alibaba', description: 'Chinese tech giant spanning commerce, cloud, and digital services.' },
  { name: 'Tencent', description: 'Chinese internet company behind WeChat, gaming, and investments.' },
  { name: 'ByteDance', description: 'Technology company best known as the parent of TikTok.' },
  { name: 'Samsung', description: 'Electronics and semiconductor company making phones, chips, and displays.' },
  { name: 'Sony', description: 'Electronics and entertainment company behind PlayStation.' },
  { name: 'Xiaomi', description: 'Consumer electronics company known for smartphones and smart devices.' },
  { name: 'Lenovo', description: 'PC manufacturer known for ThinkPad laptops and enterprise hardware.' },
  { name: 'Dell', description: 'Computer hardware company known for laptops, desktops, and servers.' },
  { name: 'HP', description: 'PC and printer company serving consumer and enterprise markets.' },
  { name: 'Logitech', description: 'Peripheral company known for keyboards, mice, and webcams.' },
  { name: 'Arm', description: 'Chip architecture company licensing CPU designs used in many devices.' },
  { name: 'Broadcom', description: 'Semiconductor and infrastructure software company.' },
  { name: 'Palantir', description: 'Data integration and analytics company serving governments and enterprises.' },
  { name: 'VMware', description: 'Virtualization and cloud infrastructure software company.' },
  { name: 'Unity', description: 'Game engine company used for 2D and 3D interactive content.' },
  { name: 'Epic Games', description: 'Game company behind Unreal Engine and Fortnite.' },
  { name: 'Roblox', description: 'Gaming platform built around user-generated online experiences.' },
  { name: 'Valve', description: 'Gaming company behind Steam and PC game distribution.' },
  { name: 'Duolingo', description: 'Language learning app company with gamified lessons.' },
  { name: 'Coursera', description: 'Online education platform offering university and career courses.' },
  { name: 'Udemy', description: 'Marketplace for online video courses and technical learning.' },
  { name: 'Coinbase', description: 'Cryptocurrency exchange and wallet company.' },
  { name: 'Robinhood', description: 'Mobile-first investing app for stocks and crypto.' },
  { name: 'Wise', description: 'Cross-border money transfer and multi-currency fintech company.' },
  { name: 'Revolut', description: 'Fintech super-app for banking, cards, and international spending.' },
];

const CUSTOMER_NAMES = [
  'Ava Chen',
  'Leo Park',
  'Maya Singh',
  'Noah Kim',
  'Zoe Martinez',
  'Milo Brooks',
  'Ivy Nguyen',
  'Luca Rossi',
  'Nina Patel',
  'Owen Murphy',
  'Jade Alvarez',
  'Eli Cohen',
  'Sana Rahman',
  'Theo Johnson',
  'Ruby Clark',
  'Kai Rivera',
  'Lena Fischer',
  'Ethan Reed',
  'Aria Hassan',
  'Jonas Weber',
  'Mina Sato',
  'Felix Young',
  'Amara Davis',
  'Hugo Silva',
  'Esme Torres',
  'Caleb Fox',
  'Layla Brown',
  'Micah Evans',
  'Priya Shah',
  'Roman Bell',
];

const CUSTOMER_AVATARS = [
  '🙂',
  '😎',
  '🤠',
  '🧑‍💻',
  '👩‍💼',
  '🧑‍🚀',
  '🧑‍🔬',
  '🧑‍🎨',
  '👨‍🔧',
  '👩‍🚀',
  '🧑‍🍳',
  '👩‍🔬',
  '👨‍💼',
  '👩‍🏫',
  '🧑‍🏫',
  '👨‍🔬',
  '👩‍💻',
  '🧑‍🔧',
  '👨‍🚀',
  '👩‍🍳',
  '🧑‍⚕️',
  '👨‍⚕️',
  '👩‍⚕️',
  '🧑‍💼',
];

const VALID_VERCEL_REGION_CODES = [
  'arn1',
  'bom1',
  'cdg1',
  'cle1',
  'cpt1',
  'dub1',
  'dxb1',
  'fra1',
  'gru1',
  'hkg1',
  'hnd1',
  'iad1',
  'icn1',
  'kix1',
  'lhr1',
  'pdx1',
  'sfo1',
  'sin1',
  'syd1',
  'yul1',
];

const VALID_VERCEL_REGION_SET = new Set(VALID_VERCEL_REGION_CODES);

function randomIndex(length: number, except?: number): number {
  if (length <= 1) {
    return 0;
  }

  let next = Math.floor(Math.random() * length);
  while (next === except) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function buildGuessRound(exceptCountry?: string): GuessRound {
  const filteredAnswers = exceptCountry
    ? FLAG_BANK.filter(entry => entry.country !== exceptCountry)
    : FLAG_BANK;
  const answer = filteredAnswers[randomIndex(filteredAnswers.length)];
  const distractorPool = FLAG_BANK.filter(entry => entry.country !== answer.country);
  const distractor = distractorPool[randomIndex(distractorPool.length)];
  const options = Math.random() > 0.5
    ? [answer.country, distractor.country]
    : [distractor.country, answer.country];

  return {
    answer,
    distractor,
    options,
  };
}

function buildChannelOptions(value: number): number[] {
  const distractors = CHANNEL_BANK
    .filter(entry => entry !== value)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return [value, ...distractors].sort(() => Math.random() - 0.5);
}

function buildRgbRound(exceptLabel?: string): RgbRound {
  const targetPool = exceptLabel
    ? RGB_TARGETS.filter(entry => entry.label !== exceptLabel)
    : RGB_TARGETS;
  const target = targetPool[randomIndex(targetPool.length)];
  const [r, g, b] = target.rgb;

  return {
    target,
    channelOptions: {
      r: buildChannelOptions(r),
      g: buildChannelOptions(g),
      b: buildChannelOptions(b),
    },
  };
}

function buildMathRound(previous?: string): MathRound {
  let operator: '+' | '-' = Math.random() > 0.45 ? '+' : '-';
  let left = 100 + Math.floor(Math.random() * 900);
  let right = 100 + Math.floor(Math.random() * 900);

  if (operator === '-' && right > left) {
    [left, right] = [right, left];
  }

  const key = `${left}${operator}${right}`;
  if (key === previous) {
    return buildMathRound(previous);
  }

  return {
    left,
    right,
    operator,
    answer: operator === '+' ? left + right : left - right,
  };
}

function buildVendorRound(exceptName?: string): VendorRound {
  const answerPool = exceptName
    ? VENDOR_COMPANIES.filter(company => company.name !== exceptName)
    : VENDOR_COMPANIES;
  const answer = answerPool[randomIndex(answerPool.length)];
  const options = [answer.name, ...VENDOR_COMPANIES
    .filter(company => company.name !== answer.name)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map(company => company.name)]
    .sort(() => Math.random() - 0.5);

  return { answer, options };
}

function buildCustomerProfiles(): CustomerProfile[] {
  const names = [...CUSTOMER_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
  const avatars = [...CUSTOMER_AVATARS].sort(() => Math.random() - 0.5).slice(0, 3);

  return names.map((name, index) => ({
    id: `customer-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    avatar: avatars[index % avatars.length],
  }));
}

function buildMaze(): MazeState {
  const rows = [
    '#########',
    '#S  #   #',
    '# # # # #',
    '# #   # #',
    '# ### # #',
    '#   #   #',
    '### ### #',
    '#      G#',
    '#########',
  ];

  return {
    rows,
    start: { x: 1, y: 1 },
    goal: { x: 7, y: 7 },
  };
}

function GuessTheCountryGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<GuessRound>(() => buildGuessRound());
  const options = useMemo(() => round.options, [round]);

  return (
    <div className="mini-shell mini-shell-country">
      <div className="mini-callout mini-callout-country">
        Which country is this flag?
      </div>

      <div className="flag-card" aria-label="Flag to identify">
        <div className="flag-card-inner">
          <span className="flag-emoji" role="img" aria-label={`${round.answer.country} flag`}>
            {round.answer.flag}
          </span>
        </div>
      </div>

      <div className="country-choice-grid">
        {options.map(option => (
          <button
            className="country-choice"
            key={`${round.answer.flag}-${round.distractor.country}-${option}`}
            onClick={() => {
              if (option === round.answer.country) {
                onResolve();
                return;
              }

              setRound(buildGuessRound(round.answer.country));
            }}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function GuessTheHexGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<RgbRound>(() => buildRgbRound());
  const [selection, setSelection] = useState<{ r: number | null; g: number | null; b: number | null }>({
    r: null,
    g: null,
    b: null,
  });

  const preview = {
    r: selection.r ?? 0,
    g: selection.g ?? 0,
    b: selection.b ?? 0,
  };
  const previewColor = `rgb(${preview.r}, ${preview.g}, ${preview.b})`;
  const targetColor = `rgb(${round.target.rgb[0]}, ${round.target.rgb[1]}, ${round.target.rgb[2]})`;

  useEffect(() => {
    const matched =
      selection.r === round.target.rgb[0] &&
      selection.g === round.target.rgb[1] &&
      selection.b === round.target.rgb[2];

    if (matched) {
      onResolve();
    }
  }, [onResolve, round.target.rgb, selection.b, selection.g, selection.r]);

  return (
    <div className="mini-shell mini-shell-hex">
      <div className="mini-callout mini-callout-hex">
        Match the target color by choosing the right RGB values.
      </div>

      <div className="rgb-duel">
        <div className="hex-card" aria-label={`Target color ${round.target.label}`}>
          <div className="hex-card-inner">
            <div className="swatch-stack">
              <div className="swatch-label">Target</div>
              <div className="hex-swatch" style={{ background: targetColor }} />
            </div>
          </div>
        </div>

        <div className="hex-card hex-card-preview" aria-label="Current mixed color">
          <div className="hex-card-inner">
            <div className="swatch-stack">
              <div className="swatch-label">Your Mix</div>
              <div className="hex-swatch" style={{ background: previewColor }} />
            </div>
          </div>
        </div>
      </div>

      <div className="rgb-channel-grid">
        {(['r', 'g', 'b'] as const).map(channel => (
          <div className={`rgb-channel rgb-channel-${channel}`} key={channel}>
            <div className="rgb-channel-head">
              <span className="rgb-channel-name">{channel.toUpperCase()}</span>
              <span className="rgb-channel-value">{selection[channel] ?? '--'}</span>
            </div>
            <div className="rgb-option-row">
              {round.channelOptions[channel].map(value => (
                <button
                  className={`rgb-option${selection[channel] === value ? ' selected' : ''}`}
                  key={`${round.target.label}-${channel}-${value}`}
                  onClick={() => {
                    setSelection(current => ({ ...current, [channel]: value }));
                  }}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NameFiveVercelRegionGame({ onResolve }: { onResolve: () => void }) {
  const [value, setValue] = useState('');
  const [attempts, setAttempts] = useState<RegionAttempt[]>([]);
  const acceptedValues = useMemo(
    () => attempts.filter(attempt => attempt.accepted).map(attempt => attempt.value),
    [attempts],
  );
  const acceptedSet = useMemo(() => new Set(acceptedValues), [acceptedValues]);
  const acceptedCount = acceptedSet.size;

  useEffect(() => {
    if (acceptedCount >= 5) {
      onResolve();
    }
  }, [acceptedCount, onResolve]);

  const submitValue = () => {
    const next = value.trim().toLowerCase();
    if (!next) {
      return;
    }

    const accepted = VALID_VERCEL_REGION_SET.has(next) && !acceptedSet.has(next);
    setAttempts(current => [{ value: next, accepted }, ...current].slice(0, 10));
    setValue('');
  };

  return (
    <div className="mini-shell mini-shell-region">
      <div className="mini-callout mini-callout-region">
        Type 5 Vercel region codes. Example: iad1
      </div>

      <div className="region-terminal">
        <div className="region-terminal-head">
          <span>accepted {acceptedCount}/5</span>
          <span>example iad1</span>
        </div>

        <div className="region-input-row">
          <span className="region-prompt">&gt;</span>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className="region-input"
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitValue();
              }
            }}
            placeholder="type a region code"
            spellCheck={false}
            type="text"
            value={value}
          />
          <button className="region-submit" onClick={submitValue} type="button">
            Enter
          </button>
        </div>

        <div className="region-log">
          {attempts.length > 0 ? (
            attempts.map((attempt, index) => (
              <div className={`region-attempt${attempt.accepted ? ' accepted' : ' rejected'}`} key={`${attempt.value}-${index}`}>
                <span className="region-attempt-mark">{attempt.accepted ? '✓' : '×'}</span>
                <span className="region-attempt-value">{attempt.value}</span>
              </div>
            ))
          ) : (
            <div className="region-attempt region-attempt-empty">
              <span className="region-attempt-mark">…</span>
              <span className="region-attempt-value">No regions entered yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MathGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<MathRound>(() => buildMathRound());
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    if (result !== 'wrong') {
      return;
    }

    const timeout = window.setTimeout(() => setResult('idle'), 420);
    return () => window.clearTimeout(timeout);
  }, [result]);

  const submitValue = () => {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    if (parsed === round.answer) {
      setResult('correct');
      onResolve();
      return;
    }

    setResult('wrong');
    setValue('');
    setRound(current => buildMathRound(`${current.left}${current.operator}${current.right}`));
  };

  return (
    <div className="mini-shell mini-shell-math">
      <div className="mini-callout mini-callout-math">
        Solve the equation. Three-digit arithmetic only.
      </div>

      <div className={`math-board${result === 'wrong' ? ' wrong' : ''}`}>
        <div className="math-expression">
          <span>{round.left}</span>
          <span className="math-operator">{round.operator}</span>
          <span>{round.right}</span>
        </div>

        <div className="math-input-row">
          <span className="math-equals">=</span>
          <input
            className="math-input"
            inputMode="numeric"
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitValue();
              }
            }}
            placeholder="answer"
            type="text"
            value={value}
          />
          <button className="math-submit" onClick={submitValue} type="button">
            Check
          </button>
        </div>
      </div>
    </div>
  );
}

function MonkeyTypeGame({ onResolve }: { onResolve: () => void }) {
  const [snippet] = useState(() => CODE_SNIPPETS[randomIndex(CODE_SNIPPETS.length)]);
  const [typed, setTyped] = useState('');
  const [focused, setFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typed === snippet) {
      onResolve();
    }
  }, [onResolve, snippet, typed]);

  return (
    <div className="mini-shell mini-shell-monkeytype">
      <div className="mini-callout mini-callout-monkeytype">
        Type through the snippet character by character.
      </div>

      <div
        className={`typing-board typing-board-live${focused ? ' focused' : ''}`}
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        <div className="typing-stream" aria-label="Typing target">
          {snippet.split('').map((char, index) => {
            const typedChar = typed[index];
            const isCurrent = index === typed.length;
            const isCorrect = typedChar === char;
            const isWrong = typedChar !== undefined && typedChar !== char;

            return (
              <span
                className={[
                  'typing-char',
                  isCurrent ? 'current' : '',
                  isCorrect ? 'correct' : '',
                  isWrong ? 'wrong' : '',
                ].filter(Boolean).join(' ')}
                key={`${char}-${index}`}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>

        <input
          autoCapitalize="none"
          autoCorrect="off"
          className="typing-hidden-input"
          onBlur={() => setFocused(false)}
          onChange={event => {
            const next = event.target.value.slice(0, snippet.length);
            setTyped(next);
          }}
          onFocus={() => setFocused(true)}
          onPaste={event => event.preventDefault()}
          ref={inputRef}
          spellCheck={false}
          type="text"
          value={typed}
        />

        <div className="typing-actions">
          <div className="typing-meta">
            {typed.length}/{snippet.length} chars
          </div>
          <div className="typing-meta">Paste disabled</div>
        </div>
      </div>
    </div>
  );
}

function MatchTheVendorGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<VendorRound>(() => buildVendorRound());

  return (
    <div className="mini-shell mini-shell-vendor-match">
      <div className="mini-callout mini-callout-vendor-match">
        Match the vendor to the company description.
      </div>

      <div className="vendor-match-card">
        <div className="vendor-match-kicker">Description</div>
        <p className="vendor-match-copy">{round.answer.description}</p>
      </div>

      <div className="vendor-match-grid">
        {round.options.map(option => (
          <button
            className="vendor-match-choice"
            key={`${round.answer.name}-${option}`}
            onClick={() => {
              if (option === round.answer.name) {
                onResolve();
                return;
              }

              setRound(buildVendorRound(round.answer.name));
            }}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchTheCustomerGame({ onResolve }: { onResolve: () => void }) {
  const [profiles, setProfiles] = useState<CustomerProfile[]>(() => buildCustomerProfiles());
  const [phase, setPhase] = useState<'memorize' | 'quiz'>('memorize');
  const [questionIndex, setQuestionIndex] = useState(() => randomIndex(3));

  useEffect(() => {
    if (phase !== 'memorize') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setQuestionIndex(randomIndex(profiles.length));
      setPhase('quiz');
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [phase, profiles]);

  const answer = profiles[questionIndex];

  return (
    <div className="mini-shell mini-shell-customer-match">
      <div className="mini-callout mini-callout-customer-match">
        {phase === 'memorize' ? 'Memorize the customers before the names disappear.' : 'Which name matches this customer?'}
      </div>

      {phase === 'memorize' ? (
        <div className="customer-memory-board">
          <div className="customer-memory-head">
            <span>Study phase</span>
            <span>5 seconds</span>
          </div>

          <div className="customer-memory-grid">
            {profiles.map(profile => (
              <div className="customer-memory-card" key={profile.id}>
                <div className="customer-memory-avatar" aria-hidden="true">
                  {profile.avatar}
                </div>
                <div className="customer-memory-name">{profile.name}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="customer-quiz-board">
          <div className="customer-quiz-card">
            <div className="customer-quiz-kicker">Customer</div>
            <div className="customer-quiz-avatar" aria-hidden="true">
              {answer.avatar}
            </div>
          </div>

          <div className="customer-name-grid">
            {profiles.map(profile => (
              <button
                className="customer-name-choice"
                key={`${answer.id}-${profile.id}`}
                onClick={() => {
                  if (profile.id === answer.id) {
                    onResolve();
                    return;
                  }

                  const nextProfiles = buildCustomerProfiles();
                  setProfiles(nextProfiles);
                  setQuestionIndex(randomIndex(nextProfiles.length));
                  setPhase('memorize');
                }}
                type="button"
              >
                {profile.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItMazeGame({ onResolve }: { onResolve: () => void }) {
  const [maze] = useState<MazeState>(() => buildMaze());
  const [position, setPosition] = useState(maze.start);
  const [wrongBump, setWrongBump] = useState(false);

  useEffect(() => {
    setPosition(maze.start);
  }, [maze]);

  useEffect(() => {
    if (position.x === maze.goal.x && position.y === maze.goal.y) {
      onResolve();
    }
  }, [maze.goal.x, maze.goal.y, onResolve, position.x, position.y]);

  useEffect(() => {
    const move = (dx: number, dy: number) => {
      setPosition(current => {
        const nextX = current.x + dx;
        const nextY = current.y + dy;
        const nextCell = maze.rows[nextY]?.[nextX];

        if (!nextCell || nextCell === '#') {
          setWrongBump(true);
          window.setTimeout(() => setWrongBump(false), 140);
          return current;
        }

        return { x: nextX, y: nextY };
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        move(0, -1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        move(0, 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1, 0);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1, 0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [maze.rows]);

  return (
    <div className="mini-shell mini-shell-it-maze">
      <div className="mini-callout mini-callout-it-maze">
        Use the arrow keys to route the request through IT.
      </div>

      <div className={`it-maze-board${wrongBump ? ' bumped' : ''}`}>
        <div className="it-maze-head">
          <span>Start</span>
          <span>Arrow keys only</span>
          <span>Goal</span>
        </div>
        <div className="it-maze-grid" aria-label="IT support labyrinth">
          {maze.rows.map((row, y) =>
            row.split('').map((cell, x) => {
              const isPlayer = position.x === x && position.y === y;
              const className = [
                'it-maze-cell',
                cell === '#' ? 'wall' : 'path',
                cell === 'S' ? 'start' : '',
                cell === 'G' ? 'goal' : '',
                isPlayer ? 'player' : '',
              ].filter(Boolean).join(' ');

              return (
                <div className={className} key={`${x}-${y}`}>
                  {cell === 'S' ? 'S' : cell === 'G' ? 'E' : isPlayer ? '●' : ''}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

interface BugSprite {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hue: number;
}

const BUG_FIELD_WIDTH = 420;
const BUG_FIELD_HEIGHT = 240;
const BUG_COUNT = 5;

function createBug(index: number): BugSprite {
  return {
    id: `bug-${index}-${Math.random().toString(36).slice(2, 7)}`,
    x: 28 + Math.random() * (BUG_FIELD_WIDTH - 56),
    y: 30 + Math.random() * (BUG_FIELD_HEIGHT - 60),
    dx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4),
    dy: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.3),
    hue: 320 + Math.floor(Math.random() * 40),
  };
}

function BugBashGame({ onResolve }: { onResolve: () => void }) {
  const [bugs, setBugs] = useState<BugSprite[]>(() =>
    Array.from({ length: BUG_COUNT }, (_, index) => createBug(index)),
  );
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSquash = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const ctx = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = ctx;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(190 + Math.random() * 70, now);
    oscillator.frequency.exponentialRampToValueAtTime(68, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  };

  useEffect(() => {
    if (bugs.length === 0) {
      onResolve();
      return;
    }

    const interval = window.setInterval(() => {
      setBugs(current =>
        current.map(bug => {
          let nextX = bug.x + bug.dx;
          let nextY = bug.y + bug.dy;
          let nextDx = bug.dx;
          let nextDy = bug.dy;

          if (nextX <= 10 || nextX >= BUG_FIELD_WIDTH - 42) {
            nextDx *= -1;
            nextX = Math.max(10, Math.min(BUG_FIELD_WIDTH - 42, nextX));
          }

          if (nextY <= 10 || nextY >= BUG_FIELD_HEIGHT - 42) {
            nextDy *= -1;
            nextY = Math.max(10, Math.min(BUG_FIELD_HEIGHT - 42, nextY));
          }

          return {
            ...bug,
            x: nextX,
            y: nextY,
            dx: nextDx,
            dy: nextDy,
          };
        }),
      );
    }, 48);

    return () => window.clearInterval(interval);
  }, [bugs.length, onResolve]);

  useEffect(() => () => {
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  return (
    <div className="mini-shell mini-shell-bugbash">
      <div className="mini-callout mini-callout-bugbash">
        Smash every bug in the release before it ships.
      </div>

      <div className="bug-arena">
        <div className="bug-grid" aria-hidden="true" />
        {bugs.map(bug => (
          <button
            className="bug-sprite"
            key={bug.id}
            onClick={() => {
              playSquash();
              setBugs(current => current.filter(entry => entry.id !== bug.id));
            }}
            style={
              {
                '--bug-x': `${bug.x}px`,
                '--bug-y': `${bug.y}px`,
                '--bug-hue': `${bug.hue}`,
              } as CSSProperties
            }
            type="button"
          >
            <span className="bug-body" />
            <span className="bug-wing left" />
            <span className="bug-wing right" />
            <span className="bug-eye left" />
            <span className="bug-eye right" />
          </button>
        ))}

        <div className="bug-counter">
          <span>bugs left</span>
          <strong>{bugs.length}</strong>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Find the Logs — word search in a 10×10 grid of scrambled-case gibberish
// ---------------------------------------------------------------------------

const LOG_WORDS = [
  'ERROR', 'FATAL', 'PANIC', 'ABORT', 'CRASH',
  'TIMEOUT', 'REJECT', 'FAILED', 'BROKEN', 'STALE',
  'DENIED', 'LEAKED', 'ORPHAN', 'STUCK', 'DRAIN',
];

const GRID_SIZE = 10;
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?><;:';

function scrambleCase(s: string): string {
  return s.split('').map(c => (Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase())).join('');
}

interface LogGrid {
  cells: string[][];
  word: string;
  wordCells: Set<string>; // "row,col" keys
}

function generateLogGrid(): LogGrid {
  const word = LOG_WORDS[Math.floor(Math.random() * LOG_WORDS.length)];

  // Fill grid with random chars, all with scrambled case.
  const cells: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)],
    ),
  );

  // Place the word in a random direction.
  const directions: [number, number][] = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  let placed = false;
  const wordCells = new Set<string>();
  const scrambled = scrambleCase(word);

  for (let attempt = 0; attempt < 200 && !placed; attempt++) {
    const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);

    // Check bounds.
    const endRow = startRow + dr * (scrambled.length - 1);
    const endCol = startCol + dc * (scrambled.length - 1);
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

    // Place it.
    wordCells.clear();
    for (let i = 0; i < scrambled.length; i++) {
      const r = startRow + dr * i;
      const c = startCol + dc * i;
      cells[r][c] = scrambled[i];
      wordCells.add(`${r},${c}`);
    }
    placed = true;
  }

  return { cells, word, wordCells };
}

function FindTheLogsGame({ onResolve }: { onResolve: () => void }) {
  const [grid, setGrid] = useState<LogGrid>(generateLogGrid);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState(false);

  const toggle = useCallback((key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Check if the selection matches the word cells.
  useEffect(() => {
    if (selected.size === 0) return;
    if (selected.size !== grid.wordCells.size) return;

    const isCorrect = [...selected].every(k => grid.wordCells.has(k));
    if (isCorrect) {
      onResolve();
    } else if (selected.size === grid.wordCells.size) {
      // Wrong selection — flash and reset.
      setWrongFlash(true);
      const t = setTimeout(() => {
        setWrongFlash(false);
        setSelected(new Set());
        setGrid(generateLogGrid());
      }, 600);
      return () => clearTimeout(t);
    }
  }, [selected, grid.wordCells, onResolve]);

  return (
    <div className="mini-shell mini-shell-logs">
      <div className="mini-callout mini-callout-logs">
        Find the word in the logs
      </div>

      <div className="logs-target">
        <span className="logs-target-word">{grid.word}</span>
        <span className="logs-target-hint">{selected.size} / {grid.wordCells.size} selected</span>
      </div>

      <div className={`logs-grid${wrongFlash ? ' logs-wrong' : ''}`}>
        {grid.cells.map((row, ri) =>
          row.map((char, ci) => {
            const key = `${ri},${ci}`;
            const isSel = selected.has(key);
            return (
              <button
                className={`logs-cell${isSel ? ' logs-cell-selected' : ''}`}
                key={key}
                onClick={() => toggle(key)}
                type="button"
              >
                {char}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

const IMPLEMENTED_MINIGAMES = new Set<MiniGameId>([
  'bug-bash',
  'find-the-logs',
  'guess-the-country',
  'guess-the-hex',
  'it-maze',
  'math',
  'match-the-customer',
  'match-the-vendor',
  'monkey-type',
  'name-five-aws-region',
]);

export function hasMiniGame(miniGameId: MiniGameId | undefined): miniGameId is MiniGameId {
  return !!miniGameId && IMPLEMENTED_MINIGAMES.has(miniGameId);
}

export function MiniGamePanel({
  miniGameId,
  onResolve,
}: MiniGamePanelProps) {
  if (miniGameId === 'bug-bash') {
    return <BugBashGame onResolve={onResolve} />;
  }

  if (miniGameId === 'guess-the-country') {
    return <GuessTheCountryGame onResolve={onResolve} />;
  }

  if (miniGameId === 'find-the-logs') {
    return <FindTheLogsGame onResolve={onResolve} />;
  }

  if (miniGameId === 'guess-the-hex') {
    return <GuessTheHexGame onResolve={onResolve} />;
  }

  if (miniGameId === 'name-five-aws-region') {
    return <NameFiveVercelRegionGame onResolve={onResolve} />;
  }

  if (miniGameId === 'math') {
    return <MathGame onResolve={onResolve} />;
  }

  if (miniGameId === 'monkey-type') {
    return <MonkeyTypeGame onResolve={onResolve} />;
  }

  if (miniGameId === 'match-the-vendor') {
    return <MatchTheVendorGame onResolve={onResolve} />;
  }

  if (miniGameId === 'match-the-customer') {
    return <MatchTheCustomerGame onResolve={onResolve} />;
  }

  if (miniGameId === 'it-maze') {
    return <ItMazeGame onResolve={onResolve} />;
  }

  return null;
}
