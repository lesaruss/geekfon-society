// /api/roster/<artist>/chat/engage   (Authorization: Bearer <supabase token>, optional)
//
// Member comments, replies and likes on the artists' group chat (Sean,
// 2026-11-04: "if they're a member, maybe they can leave their comments or
// reply, and there's a thread; each comment, somebody can reply and like it
// and interact with it"). Reading the chat is open to everyone
// (lib/chatAccess.ts); TAKING PART is the member feature:
//   - like a chat line or a comment: any signed-in account
//   - comment and reply: supporters of THIS artist (their album, Lifetime,
//     Pro or staff, same entitlement as the vault), 18 and over
//   - every comment is held for approval in the Writers' Room before anyone
//     else sees it (Sean can switch that to auto-publish once he trusts it:
//     AUTO_APPROVE below). The author always sees their own pending comment.
//   - one level of replies: a reply cannot be replied to
//
// GET ?day=YYYY-MM-DD   like and comment counts for every line of that day
// GET ?message=<id>     the thread under one line
// POST { action: "like", kind: "message" | "comment", id }   toggles a like
// POST { action: "comment", messageId, body, parentId? }     adds a comment
//
// Tables gfs_chat_comments and gfs_chat_likes are server-only (service role).

import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { serviceClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM = "geekfon-crew";
const TZ = "America/Los_Angeles";
const noStore = { "Cache-Control": "private, no-store" };
// Held for approval until Sean says otherwise.
const AUTO_APPROVE = false;
const MAX_LEN = 500;
const MAX_PER_HOUR = 10;

export type EngageCan = { signedIn: boolean; like: boolean; comment: boolean; why: "signin" | "support" | "minor" | null };
export type EngageCounts = Record<string, { likes: number; liked: boolean; comments: number }>;
export type ThreadComment = {
  id: string; parentId: string | null; name: string; body: string; createdAt: string;
  likes: number; liked: boolean; mine: boolean; pending: boolean;
};

function nyDayBounds(day: string): [string, string] {
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = noon.getTime() - local.getTime();
  const start = new Date(new Date(`${day}T00:00:00Z`).getTime() + offsetMs);
  return [start.toISOString(), new Date(start.getTime() + 86400000).toISOString()];
}

async function who(req: NextRequest, artist: string) {
  const viewer = await viewerFromRequest(req);
  const ent = await entitlementFor(viewer, artist);
  const staff = ent.reason === "staff";
  let minor = false;
  let name = "A fan";
  if (viewer) {
    const sb = serviceClient();
    const { data: m } = await sb!.from("gfs_members").select("name, is_minor").eq("user_id", viewer.id).maybeSingle();
    // Treat an unknown age as a minor: a public thread under the artists' lines.
    minor = !staff && (m?.is_minor ?? true);
    const first = (m?.name || "").trim().split(/\s+/)[0];
    if (first) name = first.slice(0, 24);
  }
  const can: EngageCan = {
    signedIn: !!viewer,
    like: !!viewer,
    comment: !!viewer && ent.supporter && !minor,
    why: !viewer ? "signin" : !ent.supporter ? "support" : minor ? "minor" : null,
  };
  return { viewer, staff, can, name };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
  const { viewer, staff, can } = await who(req, artist);
  const now = new Date().toISOString();

  const messageId = req.nextUrl.searchParams.get("message");
  if (messageId) {
    const { data: rows } = await sb.from("gfs_chat_comments")
      .select("id, parent_id, user_id, author_name, body, created_at, status")
      .eq("message_id", messageId).neq("status", "rejected").order("created_at", { ascending: true }).limit(500);
    const visible = (rows ?? []).filter((r: { status: string; user_id: string }) => r.status === "approved" || (viewer && r.user_id === viewer.id) || staff);
    const ids = visible.map((r: { id: string }) => r.id);
    const { data: likes } = ids.length ? await sb.from("gfs_chat_likes").select("target_id, user_id").eq("target_kind", "comment").in("target_id", ids) : { data: [] };
    const count = new Map<string, number>(); const mine = new Set<string>();
    for (const l of (likes ?? []) as { target_id: string; user_id: string }[]) {
      count.set(l.target_id, (count.get(l.target_id) ?? 0) + 1);
      if (viewer && l.user_id === viewer.id) mine.add(l.target_id);
    }
    const comments: ThreadComment[] = visible.map((r: { id: string; parent_id: string | null; user_id: string; author_name: string; body: string; created_at: string; status: string }) => ({
      id: r.id, parentId: r.parent_id, name: r.author_name, body: r.body, createdAt: r.created_at,
      likes: count.get(r.id) ?? 0, liked: mine.has(r.id), mine: !!viewer && r.user_id === viewer.id, pending: r.status === "pending",
    }));
    return NextResponse.json({ comments, can }, { headers: noStore });
  }

  const day = req.nextUrl.searchParams.get("day");
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "day required" }, { status: 400, headers: noStore });
  const [from, to] = nyDayBounds(day);
  let mq = sb.from("gfs_chat_messages").select("id").eq("room", ROOM).eq("published", true).gte("posted_at", from).lt("posted_at", to).limit(400);
  if (!staff) mq = mq.lte("posted_at", now);
  const { data: msgs } = await mq;
  const ids = (msgs ?? []).map((m: { id: string }) => m.id);
  const counts: EngageCounts = Object.fromEntries(ids.map(id => [id, { likes: 0, liked: false, comments: 0 }]));
  if (ids.length) {
    const [{ data: likes }, { data: comments }] = await Promise.all([
      sb.from("gfs_chat_likes").select("target_id, user_id").eq("target_kind", "message").in("target_id", ids).limit(20000),
      sb.from("gfs_chat_comments").select("message_id").eq("status", "approved").in("message_id", ids).limit(20000),
    ]);
    for (const l of (likes ?? []) as { target_id: string; user_id: string }[]) {
      const c = counts[l.target_id]; if (!c) continue;
      c.likes++; if (viewer && l.user_id === viewer.id) c.liked = true;
    }
    for (const c of (comments ?? []) as { message_id: string }[]) { if (counts[c.message_id]) counts[c.message_id].comments++; }
  }
  return NextResponse.json({ counts, can }, { headers: noStore });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
  const { viewer, staff, can, name } = await who(req, artist);
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });
  if (!viewer) return fail("Sign in to join in.", 401);
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const now = new Date().toISOString();

  // A line is only there to engage with once it has aired and is published.
  async function lineIsOpen(id: string): Promise<boolean> {
    const { data } = await sb!.from("gfs_chat_messages").select("id, posted_at").eq("id", id).eq("room", ROOM).eq("published", true).maybeSingle();
    return !!data && (staff || data.posted_at <= now);
  }

  if (b.action === "like") {
    const kind = b.kind === "comment" ? "comment" : b.kind === "message" ? "message" : null;
    const id = typeof b.id === "string" ? b.id : "";
    if (!kind || !/^[0-9a-f-]{36}$/i.test(id)) return fail("Bad like.");
    if (kind === "message") { if (!(await lineIsOpen(id))) return fail("That line isn't open yet.", 404); }
    else {
      const { data: c } = await sb.from("gfs_chat_comments").select("id, status").eq("id", id).maybeSingle();
      if (!c || c.status !== "approved") return fail("That comment isn't available.", 404);
    }
    const { data: existing } = await sb.from("gfs_chat_likes").select("user_id").eq("target_kind", kind).eq("target_id", id).eq("user_id", viewer.id).maybeSingle();
    if (existing) await sb.from("gfs_chat_likes").delete().eq("target_kind", kind).eq("target_id", id).eq("user_id", viewer.id);
    else await sb.from("gfs_chat_likes").insert({ target_kind: kind, target_id: id, user_id: viewer.id });
    const { count } = await sb.from("gfs_chat_likes").select("user_id", { count: "exact", head: true }).eq("target_kind", kind).eq("target_id", id);
    return NextResponse.json({ liked: !existing, likes: count ?? 0 }, { headers: noStore });
  }

  if (b.action === "comment") {
    if (!can.comment) {
      return fail(can.why === "support" ? `Support ${artist.replace(/-/g, " ")} to comment.` : can.why === "minor" ? "Comments are for members 18 and over." : "Sign in to comment.", 403);
    }
    const messageId = typeof b.messageId === "string" ? b.messageId : "";
    const text = (typeof b.body === "string" ? b.body : "").replace(/\s+\n/g, "\n").trim();
    if (!/^[0-9a-f-]{36}$/i.test(messageId)) return fail("Bad comment.");
    if (!text) return fail("Write something first.");
    if (text.length > MAX_LEN) return fail(`Keep it under ${MAX_LEN} characters.`);
    if (/https?:\/\/|www\.|\.(com|net|org|io|ai|co)\b/i.test(text)) return fail("Links aren't allowed in comments.");
    if (!(await lineIsOpen(messageId))) return fail("That line isn't open yet.", 404);

    let parentId: string | null = null;
    if (typeof b.parentId === "string" && b.parentId) {
      const { data: parent } = await sb.from("gfs_chat_comments").select("id, message_id, parent_id, status").eq("id", b.parentId).maybeSingle();
      if (!parent || parent.message_id !== messageId || parent.status !== "approved") return fail("That comment isn't available to reply to.", 404);
      // One level only: replying to a reply lands under the same comment.
      parentId = parent.parent_id ?? parent.id;
    }

    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count: recent } = await sb.from("gfs_chat_comments").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).gte("created_at", since);
    if ((recent ?? 0) >= MAX_PER_HOUR && !staff) return fail("Easy there. You can post again in a little while.", 429);

    const approved = AUTO_APPROVE || staff;
    const { data: row, error } = await sb.from("gfs_chat_comments").insert({
      message_id: messageId, parent_id: parentId, user_id: viewer.id, artist_slug: artist, author_name: name, body: text,
      status: approved ? "approved" : "pending",
      ...(approved ? { decided_at: now, decided_by: staff ? "staff" : "auto" } : {}),
    }).select("id, parent_id, author_name, body, created_at, status").single();
    if (error || !row) return fail("Couldn't post that. Try again.", 500);
    const comment: ThreadComment = { id: row.id, parentId: row.parent_id, name: row.author_name, body: row.body, createdAt: row.created_at, likes: 0, liked: false, mine: true, pending: row.status === "pending" };
    return NextResponse.json({ comment }, { headers: noStore });
  }

  return fail("Unknown action.");
}
