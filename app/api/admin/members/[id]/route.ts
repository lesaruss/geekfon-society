import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

// 2026-07-26 per Sean: admin wants to see a single member's full engagement
// picture (purchase history, like history, listens) to decide how to reach out
// to them. This mirrors the exact requireAdmin pattern already used by
// /api/admin/members - real bearer-token check against ADMIN_EMAIL, never a
// client-side-only gate. RLS on every table below already restricts a normal
// member to `auth.uid() = user_id` (their own rows only), so this route is the
// only legitimate way to see another member's data at all - the service-role
// key here is deliberately punching a single, audited hole in that for one
// admin account, not removing the underlying protection.
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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [
    { data: memberRow },
    { data: userData },
    { data: unlocks },
    { data: votes },
    { data: purchases },
    { data: plays },
  ] = await Promise.all([
    admin.from("gfs_members").select("*").eq("user_id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from("gfs_artist_unlocks").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    admin.from("gfs_artist_votes").select("*").eq("user_id", id).order("voted_at", { ascending: false }),
    admin.from("gfs_track_purchases").select("*").eq("user_id", id).order("purchased_at", { ascending: false }),
    admin.from("gfs_track_plays").select("*").eq("user_id", id).order("played_at", { ascending: false }).limit(100),
  ]);

  if (!memberRow) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({
    member: {
      ...memberRow,
      email: userData?.user?.email ?? null,
      last_sign_in: userData?.user?.last_sign_in_at ?? null,
    },
    unlocks: unlocks || [],
    votes: votes || [],
    purchases: purchases || [],
    plays: plays || [],
  });
}
