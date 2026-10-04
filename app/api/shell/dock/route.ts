// POST /api/shell/dock { brand_slug, action: 'add' | 'remove' }   (Bearer)
//
// The member's own bar picks, stored once per member (public.member_dock keyed
// on members.id), so what they add here is on their bar on every brand. Same
// validation as HQ's /api/shell/dock: only live registry brands, never the hub.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest } from "@/lib/server/entitlements";
import { getShellContext, HUB_SLUG } from "@/lib/server/shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Store unavailable." }, { status: 503 });
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Sign in to change your bar." }, { status: 401 });
  const ctx = await getShellContext(viewer);
  if (!ctx.memberId) return NextResponse.json({ error: "No member profile for this account." }, { status: 409 });

  let body: { brand_slug?: string; action?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 }); }
  const slug = (body.brand_slug ?? "").trim();
  const action = body.action === "remove" ? "remove" : "add";
  if (slug === HUB_SLUG) return NextResponse.json({ error: "The hub is always on the bar." }, { status: 400 });

  const { data: brand } = await sb.from("universe_brands").select("slug, is_live").eq("slug", slug).maybeSingle();
  if (!brand) return NextResponse.json({ error: "Unknown brand." }, { status: 400 });
  if (action === "add" && !brand.is_live) return NextResponse.json({ error: "That brand is not live yet." }, { status: 400 });

  const current = ctx.dock;
  const next = action === "remove" ? current.filter(s => s !== slug) : current.includes(slug) ? current : [...current, slug];
  const { error } = await sb
    .from("member_dock")
    .upsert({ member_id: ctx.memberId, user_id: viewer.id, brand_slugs: next, updated_at: new Date().toISOString() }, { onConflict: "member_id" });
  if (error) return NextResponse.json({ error: "Could not update your bar." }, { status: 500 });
  return NextResponse.json({ ok: true, brand_slugs: next });
}
