// POST /api/admin/changes/<id>   (admin only)   body: { decision: "approve" | "hold", note?: string }
//
// Records Sean's answer on a preview or a decision. It records only: nothing
// deploys or migrates from this button. Logan reads approved items and ships
// them (fast-forward to production for a preview, or runs the agreed work for
// a decision), then marks the row live.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest } from "@/lib/server/entitlements";

export const runtime = "nodejs";

const ADMIN_EMAIL = "contact@lesaruss.com";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { decision?: string; note?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const status = body.decision === "approve" ? "approved" : body.decision === "hold" ? "held" : null;
  if (!status) return NextResponse.json({ error: "decision must be approve or hold" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  // Only an item still waiting can be decided; a second click is a no-op.
  const { data, error } = await sb
    .from("gfs_changes")
    .update({ status, decided_at: new Date().toISOString(), decided_by: viewer.email, decision_note: note || null })
    .eq("id", id)
    .eq("status", "awaiting_review")
    .select("id, title, status, playbook_slug")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Already decided or not found" }, { status: 409 });

  // Leave a trail where Logan picks up work.
  await sb.from("stream_events").insert({
    owner: "logan",
    station: "geekfon",
    summary: `Sean ${status === "approved" ? "approved" : "held"} on the GeekFon Changes panel: ${data.title}${note ? ` (note: ${note})` : ""}`,
    keywords: ["geekfon-society", "changes-panel", status],
    status: status === "approved" ? "in_progress" : "blocked",
    context_link: "https://geekfon.ai/dashboard",
  });

  return NextResponse.json({ ok: true, status });
}
