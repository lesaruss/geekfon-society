// GET /api/admin/song-audio   (staff only)
// Every depot song with its current audio, flagged instrumentals first.
import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest, isStaff } from "@/lib/server/entitlements";
import { FLAGGED_INSTRUMENTALS } from "@/lib/server/songAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isStaff(viewer))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  const [{ data: songs, error }, { data: artists }] = await Promise.all([
    sb.from("pulse_songs")
      .select("id, slug, title, primary_artist_slug, src_path, master_path, duration_seconds, uploaded_at, master_uploaded_at, is_remix")
      .is("retired_at", null)
      .order("primary_artist_slug").order("title"),
    sb.from("gfs_artists").select("slug, name"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const names = new Map(((artists ?? []) as { slug: string; name: string | null }[]).map(a => [a.slug, a.name || a.slug]));
  return NextResponse.json(
    {
      songs: (songs ?? []).map(s => ({ ...s, artist_name: names.get(s.primary_artist_slug) || s.primary_artist_slug, flagged: FLAGGED_INSTRUMENTALS[s.id] ? true : false })),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
