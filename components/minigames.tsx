'use client';

import type { MiniGameId } from '@/lib/game/types';

interface MiniGamePanelProps {
  miniGameId: MiniGameId;
  onResolve: () => void;
  onFail: () => void;
}

export function MiniGamePanel({
  miniGameId,
  onResolve,
  onFail,
}: MiniGamePanelProps) {
  if (miniGameId === 'visual-patch') {
    return (
      <div className="mini-shell">
        <div className="callout panel-muted">repair preview surface</div>
        <div className="mini-grid">
          <div className="mini-tile">toolbar</div>
          <div className="mini-tile target">flags</div>
          <div className="mini-tile">preview</div>
        </div>
        <div className="cta-row">
          <button className="button" onClick={onResolve} type="button">
            Ship Fix
          </button>
          <button className="button secondary" onClick={onFail} type="button">
            Break Preview
          </button>
        </div>
      </div>
    );
  }

  if (miniGameId === 'route-repair') {
    return (
      <div className="mini-shell">
        <div className="callout panel-muted">stabilize config path</div>
        <div className="mini-grid">
          <div className="mini-tile target">config</div>
          <div className="mini-tile">cron</div>
          <div className="mini-tile">cache</div>
        </div>
        <div className="cta-row">
          <button className="button" onClick={onResolve} type="button">
            Sync Backend
          </button>
          <button className="button secondary" onClick={onFail} type="button">
            Stall Runtime
          </button>
        </div>
      </div>
    );
  }

  if (miniGameId === 'message-triage') {
    return (
      <div className="mini-shell">
        <div className="callout panel-muted">ship the right response</div>
        <div className="mini-grid">
          <div className="mini-tile target">reply</div>
          <div className="mini-tile">vendor</div>
          <div className="mini-tile">thread</div>
        </div>
        <div className="cta-row">
          <button className="button" onClick={onResolve} type="button">
            Send Update
          </button>
          <button className="button secondary" onClick={onFail} type="button">
            Misfire Comms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mini-shell">
      <div className="callout panel-muted">stabilize production edge</div>
      <div className="mini-grid">
        <div className="mini-tile">waf</div>
        <div className="mini-tile target">rollout</div>
        <div className="mini-tile">botid</div>
      </div>
      <div className="cta-row">
        <button className="button" onClick={onResolve} type="button">
          Restore Edge
        </button>
        <button className="button secondary" onClick={onFail} type="button">
          Melt Prod
        </button>
      </div>
    </div>
  );
}
