// GET /api/radio/artist-page?slug=<artist>
// The free view of an artist page (lib/server/artistPage.ts): profile, songs
// (preview only, no vault paths), stations, press and the public gallery.
// Supporter content still comes only from /api/roster/<artist>/access.
import { NextRequest, NextResponse } from "next/server";
import { loadArtistPage } from "@/lib/server/artistPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").toLowerCase();
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await loadArtistPage(slug);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
}
