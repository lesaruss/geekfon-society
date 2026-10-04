// POST /api/shell/sso { lrsso } -> { token_hash }
//
// DESTINATION side of cross-brand sign-in on geekfon.ai. Another brand's bar
// sends the member to /auth/sso?lrsso=<handoff>; that page posts the token
// here. This verifies it (signature, kind, expiry), spends it (single-use,
// atomically, in sso_handoffs), and mints a one-time magic-link hash for the
// member's email with no email sent. The page then calls
// supabase.auth.verifyOtp in the browser, because geekfon.ai keeps its session
// in the browser client rather than in cookies. The member must already have
// an account in the shared auth pool; otherwise this refuses and the page
// sends them to sign in.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { verifyHandoff } from "@/lib/server/shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let body: { lrsso?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const claims = await verifyHandoff(body.lrsso);
  if (!claims || !claims.email) return NextResponse.json({ error: "invalid" }, { status: 401 });

  const { data: spent, error: spendErr } = await sb
    .from("sso_handoffs")
    .update({ consumed_at: new Date().toISOString() })
    .eq("jti", claims.jti)
    .is("consumed_at", null)
    .select("jti")
    .maybeSingle();
  if (spendErr || !spent) return NextResponse.json({ error: "used" }, { status: 401 });

  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email: claims.email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) return NextResponse.json({ error: "no_account" }, { status: 404 });

  return NextResponse.json({ token_hash: tokenHash }, { headers: { "Cache-Control": "private, no-store" } });
}
