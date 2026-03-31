export type SymbolLinkRule = {
  companySlug: string;
  keywords: string[];
};

export const symbolLinkRules: SymbolLinkRule[] = [
  { companySlug: "nvidia", keywords: ["nvidia", "nvda", "gpu", "chip", "chips", "ai chip", "semiconductor", "semiconductors"] },
  { companySlug: "asml", keywords: ["asml", "lithography", "chip equipment", "semiconductor equipment", "fab equipment"] },
  { companySlug: "samsung-electronics", keywords: ["samsung", "memory chip", "memory", "electronics", "consumer electronics", "smartphone"] },
  { companySlug: "shell", keywords: ["shell", "lng", "oil", "gas", "energy major", "tankers", "crude shipments", "petroleum"] },
  { companySlug: "rwe", keywords: ["rwe", "utility", "utilities", "power grid", "electric utility", "electricity", "power prices"] },
  { companySlug: "freeport-mcmoran", keywords: ["freeport", "fcx", "copper", "mine", "mining", "copper supply", "ore"] },
  { companySlug: "antofagasta", keywords: ["antofagasta", "anto", "copper", "chile mine", "andean copper"] },
  { companySlug: "maersk", keywords: ["maersk", "shipping", "freight", "container", "port disruption", "cargo lane", "red sea", "strait", "shipping route"] },
  { companySlug: "exxon-mobil", keywords: ["exxon", "xom", "crude", "oil", "refining", "gas shipments", "energy exports"] },
  { companySlug: "bhp", keywords: ["bhp", "iron ore", "metals", "diversified mining", "miner", "commodities producer"] },
];
