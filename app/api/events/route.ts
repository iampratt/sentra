import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query<{
      db_id: string;
      title: string;
      source: string;
      region: string | null;
      country: string | null;
      lat: number | null;
      lng: number | null;
      published_at: string;
      canonical_url: string | null;
      severity: "Low" | "Medium" | "High" | null;
      sentiment: "Bearish" | "Neutral" | "Bullish" | null;
      category: string | null;
      impact_window: string | null;
      summary: string | null;
    }>(
      `
        select
          e.id::text as db_id,
          e.title,
          coalesce(s.name, 'Unknown') as source,
          e.region,
          e.country,
          e.location_lat as lat,
          e.location_lng as lng,
          e.published_at::text as published_at,
          e.canonical_url,
          e.severity,
          e.sentiment,
          e.category,
          e.impact_window,
          e.summary
        from news_events e
        left join news_sources s on s.id = e.source_id
        order by e.published_at desc
      `,
    );

    return NextResponse.json({
      ok: true,
      events: result.rows.map((row) => ({
        id:
          row.canonical_url?.startsWith("mock://")
            ? row.canonical_url.replace("mock://", "")
            : row.db_id,
        title: row.title,
        source: row.source,
        region: row.region ?? "Unknown",
        country: row.country ?? "Unknown",
        lat: row.lat,
        lng: row.lng,
        publishedAt: row.published_at,
        severity: row.severity ?? "Low",
        sentiment: row.sentiment ?? "Neutral",
        category: row.category ?? "General",
        watchlist: [] as string[],
        impactWindow: row.impact_window ?? "N/A",
        summary: row.summary ?? "",
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown events query failure.";

    return NextResponse.json(
      {
        ok: false,
        error: `Failed to load events: ${message}`,
      },
      { status: 500 },
    );
  }
}
