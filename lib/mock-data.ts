export type MockEvent = {
  id: string;
  title: string;
  source: string;
  region: string;
  country: string;
  lat: number | null;
  lng: number | null;
  publishedAt: string;
  severity: "Low" | "Medium" | "High";
  sentiment: "Bearish" | "Neutral" | "Bullish";
  category: string;
  watchlist: string[];
  impactWindow: string;
  summary: string;
};

export type MockStockImpact = {
  symbol: string;
  market: string;
  sentiment: "Bearish" | "Neutral" | "Bullish";
  direction: "Down" | "Mixed" | "Up";
  magnitude: "Low" | "Medium" | "High";
};

export const mockEvents: MockEvent[] = [
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
    sentiment: "Bearish",
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
    sentiment: "Neutral",
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
    sentiment: "Bullish",
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
    sentiment: "Bullish",
    category: "Metals",
    watchlist: ["Copper", "Miners", "Manufacturers"],
    impactWindow: "3-7d",
    summary:
      "Labor talks at a major copper operation have stalled, raising the probability of supply disruption and putting metals, miners, and industrial buyers on alert.",
  },
];

export const mockStockImpacts: Record<string, MockStockImpact[]> = {
  "mena-shipping-001": [
    { symbol: "MAERSK-B.CO", market: "Copenhagen", sentiment: "Bearish", direction: "Down", magnitude: "Medium" },
    { symbol: "XOM", market: "NYSE", sentiment: "Bullish", direction: "Up", magnitude: "Low" },
    { symbol: "AAL", market: "NASDAQ", sentiment: "Bearish", direction: "Down", magnitude: "Low" },
  ],
  "asia-chip-002": [
    { symbol: "005930.KS", market: "Korea", sentiment: "Neutral", direction: "Mixed", magnitude: "Medium" },
    { symbol: "ASML", market: "NASDAQ", sentiment: "Bearish", direction: "Down", magnitude: "Medium" },
    { symbol: "NVDA", market: "NASDAQ", sentiment: "Neutral", direction: "Mixed", magnitude: "Low" },
  ],
  "europe-energy-003": [
    { symbol: "RWE.DE", market: "Xetra", sentiment: "Bullish", direction: "Up", magnitude: "Medium" },
    { symbol: "BAS.DE", market: "Xetra", sentiment: "Bearish", direction: "Down", magnitude: "Low" },
    { symbol: "SHEL", market: "LSE", sentiment: "Bullish", direction: "Up", magnitude: "Low" },
  ],
  "latam-mining-004": [
    { symbol: "FCX", market: "NYSE", sentiment: "Bullish", direction: "Up", magnitude: "Medium" },
    { symbol: "ANTO.L", market: "LSE", sentiment: "Bullish", direction: "Up", magnitude: "High" },
    { symbol: "CAT", market: "NYSE", sentiment: "Bearish", direction: "Down", magnitude: "Low" },
  ],
};
