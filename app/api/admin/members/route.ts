import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// This route lists every member's name, email, tier, points balance, and last login
// using the service-role key - it had NO auth check at all until 2026-07-13. Enforce
// the same account-only gate used by /api/admin/release-schedule so the API can't be
// hit directly by anyone who knows the URL.
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

  const [{ data: members }, { data: pointsRows }, { data: { users } }] =
    await Promise.all([
      admin.from("gfs_members").select("*").order("created_at", { ascending: false }),
      admin.from("member_points").select("user_id,available_points,total_points,spent_points"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const result = (members || []).map((m) => {
    const u = users.find((x) => x.id === m.user_id);
    const pts = (pointsRows || []).find((p) => p.user_id === m.user_id);
    return {
      ...m,
      email: u?.email ?? null,
      last_sign_in: u?.last_sign_in_at ?? null,
      available_points: pts?.available_points ?? 0,
    };
  });

  return NextResponse.json({ members: result });
}
