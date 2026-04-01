import { NextResponse } from "next/server";

export async function POST() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_BASE_URL for embedding operator proxy." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${apiBaseUrl}/vectors/embed/recent?limit=5`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content_type: "summary",
        event_ids: [],
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: payload?.detail ?? payload?.error ?? "Failed to embed recent events." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to embed recent events.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
