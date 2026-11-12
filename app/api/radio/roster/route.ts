// GET /api/radio/roster
// Every artist for the Seat 2 Artists page (/roster): picture, genre, city,
// accent, the genre stations they are on and their song count. Public.
import { NextResponse } from "next/server";
import { loadRoster } from "@/lib/server/artistPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadRoster();
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
}
