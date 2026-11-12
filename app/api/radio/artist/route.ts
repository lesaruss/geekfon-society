// GET /api/radio/artist?slug=<artist slug>
//
// The artist card for GeekFon Radio's "What is this?" panel: name, tagline,
// genre, home city, pictures and the stations they are on. Public, like the
// artist page itself.
//
// Slugs: the radio's tracks carry the depot slug (pulse_songs, the same as
// gfs_artists and the artist page, e.g. "riku"). Older tables say
// "riku-hayasaka"; depotSlug folds that in, and `slug` in the answer is always
// the real page slug, so the client links to /<slug>.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { depotSlug } from "@/lib/server/depot";
import { stationsFeaturing } from "@/lib/server/radio";

export const runtime = "nodejs";

type Profile = { tagline?: string; genre?: string; location?: string; chatAvatar?: string; profileUrl?: string; name?: string };

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("slug") || "").toLowerCase();
  if (!/^[a-z0-9-]{1,64}$/.test(raw)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slug = depotSlug(raw);
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const [{ data, error }, stations] = await Promise.all([
    sb.from("gfs_artists").select("slug, name, profile").eq("slug", slug).maybeSingle(),
    stationsFeaturing(slug),
  ]);
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = data as { slug: string; name: string | null; profile: Profile | null };
  const p = row.profile ?? {};
  // Stored taglines use " - " as a break; plain copy reads it as a comma.
  const tagline = p.tagline ? p.tagline.replace(/\s+[-–—]\s+/g, ", ") : null;

  return NextResponse.json(
    {
      slug: row.slug,
      name: row.name || p.name || row.slug,
      tagline,
      genre: p.genre || null,
      location: p.location || null,
      avatar: p.chatAvatar || p.profileUrl || null,
      portrait: p.profileUrl || null,
      stations: stations.map(s => ({ slug: s.slug, name: s.name, color: s.color ?? null, ink: s.ink ?? null })),
    },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
  );
}
