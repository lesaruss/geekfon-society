import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAIL = "contact@lesaruss.com";

// Same placeholder commission rate already defined in app/api/invite/route.ts
// and app/dashboard/context.tsx - not re-invented here. Adjust in one place
// (all three) if Sean sets a real rate later.
const PRO_COMMISSION_RATE = 0.25;

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

// Accept: grants full catalog access (is_pro) + creates the affiliate
// referral row (tier "pro", 25% commission, 1yr window) on the applicant's
// EXISTING account - app/pro/page.tsx already requires them to be a signed-in
// Passport member before they can apply, so there is always an account to
// upgrade here, unlike app/api/invite/route.ts which can invite a brand new
// email. Reject: just marks the application so it drops off the pending list.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { id } = await params;

  const { action } = await req.json();
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action must be accept or reject" }, { status: 400 });
  }

  const { data: application } = await admin
    .from("gfs_plus_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (action === "reject") {
    await admin.from("gfs_plus_applications").update({ status: "rejected" }).eq("id", id);
    return NextResponse.json({ success: true });
  }

  // action === "accept"
  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const matchedUser = userList?.users?.find(
    (u) => u.email?.toLowerCase() === application.email.toLowerCase()
  );

  if (!matchedUser) {
    return NextResponse.json(
      { error: "No account found for this applicant's email - they may have applied under a different address" },
      { status: 404 }
    );
  }

  const userId = matchedUser.id;

  await admin
    .from("gfs_members")
    .update({ tier: "pro", is_pro: true, tier_source: "admin_pro_accept" })
    .eq("user_id", userId);

  const refCode = Math.random().toString(36).slice(2, 10).toUpperCase();
  const windowExpires = new Date();
  windowExpires.setFullYear(windowExpires.getFullYear() + 1);

  await admin.from("referrals").upsert(
    {
      referrer_id: userId,
      ref_code: refCode,
      commission_rate: PRO_COMMISSION_RATE,
      window_expires_at: windowExpires.toISOString(),
      total_earned_cents: 0,
      pending_earned_cents: 0,
    },
    { onConflict: "referrer_id" }
  );

  await admin.from("gfs_plus_applications").update({ status: "accepted" }).eq("id", id);

  return NextResponse.json({ success: true, user_id: userId, ref_code: refCode });
}
