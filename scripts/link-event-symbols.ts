import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

import { symbolLinkRules } from "@/lib/symbol-linking";

type EventRow = {
  id: string;
  title: string;
  summary: string | null;
  raw_content: string | null;
  category: string | null;
  country: string | null;
};

type SymbolRow = {
  symbol_id: string;
  company_id: string;
  company_slug: string;
  company_name: string;
  ticker: string;
  sector: string | null;
  industry: string | null;
  company_country: string | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasToken(haystack: string, token: string) {
  if (token.length < 2) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token.toLowerCase())}([^a-z0-9]|$)`);
  return pattern.test(haystack);
}

function matchCompanySlugs(event: EventRow, symbols: SymbolRow[]): Map<string, string[]> {
  const haystack = [
    event.title,
    event.summary ?? "",
    event.raw_content ?? "",
    event.category ?? "",
    event.country ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matches = new Map<string, string[]>();

  for (const rule of symbolLinkRules) {
    const matchedKeywords = rule.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
    if (matchedKeywords.length > 0) {
      matches.set(rule.companySlug, [...(matches.get(rule.companySlug) ?? []), ...matchedKeywords.map((keyword) => `keyword:${keyword}`)]);
    }
  }

  for (const symbol of symbols) {
    const reasons: string[] = [];
    if (hasToken(haystack, symbol.ticker)) {
      reasons.push(`ticker:${symbol.ticker}`);
    }

    if (symbol.company_name && haystack.includes(symbol.company_name.toLowerCase())) {
      reasons.push(`company:${symbol.company_name}`);
    }

    if (symbol.industry && haystack.includes(symbol.industry.toLowerCase())) {
      reasons.push(`industry:${symbol.industry}`);
    }

    if (symbol.company_country && haystack.includes(symbol.company_country.toLowerCase()) && symbol.sector && haystack.includes(symbol.sector.toLowerCase())) {
      reasons.push(`country-sector:${symbol.company_country}/${symbol.sector}`);
    }

    if (reasons.length > 0) {
      matches.set(symbol.company_slug, [...(matches.get(symbol.company_slug) ?? []), ...reasons]);
    }
  }

  return matches;
}

async function main() {
  const { db } = await import("@/lib/db-core");

  const eventsResult = await db.query<EventRow>(
    `
      select
        id::text as id,
        title,
        summary,
        raw_content,
        category,
        country
      from news_events
      order by published_at desc
    `,
  );

  const symbolsResult = await db.query<SymbolRow>(
    `
      select
        s.id::text as symbol_id,
        c.id::text as company_id,
        c.slug as company_slug,
        c.name as company_name,
        s.ticker,
        c.sector,
        c.industry,
        c.country as company_country
      from symbols s
      inner join companies c on c.id = s.company_id
    `,
  );

  const symbolByCompanySlug = new Map<string, SymbolRow[]>();
  for (const row of symbolsResult.rows) {
    const existing = symbolByCompanySlug.get(row.company_slug) ?? [];
    existing.push(row);
    symbolByCompanySlug.set(row.company_slug, existing);
  }

  let linkedEvents = 0;
  let insertedLinks = 0;

  for (const event of eventsResult.rows) {
    const matchReasons = matchCompanySlugs(event, symbolsResult.rows);
    const matchedCompanySlugs = [...matchReasons.keys()];
    if (matchedCompanySlugs.length === 0) {
      continue;
    }

    linkedEvents += 1;

    for (const companySlug of matchedCompanySlugs) {
      const symbols = symbolByCompanySlug.get(companySlug) ?? [];

      for (const symbol of symbols) {
        const result = await db.query<{ inserted: boolean }>(
          `
            insert into event_symbol_impacts (
              event_id,
              symbol_id,
              sentiment,
              direction,
              magnitude,
              confidence,
              time_horizon,
              rationale
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            on conflict (event_id, symbol_id) do nothing
            returning true as inserted
          `,
          [
            event.id,
            symbol.symbol_id,
            null,
            null,
            null,
            0.45,
            "1-3d",
            `Deterministic match from event content: ${(matchReasons.get(companySlug) ?? []).join(", ")}`,
          ],
        );

        if (result.rows[0]?.inserted) {
          insertedLinks += 1;
        }
      }
    }
  }

  console.log(`Linked tracked symbols. events_with_matches=${linkedEvents} inserted_links=${insertedLinks}`);
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Event-symbol linking failed: ${message}`);
  process.exit(1);
});
