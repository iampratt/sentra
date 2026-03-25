import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

import { db } from "@/lib/db-core";

async function main() {
  const result = await db.query<{
    title: string;
    source_name: string;
    country: string | null;
    published_at: string;
  }>(
    `
      select
        e.title,
        coalesce(s.name, 'Unknown') as source_name,
        e.country,
        e.published_at::text as published_at
      from news_events e
      left join news_sources s on s.id = e.source_id
      order by e.published_at desc
    `,
  );

  console.log(JSON.stringify(result.rows, null, 2));
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Check failed: ${message}`);
  process.exit(1);
});
