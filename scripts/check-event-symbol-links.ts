import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("@/lib/db-core");

  const result = await db.query<{
    event_id: string;
    event_title: string;
    ticker: string;
    exchange: string;
    company_name: string;
    rationale: string | null;
  }>(
    `
      select
        e.id::text as event_id,
        e.title as event_title,
        s.ticker,
        s.exchange,
        c.name as company_name,
        esi.rationale
      from event_symbol_impacts esi
      inner join news_events e on e.id = esi.event_id
      inner join symbols s on s.id = esi.symbol_id
      inner join companies c on c.id = s.company_id
      order by e.published_at desc, c.name asc
    `,
  );

  console.log(JSON.stringify(result.rows, null, 2));
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Event-symbol link check failed: ${message}`);
  process.exit(1);
});
