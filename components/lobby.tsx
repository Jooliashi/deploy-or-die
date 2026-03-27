'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

const DEMO_CODE = 'SHIP-42';

function generateRoomCode(): string {
  const words = ['SHIP', 'FLUX', 'CORE', 'HELM', 'NODE', 'PUSH', 'SYNC', 'BOLT'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${word}-${num}`;
}

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

export function Lobby() {
  const router = useRouter();
  const [name, setName] = useState(pickDefaultName);
  const [joinCode, setJoinCode] = useState('');

  const safeName = name.trim() || pickDefaultName();

  const demoHref = useMemo(
    () => `/room/${DEMO_CODE}?name=${encodeURIComponent(safeName)}`,
    [safeName],
  );

  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    router.push(`/room/${code}?name=${encodeURIComponent(safeName)}`);
  }, [safeName, router]);

  const joinRoom = useCallback(() => {
    const code = joinCode.trim();
    if (!code) return;
    router.push(`/room/${code}?name=${encodeURIComponent(safeName)}`);
  }, [joinCode, safeName, router]);

  const handleJoinKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') joinRoom();
    },
    [joinRoom],
  );

  return (
    <div className="landing-wrapper">
      {/* ── Header + Name ────────────────────────────────── */}
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

      {/* ── Action cards ─────────────────────────────────── */}
      <div className="landing-cards">
        {/* Demo card */}
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

        {/* Multiplayer card */}
        <div className="panel landing-card">
          <div className="landing-card-head">
            <span className="eyebrow">Multiplayer</span>
            <h2 className="landing-card-title">Play with Others</h2>
            <p className="landing-card-desc">
              Create a room and share the code, or join an existing one.
            </p>
          </div>
          <div className="landing-mp-actions">
            <button className="button landing-card-btn" type="button" onClick={createRoom}>
              Create New Room
            </button>
            <div className="landing-or">
              <span />
              <span className="landing-or-text">or join</span>
              <span />
            </div>
            <div className="landing-join-row">
              <input
                className="input"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={handleJoinKeyDown}
                placeholder="Enter room code"
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

      {/* ── Info ─────────────────────────────────────────── */}
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
              Create a room and share the code. Each player gets a role with
              different controls. Tasks are delegated -- communicate to survive
              the deploy.
            </p>
          </div>
          <div className="panel-muted landing-info-card">
            <h3>Roles</h3>
            <p>
              <strong>Frontend</strong> owns client patches and edge cache.{' '}
              <strong>Backend</strong> handles routes, workers, and webhooks.{' '}
              <strong>Infra</strong> manages regions, pipelines, and error storms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
