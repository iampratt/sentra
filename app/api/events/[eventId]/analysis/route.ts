import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_BASE_URL for analysis proxy." },
      { status: 500 },
    );
  }

  const { eventId } = await params;

  try {
    const response = await fetch(`${apiBaseUrl}/analysis/events/${eventId}/run`, {
      method: "POST",
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: payload?.detail ?? payload?.error ?? "Failed to run event analysis." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run event analysis.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
