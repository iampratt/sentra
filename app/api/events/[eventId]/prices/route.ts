import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_BASE_URL for price proxy." },
      { status: 500 },
    );
  }

  const { eventId } = await params;

  try {
    const response = await fetch(`${apiBaseUrl}/stocks/events/${eventId}/prices`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: payload?.detail ?? "Failed to load linked symbol prices." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load linked symbol prices.";

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
