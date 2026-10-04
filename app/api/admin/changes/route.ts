// GET /api/admin/changes   (admin only)
//
// Feeds the Changes panel on the Admin Command Center (2026-10-04, Sean: "These
// should all be on the dashboard for GeekFon... how can I see what's
// happening without us making commitments to any major changes?").
//
// Three lists from public.gfs_changes:
//   - waiting:  previews awaiting Sean's OK and decisions waiting on him
//   - decided:  things he approved or held that Logan has not acted on yet
//   - shipped:  what went live (or was rolled back) most recently
// Visible changes reach geekfon.ai only after Sean approves the preview.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest } from "@/lib/server/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "contact@lesaruss.com";

export async function GET(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  const cols = "id, created_at, kind, title, summary, status, preview_url, live_url, commit_sha, default_action, playbook_slug, decided_at, decision_note";
  const [waiting, decided, shipped] = await Promise.all([
    sb.from("gfs_changes").select(cols).eq("status", "awaiting_review").order("created_at", { ascending: true }),
    sb.from("gfs_changes").select(cols).in("status", ["approved", "held"]).order("decided_at", { ascending: false }).limit(10),
    sb.from("gfs_changes").select(cols).in("status", ["live", "rolled_back"]).order("created_at", { ascending: false }).limit(8),
  ]);
  const err = waiting.error || decided.error || shipped.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  return NextResponse.json(
    { waiting: waiting.data ?? [], decided: decided.data ?? [], shipped: shipped.data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
