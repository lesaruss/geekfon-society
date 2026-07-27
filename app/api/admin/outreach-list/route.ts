import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

// 2026-07-26 per Sean: scope for this pass is a segmented, EXPORTABLE member
// list (not a send tool - he already has Resend + Beehiiv for actual sending,
// so this route's job is just to hand back a clean, filterable dataset that
// gets exported/pasted into those, not to email anyone itself).
//
// Hard rule, not a toggle: gfs_members.is_minor rows are excluded from the
// result entirely, always. This isn't a UI filter the admin can turn back on -
// it's a compliance floor. Per the legal discussion with Sean: outreach/
// marketing contact lists built from a minor's behavioral data carry real
// COPPA-adjacent exposure, and GeekFon already has real registered minors
// (is_minor is a live column, not hypothetical). If Sean ever wants a minor
// included in an outreach list, that's a deliberate legal-reviewed exception,
// not something this route should make easy to do by accident.
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

  const [
    { data: members },
    { data: { users } },
    { data: votes },
    { data: unlocks },
  ] = await Promise.all([
    admin.from("gfs_members").select("user_id,name,tier,created_at,is_minor"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("gfs_artist_votes").select("user_id,artist_slug"),
    admin.from("gfs_artist_unlocks").select("user_id,artist_slug"),
  ]);

  const likedMap: Record<string, Set<string>> = {};
  const likeCountMap: Record<string, number> = {};
  (votes || []).forEach((v: { user_id: string; artist_slug: string }) => {
    likedMap[v.user_id] = likedMap[v.user_id] || new Set();
    likedMap[v.user_id].add(v.artist_slug);
    likeCountMap[v.user_id] = (likeCountMap[v.user_id] || 0) + 1;
  });

  const unlockedMap: Record<string, Set<string>> = {};
  (unlocks || []).forEach((u: { user_id: string; artist_slug: string }) => {
    unlockedMap[u.user_id] = unlockedMap[u.user_id] || new Set();
    unlockedMap[u.user_id].add(u.artist_slug);
  });

  const allMembers = members || [];
  const excludedMinors = allMembers.filter((m: { is_minor: boolean }) => m.is_minor).length;

  const rows = allMembers
    .filter((m: { is_minor: boolean }) => !m.is_minor)
    .map((m: { user_id: string; name: string | null; tier: string | null; created_at: string }) => {
      const u = users.find((x) => x.id === m.user_id);
      return {
        user_id: m.user_id,
        name: m.name,
        email: u?.email ?? null,
        tier: m.tier,
        created_at: m.created_at,
        last_sign_in: u?.last_sign_in_at ?? null,
        artists_liked: Array.from(likedMap[m.user_id] || []),
        artists_unlocked: Array.from(unlockedMap[m.user_id] || []),
        total_likes: likeCountMap[m.user_id] || 0,
      };
    });

  return NextResponse.json({ rows, excludedMinors });
}
