"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import { mockEvents, mockStockImpacts, type MockEvent, type MockStockImpact } from "@/lib/mock-data";

type IntelDashboardProps = {
  appName: string;
  apiBaseUrl: string;
};

type MapMode = "globe" | "flat";
type FilterValue = "All" | string;

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

type GlobeViewport = {
  width: number;
  height: number;
};

export function IntelDashboard({ appName, apiBaseUrl }: IntelDashboardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(mockEvents[0]?.id ?? "");
  const [mapMode, setMapMode] = useState<MapMode>("globe");
  const [regionFilter, setRegionFilter] = useState<FilterValue>("All");
  const [sentimentFilter, setSentimentFilter] = useState<FilterValue>("All");
  const [sourceFilter, setSourceFilter] = useState<FilterValue>("All");
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const [globeViewport, setGlobeViewport] = useState<GlobeViewport>({
    width: 900,
    height: 720,
  });

  const regionOptions = useMemo(() => ["All", ...new Set(mockEvents.map((event) => event.region))], []);
  const sentimentOptions = useMemo(
    () => ["All", ...new Set(mockEvents.map((event) => event.sentiment))],
    [],
  );
  const sourceOptions = useMemo(() => ["All", ...new Set(mockEvents.map((event) => event.source))], []);

  const filteredEvents = useMemo(
    () =>
      mockEvents.filter((event) => {
        const regionMatch = regionFilter === "All" || event.region === regionFilter;
        const sentimentMatch = sentimentFilter === "All" || event.sentiment === sentimentFilter;
        const sourceMatch = sourceFilter === "All" || event.source === sourceFilter;

        return regionMatch && sentimentMatch && sourceMatch;
      }),
    [regionFilter, sentimentFilter, sourceFilter],
  );

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;
  const selectedStockImpacts = selectedEvent ? mockStockImpacts[selectedEvent.id] ?? [] : [];
  const highSeverityCount = filteredEvents.filter((event) => event.severity === "High").length;
  const globePoints = filteredEvents.map((event) => ({
    ...event,
    size:
      event.id === selectedEvent?.id
        ? 0.52
        : event.severity === "High"
          ? 0.35
          : 0.24,
    color: event.severity === "High" ? "#ff8a8a" : event.severity === "Medium" ? "#ffd07a" : "#8ee9ff",
  }));
  const ringEvents = selectedEvent ? [selectedEvent] : [];
  const worldFeatures = useMemo(() => {
    const geo = feature(worldAtlas as any, (worldAtlas as any).objects.countries) as any;
    return geo.features ?? [];
  }, []);

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

  useEffect(() => {
    const globeInstance = globeRef.current;

    if (!globeInstance?.globeMaterial) {
      return;
    }

    const material = globeInstance.globeMaterial();

    material.color.set("#17384b");
    material.emissive.set("#0a1820");
    material.emissiveIntensity = 0.28;
    material.shininess = 0.9;
  }, [globeViewport.width, globeViewport.height]);

  useEffect(() => {
    const globeInstance = globeRef.current;

    if (!selectedEvent || mapMode !== "globe" || !globeInstance?.pointOfView) {
      return;
    }

    globeInstance.pointOfView(
      {
        lat: selectedEvent.lat,
        lng: selectedEvent.lng,
        altitude: 1.75,
      },
      900,
    );
  }, [mapMode, selectedEvent]);

  useEffect(() => {
    if (selectedEvent || filteredEvents.length === 0) {
      return;
    }

    setSelectedEventId(filteredEvents[0].id);
  }, [filteredEvents, selectedEvent]);

  const resetFilters = () => {
    setRegionFilter("All");
    setSentimentFilter("All");
    setSourceFilter("All");
  };

  return (
    <main className="intel-shell">
      <section className="intel-stage" aria-label="Map-first intelligence shell">
        <header className="command-bar">
          <div className="brand-block">
            <p className="kicker">Part 11: Frontend Filters</p>
            <h1>{appName}</h1>
          </div>

          <nav className="control-strip" aria-label="Static control bar">
            <div className="control-pill">
              <span className="control-label">View</span>
              <strong>Global</strong>
            </div>
            <div className="control-pill control-pill-toggle">
              <span className="control-label">Map Mode</span>
              <div className="toggle-row" role="tablist" aria-label="Map mode">
                <button
                  type="button"
                  className={`toggle-chip${mapMode === "globe" ? " toggle-chip-active" : ""}`}
                  onClick={() => setMapMode("globe")}
                >
                  Globe
                </button>
                <button
                  type="button"
                  className={`toggle-chip${mapMode === "flat" ? " toggle-chip-active" : ""}`}
                  onClick={() => setMapMode("flat")}
                >
                  2D
                </button>
              </div>
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
            <strong>{filteredEvents.length}</strong>
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

        <section className="filter-strip" aria-label="Event filters">
          <label className="filter-card">
            <span>Region</span>
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
              {regionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-card">
            <span>Sentiment</span>
            <select value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value)}>
              {sentimentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-card">
            <span>Source</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="filter-reset" onClick={resetFilters}>
            Reset Filters
          </button>
        </section>

        <div className="map-frame">
          <aside className="drawer drawer-left">
            <div className="drawer-head">
              <div>
                <p className="section-label">Event Stream</p>
                <h2>Live Developments</h2>
              </div>
              <span className="status-badge">{filteredEvents.length} Events</span>
            </div>

            <div className="drawer-toolbar">
              <span className="toolbar-chip toolbar-chip-active">All Regions</span>
              <span className="toolbar-chip">High Impact</span>
              <span className="toolbar-chip">Macro</span>
            </div>

            <div className="event-list" role="list" aria-label="Mock news events">
              {filteredEvents.map((event) => {
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
              {filteredEvents.length === 0 ? (
                <div className="empty-filter-state">
                  <strong>No events match the current filters.</strong>
                  <span>Adjust the filters or reset them to restore the full mock stream.</span>
                </div>
              ) : null}
            </div>
          </aside>

          <section
            className={`map-surface${mapMode === "flat" ? " map-surface-flat" : ""}`}
            aria-label={mapMode === "globe" ? "Globe map" : "2D map"}
          >
            <div className={`map-grid${mapMode === "flat" ? " map-grid-flat" : ""}`} aria-hidden="true" />
            {mapMode === "globe" ? (
              <>
                <div className="orbital orbital-1" />
                <div className="orbital orbital-2" />
                <div className="map-glow" />
              </>
            ) : (
              <div className="flat-wash" aria-hidden="true" />
            )}
            <div className="crosshair crosshair-x" />
            <div className="crosshair crosshair-y" />
            {mapMode === "globe" ? (
              <div ref={globeContainerRef} className="globe-wrap">
                <Globe
                  ref={globeRef}
                  backgroundColor="rgba(0,0,0,0)"
                  showGlobe
                  showAtmosphere
                  atmosphereColor="#79dfff"
                  atmosphereAltitude={0.16}
                  polygonsData={worldFeatures}
                  polygonAltitude={0.01}
                  polygonCapColor={() => "rgba(44, 98, 122, 0.92)"}
                  polygonSideColor={() => "rgba(16, 43, 56, 0.88)"}
                  polygonStrokeColor={() => "rgba(132, 221, 255, 0.28)"}
                  polygonsTransitionDuration={300}
                  ringsData={ringEvents}
                  ringLat="lat"
                  ringLng="lng"
                  ringColor={() => ["rgba(142, 233, 255, 0.52)", "rgba(142, 233, 255, 0.16)"]}
                  ringMaxRadius={6}
                  ringPropagationSpeed={2.2}
                  ringRepeatPeriod={900}
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
            ) : (
              <div className="flat-map-wrap">
                <ComposableMap
                  projection="geoEqualEarth"
                  projectionConfig={{ scale: 175 }}
                  width={globeViewport.width}
                  height={globeViewport.height}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Geographies geography={worldFeatures}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#1c465c"
                          stroke="#5fa4c7"
                          strokeWidth={0.38}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", fill: "#255873" },
                            pressed: { outline: "none" },
                          }}
                        />
                      ))
                    }
                  </Geographies>
                  {filteredEvents.map((event) => (
                    <Marker
                      key={event.id}
                      coordinates={[event.lng, event.lat]}
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <g className="flat-marker">
                        <circle
                          r={event.id === selectedEvent?.id ? 8 : 6}
                          fill={
                            event.severity === "High"
                              ? "#ff8a8a"
                              : event.severity === "Medium"
                                ? "#ffd07a"
                                : "#8ee9ff"
                          }
                          stroke="#041017"
                          strokeWidth={1.8}
                        />
                        <circle
                          r={event.id === selectedEvent?.id ? 16 : 11}
                          fill={event.id === selectedEvent?.id ? "rgba(142, 233, 255, 0.22)" : "rgba(142, 233, 255, 0.12)"}
                        />
                      </g>
                    </Marker>
                  ))}
                </ComposableMap>
              </div>
            )}

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
                {mapMode === "globe"
                  ? "Selected events now drive visible globe focus: the active point grows, pulses, and the camera shifts toward the event location."
                  : "The flat map now shares the same active selection state, with stronger highlighted markers for the currently selected event."}
              </p>
            </div>
          </section>

          <aside className="drawer drawer-right">
            <div className="drawer-head">
              <div>
                <p className="section-label">Selected Event</p>
                <h2>Event Detail</h2>
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
                <div className="detail-block">
                  <p className="detail-label">Placeholder Impact</p>
                  <div className="signal-grid">
                    <div className="signal-card">
                      <span>Sentiment</span>
                      <strong>{selectedEvent.severity === "High" ? "Risk-Off" : "Neutral Watch"}</strong>
                    </div>
                    <div className="signal-card">
                      <span>Direction</span>
                      <strong>{selectedEvent.severity === "High" ? "Negative Bias" : "Mixed Bias"}</strong>
                    </div>
                    <div className="signal-card">
                      <span>Magnitude</span>
                      <strong>{selectedEvent.severity === "High" ? "Elevated" : "Moderate"}</strong>
                    </div>
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
                <div className="detail-block">
                  <p className="detail-label">Mock Stock Impact</p>
                  <div className="stock-impact-list">
                    {selectedStockImpacts.map((impact) => (
                      <article key={impact.symbol} className="stock-impact-card">
                        <div className="stock-impact-head">
                          <strong>{impact.symbol}</strong>
                          <span className="tag-pill">{impact.market}</span>
                        </div>
                        <div className="stock-impact-grid">
                          <div className="stock-impact-stat">
                            <span>Sentiment</span>
                            <strong>{impact.sentiment}</strong>
                          </div>
                          <div className="stock-impact-stat">
                            <span>Direction</span>
                            <strong>{impact.direction}</strong>
                          </div>
                          <div className="stock-impact-stat">
                            <span>Magnitude</span>
                            <strong>{impact.magnitude}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
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
