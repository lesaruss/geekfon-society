// /api/roster/<artist>/chat   (Authorization: Bearer <supabase token>, optional)
//
// The artists' group chat (2026-10-04, Sean: "start building the chat, going
// back to what we used to have"): the GeekFon artists talking to each other
// day by day, read from one artist's page with that artist on the right.
// Lines are written and approved in the Chat Writers' Room
// (/api/admin/chat-room); only published lines show, and a future posted_at
// stays hidden until then. Lines live in gfs_chat_messages (service role only).
//
// Who reads what (Sean, 2026-10-10, lib/chatAccess.ts): October 1 to 3 are
// free for everyone, no sign-in. Later days are for supporters of ANY artist
// (chatSupporter in lib/server/entitlements.ts). Everyone else gets a locked
// day: its date, who talks, and one teaser line, never the rest of its lines.
//
// GET  ?day=YYYY-MM-DD   that day's lines (LA days), the days that have
//                        lines, and the cast (name, avatar, accent).

import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest, chatSupporter } from "@/lib/server/entitlements";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { loadChatCast } from "@/lib/server/chatCast";
import { FREE_CHAT_DAYS, isFreeChatDay } from "@/lib/chatAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM = "geekfon-crew";
// The story lives in the LA house, so its days and clock are LA time (2026-10-05).
const TZ = "America/Los_Angeles";
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
  /** A photo, video or audio clip shown as an icon beside the line. */
  media?: { url: string; kind: "image" | "video" | "audio" };
  /** Cast reactions to the line (2026-10-06, Sean: "you can see all the people liking his message"). */
  reactions?: { emoji: string; from: string }[];
};
export type ChatPerson = { name: string; avatar: string | null; accent: string | null };
/** A supporters-only day as a non-supporter sees it: no lines, just the hook. */
export type ChatLockedDay = { cast: string[]; teaser: { from: string; body: string } | null };

type Row = {
  id: string; from_slug: string; body: string; original: string | null; original_lang: string | null;
  kind: "message" | "drop"; drop_title: string | null; drop_label: string | null; drop_cover: string | null; posted_at: string;
  media_url: string | null; media_kind: "image" | "video" | "audio" | null;
  reactions: { emoji: string; from: string }[] | null;
};

// The story-time (LA) calendar day of an instant, as YYYY-MM-DD.
function nyDay(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

// The UTC instants bounding a story-time day (DST-safe: probe the offset at noon).
function nyDayBounds(day: string): [string, string] {
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = noon.getTime() - local.getTime();
  const start = new Date(new Date(`${day}T00:00:00Z`).getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start.toISOString(), end.toISOString()];
}

export async function GET(req: NextRequest) {
  const g = await chatSupporter(await viewerFromRequest(req));
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });

  const now = new Date().toISOString();
  // Staff also see what is scheduled, so they can check a day before it airs.
  let daysQ = sb.from("gfs_chat_messages").select("posted_at").eq("room", ROOM).eq("published", true).order("posted_at", { ascending: true }).limit(5000);
  if (!g.staff) daysQ = daysQ.lte("posted_at", now);
  const { data: allTimes } = await daysQ;
  const days = [...new Set((allTimes ?? []).map((r: { posted_at: string }) => nyDay(r.posted_at)))];

  const asked = req.nextUrl.searchParams.get("day");
  // Supporters open on the latest day, like any chat. Everyone else starts
  // at the beginning of the story, on the first free day.
  const firstFree = days.find(isFreeChatDay);
  const day = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked
    : !g.supporter && firstFree ? firstFree
    : (days.filter(d => d <= nyDay(now)).pop() ?? days[days.length - 1] ?? nyDay(now));
  const locked = !g.supporter && !isFreeChatDay(day);
  const [from, to] = nyDayBounds(day);
  let q = sb.from("gfs_chat_messages")
    .select("id, from_slug, body, original, original_lang, kind, drop_title, drop_label, drop_cover, posted_at, media_url, media_kind, reactions")
    .eq("room", ROOM).eq("published", true).gte("posted_at", from).lt("posted_at", to).order("posted_at", { ascending: true });
  if (!g.staff) q = q.lte("posted_at", now);
  const { data: rows } = await q;

  // A locked day sends only who talks and its first plain line, nothing else.
  if (locked) {
    const list = (rows ?? []) as Row[];
    const first = list.find(r => r.kind === "message" && r.body?.trim());
    const lock: ChatLockedDay = {
      cast: [...new Set(list.map(r => r.from_slug))],
      teaser: first ? { from: first.from_slug, body: first.body } : null,
    };
    const people: Record<string, ChatPerson> = {};
    for (const m of await loadChatCast(sb)) people[m.slug] = { name: m.name, avatar: m.avatar, accent: m.accent };
    return NextResponse.json({ day, days, today: nyDay(now), messages: [], locked: lock, freeDays: FREE_CHAT_DAYS, supporter: false, people, staff: false }, { headers: noStore });
  }

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
    ...(r.media_url ? { media: { url: r.media_url, kind: r.media_kind || "image" } } : {}),
    ...(r.reactions?.length ? { reactions: r.reactions } : {}),
  }));

  // Everyone the Writers' Room can cast (roster plus Logan and LoLA).
  const people: Record<string, ChatPerson> = {};
  for (const m of await loadChatCast(sb)) people[m.slug] = { name: m.name, avatar: m.avatar, accent: m.accent };

  return NextResponse.json({ day, days, today: nyDay(now), messages, locked: null, freeDays: FREE_CHAT_DAYS, supporter: g.supporter, people, staff: g.staff }, { headers: noStore });
}
