import { NextResponse } from "next/server";

export async function POST() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_BASE_URL for GDELT operator proxy." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${apiBaseUrl}/news/ingest/gdelt`, {
      method: "POST",
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: payload?.detail ?? payload?.error ?? "Failed to trigger GDELT ingest." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to trigger GDELT ingest.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
