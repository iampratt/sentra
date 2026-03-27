import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

import { trackedCompanies, trackedSymbols } from "@/lib/tracked-symbols";

async function main() {
  const { db } = await import("@/lib/db-core");

  for (const company of trackedCompanies) {
    await db.query(
      `
        insert into companies (name, slug, country, sector, industry)
        values ($1, $2, $3, $4, $5)
        on conflict (slug) do update
        set name = excluded.name,
            country = excluded.country,
            sector = excluded.sector,
            industry = excluded.industry,
            updated_at = now()
      `,
      [company.name, company.slug, company.country, company.sector, company.industry],
    );
  }

  for (const symbol of trackedSymbols) {
    const companyResult = await db.query<{ id: string }>(
      `select id::text as id from companies where slug = $1 limit 1`,
      [symbol.companySlug],
    );

    const companyId = companyResult.rows[0]?.id;
    if (!companyId) {
      throw new Error(`Missing company for symbol seed: ${symbol.companySlug}`);
    }

    await db.query(
      `
        insert into symbols (company_id, ticker, exchange, market, currency)
        values ($1, $2, $3, $4, $5)
        on conflict (ticker, exchange) do update
        set company_id = excluded.company_id,
            market = excluded.market,
            currency = excluded.currency,
            updated_at = now()
      `,
      [companyId, symbol.ticker, symbol.exchange, symbol.market, symbol.currency],
    );
  }

  const companiesCount = await db.query<{ count: string }>("select count(*)::text as count from companies");
  const symbolsCount = await db.query<{ count: string }>("select count(*)::text as count from symbols");

  console.log(
    `Seeded tracked symbol universe. companies=${companiesCount.rows[0]?.count ?? "0"} symbols=${symbolsCount.rows[0]?.count ?? "0"}`,
  );
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Symbol universe seed failed: ${message}`);
  process.exit(1);
});
