import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Added 2026-07-27 alongside app/join/page.tsx and the referred_by_ref_code
// column on gfs_members. Claims a referral code onto the SIGNED-IN caller's
// own member row - first-touch, one-time, server-verified. This is the
// missing link between "someone clicked a Pro/Promoter's referral link" and
// "that member's purchases actually credit the referrer" - see the
// commission-crediting block in app/api/webhooks/stripe/route.ts.
//
// Always returns 200 with {ok:true} on any no-op (bad code, expired window,
// self-referral, already claimed) rather than leaking which case it was -
// this is called silently from the client on first dashboard load.
export async function POST(req: NextRequest) {
  try {
    const { ref_code } = await req.json();
    if (!ref_code || typeof ref_code !== "string") {
      return NextResponse.json({ ok: true });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(SUPA_URL, SUPA_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const code = ref_code.trim().toUpperCase();

    const { data: member } = await admin
      .from("gfs_members")
      .select("user_id, referred_by_ref_code")
      .eq("user_id", user.id)
      .maybeSingle();

    // Already attributed (first-touch wins) or no member row yet - no-op.
    if (!member || member.referred_by_ref_code) {
      return NextResponse.json({ ok: true });
    }

    const { data: referral } = await admin
      .from("referrals")
      .select("referrer_id, ref_code, window_expires_at")
      .eq("ref_code", code)
      .maybeSingle();

    if (!referral) return NextResponse.json({ ok: true });

    // No self-referral, and the referrer's commission window must still be open.
    if (referral.referrer_id === user.id) return NextResponse.json({ ok: true });
    if (referral.window_expires_at && new Date(referral.window_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: true });
    }

    await admin
      .from("gfs_members")
      .update({ referred_by_ref_code: code })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[referral/claim]", err);
    return NextResponse.json({ ok: true });
  }
}
