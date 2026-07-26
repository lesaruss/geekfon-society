import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

// 2026-07-26 per Sean: Artist Rankings should show admin (and only admin) who's
// liking what, as small initials-circle avatars. This is real per-member data
// (gfs_artist_votes.user_id) that RLS already restricts to "your own rows
// only" for everyone else - this route is the one deliberate, audited admin
// exception, same pattern as /api/admin/members and /api/admin/members/[id].
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

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: votes }, { data: members }] = await Promise.all([
    admin.from("gfs_artist_votes").select("artist_slug,user_id,voted_at").order("voted_at", { ascending: false }),
    admin.from("gfs_members").select("user_id,name"),
  ]);

  const nameMap: Record<string, string | null> = {};
  (members || []).forEach((m: { user_id: string; name: string | null }) => { nameMap[m.user_id] = m.name; });

  // Dedupe to one entry per distinct member per artist, keeping the
  // most-recent vote first (votes are already ordered newest-first above).
  // Capped at 30 distinct likers per artist as a payload safety valve - the
  // rankings UI itself only ever renders the first handful anyway.
  const likers: Record<string, { user_id: string; name: string | null }[]> = {};
  const seenPerArtist: Record<string, Set<string>> = {};

  (votes || []).forEach((v: { artist_slug: string; user_id: string; voted_at: string }) => {
    if (!likers[v.artist_slug]) { likers[v.artist_slug] = []; seenPerArtist[v.artist_slug] = new Set(); }
    const seen = seenPerArtist[v.artist_slug];
    if (seen.has(v.user_id) || likers[v.artist_slug].length >= 30) return;
    seen.add(v.user_id);
    likers[v.artist_slug].push({ user_id: v.user_id, name: nameMap[v.user_id] ?? null });
  });

  return NextResponse.json({ likers });
}
