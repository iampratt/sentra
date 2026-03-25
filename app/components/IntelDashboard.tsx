"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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
  lat: number;
  lng: number;
  publishedAt: string;
  severity: "Low" | "Medium" | "High";
  category: string;
  watchlist: string[];
  impactWindow: string;
  summary: string;
};

const mockEvents: MockEvent[] = [
  {
    id: "mena-shipping-001",
    title: "Red Sea shipping risk pushes insurers to reprice regional routes",
    source: "Lloyd's Market Wire",
    region: "Middle East & Africa",
    country: "Egypt",
    lat: 27.2579,
    lng: 33.8116,
    publishedAt: "2026-03-25 08:20 UTC",
    severity: "High",
    category: "Shipping",
    watchlist: ["Energy", "Logistics", "Insurers"],
    impactWindow: "24h",
    summary:
      "Shipping disruptions around the Red Sea are raising freight and insurance expectations, increasing watchlist pressure on logistics, energy, and import-dependent equities.",
  },
  {
    id: "asia-chip-002",
    title: "Export review signals tighter controls on advanced chip equipment",
    source: "Asia Tech Brief",
    region: "Asia Pacific",
    country: "South Korea",
    lat: 37.5665,
    lng: 126.978,
    publishedAt: "2026-03-25 07:10 UTC",
    severity: "Medium",
    category: "Semiconductors",
    watchlist: ["Chipmakers", "Tooling", "Electronics"],
    impactWindow: "2-5d",
    summary:
      "A policy review on advanced semiconductor tooling is adding uncertainty for suppliers and downstream electronics names with exposure to fabrication expansion.",
  },
  {
    id: "europe-energy-003",
    title: "Unexpected pipeline maintenance tightens short-term gas outlook",
    source: "Continental Energy Desk",
    region: "Europe",
    country: "Germany",
    lat: 52.52,
    lng: 13.405,
    publishedAt: "2026-03-25 05:45 UTC",
    severity: "Medium",
    category: "Energy",
    watchlist: ["Utilities", "Chemicals", "Industrials"],
    impactWindow: "1-3d",
    summary:
      "Short-duration infrastructure maintenance has shifted regional energy pricing expectations and may influence utilities, chemicals, and heavy manufacturing sentiment.",
  },
  {
    id: "latam-mining-004",
    title: "Copper supply negotiations stall at major Andean operation",
    source: "LatAm Commodities Watch",
    region: "Latin America",
    country: "Chile",
    lat: -33.4489,
    lng: -70.6693,
    publishedAt: "2026-03-24 23:50 UTC",
    severity: "High",
    category: "Metals",
    watchlist: ["Copper", "Miners", "Manufacturers"],
    impactWindow: "3-7d",
    summary:
      "Labor talks at a major copper operation have stalled, raising the probability of supply disruption and putting metals, miners, and industrial buyers on alert.",
  },
];

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

type GlobeViewport = {
  width: number;
  height: number;
};

export function IntelDashboard({ appName, apiBaseUrl }: IntelDashboardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(mockEvents[0]?.id ?? "");
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const [globeViewport, setGlobeViewport] = useState<GlobeViewport>({
    width: 900,
    height: 720,
  });

  const selectedEvent =
    mockEvents.find((event) => event.id === selectedEventId) ?? mockEvents[0] ?? null;
  const highSeverityCount = mockEvents.filter((event) => event.severity === "High").length;
  const globePoints = mockEvents.map((event) => ({
    ...event,
    size: event.severity === "High" ? 0.35 : 0.24,
    color: event.severity === "High" ? "#ff8a8a" : event.severity === "Medium" ? "#ffd07a" : "#8ee9ff",
  }));

  useEffect(() => {
    const element = globeContainerRef.current;

    if (!element) {
      return;
    }

    const updateViewport = () => {
      const { width, height } = element.getBoundingClientRect();

      if (width === 0 || height === 0) {
        return;
      }

      setGlobeViewport({
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="intel-shell">
      <section className="intel-stage" aria-label="Map-first intelligence shell">
        <header className="command-bar">
          <div className="brand-block">
            <p className="kicker">Part 7: Globe Integration</p>
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

        <section className="telemetry-strip" aria-label="Static dashboard telemetry">
          <div className="telemetry-card">
            <span>Tracked Events</span>
            <strong>{mockEvents.length}</strong>
          </div>
          <div className="telemetry-card">
            <span>High Severity</span>
            <strong>{highSeverityCount}</strong>
          </div>
          <div className="telemetry-card">
            <span>Regions Active</span>
            <strong>4</strong>
          </div>
          <div className="telemetry-card">
            <span>Refresh Mode</span>
            <strong>Manual</strong>
          </div>
          <div className="telemetry-card">
            <span>Model State</span>
            <strong>Mock Feed</strong>
          </div>
          <div className="telemetry-card">
            <span>Signal Queue</span>
            <strong>Standby</strong>
          </div>
        </section>

        <div className="map-frame">
          <aside className="drawer drawer-left">
            <div className="drawer-head">
              <div>
                <p className="section-label">Event Stream</p>
                <h2>Live Developments</h2>
              </div>
              <span className="status-badge">{mockEvents.length} Events</span>
            </div>

            <div className="drawer-toolbar">
              <span className="toolbar-chip toolbar-chip-active">All Regions</span>
              <span className="toolbar-chip">High Impact</span>
              <span className="toolbar-chip">Macro</span>
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
                    <div className="event-card-head">
                      <span className={`severity-chip severity-${event.severity.toLowerCase()}`}>
                        {event.severity}
                      </span>
                      <span className="event-category">{event.category}</span>
                      <span className="event-window">{event.impactWindow}</span>
                    </div>
                    <strong>{event.title}</strong>
                    <div className="event-meta-row">
                      <span className="event-meta">
                        {event.region} · {event.country}
                      </span>
                      <span className="event-meta">{event.publishedAt}</span>
                    </div>
                    <span className="event-meta">{event.source}</span>
                    <div className="tag-row" aria-label="Watchlist sectors">
                      {event.watchlist.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="map-surface" aria-label="Globe map">
            <div className="map-grid" aria-hidden="true" />
            <div className="orbital orbital-1" />
            <div className="orbital orbital-2" />
            <div className="map-glow" />
            <div className="crosshair crosshair-x" />
            <div className="crosshair crosshair-y" />
            <div ref={globeContainerRef} className="globe-wrap">
              <Globe
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                showAtmosphere
                atmosphereColor="#79dfff"
                atmosphereAltitude={0.16}
                pointsData={globePoints}
                pointLat="lat"
                pointLng="lng"
                pointAltitude="size"
                pointRadius={0.36}
                pointColor="color"
                pointResolution={16}
                onPointClick={(point) => setSelectedEventId((point as MockEvent).id)}
                width={globeViewport.width}
                height={globeViewport.height}
              />
            </div>

            <div className="map-meta map-meta-top-left">
              <span>Lat {selectedEvent?.lat.toFixed(4) ?? "20.0000"}</span>
              <span>Lon {selectedEvent?.lng.toFixed(4) ?? "0.0000"}</span>
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
            <div className="map-stack map-stack-left">
              <div className="stack-card">
                <span>Focus Region</span>
                <strong>{selectedEvent?.region ?? "Global"}</strong>
              </div>
              <div className="stack-card">
                <span>Selected Sector</span>
                <strong>{selectedEvent?.category ?? "None"}</strong>
              </div>
            </div>
            <div className="map-stack map-stack-right">
              <div className="stack-card">
                <span>Impact Window</span>
                <strong>{selectedEvent?.impactWindow ?? "N/A"}</strong>
              </div>
              <div className="stack-card">
                <span>Watchlist Count</span>
                <strong>{selectedEvent?.watchlist.length ?? 0}</strong>
              </div>
            </div>

            <div className="center-plate">
              <p className="section-label">Primary Surface</p>
              <h2>Global Intelligence Map</h2>
              <p>
                Static event markers are live on the globe. Marker clicks now work; tighter
                synchronization and richer overlays continue in the next part.
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
                <div className="tag-row tag-row-detail">
                  <span className={`severity-chip severity-${selectedEvent.severity.toLowerCase()}`}>
                    {selectedEvent.severity}
                  </span>
                  <span className="tag-pill">{selectedEvent.category}</span>
                  <span className="tag-pill">{selectedEvent.impactWindow} window</span>
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
                  <p className="detail-label">Watchlist Exposure</p>
                  <div className="tag-row">
                    {selectedEvent.watchlist.map((tag) => (
                      <span key={tag} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="detail-block">
                  <p className="detail-label">Summary</p>
                  <p className="drawer-copy detail-copy">{selectedEvent.summary}</p>
                </div>
                <div className="signal-grid">
                  <div className="signal-card">
                    <span>Signal Bias</span>
                    <strong>{selectedEvent.severity === "High" ? "Escalating" : "Monitoring"}</strong>
                  </div>
                  <div className="signal-card">
                    <span>Correlation</span>
                    <strong>Pending</strong>
                  </div>
                  <div className="signal-card">
                    <span>Linked Symbols</span>
                    <strong>Not wired</strong>
                  </div>
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
          <div className="alert-grid">
            <div className="alert-item">
              <span>Priority Queue</span>
              <strong>No live escalations</strong>
            </div>
            <div className="alert-item">
              <span>Selected Region</span>
              <strong>{selectedEvent?.region ?? "Global"}</strong>
            </div>
            <div className="alert-item">
              <span>Next Layer</span>
              <strong>Map Sync + Filters</strong>
            </div>
            <div className="alert-item">
              <span>Status</span>
              <strong>Awaiting Part 8</strong>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
