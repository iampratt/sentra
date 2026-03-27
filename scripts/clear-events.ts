import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("@/lib/db-core");

  await db.query("delete from event_symbol_impacts");
  await db.query("delete from news_events");
  await db.query("delete from ingestion_runs");

  console.log("Cleared event_symbol_impacts, news_events, and ingestion_runs.");
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Clear failed: ${message}`);
  process.exit(1);
});
