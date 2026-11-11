// GET /api/home
//
// Everything the character-select homepage and roster need in one call. The
// loading lives in lib/server/homeData.ts, shared with app/page.tsx.

import { NextResponse } from "next/server";
import { loadHomeData } from "@/lib/server/homeData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadHomeData();
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
