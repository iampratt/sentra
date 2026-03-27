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
};

function matchCompanySlugs(event: EventRow): string[] {
  const haystack = [
    event.title,
    event.summary ?? "",
    event.raw_content ?? "",
    event.category ?? "",
    event.country ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return symbolLinkRules
    .filter((rule) => rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
    .map((rule) => rule.companySlug);
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
        c.slug as company_slug
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
    const matchedCompanySlugs = [...new Set(matchCompanySlugs(event))];
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
            0.35,
            "1-3d",
            "Deterministic keyword/company match from event content.",
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
