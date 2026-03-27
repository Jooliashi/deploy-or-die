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
        <div className="callout panel-muted">match target tile</div>
        <div className="mini-grid">
          <div className="mini-tile">Header</div>
          <div className="mini-tile target">CTA</div>
          <div className="mini-tile">Card</div>
        </div>
        <div className="cta-row">
          <button className="button" onClick={onResolve} type="button">
            Patch Visual
          </button>
          <button className="button secondary" onClick={onFail} type="button">
            Ship Broken UI
          </button>
        </div>
      </div>
    );
  }

  if (miniGameId === 'route-repair') {
    return (
      <div className="mini-shell">
        <div className="callout panel-muted">restore route chain</div>
        <div className="mini-grid">
          <div className="mini-tile target">API</div>
          <div className="mini-tile">Worker</div>
          <div className="mini-tile">Auth</div>
        </div>
        <div className="cta-row">
          <button className="button" onClick={onResolve} type="button">
            Restore Routing
          </button>
          <button className="button secondary" onClick={onFail} type="button">
            Drop Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mini-shell">
      <div className="callout panel-muted">rebalance live regions</div>
      <div className="mini-grid">
        <div className="mini-tile">iad1</div>
        <div className="mini-tile target">sfo1</div>
        <div className="mini-tile">fra1</div>
      </div>
      <div className="cta-row">
        <button className="button" onClick={onResolve} type="button">
          Stabilize Regions
        </button>
        <button className="button secondary" onClick={onFail} type="button">
          Overload Canary
        </button>
      </div>
    </div>
  );
}
