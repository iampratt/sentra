import { NextResponse } from "next/server";

import { checkDatabaseConnection } from "@/lib/db";

export async function GET() {
  const result = await checkDatabaseConnection();

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
