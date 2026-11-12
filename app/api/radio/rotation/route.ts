// GET /api/radio/rotation?station=<slug>
//
// The synced-clock radio's rotation and overrides, built from the depot (see
// lib/server/radio.ts). Without a station (or station=main) this is the main
// GeekFon Radio rotation, controlled from the admin Radio Schedule page. Any
// other slug is a genre station from public.gfs_radio_stations, or an artist
// radio, "artist:<slug>" (Sean, 2026-11-12), which also returns `info`: its
// name ("<Artist> Radio") and the artist's accent color. Every track's `path`
// is a full playable URL.

import { NextRequest, NextResponse } from "next/server";
import { buildStationSchedule, buildArtistSchedule, listStations, MAIN_STATION, ARTIST_STATION_PREFIX } from "@/lib/server/radio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("station") || MAIN_STATION.slug;
  const isArtist = slug.startsWith(ARTIST_STATION_PREFIX);
  const [schedule, stations] = await Promise.all([isArtist ? buildArtistSchedule(slug) : buildStationSchedule(slug), listStations()]);
  if (!schedule) return NextResponse.json({ error: "Unknown station", stations }, { status: 404 });
  return NextResponse.json(
    { station: slug, stations, ...schedule },
    // Signed links last 24h; a 5-minute CDN cache keeps admin schedule edits
    // and newly imported songs close to live while sparing the database a
    // query per listener.
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } }
  );
}
