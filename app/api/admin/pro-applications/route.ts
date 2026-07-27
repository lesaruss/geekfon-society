import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAIL = "contact@lesaruss.com";

// Added 2026-07-27: gfs_plus_applications (fed by app/api/pro-apply/route.ts,
// formerly plus-apply) had no admin review surface anywhere in the app - the
// only way to act on an application was directly in Supabase Studio, and
// nothing connected an application to actually granting tier/catalog access
// or creating a referral code. See [id]/route.ts for the accept/reject
// action that closes that gap.
async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>): Promise<NextResponse | null> {
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
  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const denied = await requireAdmin(req, admin);
  if (denied) return denied;

  const { data, error } = await admin
    .from("gfs_plus_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
  return NextResponse.json({ applications: data || [] });
}
