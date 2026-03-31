"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import { mockEvents, type MockEvent } from "@/lib/mock-data";

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

type LinkedPriceSymbol = {
  ticker: string;
  exchange: string;
  market: string;
  currency: string | null;
  provider_symbol: string;
  last_close: number | null;
  previous_close: number | null;
  change_percent: number | null;
  last_trading_at: string | null;
  sentiment: string | null;
  direction: string | null;
  magnitude: string | null;
  confidence: number | null;
  time_horizon: string | null;
  rationale: string | null;
  status: string;
  error: string | null;
};

type LinkedPricePayload =
  | { ok: true; event_id: string; symbols: LinkedPriceSymbol[] }
  | { ok: false; error: string };

type AnalysisRunPayload =
  | { ok: true; provider: string; model: string; event_id: string; impacts: Array<unknown>; provider_status: string; error?: string | null }
  | { ok: false; error: string };

function hasCoordinates(event: MockEvent): event is MockEvent & { lat: number; lng: number } {
  return typeof event.lat === "number" && typeof event.lng === "number";
}

function formatCoordinate(value: number | null) {
  return typeof value === "number" ? value.toFixed(4) : "N/A";
}

export function IntelDashboard({ appName, apiBaseUrl }: IntelDashboardProps) {
  const [events, setEvents] = useState<MockEvent[]>(mockEvents);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>(mockEvents[0]?.id ?? "");
  const [mapMode, setMapMode] = useState<MapMode>("globe");
  const [regionFilter, setRegionFilter] = useState<FilterValue>("All");
  const [sentimentFilter, setSentimentFilter] = useState<FilterValue>("All");
  const [sourceFilter, setSourceFilter] = useState<FilterValue>("All");
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const [linkedSymbols, setLinkedSymbols] = useState<LinkedPriceSymbol[]>([]);
  const [linkedSymbolsError, setLinkedSymbolsError] = useState<string | null>(null);
  const [linkedSymbolsLoading, setLinkedSymbolsLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [globeViewport, setGlobeViewport] = useState<GlobeViewport>({
    width: 900,
    height: 720,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const response = await fetch("/api/events", { cache: "no-store" });
        const payload = (await response.json()) as
          | { ok: true; events: MockEvent[] }
          | { ok: false; error: string };

        if (!response.ok || !payload.ok) {
          throw new Error("error" in payload ? payload.error : "Failed to load events.");
        }

        if (!cancelled) {
          setEvents(payload.events);
          setEventsError(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load events.";

        if (!cancelled) {
          setEventsError(message);
          setEvents(mockEvents);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const regionOptions = useMemo(() => ["All", ...new Set(events.map((event) => event.region))], [events]);
  const sentimentOptions = useMemo(
    () => ["All", ...new Set(events.map((event) => event.sentiment))],
    [events],
  );
  const sourceOptions = useMemo(() => ["All", ...new Set(events.map((event) => event.source))], [events]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const regionMatch = regionFilter === "All" || event.region === regionFilter;
        const sentimentMatch = sentimentFilter === "All" || event.sentiment === sentimentFilter;
        const sourceMatch = sourceFilter === "All" || event.source === sourceFilter;

        return regionMatch && sentimentMatch && sourceMatch;
      }),
    [events, regionFilter, sentimentFilter, sourceFilter],
  );
  const mappableEvents = useMemo(() => filteredEvents.filter(hasCoordinates), [filteredEvents]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;
  const highSeverityCount = filteredEvents.filter((event) => event.severity === "High").length;
  const globePoints = useMemo(
    () =>
      mappableEvents.map((event) => ({
        ...event,
        size:
          event.id === selectedEvent?.id
            ? 0.48
            : event.severity === "High"
              ? 0.32
              : 0.22,
        color:
          event.id === selectedEvent?.id
            ? "#c7f7ff"
            : event.severity === "High"
              ? "#ff8a8a"
              : event.severity === "Medium"
                ? "#ffd07a"
                : "#8ee9ff",
      })),
    [mappableEvents, selectedEvent],
  );
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

    if (!selectedEvent || !hasCoordinates(selectedEvent) || mapMode !== "globe" || !globeInstance?.pointOfView) {
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

  useEffect(() => {
    let cancelled = false;

    async function loadLinkedSymbols() {
      if (!selectedEvent?.dbId) {
        setLinkedSymbols([]);
        setLinkedSymbolsError(null);
        setLinkedSymbolsLoading(false);
        return;
      }

      try {
        setLinkedSymbolsLoading(true);
        const response = await fetch(`/api/events/${selectedEvent.dbId}/prices`, { cache: "no-store" });
        const payload = (await response.json()) as LinkedPricePayload;

        if (!response.ok || !payload.ok) {
          throw new Error("error" in payload ? payload.error : "Failed to load linked symbol prices.");
        }

        if (!cancelled) {
          setLinkedSymbols(payload.symbols);
          setLinkedSymbolsError(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load linked symbol prices.";

        if (!cancelled) {
          setLinkedSymbols([]);
          setLinkedSymbolsError(message);
        }
      } finally {
        if (!cancelled) {
          setLinkedSymbolsLoading(false);
        }
      }
    }

    void loadLinkedSymbols();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent?.dbId]);

  const resetFilters = () => {
    setRegionFilter("All");
    setSentimentFilter("All");
    setSourceFilter("All");
  };

  const runAnalysis = async () => {
    if (!selectedEvent?.dbId) {
      setAnalysisError("This event is not stored yet, so analysis cannot run.");
      return;
    }

    try {
      setAnalysisRunning(true);
      setAnalysisError(null);

      const response = await fetch(`/api/events/${selectedEvent.dbId}/analysis`, {
        method: "POST",
      });
      const payload = (await response.json()) as AnalysisRunPayload;

      if (!response.ok || !payload.ok) {
        throw new Error("error" in payload ? (payload.error ?? "Failed to run analysis.") : "Failed to run analysis.");
      }

      const refreshed = await fetch(`/api/events/${selectedEvent.dbId}/prices`, { cache: "no-store" });
      const refreshedPayload = (await refreshed.json()) as LinkedPricePayload;

      if (refreshed.ok && refreshedPayload.ok) {
        setLinkedSymbols(refreshedPayload.symbols);
        setLinkedSymbolsError(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run analysis.";
      setAnalysisError(message);
    } finally {
      setAnalysisRunning(false);
    }
  };

  return (
    <main className="intel-shell">
      <section className="intel-stage" aria-label="Map-first intelligence shell">
        <header className="command-bar">
          <div className="brand-block">
            <p className="kicker">Part 15: DB-backed Event Feed</p>
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
            <strong>{eventsError ? "DB Fallback" : "DB Feed"}</strong>
          </div>
          <div className="telemetry-card">
            <span>Signal Queue</span>
            <strong>Standby</strong>
          </div>
        </section>

        {eventsError ? (
          <section className="events-warning" aria-label="Event data warning">
            <strong>Database events unavailable.</strong>
            <span>{eventsError}</span>
            <span>Showing local fallback events so the dashboard remains usable.</span>
          </section>
        ) : null}

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
              <span className="toolbar-chip">{mappableEvents.length} Mapped</span>
            </div>

            <div className="event-list" role="list" aria-label="News events">
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
                    {!hasCoordinates(event) ? (
                      <span className="event-meta event-meta-warning">Location unavailable for map placement</span>
                    ) : null}
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
                  <span>Adjust the filters or reset them to restore the current event stream.</span>
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
                  polygonsTransitionDuration={0}
                  ringsData={[]}
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
                  {mappableEvents.map((event) => (
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
              <span>Lat {selectedEvent ? formatCoordinate(selectedEvent.lat) : "N/A"}</span>
              <span>Lon {selectedEvent ? formatCoordinate(selectedEvent.lng) : "N/A"}</span>
            </div>
            <div className="map-meta map-meta-top-right">
              <span>Zoom 1.00</span>
              <span>View Global</span>
            </div>
            <div className="map-meta map-meta-bottom-left">
              <span>Layers: News Impact</span>
            </div>
            <div className="map-meta map-meta-bottom-right">
              <span>{selectedEvent ? (hasCoordinates(selectedEvent) ? selectedEvent.country : "No mapped location") : "No event selected"}</span>
            </div>
            <div className="map-stack map-stack-left">
              <div className="stack-card">
                <span>Focus Region</span>
                <strong>{selectedEvent?.region ?? "Global"}</strong>
              </div>
              <div className="stack-card">
                <span>Mapped Events</span>
                <strong>{mappableEvents.length}</strong>
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
                  <p className="detail-label">Linked Symbols & Price Context</p>
                  <div className="tag-row">
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => void runAnalysis()}
                      disabled={analysisRunning || !selectedEvent?.dbId}
                    >
                      {analysisRunning ? "Running Analysis..." : "Run Analysis"}
                    </button>
                  </div>
                  {analysisError ? (
                    <div className="stock-impact-empty">
                      <strong>Analysis unavailable.</strong>
                      <span>{analysisError}</span>
                    </div>
                  ) : null}
                  {linkedSymbolsLoading ? (
                    <div className="stock-impact-empty">
                      <strong>Loading linked symbol prices...</strong>
                    </div>
                  ) : null}
                  {linkedSymbolsError ? (
                    <div className="stock-impact-empty">
                      <strong>Linked symbol prices unavailable.</strong>
                      <span>{linkedSymbolsError}</span>
                    </div>
                  ) : null}
                  {!linkedSymbolsLoading && !linkedSymbolsError && linkedSymbols.length === 0 ? (
                    <div className="stock-impact-empty">
                      <strong>No linked symbols persisted for this event yet.</strong>
                      <span>Run the event-symbol linker first, then reload this event.</span>
                    </div>
                  ) : null}
                  {!linkedSymbolsLoading && !linkedSymbolsError && linkedSymbols.length > 0 ? (
                    <div className="stock-impact-list">
                      {linkedSymbols.map((symbol) => (
                        <article key={`${symbol.ticker}-${symbol.exchange}`} className="stock-impact-card">
                          <div className="stock-impact-head">
                            <strong>{symbol.ticker}</strong>
                            <span className="tag-pill">{symbol.market}</span>
                          </div>
                          <div className="stock-impact-grid">
                            <div className="stock-impact-stat">
                              <span>Exchange</span>
                              <strong>{symbol.exchange}</strong>
                            </div>
                            <div className="stock-impact-stat">
                              <span>Signal</span>
                              <strong>{symbol.direction ?? "Not analyzed"}</strong>
                            </div>
                            <div className="stock-impact-stat">
                              <span>Last Close</span>
                              <strong>
                                {symbol.last_close !== null
                                  ? `${symbol.currency ?? ""} ${symbol.last_close.toFixed(2)}`.trim()
                                  : "Unavailable"}
                              </strong>
                            </div>
                            <div className="stock-impact-stat">
                              <span>Change</span>
                              <strong>
                                {symbol.change_percent !== null ? `${symbol.change_percent.toFixed(2)}%` : "Unavailable"}
                              </strong>
                            </div>
                          </div>
                          <div className="tag-row">
                            <span className="tag-pill">{symbol.provider_symbol}</span>
                            <span className={`tag-pill${symbol.status === "ok" ? "" : " tag-pill-warning"}`}>
                              {symbol.status}
                            </span>
                            {symbol.sentiment ? <span className="tag-pill">{symbol.sentiment}</span> : null}
                            {symbol.magnitude ? <span className="tag-pill">{symbol.magnitude}</span> : null}
                            {symbol.time_horizon ? <span className="tag-pill">{symbol.time_horizon}</span> : null}
                          </div>
                          {symbol.rationale ? <span className="event-meta">{symbol.rationale}</span> : null}
                          {symbol.error ? <span className="event-meta event-meta-warning">{symbol.error}</span> : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
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
