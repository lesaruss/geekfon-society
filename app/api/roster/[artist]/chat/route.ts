// /api/roster/<artist>/chat   (Authorization: Bearer <supabase token>)
//
// The artists' group chat (2026-10-04, Sean: "start building the chat, going
// back to what we used to have"): the GeekFon artists talking to each other
// day by day, read from one artist's page with that artist on the right.
// Supporters of the artist (and Lifetime / Pro / staff) read it; staff post
// lines as any artist, optionally scheduled (a future posted_at stays hidden
// until then). Lines live in gfs_chat_messages (service role only).
//
// GET  ?day=YYYY-MM-DD   that day's lines (New York days), the days that have
//                        lines, and the cast (name, avatar, accent).
// POST { from, body, original?, originalLang?, postedAt?, kind?, drop? }  staff
// DELETE ?id=<uuid>                                                     staff

import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { serviceClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM = "geekfon-crew";
const TZ = "America/New_York";
const noStore = { "Cache-Control": "private, no-store" };

export type ChatMessage = {
  id: string;
  from: string;
  body: string;
  original: string | null;
  originalLang: string | null;
  kind: "message" | "drop";
  drop: { title: string | null; label: string | null; cover: string | null } | null;
  postedAt: string;
  scheduled?: boolean;
};
export type ChatPerson = { name: string; avatar: string | null; accent: string | null };

type Row = {
  id: string; from_slug: string; body: string; original: string | null; original_lang: string | null;
  kind: "message" | "drop"; drop_title: string | null; drop_label: string | null; drop_cover: string | null; posted_at: string;
};

// The New York calendar day of an instant, as YYYY-MM-DD.
function nyDay(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

// The UTC instants bounding a New York day (DST-safe: probe the offset at noon).
function nyDayBounds(day: string): [string, string] {
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = noon.getTime() - local.getTime();
  const start = new Date(new Date(`${day}T00:00:00Z`).getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start.toISOString(), end.toISOString()];
}

async function gate(req: NextRequest, artist: string) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return { ok: false as const, status: 401 };
  const ent = await entitlementFor(viewer, artist);
  if (!ent.supporter) return { ok: false as const, status: 403 };
  return { ok: true as const, viewer, staff: ent.reason === "staff" };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const g = await gate(req, artist);
  if (!g.ok) return NextResponse.json({ error: "supporters only" }, { status: g.status, headers: noStore });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });

  const now = new Date().toISOString();
  // Staff also see what is scheduled, so they can check a day before it airs.
  let daysQ = sb.from("gfs_chat_messages").select("posted_at").eq("room", ROOM).eq("published", true).order("posted_at", { ascending: true }).limit(5000);
  if (!g.staff) daysQ = daysQ.lte("posted_at", now);
  const { data: allTimes } = await daysQ;
  const days = [...new Set((allTimes ?? []).map((r: { posted_at: string }) => nyDay(r.posted_at)))];

  const asked = req.nextUrl.searchParams.get("day");
  const day = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : (days.filter(d => d <= nyDay(now)).pop() ?? days[days.length - 1] ?? nyDay(now));
  const [from, to] = nyDayBounds(day);
  let q = sb.from("gfs_chat_messages")
    .select("id, from_slug, body, original, original_lang, kind, drop_title, drop_label, drop_cover, posted_at")
    .eq("room", ROOM).eq("published", true).gte("posted_at", from).lt("posted_at", to).order("posted_at", { ascending: true });
  if (!g.staff) q = q.lte("posted_at", now);
  const { data: rows } = await q;

  const messages: ChatMessage[] = ((rows ?? []) as Row[]).map(r => ({
    id: r.id,
    from: r.from_slug,
    body: r.body,
    original: r.original,
    originalLang: r.original_lang,
    kind: r.kind,
    drop: r.kind === "drop" ? { title: r.drop_title, label: r.drop_label, cover: r.drop_cover } : null,
    postedAt: r.posted_at,
    ...(r.posted_at > now ? { scheduled: true } : {}),
  }));

  // The cast: everyone on the roster, so staff can post as anyone.
  const { data: artists } = await sb.from("gfs_artists").select("slug, name, profile").order("name");
  const people: Record<string, ChatPerson> = {};
  for (const a of (artists ?? []) as { slug: string; name: string; profile: Record<string, unknown> | null }[]) {
    const p = a.profile || {};
    people[a.slug] = {
      name: a.name,
      avatar: (p.profileUrl as string) || (p.heroUrl as string) || null,
      accent: (p.accent as string) || null,
    };
  }

  return NextResponse.json({ day, days, today: nyDay(now), messages, people, staff: g.staff }, { headers: noStore });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const g = await gate(req, artist);
  if (!g.ok || !g.staff) return NextResponse.json({ error: "staff only" }, { status: 403, headers: noStore });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });

  const b = await req.json().catch(() => null) as {
    from?: string; body?: string; original?: string; originalLang?: string; postedAt?: string;
    kind?: "message" | "drop"; drop?: { title?: string; label?: string; cover?: string };
  } | null;
  const from = (b?.from || "").trim();
  const body = (b?.body || "").trim();
  if (!from || !body) return NextResponse.json({ error: "from and body are required" }, { status: 400, headers: noStore });
  const postedAt = b?.postedAt ? new Date(b.postedAt) : new Date();
  if (isNaN(postedAt.getTime())) return NextResponse.json({ error: "bad postedAt" }, { status: 400, headers: noStore });
  const kind = b?.kind === "drop" ? "drop" : "message";

  const { data, error } = await sb.from("gfs_chat_messages").insert({
    room: ROOM,
    from_slug: from,
    body: body.slice(0, 2000),
    original: b?.original?.trim() || null,
    original_lang: b?.original?.trim() ? (b?.originalLang?.trim() || null) : null,
    kind,
    drop_title: kind === "drop" ? b?.drop?.title?.trim() || null : null,
    drop_label: kind === "drop" ? b?.drop?.label?.trim() || null : null,
    drop_cover: kind === "drop" ? b?.drop?.cover?.trim() || null : null,
    posted_at: postedAt.toISOString(),
    created_by: g.viewer.email,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  return NextResponse.json({ id: data.id, day: nyDay(postedAt) }, { headers: noStore });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const g = await gate(req, artist);
  if (!g.ok || !g.staff) return NextResponse.json({ error: "staff only" }, { status: 403, headers: noStore });
  const sb = serviceClient();
  const id = req.nextUrl.searchParams.get("id");
  if (!sb || !id) return NextResponse.json({ error: "bad request" }, { status: 400, headers: noStore });
  const { error } = await sb.from("gfs_chat_messages").delete().eq("id", id).eq("room", ROOM);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
