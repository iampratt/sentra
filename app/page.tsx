import { getClientConfig } from "@/lib/config";

const streamEmptyState =
  "No events loaded yet. Part 6 will introduce the first mock event set and populate this live stream.";
const detailEmptyState =
  "Select an event once mock data is added. This drawer will later show summary, impact, linked symbols, and context.";
const alertEmptyState =
  "No active alerts. This strip will surface urgent developments after event and impact logic is connected.";

export default function HomePage() {
  const config = getClientConfig();

  return (
    <main className="intel-shell">
      <section className="intel-stage" aria-label="Map-first intelligence shell">
        <header className="command-bar">
          <div className="brand-block">
            <p className="kicker">Part 5 Pivoted Shell</p>
            <h1>{config.appName}</h1>
          </div>

          <nav className="control-strip" aria-label="Static control bar">
            <div className="control-pill">
              <span className="control-label">View</span>
              <strong>Global</strong>
            </div>
            <div className="control-pill">
              <span className="control-label">Time Range</span>
              <strong>7D</strong>
            </div>
            <div className="control-pill">
              <span className="control-label">Layer</span>
              <strong>News Impact</strong>
            </div>
            <div className="control-pill control-pill-status">
              <span className="control-label">API</span>
              <strong>{config.apiBaseUrl}</strong>
            </div>
          </nav>
        </header>

        <div className="map-frame">
          <aside className="drawer drawer-left">
            <div className="drawer-head">
              <div>
                <p className="section-label">Event Stream</p>
                <h2>Live Developments</h2>
              </div>
              <span className="status-badge">0 Events</span>
            </div>
            <p className="drawer-copy">{streamEmptyState}</p>
          </aside>

          <section className="map-surface" aria-label="Map placeholder">
            <div className="map-grid" aria-hidden="true" />
            <div className="orbital orbital-1" />
            <div className="orbital orbital-2" />
            <div className="map-glow" />
            <div className="crosshair crosshair-x" />
            <div className="crosshair crosshair-y" />

            <div className="map-meta map-meta-top-left">
              <span>Lat 20.0000</span>
              <span>Lon 0.0000</span>
            </div>
            <div className="map-meta map-meta-top-right">
              <span>Zoom 1.00</span>
              <span>View Global</span>
            </div>
            <div className="map-meta map-meta-bottom-left">
              <span>Layers: News Impact</span>
            </div>
            <div className="map-meta map-meta-bottom-right">
              <span>Static shell only</span>
            </div>

            <div className="center-plate">
              <p className="section-label">Primary Surface</p>
              <h2>Global Intelligence Map</h2>
              <p>
                This is a structural placeholder for the dominant map experience. Part 7 will swap
                this visual shell for an actual globe or map layer.
              </p>
            </div>
          </section>

          <aside className="drawer drawer-right">
            <div className="drawer-head">
              <div>
                <p className="section-label">Selected Event</p>
                <h2>Impact Detail</h2>
              </div>
              <span className="status-badge">Empty</span>
            </div>
            <p className="drawer-copy">{detailEmptyState}</p>
          </aside>
        </div>

        <footer className="alert-ribbon">
          <div className="alert-ribbon-head">
            <p className="section-label">Alert Ribbon</p>
            <span className="status-badge">Quiet</span>
          </div>
          <p>{alertEmptyState}</p>
        </footer>
      </section>
    </main>
  );
}
