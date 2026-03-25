import { Pool } from "pg";

import { getServerConfig } from "@/lib/server-config";

declare global {
  var __newsDashboardPool: Pool | undefined;
}

function createPool() {
  const { databaseUrl } = getServerConfig();

  return new Pool({
    connectionString: databaseUrl,
    max: 5,
  });
}

export const db = globalThis.__newsDashboardPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__newsDashboardPool = db;
}

export async function checkDatabaseConnection() {
  try {
    const result = await db.query<{
      current_database: string;
      current_schema: string;
      now: string;
    }>(
      "select current_database() as current_database, current_schema() as current_schema, now()::text as now",
    );

    return {
      ok: true as const,
      database: result.rows[0]?.current_database ?? "unknown",
      schema: result.rows[0]?.current_schema ?? "unknown",
      checkedAt: result.rows[0]?.now ?? "unknown",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database connectivity failure.";

    return {
      ok: false as const,
      error: `Database connection failed: ${message}`,
    };
  }
}
