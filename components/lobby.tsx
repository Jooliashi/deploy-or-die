'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

const ROOM_CODE = 'SHIP-42';

function generateRoomCode(): string {
  const words = ['SHIP', 'FLUX', 'CORE', 'HELM', 'NODE', 'PUSH', 'SYNC', 'BOLT'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${word}-${num}`;
}

export function Lobby() {
  const router = useRouter();
  const [name, setName] = useState('Engineer');
  const joinHref = useMemo(
    () => `/room/${ROOM_CODE}?name=${encodeURIComponent(name || 'Engineer')}`,
    [name]
  );

  const createPrivateRoom = useCallback(() => {
    const code = generateRoomCode();
    router.push(`/room/${code}?name=${encodeURIComponent(name || 'Engineer')}`);
  }, [name, router]);

  return (
    <div className="stack">
      <div className="panel section">
        <span className="eyebrow">Lobby</span>
        <h2>Spin up a room and start a doomed deploy.</h2>
        <p>
          Multiplayer is powered by Jazz. Room state syncs in real-time across all
          connected players via Jazz Cloud.
        </p>
        <div className="stack" style={{ marginTop: 16 }}>
          <label className="stack" htmlFor="player-name">
            <span className="stat-label">Display Name</span>
            <input
              id="player-name"
              className="input"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Engineer"
            />
          </label>
          <div className="tag-row">
            <span className="tag">Jazz real-time sync</span>
            <span className="tag">3 MVP roles</span>
            <span className="tag">Standalone mini-games</span>
          </div>
          <div className="cta-row">
            <Link className="button" href={joinHref}>
              Enter Demo Room
            </Link>
            <button
              className="button secondary"
              type="button"
              onClick={createPrivateRoom}
            >
              Create Private Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

