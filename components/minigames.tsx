'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniGameId } from '@/lib/game/types';

interface MiniGamePanelProps {
  miniGameId: MiniGameId;
  onResolve: () => void;
}

interface FlagEntry {
  country: string;
  capital: string;
  decoyCity: string;
  group: string;
  flag: string;
}

const FLAG_BANK: FlagEntry[] = [
  { country: 'Argentina', capital: 'Buenos Aires', decoyCity: 'Cordoba', group: 'americas-south', flag: '🇦🇷' },
  { country: 'Australia', capital: 'Canberra', decoyCity: 'Sydney', group: 'oceania', flag: '🇦🇺' },
  { country: 'Belgium', capital: 'Brussels', decoyCity: 'Antwerp', group: 'europe-west', flag: '🇧🇪' },
  { country: 'Brazil', capital: 'Brasilia', decoyCity: 'Sao Paulo', group: 'americas-south', flag: '🇧🇷' },
  { country: 'Canada', capital: 'Ottawa', decoyCity: 'Toronto', group: 'americas-north', flag: '🇨🇦' },
  { country: 'Chile', capital: 'Santiago', decoyCity: 'Valparaiso', group: 'americas-south', flag: '🇨🇱' },
  { country: 'Colombia', capital: 'Bogota', decoyCity: 'Medellin', group: 'americas-south', flag: '🇨🇴' },
  { country: 'Denmark', capital: 'Copenhagen', decoyCity: 'Aarhus', group: 'europe-nordic', flag: '🇩🇰' },
  { country: 'Finland', capital: 'Helsinki', decoyCity: 'Turku', group: 'europe-nordic', flag: '🇫🇮' },
  { country: 'France', capital: 'Paris', decoyCity: 'Lyon', group: 'europe-west', flag: '🇫🇷' },
  { country: 'Germany', capital: 'Berlin', decoyCity: 'Munich', group: 'europe-central', flag: '🇩🇪' },
  { country: 'Greece', capital: 'Athens', decoyCity: 'Thessaloniki', group: 'europe-south', flag: '🇬🇷' },
  { country: 'India', capital: 'New Delhi', decoyCity: 'Mumbai', group: 'asia-south', flag: '🇮🇳' },
  { country: 'Indonesia', capital: 'Jakarta', decoyCity: 'Surabaya', group: 'asia-southeast', flag: '🇮🇩' },
  { country: 'Ireland', capital: 'Dublin', decoyCity: 'Cork', group: 'europe-west', flag: '🇮🇪' },
  { country: 'Italy', capital: 'Rome', decoyCity: 'Milan', group: 'europe-south', flag: '🇮🇹' },
  { country: 'Japan', capital: 'Tokyo', decoyCity: 'Osaka', group: 'asia-east', flag: '🇯🇵' },
  { country: 'Mexico', capital: 'Mexico City', decoyCity: 'Guadalajara', group: 'americas-north', flag: '🇲🇽' },
  { country: 'Netherlands', capital: 'Amsterdam', decoyCity: 'Rotterdam', group: 'europe-west', flag: '🇳🇱' },
  { country: 'New Zealand', capital: 'Wellington', decoyCity: 'Auckland', group: 'oceania', flag: '🇳🇿' },
  { country: 'Nigeria', capital: 'Abuja', decoyCity: 'Lagos', group: 'africa', flag: '🇳🇬' },
  { country: 'Norway', capital: 'Oslo', decoyCity: 'Bergen', group: 'europe-nordic', flag: '🇳🇴' },
  { country: 'Peru', capital: 'Lima', decoyCity: 'Cusco', group: 'americas-south', flag: '🇵🇪' },
  { country: 'Poland', capital: 'Warsaw', decoyCity: 'Krakow', group: 'europe-central', flag: '🇵🇱' },
  { country: 'Portugal', capital: 'Lisbon', decoyCity: 'Porto', group: 'europe-south', flag: '🇵🇹' },
  { country: 'Singapore', capital: 'Singapore', decoyCity: 'Jurong', group: 'asia-southeast', flag: '🇸🇬' },
  { country: 'South Korea', capital: 'Seoul', decoyCity: 'Busan', group: 'asia-east', flag: '🇰🇷' },
  { country: 'Spain', capital: 'Madrid', decoyCity: 'Barcelona', group: 'europe-south', flag: '🇪🇸' },
  { country: 'Sweden', capital: 'Stockholm', decoyCity: 'Gothenburg', group: 'europe-nordic', flag: '🇸🇪' },
  { country: 'Switzerland', capital: 'Bern', decoyCity: 'Zurich', group: 'europe-central', flag: '🇨🇭' },
  { country: 'Thailand', capital: 'Bangkok', decoyCity: 'Chiang Mai', group: 'asia-southeast', flag: '🇹🇭' },
  { country: 'United Kingdom', capital: 'London', decoyCity: 'Manchester', group: 'europe-west', flag: '🇬🇧' },
  { country: 'United States', capital: 'Washington, D.C.', decoyCity: 'New York', group: 'americas-north', flag: '🇺🇸' },
  { country: 'Vietnam', capital: 'Hanoi', decoyCity: 'Ho Chi Minh City', group: 'asia-southeast', flag: '🇻🇳' },
];

interface GuessRound {
  answer: FlagEntry;
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

interface LoadBalancerLane {
  id: string;
  label: string;
  load: number;
}

interface RegexScenario {
  prompt: string;
  samples: string[];
  answer: string;
  distractors: string[];
}

interface MazeState {
  rows: string[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
}

interface DeploySequenceScenario {
  sentence: string;
  sequence: string[];
  options: string[];
}

const MAZE_BANK = [
  [
    '#########',
    '#S  #   #',
    '# # # # #',
    '# #   # #',
    '# ### # #',
    '#   #   #',
    '### ### #',
    '#      G#',
    '#########',
  ],
  [
    '#########',
    '#S     ##',
    '### ##  #',
    '#   ## ##',
    '# #    ##',
    '# ####  #',
    '#    ## #',
    '## #   G#',
    '#########',
  ],
  [
    '#########',
    '#S#     #',
    '# # ### #',
    '# # #   #',
    '#   # ###',
    '### #   #',
    '#   ### #',
    '#     #G#',
    '#########',
  ],
  [
    '#########',
    '#S   ## #',
    '# ## ## #',
    '# ##    #',
    '# #######',
    '#   #   #',
    '### # # #',
    '#     #G#',
    '#########',
  ],
  [
    '#########',
    '#S      #',
    '# ##### #',
    '#   #   #',
    '### # ###',
    '#   #   #',
    '# ### # #',
    '#     #G#',
    '#########',
  ],
  [
    '#########',
    '#S##    #',
    '#  # ## #',
    '## # ## #',
    '#  #    #',
    '# #######',
    '#     # #',
    '# ###  G#',
    '#########',
  ],
  [
    '#########',
    '#S  #   #',
    '## ## # #',
    '#   # # #',
    '# ### # #',
    '#     # #',
    '# ##### #',
    '#     #G#',
    '#########',
  ],
  [
    '#########',
    '#S   #  #',
    '# ## # ##',
    '# ## #  #',
    '#    ## #',
    '#### ## #',
    '#      ##',
    '# #### G#',
    '#########',
  ],
];

const TWEET_SNIPPETS = [
  'just deployed on a friday, what could go wrong',
  'our status page says all green but my inbox says otherwise',
  'who approved this pull request at 2am',
  'the intern pushed to main and now we are trending',
  'nothing like a good rollback to start the morning',
  'we scaled to zero and our customers noticed',
  'the database is fine, it is just thinking really hard',
  'shipped the fix, broke two other things, classic',
  'our uptime is great if you ignore last tuesday',
  'someone rotated the keys and forgot to tell anyone',
  'the cache is stale but the vibes are fresh',
  'customers are reporting issues, we are investigating',
  'hot take: staging is just production with fewer users',
  'we do not have a deployment problem, we have a courage problem',
  'the deploy is stuck, has anyone tried turning it off and on again',
  'turns out the feature flag was on for everyone the whole time',
  'the on call engineer is sleeping, pray for our customers',
  'new feature just dropped, and so did our conversion rate',
  'we promise the next release will fix everything',
  'our monitoring caught the issue three hours after twitter did',
  'the build passed locally, blame the ci runner',
  'just merged a one line fix with a two page post mortem',
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
  'Julia Shi',
  'Andy Schneider',
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

const DEPLOY_SEQUENCE_SCENARIOS: DeploySequenceScenario[] = [
  { sentence: 'A monkey takes the banana to the park.', sequence: ['🐵', '🍌', '🏞️'], options: ['🐵', '🍌', '🏞️', '🚶', '🚀'] },
  { sentence: 'The robot ships the package to the moon.', sequence: ['🤖', '📦', '🌕'], options: ['🤖', '📦', '🌕', '🚚', '☁️'] },
  { sentence: 'A cat brings coffee to the office.', sequence: ['🐱', '☕', '🏢'], options: ['🐱', '☕', '🏢', '🧑‍💻', '📨'] },
  { sentence: 'The wizard sends the scroll to the castle.', sequence: ['🧙', '📜', '🏰'], options: ['🧙', '📜', '🏰', '🐉', '⚔️'] },
  { sentence: 'A fox carries pizza to the beach.', sequence: ['🦊', '🍕', '🏖️'], options: ['🦊', '🍕', '🏖️', '🚲', '🌊'] },
  { sentence: 'The astronaut moves the laptop to Mars.', sequence: ['🧑‍🚀', '💻', '🪐'], options: ['🧑‍🚀', '💻', '🪐', '🚀', '🌌'] },
  { sentence: 'A panda delivers noodles to the city.', sequence: ['🐼', '🍜', '🏙️'], options: ['🐼', '🍜', '🏙️', '🚕', '🎐'] },
  { sentence: 'The penguin slides the fish to the iceberg.', sequence: ['🐧', '🐟', '🧊'], options: ['🐧', '🐟', '🧊', '🌊', '⛷️'] },
  { sentence: 'A scientist brings the potion to the lab.', sequence: ['🧑‍🔬', '🧪', '🧫'], options: ['🧑‍🔬', '🧪', '🧫', '🧬', '🔬'] },
  { sentence: 'The knight carries the key to the tower.', sequence: ['🛡️', '🗝️', '🗼'], options: ['🛡️', '🗝️', '🗼', '🐴', '⚔️'] },
  { sentence: 'A bird drops the letter at the house.', sequence: ['🐦', '✉️', '🏠'], options: ['🐦', '✉️', '🏠', '📮', '🌳'] },
  { sentence: 'The developer sends the bug to the trash.', sequence: ['🧑‍💻', '🐛', '🗑️'], options: ['🧑‍💻', '🐛', '🗑️', '⌨️', '📦'] },
  { sentence: 'A farmer brings the apple to the barn.', sequence: ['🧑‍🌾', '🍎', '🛖'], options: ['🧑‍🌾', '🍎', '🛖', '🚜', '🌾'] },
  { sentence: 'The ghost takes the candle to the cave.', sequence: ['👻', '🕯️', '🕳️'], options: ['👻', '🕯️', '🕳️', '🌙', '🪨'] },
  { sentence: 'A diver moves the pearl to the ship.', sequence: ['🤿', '🦪', '🛳️'], options: ['🤿', '🦪', '🛳️', '🌊', '⚓'] },
  { sentence: 'The chef brings sushi to the market.', sequence: ['🧑‍🍳', '🍣', '🏪'], options: ['🧑‍🍳', '🍣', '🏪', '🔪', '🛒'] },
  { sentence: 'A bee carries honey to the garden.', sequence: ['🐝', '🍯', '🌷'], options: ['🐝', '🍯', '🌷', '🌼', '☀️'] },
  { sentence: 'The racer drives the trophy to the garage.', sequence: ['🏎️', '🏆', '🏁'], options: ['🏎️', '🏆', '🏁', '⛽', '🔧'] },
  { sentence: 'A pirate takes the map to the island.', sequence: ['🏴‍☠️', '🗺️', '🏝️'], options: ['🏴‍☠️', '🗺️', '🏝️', '⚓', '💰'] },
  { sentence: 'The artist brings the brush to the museum.', sequence: ['🧑‍🎨', '🖌️', '🖼️'], options: ['🧑‍🎨', '🖌️', '🖼️', '🎨', '🏛️'] },
  { sentence: 'A doctor sends the pill to the hospital.', sequence: ['🧑‍⚕️', '💊', '🏥'], options: ['🧑‍⚕️', '💊', '🏥', '🩺', '🚑'] },
  { sentence: 'The mail truck takes the parcel to the mountain.', sequence: ['🚚', '📦', '⛰️'], options: ['🚚', '📦', '⛰️', '🛣️', '📬'] },
  { sentence: 'A unicorn brings the star to the cloud.', sequence: ['🦄', '⭐', '☁️'], options: ['🦄', '⭐', '☁️', '🌈', '✨'] },
];

const REGEX_SCENARIOS: RegexScenario[] = [
  {
    prompt: 'Match Vercel-style region codes',
    samples: ['iad1', 'pdx1', 'fra1'],
    answer: '^[a-z]{3}\\d$',
    distractors: ['^[a-z]{2}\\d{2}$', '^[a-z]{4}\\d$'],
  },
  {
    prompt: 'Match preview deployment URLs',
    samples: ['app-git-main-acme.vercel.app', 'docs-git-fix-acme.vercel.app', 'api-git-test-acme.vercel.app'],
    answer: '^[a-z0-9-]+\\.vercel\\.app$',
    distractors: ['^[a-z0-9-]+\\.vercel\\.com$', '^[a-z0-9]+\\.vercel\\.app$'],
  },
  {
    prompt: 'Match ENV var keys written in screaming snake case',
    samples: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_API_URL', 'EDGE_CONFIG_TOKEN'],
    answer: '^[A-Z0-9_]+$',
    distractors: ['^[a-z0-9_]+$', '^[A-Z][a-z0-9_]+$'],
  },
  {
    prompt: 'Match version tags like v12',
    samples: ['v1', 'v12', 'v203'],
    answer: '^v\\d+$',
    distractors: ['^v[A-Z]+$', '^v\\d{2}$'],
  },
  {
    prompt: 'Match branch names with slashes',
    samples: ['feat/flags', 'fix/login-loop', 'chore/release'],
    answer: '^[a-z]+\\/[a-z0-9-]+$',
    distractors: ['^[A-Z]+\\/[a-z0-9-]+$', '^[a-z]+-[a-z0-9-]+$'],
  },
  {
    prompt: 'Match UUID-like short ids with lowercase hex',
    samples: ['a3f9c1', 'ff09ab', '0bc123'],
    answer: '^[a-f0-9]{6}$',
    distractors: ['^[A-F0-9]{6}$', '^[a-z0-9]{8}$'],
  },
  {
    prompt: 'Match HTTP status codes',
    samples: ['200', '404', '503'],
    answer: '^\\d{3}$',
    distractors: ['^\\d{2}$', '^\\d{3}[A-Z]$'],
  },
  {
    prompt: 'Match dates formatted like 2026-03-28',
    samples: ['2026-03-28', '2025-11-09', '2027-01-01'],
    answer: '^\\d{4}-\\d{2}-\\d{2}$',
    distractors: ['^\\d{2}-\\d{2}-\\d{4}$', '^\\d{4}\\/\\d{2}\\/\\d{2}$'],
  },
  {
    prompt: 'Match semantic versions',
    samples: ['1.0.0', '12.4.9', '0.18.2'],
    answer: '^\\d+\\.\\d+\\.\\d+$',
    distractors: ['^v\\d+\\.\\d+\\.\\d+$', '^\\d+\\.\\d+$'],
  },
  {
    prompt: 'Match email-like team addresses',
    samples: ['ops@acme.com', 'dev@ship.io', 'team@vercel.app'],
    answer: '^[a-z]+@[a-z0-9.-]+\\.[a-z]{2,}$',
    distractors: ['^[A-Z]+@[a-z0-9.-]+\\.[a-z]{2,}$', '^[a-z]+#[a-z0-9.-]+\\.[a-z]{2,}$'],
  },
  {
    prompt: 'Match paths that start with /api/',
    samples: ['/api/logs', '/api/deploy', '/api/health'],
    answer: '^\\/api\\/[a-z-]+$',
    distractors: ['^api\\/[a-z-]+$', '^\\/[a-z-]+\\/api$'],
  },
  {
    prompt: 'Match ticket ids like INC-203',
    samples: ['INC-203', 'INC-404', 'INC-999'],
    answer: '^INC-\\d{3}$',
    distractors: ['^inc-\\d{3}$', '^INC_\\d{3}$'],
  },
  {
    prompt: 'Match lowercase kebab-case slugs',
    samples: ['launch-thread', 'support-guide', 'preview-cache'],
    answer: '^[a-z]+(?:-[a-z]+)+$',
    distractors: ['^[a-z]+(?:_[a-z]+)+$', '^[A-Z]+(?:-[a-z]+)+$'],
  },
  {
    prompt: 'Match CSS hex colors',
    samples: ['#ff6600', '#00ccaa', '#1f2d3d'],
    answer: '^#[a-f0-9]{6}$',
    distractors: ['^#[A-F0-9]{3}$', '^[a-f0-9]{6}$'],
  },
  {
    prompt: 'Match log levels in brackets',
    samples: ['[INFO]', '[WARN]', '[ERROR]'],
    answer: '^\\[[A-Z]+\\]$',
    distractors: ['^\\([A-Z]+\\)$', '^\\[[a-z]+\\]$'],
  },
  {
    prompt: 'Match numbers ending in ms',
    samples: ['120ms', '5ms', '980ms'],
    answer: '^\\d+ms$',
    distractors: ['^\\d+s$', '^ms\\d+$'],
  },
  {
    prompt: 'Match hostnames with dot separators',
    samples: ['edge.us1.vercel', 'api.eu2.vercel', 'cache.ap1.vercel'],
    answer: '^[a-z]+\\.[a-z0-9]+\\.vercel$',
    distractors: ['^[a-z]+-[a-z0-9]+-vercel$', '^[A-Z]+\\.[a-z0-9]+\\.vercel$'],
  },
  {
    prompt: 'Match numbers with optional leading minus',
    samples: ['10', '-4', '203'],
    answer: '^-?\\d+$',
    distractors: ['^\\+?\\d+$', '^\\d+-?$'],
  },
  {
    prompt: 'Match file names ending in .ts',
    samples: ['route.ts', 'config.ts', 'cache.ts'],
    answer: '^[a-z-]+\\.ts$',
    distractors: ['^[a-z-]+\\.js$', '^[A-Z-]+\\.ts$'],
  },
  {
    prompt: 'Match commit hashes shortened to 7 chars',
    samples: ['a1b2c3d', 'ff09abc', '9d8e7f6'],
    answer: '^[a-f0-9]{7}$',
    distractors: ['^[a-z0-9]{7}$', '^[a-f0-9]{6}$'],
  },
];

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
  const sameGroupCapitals = FLAG_BANK
    .filter(entry => entry.country !== answer.country && entry.group === answer.group)
    .map(entry => entry.capital);
  const globalCapitals = FLAG_BANK
    .filter(entry => entry.country !== answer.country && entry.capital !== answer.decoyCity)
    .map(entry => entry.capital);

  const distractors = new Set<string>([answer.decoyCity]);
  const sameGroupPool = [...sameGroupCapitals].sort(() => Math.random() - 0.5);
  for (const capital of sameGroupPool) {
    if (distractors.size >= 3) break;
    distractors.add(capital);
  }

  const fallbackPool = [...globalCapitals].sort(() => Math.random() - 0.5);
  for (const capital of fallbackPool) {
    if (distractors.size >= 3) break;
    distractors.add(capital);
  }

  const options = [answer.capital, ...[...distractors].slice(0, 3)].sort(() => Math.random() - 0.5);

  return {
    answer,
    options,
  };
}

function buildChannelOptions(value: number): number[] {
  const distractors = CHANNEL_BANK
    .filter(entry => entry !== value)
    .sort(() => Math.random() - 0.5)
    .slice(0, 1);

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
  const rows = MAZE_BANK[Math.floor(Math.random() * MAZE_BANK.length)];

  return {
    rows,
    start: findMazeMarker(rows, 'S'),
    goal: findMazeMarker(rows, 'G'),
  };
}

function findMazeMarker(rows: string[], marker: 'S' | 'G') {
  for (let y = 0; y < rows.length; y += 1) {
    const x = rows[y].indexOf(marker);
    if (x !== -1) {
      return { x, y };
    }
  }

  return marker === 'S' ? { x: 1, y: 1 } : { x: rows[0].length - 2, y: rows.length - 2 };
}

function buildDeploySequenceScenario(previousSentence?: string): DeploySequenceScenario {
  const pool = previousSentence
    ? DEPLOY_SEQUENCE_SCENARIOS.filter(scenario => scenario.sentence !== previousSentence)
    : DEPLOY_SEQUENCE_SCENARIOS;
  const picked = pool[randomIndex(pool.length)];
  // Shuffle options so the correct emojis aren't always first.
  const shuffledOptions = [...picked.options].sort(() => Math.random() - 0.5);
  return { ...picked, options: shuffledOptions };
}

function buildRegexScenario(previousPrompt?: string) {
  const pool = previousPrompt
    ? REGEX_SCENARIOS.filter(scenario => scenario.prompt !== previousPrompt)
    : REGEX_SCENARIOS;
  const scenario = pool[randomIndex(pool.length)];
  const options = [scenario.answer, ...scenario.distractors].sort(() => Math.random() - 0.5);
  return { ...scenario, options };
}

function GuessTheCountryGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState<GuessRound>(() => buildGuessRound());
  const options = useMemo(() => round.options, [round]);

  return (
    <div className="mini-shell mini-shell-country">
      <div className="mini-callout mini-callout-country">
        Which capital matches this flag?
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
            key={`${round.answer.flag}-${option}`}
            onClick={() => {
              if (option === round.answer.capital) {
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
  const [snippet] = useState(() => TWEET_SNIPPETS[randomIndex(TWEET_SNIPPETS.length)]);
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
        Type the tweet as fast as you can.
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

// ---------------------------------------------------------------------------
// Cache Knowledge — cache trivia multiple choice
// ---------------------------------------------------------------------------

const CACHE_QUESTIONS = [
  { q: 'Which header tells the browser to cache for 1 hour?', a: 'Cache-Control: max-age=3600', wrong: ['ETag: 3600', 'Expires: 1h', 'X-Cache: HIT'] },
  { q: 'What does "stale-while-revalidate" do?', a: 'Serves stale while fetching fresh', wrong: ['Deletes the cache', 'Blocks until fresh', 'Returns 304 always'] },
  { q: 'What status code means "Not Modified"?', a: '304', wrong: ['200', '301', '404'] },
  { q: 'Which cache strategy never stores anything?', a: 'no-store', wrong: ['no-cache', 'must-revalidate', 'public'] },
  { q: 'What does a CDN cache HIT mean?', a: 'Response served from edge', wrong: ['Response from origin', 'Cache was purged', 'Request was blocked'] },
  { q: 'What validates if a cached resource changed?', a: 'ETag', wrong: ['Content-Type', 'Accept', 'Origin'] },
];

function CacheKnowledgeGame({ onResolve }: { onResolve: () => void }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * CACHE_QUESTIONS.length));
  const q = CACHE_QUESTIONS[idx];
  const options = useMemo(() =>
    [q.a, ...q.wrong].sort(() => Math.random() - 0.5),
    [q],
  );

  return (
    <div className="mini-shell mini-shell-cache">
      <div className="mini-callout mini-callout-cache">{q.q}</div>
      <div className="cache-options">
        {options.map(opt => (
          <button
            key={opt}
            className="cache-option"
            onClick={() => {
              if (opt === q.a) { onResolve(); return; }
              setIdx(Math.floor(Math.random() * CACHE_QUESTIONS.length));
            }}
            type="button"
          >{opt}</button>
        ))}
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}



// ---------------------------------------------------------------------------
// Shape Sorter — drag shapes into matching holes
// ---------------------------------------------------------------------------

interface ShapeDef {
  id: string;
  /** SVG path for the shape (centered in a 0 0 48 48 viewBox). */
  path: string;
  color: string;
}

const SHAPE_DEFS: ShapeDef[] = [
  { id: 'circle', path: 'M24 4a20 20 0 1 1 0 40 20 20 0 1 1 0-40z', color: '#3EA8FF' },
  { id: 'triangle', path: 'M24 4L44 40H4z', color: '#FF5E57' },
  { id: 'square', path: 'M6 6h36v36H6z', color: '#F6C549' },
  { id: 'star', path: 'M24 2l6.5 14.5H46l-12 9.5 4.5 15L24 32l-14.5 9 4.5-15-12-9.5h15.5z', color: '#86efac' },
  { id: 'diamond', path: 'M24 2L44 24 24 46 4 24z', color: '#c084fc' },
  { id: 'hexagon', path: 'M24 2l19 11v22l-19 11L5 35V13z', color: '#fb923c' },
];

const SHAPE_COUNT = 4;
const SNAP_THRESHOLD = 0.15; // 15% of board width

function buildShapeRound(): ShapeDef[] {
  return [...SHAPE_DEFS].sort(() => Math.random() - 0.5).slice(0, SHAPE_COUNT);
}

function ShapeSorterGame({ onResolve }: { onResolve: () => void }) {
  // `holeShapes` defines the order of holes at the top (randomly picked).
  // `pieces` is a separately shuffled copy — piece order differs from hole order.
  const [holeShapes] = useState(buildShapeRound);
  const [pieces] = useState(() => [...holeShapes].sort(() => Math.random() - 0.5));

  const holePositions = useMemo(() =>
    holeShapes.map((_, i) => ({ x: (i + 0.5) / SHAPE_COUNT, y: 0.22 })),
    [holeShapes],
  );
  const initialPositions = useMemo(() =>
    pieces.map((_, i) => ({ x: (i + 0.5) / SHAPE_COUNT, y: 0.78 })),
    [pieces],
  );

  const [positions, setPositions] = useState(initialPositions);
  const [locked, setLocked] = useState<boolean[]>(() => pieces.map(() => false));
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  const completed = locked.every(Boolean);
  useEffect(() => {
    if (completed) {
      const t = setTimeout(onResolve, 400);
      return () => clearTimeout(t);
    }
  }, [completed, onResolve]);

  const getBoardCoords = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const startDrag = useCallback((idx: number, clientX: number, clientY: number) => {
    if (locked[idx]) return;
    const coords = getBoardCoords(clientX, clientY);
    setDragging(idx);
    setDragOffset({
      x: positions[idx].x - coords.x,
      y: positions[idx].y - coords.y,
    });
  }, [locked, positions, getBoardCoords]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (dragging === null) return;
    const coords = getBoardCoords(clientX, clientY);
    setPositions(prev => {
      const next = [...prev];
      next[dragging] = { x: coords.x + dragOffset.x, y: coords.y + dragOffset.y };
      return next;
    });
  }, [dragging, dragOffset, getBoardCoords]);

  const endDrag = useCallback(() => {
    if (dragging === null) return;
    const pos = positions[dragging];
    const piece = pieces[dragging];

    // Find the matching hole for this piece's shape.
    const holeIdx = holeShapes.findIndex(h => h.id === piece.id);
    if (holeIdx === -1) { setDragging(null); return; }

    const holePos = holePositions[holeIdx];
    const dist = Math.sqrt((pos.x - holePos.x) ** 2 + (pos.y - holePos.y) ** 2);

    if (dist < SNAP_THRESHOLD) {
      setPositions(prev => {
        const next = [...prev];
        next[dragging] = { ...holePos };
        return next;
      });
      setLocked(prev => {
        const next = [...prev];
        next[dragging] = true;
        return next;
      });
    }
    setDragging(null);
  }, [dragging, positions, holePositions, holeShapes, pieces]);

  const onMouseMove = useCallback((e: React.MouseEvent) => moveDrag(e.clientX, e.clientY), [moveDrag]);
  const onMouseUp = useCallback(() => endDrag(), [endDrag]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, [moveDrag]);
  const onTouchEnd = useCallback(() => endDrag(), [endDrag]);

  return (
    <div className="mini-shell mini-shell-shapesorter">
      <div className="mini-callout mini-callout-shapesorter">
        Drag each shape into its matching hole
      </div>
      <div className="shapesorter-count">{locked.filter(Boolean).length}/{SHAPE_COUNT}</div>
      <div
        className="shapesorter-board"
        ref={boardRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Holes — in holeShapes order */}
        {holeShapes.map((shape, i) => {
          const isFilled = pieces.some((p, pi) => p.id === shape.id && locked[pi]);
          return (
            <div
              key={`hole-${shape.id}`}
              className={`shapesorter-hole${isFilled ? ' shapesorter-hole-filled' : ''}`}
              style={{
                left: `${holePositions[i].x * 100}%`,
                top: `${holePositions[i].y * 100}%`,
              }}
            >
              <svg viewBox="0 0 48 48" className="shapesorter-hole-svg">
                <path d={shape.path} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
            </div>
          );
        })}

        {/* Draggable pieces — in separately shuffled order */}
        {pieces.map((shape, i) => (
          <div
            key={`piece-${shape.id}`}
            className={`shapesorter-piece${dragging === i ? ' shapesorter-dragging' : ''}${locked[i] ? ' shapesorter-locked' : ''}`}
            style={{
              left: `${positions[i].x * 100}%`,
              top: `${positions[i].y * 100}%`,
            }}
            onMouseDown={e => { e.preventDefault(); startDrag(i, e.clientX, e.clientY); }}
            onTouchStart={e => { if (e.touches.length > 0) startDrag(i, e.touches[0].clientX, e.touches[0].clientY); }}
          >
            <svg viewBox="0 0 48 48" className="shapesorter-piece-svg">
              <path d={shape.path} fill={shape.color} />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Currency Match — match a 3-letter currency code to its symbol
// ---------------------------------------------------------------------------

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'KRW', symbol: '₩' },
  { code: 'INR', symbol: '₹' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'THB', symbol: '฿' },
  { code: 'PLN', symbol: 'zł' },
  { code: 'TRY', symbol: '₺' },
  { code: 'CHF', symbol: 'Fr' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'RUB', symbol: '₽' },
  { code: 'NGN', symbol: '₦' },
  { code: 'ILS', symbol: '₪' },
  { code: 'PHP', symbol: '₱' },
  { code: 'UAH', symbol: '₴' },
  { code: 'VND', symbol: '₫' },
  { code: 'BTC', symbol: '₿' },
  { code: 'ETH', symbol: 'Ξ' },
];

function buildCurrencyRound() {
  const shuffled = [...CURRENCIES].sort(() => Math.random() - 0.5);
  const answer = shuffled[0];
  // Pick 3 distractors (different symbols).
  const distractors = shuffled.slice(1, 4);
  const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
  return { answer, options };
}

function CurrencyMatchGame({ onResolve }: { onResolve: () => void }) {
  const [round, setRound] = useState(buildCurrencyRound);
  const [wrongFlash, setWrongFlash] = useState(false);

  const handlePick = useCallback((symbol: string) => {
    if (symbol === round.answer.symbol) {
      onResolve();
    } else {
      setWrongFlash(true);
      setTimeout(() => {
        setWrongFlash(false);
        setRound(buildCurrencyRound());
      }, 400);
    }
  }, [round.answer.symbol, onResolve]);

  return (
    <div className="mini-shell mini-shell-currency">
      <div className="mini-callout mini-callout-currency">
        Match the currency code to its symbol
      </div>
      <div className={`currency-code${wrongFlash ? ' currency-wrong' : ''}`}>
        {round.answer.code}
      </div>
      <div className="currency-options">
        {round.options.map(opt => (
          <button
            key={opt.code}
            className="currency-option"
            onClick={() => handlePick(opt.symbol)}
            type="button"
          >
            {opt.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Traffic Filter — tap malicious requests, avoid good ones
// ---------------------------------------------------------------------------

interface TrafficRequest {
  id: string;
  label: string;
  malicious: boolean;
  spawnedAt: number;
}

/** Delay in ms before the color hint appears on a request. */
const TRAFFIC_REVEAL_DELAY = 1500;

const TRAFFIC_POOL = {
  bad: [
    'POST /admin?sql=DROP', 'GET /../../../etc/passwd', 'POST /login (10k rpm)',
    'GET /api?<script>alert(1)', 'PUT /users/*/role=admin', 'DELETE /db/production',
    'GET /wp-admin/install.php', 'POST /xmlrpc.php (bot)', 'GET /api?sleep(10)',
  ],
  good: [
    'GET /index.html', 'POST /api/checkout', 'GET /images/logo.png',
    'PUT /user/profile', 'GET /api/products?page=2', 'POST /auth/login',
    'GET /docs/getting-started', 'POST /api/feedback', 'GET /health',
  ],
};

function spawnRequest(): TrafficRequest {
  const malicious = Math.random() < 0.5;
  const pool = malicious ? TRAFFIC_POOL.bad : TRAFFIC_POOL.good;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: pool[Math.floor(Math.random() * pool.length)],
    malicious,
    spawnedAt: Date.now(),
  };
}

function TrafficFilterGame({ onResolve }: { onResolve: () => void }) {
  const [requests, setRequests] = useState<TrafficRequest[]>(() => [spawnRequest()]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [now, setNow] = useState(Date.now());
  const TARGET = 7;

  useEffect(() => {
    const t = setInterval(() => {
      setRequests(prev => {
        const next = [...prev.slice(-6), spawnRequest()];
        return next;
      });
      setNow(Date.now());
    }, 750);
    return () => clearInterval(t);
  }, []);

  // Also tick `now` more frequently so the reveal transition is smooth.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (score >= TARGET) onResolve();
  }, [score, onResolve]);

  const tap = useCallback((req: TrafficRequest) => {
    if (req.malicious) {
      setScore(s => s + 1);
    } else {
      setMistakes(m => m + 1);
    }
    setRequests(prev => prev.filter(r => r.id !== req.id));
  }, []);

  return (
    <div className="mini-shell mini-shell-traffic">
      <div className="mini-callout mini-callout-traffic">
        Tap the malicious requests — avoid legitimate ones
      </div>
      <div className="traffic-score">
        <span className="traffic-good">{score}/{TARGET} blocked</span>
        {mistakes > 0 && <span className="traffic-bad">{mistakes} false positive{mistakes > 1 ? 's' : ''}</span>}
      </div>
      <div className="traffic-feed">
        {requests.map(req => {
          const revealed = now - req.spawnedAt >= TRAFFIC_REVEAL_DELAY;
          return (
            <button
              key={req.id}
              className={`traffic-req${revealed ? (req.malicious ? ' traffic-mal' : ' traffic-legit') : ' traffic-neutral'}`}
              onClick={() => tap(req)}
              type="button"
            >
              <code>{req.label}</code>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeploySequenceGame({ onResolve }: { onResolve: () => void }) {
  const [scenario, setScenario] = useState<DeploySequenceScenario>(() => buildDeploySequenceScenario());
  const [progress, setProgress] = useState<string[]>([]);
  const [wrongPulse, setWrongPulse] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!completed) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onResolve();
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [completed, onResolve]);

  const resetProgress = useCallback(() => {
    if (completed) {
      return;
    }
    setWrongPulse(true);
    window.setTimeout(() => setWrongPulse(false), 180);
    setProgress([]);
  }, [completed]);

  const onPick = useCallback((emoji: string) => {
    if (completed) {
      return;
    }

    const expected = scenario.sequence[progress.length];
    if (emoji !== expected) {
      resetProgress();
      return;
    }

    const nextProgress = [...progress, emoji];
    setProgress(nextProgress);
    if (nextProgress.length === scenario.sequence.length) {
      setCompleted(true);
      return;
    }
  }, [completed, progress, resetProgress, scenario.sequence]);

  const replayScenario = useCallback(() => {
    setScenario(buildDeploySequenceScenario(scenario.sentence));
    setProgress([]);
    setWrongPulse(false);
    setCompleted(false);
  }, [scenario.sentence]);

  return (
    <div className="mini-shell mini-shell-deploy-sequence">
      <div className="mini-callout mini-callout-deploy-sequence">
        Click the emoji in the correct order.
      </div>

      <div className={`deploy-sequence-card${wrongPulse ? ' wrong' : ''}${completed ? ' complete' : ''}`}>
        <p className="deploy-sequence-sentence">{scenario.sentence}</p>

        <div className="deploy-sequence-progress" aria-label="Selected sequence">
          {scenario.sequence.map((emoji, index) => {
            const status = progress[index]
              ? 'done'
              : index === progress.length
                ? 'next'
                : '';

            return (
              <span
                className={`deploy-sequence-slot${status ? ` ${status}` : ''}`}
                key={`${scenario.sentence}-${emoji}-${index}`}
              >
                {progress[index] ?? '•'}
              </span>
            );
          })}
        </div>

        <div className="deploy-sequence-grid">
          {scenario.options.map(emoji => (
            <button
              className="deploy-sequence-choice"
              key={`${scenario.sentence}-${emoji}`}
              onClick={() => onPick(emoji)}
              disabled={completed}
              type="button"
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>

        <button className="deploy-sequence-refresh" disabled={completed} onClick={replayScenario} type="button">
          New sentence
        </button>
      </div>
    </div>
  );
}

function RegexRescueGame({ onResolve }: { onResolve: () => void }) {
  const [scenario, setScenario] = useState(() => buildRegexScenario());
  const [wrongPulse, setWrongPulse] = useState(false);

  const pickOption = useCallback((option: string) => {
    if (option === scenario.answer) {
      onResolve();
      return;
    }

    setWrongPulse(true);
    window.setTimeout(() => setWrongPulse(false), 180);
    setScenario(buildRegexScenario(scenario.prompt));
  }, [onResolve, scenario.answer, scenario.prompt]);

  return (
    <div className="mini-shell mini-shell-regex">
      <div className="mini-callout mini-callout-regex">
        Pick the regex that matches all sample strings.
      </div>

      <div className={`regex-card${wrongPulse ? ' wrong' : ''}`}>
        <div className="regex-head">
          <span className="regex-kicker">Pattern target</span>
          <strong className="regex-title">{scenario.prompt}</strong>
        </div>

        <div className="regex-samples">
          {scenario.samples.map(sample => (
            <code className="regex-sample" key={`${scenario.prompt}-${sample}`}>
              {sample}
            </code>
          ))}
        </div>

        <div className="regex-grid">
          {scenario.options.map(option => (
            <button
              className="regex-choice"
              key={`${scenario.prompt}-${option}`}
              onClick={() => pickOption(option)}
              type="button"
            >
              <code>{option}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadBalancerSplitGame({ onResolve }: { onResolve: () => void }) {
  const [lanes, setLanes] = useState<LoadBalancerLane[]>([
    { id: 'a', label: 'A', load: 22 },
    { id: 'b', label: 'B', load: 36 },
    { id: 'c', label: 'C', load: 18 },
  ]);
  const [incoming, setIncoming] = useState(24);
  const [survivedTicks, setSurvivedTicks] = useState(0);
  const [overloadTicks, setOverloadTicks] = useState(0);
  const TARGET_TICKS = 12;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLanes(current => current.map(lane => ({
        ...lane,
        load: Math.max(0, lane.load - (6 + Math.floor(Math.random() * 5))),
      })));
      setIncoming(16 + Math.floor(Math.random() * 25));
      setSurvivedTicks(current => current + 1);
    }, 850);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (survivedTicks >= TARGET_TICKS) {
      onResolve();
    }
  }, [onResolve, survivedTicks]);

  useEffect(() => {
    const overloaded = lanes.some(lane => lane.load >= 100);
    if (!overloaded) {
      setOverloadTicks(0);
      return;
    }

    setOverloadTicks(current => current + 1);
  }, [lanes]);

  useEffect(() => {
    if (overloadTicks < 2) {
      return;
    }

    setLanes([
      { id: 'a', label: 'A', load: 22 },
      { id: 'b', label: 'B', load: 36 },
      { id: 'c', label: 'C', load: 18 },
    ]);
    setIncoming(18 + Math.floor(Math.random() * 18));
    setSurvivedTicks(0);
    setOverloadTicks(0);
  }, [overloadTicks]);

  const routeToLane = useCallback((laneId: string) => {
    setLanes(current =>
      current.map(lane =>
        lane.id === laneId
          ? { ...lane, load: Math.min(120, lane.load + incoming) }
          : lane,
      ),
    );
    setIncoming(12 + Math.floor(Math.random() * 26));
  }, [incoming]);

  return (
    <div className="mini-shell mini-shell-load-balance">
      <div className="mini-callout mini-callout-load-balance">
        Route incoming traffic without overloading a server.
      </div>

      <div className="lb-head">
        <div className="lb-burst">
          <span className="lb-burst-label">Incoming</span>
          <strong>{incoming}</strong>
        </div>
        <div className="lb-progress">
          <span className="lb-progress-label">Stability</span>
          <strong>{survivedTicks}/{TARGET_TICKS}</strong>
        </div>
      </div>

      <div className="lb-grid">
        {lanes.map(lane => {
          const danger = lane.load >= 75;
          return (
            <button
              className={`lb-lane${danger ? ' danger' : ''}`}
              key={lane.id}
              onClick={() => routeToLane(lane.id)}
              type="button"
            >
              <div className="lb-lane-head">
                <span className="lb-lane-name">Server {lane.label}</span>
                <span className="lb-lane-value">{lane.load}%</span>
              </div>
              <div className="lb-meter">
                <span style={{ width: `${Math.min(100, lane.load)}%` }} />
              </div>
              <div className="lb-route-label">Route here</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const IMPLEMENTED_MINIGAMES = new Set<MiniGameId>([
  'bug-bash',
  'cache-knowledge',
  'currency-match',
  'shape-sorter',
  'find-the-logs',
  'guess-the-country',
  'guess-the-hex',
  'it-maze',
  'math',
  'match-the-customer',
  'match-the-vendor',
  'monkey-type',
  'deploy-sequence',
  'name-five-aws-region',
  'pod-doctor',
  'regex-rescue',
  'refund-rush',
  'traffic-filter',
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

  if (miniGameId === 'deploy-sequence') {
    return <DeploySequenceGame onResolve={onResolve} />;
  }

  if (miniGameId === 'name-five-aws-region') {
    return <NameFiveVercelRegionGame onResolve={onResolve} />;
  }

  if (miniGameId === 'regex-rescue') {
    return <RegexRescueGame onResolve={onResolve} />;
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

  if (miniGameId === 'shape-sorter') {
    return <ShapeSorterGame onResolve={onResolve} />;
  }

  if (miniGameId === 'currency-match') {
    return <CurrencyMatchGame onResolve={onResolve} />;
  }

  if (miniGameId === 'cache-knowledge') {
    return <CacheKnowledgeGame onResolve={onResolve} />;
  }

  if (miniGameId === 'traffic-filter') {
    return <TrafficFilterGame onResolve={onResolve} />;
  }

  return null;
}
