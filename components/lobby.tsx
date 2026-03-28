'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createJazzRoom, DEMO_ROOM_CODE } from '@/lib/multiplayer/jazz-adapter';

const DEFAULT_NAMES = [
  'Kazuhira', 'Revolver', 'Meryl', 'Naomi', 'Otacon',
  'Mei Ling', 'Raiden', 'Rosemary', 'Drebin', 'Nastasha',
  'Strangelove', 'Cecile', 'Huey', 'Chico', 'Amanda',
  'Paramedic', 'Sigint', 'Sokolov', 'Sunny', 'Paz',
  'Quiet', 'Venom', 'Pequod', 'Morpho',
];

function pickDefaultName(): string {
  return DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
}

/** Extract a Jazz room ID from user input. Handles:
 *  - Raw ID: "co_z123..." → "co_z123..."
 *  - Full URL: "https://host/room/co_z123...?name=X" → "co_z123..."
 *  - URL with ?join= param: "https://host/?join=co_z123..." → "co_z123..." */
function extractRoomId(input: string): string {
  const trimmed = input.trim();

  // Try parsing as a URL.
  try {
    const url = new URL(trimmed);

    // Check for ?join= param first.
    const joinParam = url.searchParams.get('join');
    if (joinParam) return joinParam;

    // Check for /room/{id} path.
    const match = url.pathname.match(/\/room\/([^/?]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL — treat as raw ID.
  }

  return trimmed;
}

export function Lobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(pickDefaultName);
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Pre-fill join code from ?join= URL param.
  useEffect(() => {
    const join = searchParams.get('join');
    if (join) setJoinCode(join);
  }, [searchParams]);

  const safeName = name.trim() || pickDefaultName();

  const demoHref = useMemo(
    () => `/room/${DEMO_ROOM_CODE}?name=${encodeURIComponent(safeName)}`,
    [safeName],
  );

  const createRoom = useCallback(() => {
    const { id } = createJazzRoom({ roomCode: 'Multiplayer', isDemo: false });
    setCreatedRoomId(id);
    router.push(`/room/${encodeURIComponent(id)}?name=${encodeURIComponent(safeName)}&host=1`);
  }, [safeName, router]);

  const copyLink = useCallback(() => {
    if (!createdRoomId) return;
    const url = `${window.location.origin}/?join=${encodeURIComponent(createdRoomId)}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [createdRoomId]);

  const handleJoinInput = useCallback((value: string) => {
    // Extract room ID if the user pastes a URL.
    setJoinCode(extractRoomId(value));
  }, []);

  const joinRoom = useCallback(() => {
    const code = joinCode.trim();
    if (!code) return;
    router.push(`/room/${encodeURIComponent(code)}?name=${encodeURIComponent(safeName)}`);
  }, [joinCode, safeName, router]);

  const handleJoinKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') joinRoom();
    },
    [joinRoom],
  );

  return (
    <div className="landing-wrapper">
      <div className="landing-top">
        <span className="eyebrow">Deploy or Die</span>
        <h1 className="landing-title">Spaceteam for<br />software engineers.</h1>

        <div className="landing-name-bar">
          <label className="landing-name-label" htmlFor="player-name">
            Playing as
          </label>
          <input
            id="player-name"
            className="input landing-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
      </div>

      <div className="landing-cards">
        <div className="panel landing-card">
          <div className="landing-card-head">
            <span className="eyebrow">Solo</span>
            <h2 className="landing-card-title">Try the Demo</h2>
            <p className="landing-card-desc">
              Jump into a single-player room to see how the game works. No setup needed.
            </p>
          </div>
          <Link className="button landing-card-btn" href={demoHref}>
            Play Demo as {safeName}
          </Link>
        </div>

        <div className="panel landing-card">
          <div className="landing-card-head">
            <span className="eyebrow">Multiplayer</span>
            <h2 className="landing-card-title">Play with Others</h2>
            <p className="landing-card-desc">
              Create a room and share the link, or join an existing one.
            </p>
          </div>
          <div className="landing-mp-actions">
            <div className="landing-create-row">
              <button className="button landing-card-btn" type="button" onClick={createRoom}>
                Create New Room
              </button>
              {createdRoomId && (
                <button
                  className="button secondary landing-copy-btn"
                  type="button"
                  onClick={copyLink}
                >
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
              )}
            </div>
            <div className="landing-or">
              <span />
              <span className="landing-or-text">or join</span>
              <span />
            </div>
            <div className="landing-join-row">
              <input
                className="input"
                value={joinCode}
                onChange={e => handleJoinInput(e.target.value)}
                onKeyDown={handleJoinKeyDown}
                placeholder="Paste room link or ID"
              />
              <button
                className="button secondary"
                type="button"
                onClick={joinRoom}
                disabled={!joinCode.trim()}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-bottom">
        <div className="landing-info-grid">
          <div className="panel-muted landing-info-card">
            <h3>How it works</h3>
            <p>
              Tasks pop up with a countdown. Find the matching button on your
              console and complete the mini-game before time runs out. Your
              company&apos;s valuation is on the line -- if it hits zero, you&apos;re bankrupt.
            </p>
          </div>
          <div className="panel-muted landing-info-card">
            <h3>Multiplayer</h3>
            <p>
              Create a room and share the link. Each player gets a random set
              of controls. You&apos;ll see tasks meant for others -- communicate
              to survive the deploy.
            </p>
          </div>
          <div className="panel-muted landing-info-card">
            <h3>Teamwork</h3>
            <p>
              Controls are distributed evenly. When a task pops up on your
              screen, tell the right person what button to press before the
              timer runs out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
