import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

import { mockEvents } from "@/lib/mock-data";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const { db } = await import("@/lib/db-core");

  for (const event of mockEvents) {
    const sourceSlug = slugify(event.source);

    const sourceResult = await db.query<{ id: string }>(
      `
        insert into news_sources (slug, name, source_type, country)
        values ($1, $2, 'mock', $3)
        on conflict (slug) do update
        set name = excluded.name,
            country = excluded.country,
            updated_at = now()
        returning id
      `,
      [sourceSlug, event.source, event.country],
    );

    const sourceId = sourceResult.rows[0]?.id;

    await db.query(
      `
        insert into news_events (
          source_id,
          title,
          summary,
          raw_content,
          canonical_url,
          published_at,
          region,
          country,
          location_lat,
          location_lng,
          severity,
          sentiment,
          category,
          impact_window
        )
        values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14
        )
        on conflict (canonical_url) do update
        set title = excluded.title,
            summary = excluded.summary,
            raw_content = excluded.raw_content,
            published_at = excluded.published_at,
            region = excluded.region,
            country = excluded.country,
            location_lat = excluded.location_lat,
            location_lng = excluded.location_lng,
            severity = excluded.severity,
            sentiment = excluded.sentiment,
            category = excluded.category,
            impact_window = excluded.impact_window,
            updated_at = now()
      `,
      [
        sourceId,
        event.title,
        event.summary,
        event.summary,
        `mock://${event.id}`,
        new Date(event.publishedAt),
        event.region,
        event.country,
        event.lat,
        event.lng,
        event.severity,
        event.sentiment,
        event.category,
        event.impactWindow,
      ],
    );
  }

  const countResult = await db.query<{ count: string }>("select count(*)::text as count from news_events");
  console.log(`Seeded mock events. news_events count: ${countResult.rows[0]?.count ?? "0"}`);
  await db.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
