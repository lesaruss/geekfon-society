import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
// Service key from the Vercel env, never in the repo (this repo is public; the literal that used to sit here was exposed and is being rotated, 2026-10-05).
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// song_release_briefs holds real business-sensitive data (songwriter legal name,
// distribution status) so it's read only through this authenticated route with the
// service-role key - RLS on the table itself is enabled with zero policies (no anon/
// authenticated client read), matching the 2026-07-04 RLS-hardening posture. Mirrors
// the requireAdmin pattern in app/api/admin/release-schedule/route.ts.
const ADMIN_EMAIL = "contact@lesaruss.com";

async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await admin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const artistSlug = searchParams.get("artist");
  if (!artistSlug) {
    return NextResponse.json({ error: "Missing artist" }, { status: 400 });
  }

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("song_release_briefs")
    .select(
      "id, track_name, album_title, track_number, season, producer, " +
      "label_name, copyright_line, songwriter_name, songwriter_pro, songwriter_ipi, " +
      "ai_vocals, ai_lyrics, ai_production, ai_tool_used, ai_rights_confirmed, ai_disclosure_notes, " +
      "cover_art_status, music_video_status, promo_video_status, master_audio_status, " +
      "distrokid_status, distrokid_release_id, brief_status, updated_at"
    )
    .eq("artist_slug", artistSlug)
    .order("album_title")
    .order("track_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ briefs: data || [] });
}
