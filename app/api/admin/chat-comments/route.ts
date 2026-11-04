// /api/admin/chat-comments   (Authorization: Bearer <supabase token>, staff only)
//
// The moderation queue for member comments on the artists' group chat
// (Sean, 2026-11-04). Every comment waits here until staff approve it; only
// approved comments are shown to other readers (app/api/roster/[artist]/chat/engage).
//
// GET                              pending comments, oldest first, each with the
//                                  chat line it sits under and who is asking
// POST { action: "approve" | "reject", id }

import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { serviceClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

async function staff(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return null;
  const ent = await entitlementFor(viewer, "roxanne");
  return ent.reason === "staff" ? viewer : null;
}

export async function GET(req: NextRequest) {
  const v = await staff(req);
  if (!v) return NextResponse.json({ error: "staff only" }, { status: 403, headers: noStore });
  const sb = serviceClient()!;
  const { data: rows } = await sb.from("gfs_chat_comments")
    .select("id, message_id, parent_id, artist_slug, author_name, body, created_at")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(200);
  const list = (rows ?? []) as { id: string; message_id: string; parent_id: string | null; artist_slug: string; author_name: string; body: string; created_at: string }[];
  const ids = [...new Set(list.map(r => r.message_id))];
  const { data: lines } = ids.length ? await sb.from("gfs_chat_messages").select("id, from_slug, body, posted_at").in("id", ids) : { data: [] };
  const byId = new Map(((lines ?? []) as { id: string; from_slug: string; body: string; posted_at: string }[]).map(l => [l.id, l]));
  const pending = list.map(r => ({ ...r, line: byId.get(r.message_id) ?? null }));
  return NextResponse.json({ pending }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const v = await staff(req);
  if (!v) return NextResponse.json({ error: "staff only" }, { status: 403, headers: noStore });
  const sb = serviceClient()!;
  const b = await req.json().catch(() => ({})) as { action?: string; id?: string };
  if ((b.action !== "approve" && b.action !== "reject") || !b.id) return NextResponse.json({ error: "bad request" }, { status: 400, headers: noStore });
  const { error } = await sb.from("gfs_chat_comments")
    .update({ status: b.action === "approve" ? "approved" : "rejected", decided_at: new Date().toISOString(), decided_by: v.email || "staff" })
    .eq("id", b.id).eq("status", "pending");
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
