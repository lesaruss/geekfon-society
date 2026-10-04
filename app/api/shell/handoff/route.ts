// POST /api/shell/handoff   (Bearer) -> { token }
//
// SOURCE side of cross-brand sign-in: a single-use, 2-minute handoff token for
// the signed-in member, so tapping another brand on the bar lands them on it
// already signed in. Same token format and secret as HQ (lib/server/shell.ts).

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest } from "@/lib/server/entitlements";
import { getShellContext, mintHandoff } from "@/lib/server/shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Store unavailable." }, { status: 503 });
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const ctx = await getShellContext(viewer);
  if (!ctx.memberId) return NextResponse.json({ error: "No member profile for this account." }, { status: 409 });

  const minted = await mintHandoff(ctx.memberId, viewer.email);
  if (!minted) return NextResponse.json({ error: "Handoff unavailable." }, { status: 503 });
  const { error } = await sb.from("sso_handoffs").insert({ jti: minted.jti, member_id: ctx.memberId });
  if (error) return NextResponse.json({ error: "Could not start the handoff." }, { status: 500 });
  return NextResponse.json({ token: minted.token }, { headers: { "Cache-Control": "private, no-store" } });
}
