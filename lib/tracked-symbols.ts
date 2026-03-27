export type TrackedCompany = {
  name: string;
  slug: string;
  country: string;
  sector: string;
  industry: string;
};

export type TrackedSymbol = {
  companySlug: string;
  ticker: string;
  exchange: string;
  market: string;
  currency: string;
};

export const trackedCompanies: TrackedCompany[] = [
  { name: "NVIDIA Corporation", slug: "nvidia", country: "United States", sector: "Technology", industry: "Semiconductors" },
  { name: "ASML Holding N.V.", slug: "asml", country: "Netherlands", sector: "Technology", industry: "Semiconductor Equipment" },
  { name: "Samsung Electronics Co., Ltd.", slug: "samsung-electronics", country: "South Korea", sector: "Technology", industry: "Consumer Electronics" },
  { name: "Shell plc", slug: "shell", country: "United Kingdom", sector: "Energy", industry: "Integrated Oil & Gas" },
  { name: "RWE AG", slug: "rwe", country: "Germany", sector: "Utilities", industry: "Electric Utilities" },
  { name: "Freeport-McMoRan Inc.", slug: "freeport-mcmoran", country: "United States", sector: "Materials", industry: "Copper" },
  { name: "Antofagasta plc", slug: "antofagasta", country: "Chile", sector: "Materials", industry: "Copper" },
  { name: "A.P. Moller - Maersk A/S", slug: "maersk", country: "Denmark", sector: "Industrials", industry: "Marine Shipping" },
  { name: "Exxon Mobil Corporation", slug: "exxon-mobil", country: "United States", sector: "Energy", industry: "Integrated Oil & Gas" },
  { name: "BHP Group Limited", slug: "bhp", country: "Australia", sector: "Materials", industry: "Diversified Mining" },
];

export const trackedSymbols: TrackedSymbol[] = [
  { companySlug: "nvidia", ticker: "NVDA", exchange: "NASDAQ", market: "United States", currency: "USD" },
  { companySlug: "asml", ticker: "ASML", exchange: "NASDAQ", market: "United States", currency: "USD" },
  { companySlug: "samsung-electronics", ticker: "005930", exchange: "KRX", market: "South Korea", currency: "KRW" },
  { companySlug: "shell", ticker: "SHEL", exchange: "LSE", market: "United Kingdom", currency: "GBP" },
  { companySlug: "rwe", ticker: "RWE", exchange: "XETRA", market: "Germany", currency: "EUR" },
  { companySlug: "freeport-mcmoran", ticker: "FCX", exchange: "NYSE", market: "United States", currency: "USD" },
  { companySlug: "antofagasta", ticker: "ANTO", exchange: "LSE", market: "United Kingdom", currency: "GBP" },
  { companySlug: "maersk", ticker: "MAERSK-B", exchange: "OMXC", market: "Denmark", currency: "DKK" },
  { companySlug: "exxon-mobil", ticker: "XOM", exchange: "NYSE", market: "United States", currency: "USD" },
  { companySlug: "bhp", ticker: "BHP", exchange: "ASX", market: "Australia", currency: "AUD" },
];
