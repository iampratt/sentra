"use client";

import { useState } from "react";

type IntelDashboardProps = {
  appName: string;
  apiBaseUrl: string;
};

type MockEvent = {
  id: string;
  title: string;
  source: string;
  region: string;
  country: string;
  publishedAt: string;
  severity: "Low" | "Medium" | "High";
  summary: string;
};

const mockEvents: MockEvent[] = [
  {
    id: "mena-shipping-001",
    title: "Red Sea shipping risk pushes insurers to reprice regional routes",
    source: "Lloyd's Market Wire",
    region: "Middle East & Africa",
    country: "Egypt",
    publishedAt: "2026-03-25 08:20 UTC",
    severity: "High",
    summary:
      "Shipping disruptions around the Red Sea are raising freight and insurance expectations, increasing watchlist pressure on logistics, energy, and import-dependent equities.",
  },
  {
    id: "asia-chip-002",
    title: "Export review signals tighter controls on advanced chip equipment",
    source: "Asia Tech Brief",
    region: "Asia Pacific",
    country: "South Korea",
    publishedAt: "2026-03-25 07:10 UTC",
    severity: "Medium",
    summary:
      "A policy review on advanced semiconductor tooling is adding uncertainty for suppliers and downstream electronics names with exposure to fabrication expansion.",
  },
  {
    id: "europe-energy-003",
    title: "Unexpected pipeline maintenance tightens short-term gas outlook",
    source: "Continental Energy Desk",
    region: "Europe",
    country: "Germany",
    publishedAt: "2026-03-25 05:45 UTC",
    severity: "Medium",
    summary:
      "Short-duration infrastructure maintenance has shifted regional energy pricing expectations and may influence utilities, chemicals, and heavy manufacturing sentiment.",
  },
  {
    id: "latam-mining-004",
    title: "Copper supply negotiations stall at major Andean operation",
    source: "LatAm Commodities Watch",
    region: "Latin America",
    country: "Chile",
    publishedAt: "2026-03-24 23:50 UTC",
    severity: "High",
    summary:
      "Labor talks at a major copper operation have stalled, raising the probability of supply disruption and putting metals, miners, and industrial buyers on alert.",
  },
];

export function IntelDashboard({ appName, apiBaseUrl }: IntelDashboardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(mockEvents[0]?.id ?? "");

  const selectedEvent =
    mockEvents.find((event) => event.id === selectedEventId) ?? mockEvents[0] ?? null;

  return (
    <main className="intel-shell">
      <section className="intel-stage" aria-label="Map-first intelligence shell">
        <header className="command-bar">
          <div className="brand-block">
            <p className="kicker">Part 6: Mock Event Stream</p>
            <h1>{appName}</h1>
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
              <strong>{apiBaseUrl}</strong>
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
              <span className="status-badge">{mockEvents.length} Events</span>
            </div>

            <div className="event-list" role="list" aria-label="Mock news events">
              {mockEvents.map((event) => {
                const isActive = event.id === selectedEvent?.id;

                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`event-card${isActive ? " event-card-active" : ""}`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <span className={`severity-chip severity-${event.severity.toLowerCase()}`}>
                      {event.severity}
                    </span>
                    <strong>{event.title}</strong>
                    <span className="event-meta">
                      {event.region} · {event.country}
                    </span>
                    <span className="event-meta">
                      {event.source} · {event.publishedAt}
                    </span>
                  </button>
                );
              })}
            </div>
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
              <span>{selectedEvent?.country ?? "No event selected"}</span>
            </div>

            <div className="center-plate">
              <p className="section-label">Primary Surface</p>
              <h2>Global Intelligence Map</h2>
              <p>
                Static placeholder only. Event selection is live in the drawers now, but map
                rendering and marker synchronization start in Part 7 and Part 8.
              </p>
            </div>
          </section>

          <aside className="drawer drawer-right">
            <div className="drawer-head">
              <div>
                <p className="section-label">Selected Event</p>
                <h2>Impact Detail</h2>
              </div>
              <span className="status-badge">{selectedEvent?.severity ?? "Empty"}</span>
            </div>

            {selectedEvent ? (
              <div className="detail-stack">
                <div className="detail-block">
                  <p className="detail-label">Headline</p>
                  <h3>{selectedEvent.title}</h3>
                </div>
                <div className="detail-grid">
                  <div className="detail-stat">
                    <span>Source</span>
                    <strong>{selectedEvent.source}</strong>
                  </div>
                  <div className="detail-stat">
                    <span>Region</span>
                    <strong>{selectedEvent.region}</strong>
                  </div>
                  <div className="detail-stat">
                    <span>Country</span>
                    <strong>{selectedEvent.country}</strong>
                  </div>
                  <div className="detail-stat">
                    <span>Published</span>
                    <strong>{selectedEvent.publishedAt}</strong>
                  </div>
                </div>
                <div className="detail-block">
                  <p className="detail-label">Summary</p>
                  <p className="drawer-copy detail-copy">{selectedEvent.summary}</p>
                </div>
              </div>
            ) : (
              <p className="drawer-copy">
                Select an event once mock data is added. This drawer will later show summary,
                impact, linked symbols, and context.
              </p>
            )}
          </aside>
        </div>

        <footer className="alert-ribbon">
          <div className="alert-ribbon-head">
            <p className="section-label">Alert Ribbon</p>
            <span className="status-badge">Quiet</span>
          </div>
          <p>
            No active alerts yet. This strip will surface urgent developments after impact logic is
            connected in later parts.
          </p>
        </footer>
      </section>
    </main>
  );
}
