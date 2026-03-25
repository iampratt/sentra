import { getClientConfig } from "@/lib/config";

const panelCopy = {
  globe:
    "The global event map will render here. In upcoming parts, this surface will plot live event coordinates and respond to dashboard selection state.",
  events:
    "No events loaded yet. Part 6 will introduce the first mock global event set and the selection model for this panel.",
  stocks:
    "Stock impact analysis is not active yet. This panel will later show affected symbols, sentiment, direction, and confidence.",
  alerts:
    "Alerting is still empty. High-priority events and major predicted market impact will surface here in later parts.",
} as const;

export default function HomePage() {
  const config = getClientConfig();

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="kicker">Part 5: Dashboard Shell</p>
          <h1>{config.appName}</h1>
          <p className="lede">
            Static structure only. The page now matches the intended dashboard shape without adding
            event data, globe logic, or backend-driven content.
          </p>
        </div>

        <dl className="status-strip" aria-label="Environment summary">
          <div>
            <dt>Mode</dt>
            <dd>Personal MVP</dd>
          </div>
          <div>
            <dt>Frontend</dt>
            <dd>Active</dd>
          </div>
          <div>
            <dt>API Base</dt>
            <dd>{config.apiBaseUrl}</dd>
          </div>
        </dl>
      </header>

      <section className="dashboard-grid" aria-label="Dashboard shell">
        <article className="panel panel-globe">
          <div className="panel-head">
            <div>
              <p className="panel-label">Global Surface</p>
              <h2>World Event Map</h2>
            </div>
            <span className="panel-state">Empty State</span>
          </div>

          <div className="globe-stage" aria-hidden="true">
            <div className="globe-halo globe-halo-1" />
            <div className="globe-halo globe-halo-2" />
            <div className="globe-core">
              <div className="latitude latitude-1" />
              <div className="latitude latitude-2" />
              <div className="latitude latitude-3" />
              <div className="longitude longitude-1" />
              <div className="longitude longitude-2" />
              <div className="longitude longitude-3" />
            </div>
          </div>

          <p className="panel-copy">{panelCopy.globe}</p>
        </article>

        <article className="panel panel-events">
          <div className="panel-head">
            <div>
              <p className="panel-label">Event Stream</p>
              <h2>News Events</h2>
            </div>
            <span className="panel-state">0 Loaded</span>
          </div>
          <p className="panel-copy">{panelCopy.events}</p>
        </article>

        <article className="panel panel-stocks">
          <div className="panel-head">
            <div>
              <p className="panel-label">Impact Desk</p>
              <h2>Stock Signals</h2>
            </div>
            <span className="panel-state">Offline</span>
          </div>
          <p className="panel-copy">{panelCopy.stocks}</p>
        </article>

        <article className="panel panel-alerts">
          <div className="panel-head">
            <div>
              <p className="panel-label">Priority Queue</p>
              <h2>Alerts</h2>
            </div>
            <span className="panel-state">Quiet</span>
          </div>
          <p className="panel-copy">{panelCopy.alerts}</p>
        </article>
      </section>
    </main>
  );
}
