// GET /api/shell/me   (Authorization: Bearer <supabase token>)
//
// The universal shell contract on geekfon.ai (canon-universal-shell-contract):
// { member, dock, brands, current }. Same shape as HQ's /api/shell/me and the
// lr-shell edge function, so the one shared bar renders identically here.
// Signed out: member null, empty dock, the registry still returned so the bar
// can draw its anchor.

import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest } from "@/lib/server/entitlements";
import { getShellContext, getUniverseBrands, CURRENT_SLUG } from "@/lib/server/shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const [viewer, brands] = await Promise.all([viewerFromRequest(req), getUniverseBrands()]);
  const ctx = viewer ? await getShellContext(viewer) : null;
  return NextResponse.json(
    { member: ctx?.member ?? null, dock: ctx?.dock ?? [], brands, current: CURRENT_SLUG },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
