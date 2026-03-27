import Link from 'next/link';
import { Lobby } from '@/components/lobby';
import { roles } from '@/lib/game/data';

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">Deploy or Die</span>
          <h1 className="title">Spaceteam for software engineers.</h1>
          <p className="lede">
            A multiplayer browser game where teammates yell out deploy prompts, find
            the matching control on the correct station, and race through standalone
            mini-games before production collapses.
          </p>
          <div className="cta-row">
            <Link className="button" href="/room/SHIP-42?name=Alex">
              Open Demo Room
            </Link>
            <a className="button secondary" href="#architecture">
              View Skeleton
            </a>
          </div>
        </div>

        <aside className="panel hero-aside">
          <div>
            <span className="eyebrow">Framework</span>
            <h2 style={{ marginTop: 8 }}>Next.js first, Jazz-ready, Phaser optional.</h2>
          </div>
          <div className="stat-grid">
            <div className="panel-muted stat-card">
              <div className="stat-label">App Shell</div>
              <div className="stat-value">Next.js</div>
            </div>
            <div className="panel-muted stat-card">
              <div className="stat-label">Multiplayer</div>
              <div className="stat-value">Jazz seam</div>
            </div>
            <div className="panel-muted stat-card">
              <div className="stat-label">Mini-Games</div>
              <div className="stat-value">React now</div>
            </div>
            <div className="panel-muted stat-card">
              <div className="stat-label">Upgrade Path</div>
              <div className="stat-value">Phaser later</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid" id="architecture">
        <div className="stack">
          <div className="panel section stack">
            <div>
              <span className="eyebrow">Roles</span>
              <h2 style={{ marginTop: 8 }}>MVP stations</h2>
            </div>
            <div className="list">
              {roles.map(role => (
                <div className="panel-muted role-card" key={role.id}>
                  <h3>{role.name}</h3>
                  <p>{role.summary}</p>
                  <div className="tag-row" style={{ marginTop: 12 }}>
                    {role.controls.map(control => (
                      <span className="tag" key={control}>
                        {control}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <Lobby />
          <div className="panel section stack">
            <div>
              <span className="eyebrow">Skeleton</span>
              <h2 style={{ marginTop: 8 }}>What this repo gives you</h2>
            </div>
            <div className="list">
              <div className="panel-muted task-card">
                <h3>Typed game model</h3>
                <p>Roles, prompts, deploy health, timers, and mini-game ownership.</p>
              </div>
              <div className="panel-muted task-card">
                <h3>Room screen</h3>
                <p>One player station with controls, live prompts, and a local mini-game panel.</p>
              </div>
              <div className="panel-muted task-card">
                <h3>Jazz integration seam</h3>
                <p>Swap the mock adapter with a real shared-room implementation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

