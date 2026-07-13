import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const ADMIN_EMAIL = "contact@lesaruss.com";

const TIER_RATE: Record<string, number> = { promoter: 0.10, pro: 0.25 };

export async function POST(req: NextRequest) {
  const admin = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Auth check - only admin can invite. Fixed 2026-07-13: this used to only check
  // the token WHEN an Authorization header was present, which meant a request sent
  // with no header at all skipped the check entirely (fail-open) - the dashboard
  // client never actually sent this header, so in practice ANYONE could invite an
  // email and seed an arbitrary Points balance. Now fails closed: no header/invalid
  // token/wrong email all get rejected before any write happens.
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await admin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, initial_lesars = 0, tier = "passport" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Send invite via Supabase Auth admin
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://geekfon.ai/dashboard",
  });
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  const userId = inviteData.user.id;

  // Upsert gfs_members row
  await admin.from("gfs_members").upsert({
    user_id: userId,
    tier,
    name: null,
    passport_artists: [],
  }, { onConflict: "user_id" });

  // Seed Points if provided
  if (initial_lesars > 0) {
    await admin.from("member_points").upsert({
      user_id: userId,
      available_points: initial_lesars,
      total_points: initial_lesars,
      spent_points: 0,
    }, { onConflict: "user_id" });
  }

  // Create referral row for promoter / pro
  if (TIER_RATE[tier]) {
    const refCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const windowExpires = new Date();
    windowExpires.setFullYear(windowExpires.getFullYear() + 1);

    await admin.from("referrals").upsert({
      referrer_id: userId,
      ref_code: refCode,
      commission_rate: TIER_RATE[tier],
      window_expires_at: windowExpires.toISOString(),
      total_earned_cents: 0,
      pending_earned_cents: 0,
    }, { onConflict: "referrer_id" });
  }

  return NextResponse.json({ success: true, user_id: userId });
}
