// GET /api/radio/rotation
//
// The synced-clock radio's rotation and overrides, built from the depot (see
// lib/server/radio.ts). Replaces the browser reading radio_tracks directly
// with the anon key. Every track's `path` is a full playable URL.

import { NextResponse } from "next/server";
import { buildRadioSchedule } from "@/lib/server/radio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { rotation, overrides } = await buildRadioSchedule("urls");
  return NextResponse.json(
    { rotation, overrides },
    // Signed links last 24h; a 5-minute CDN cache keeps admin schedule edits
    // close to live while sparing the database a query per listener.
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } }
  );
}
