export type SymbolLinkRule = {
  companySlug: string;
  keywords: string[];
};

export const symbolLinkRules: SymbolLinkRule[] = [
  { companySlug: "nvidia", keywords: ["nvidia", "nvda", "gpu", "chip", "ai chip", "semiconductor"] },
  { companySlug: "asml", keywords: ["asml", "lithography", "chip equipment", "semiconductor equipment"] },
  { companySlug: "samsung-electronics", keywords: ["samsung", "memory chip", "electronics", "consumer electronics"] },
  { companySlug: "shell", keywords: ["shell", "lng", "oil", "gas", "energy major"] },
  { companySlug: "rwe", keywords: ["rwe", "utility", "power grid", "electric utility"] },
  { companySlug: "freeport-mcmoran", keywords: ["freeport", "fcx", "copper", "mine", "mining"] },
  { companySlug: "antofagasta", keywords: ["antofagasta", "anto", "copper", "chile mine"] },
  { companySlug: "maersk", keywords: ["maersk", "shipping", "freight", "container", "port disruption"] },
  { companySlug: "exxon-mobil", keywords: ["exxon", "xom", "crude", "oil", "refining"] },
  { companySlug: "bhp", keywords: ["bhp", "iron ore", "metals", "diversified mining"] },
];
