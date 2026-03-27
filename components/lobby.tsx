'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const ROOM_CODE = 'SHIP-42';

export function Lobby() {
  const [name, setName] = useState('Engineer');
  const joinHref = useMemo(
    () => `/room/${ROOM_CODE}?name=${encodeURIComponent(name || 'Engineer')}`,
    [name]
  );

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
            <button className="button secondary" type="button">
              Create Private Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

