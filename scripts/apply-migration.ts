import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { db } from "@/lib/db-core";

async function main() {
  const migrationPath = process.argv[2];

  if (!migrationPath) {
    throw new Error("Usage: pnpm exec tsx scripts/apply-migration.ts <migration-path>");
  }

  const absolutePath = resolve(process.cwd(), migrationPath);
  const sql = await readFile(absolutePath, "utf8");

  await db.query(sql);

  console.log(`Applied migration: ${migrationPath}`);
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration failed: ${message}`);
  process.exit(1);
});
