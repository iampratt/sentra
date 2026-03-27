import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("@/lib/db-core");

  const result = await db.query<{
    company: string;
    company_country: string | null;
    ticker: string;
    exchange: string;
    market: string;
    currency: string | null;
  }>(
    `
      select
        c.name as company,
        c.country as company_country,
        s.ticker,
        s.exchange,
        s.market,
        s.currency
      from symbols s
      inner join companies c on c.id = s.company_id
      order by c.name asc, s.exchange asc
    `,
  );

  console.log(JSON.stringify(result.rows, null, 2));
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Symbol universe check failed: ${message}`);
  process.exit(1);
});
