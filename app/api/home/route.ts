// GET /api/home
//
// Everything the character-select homepage and roster need in one call
// (playbook geekfon-character-select, Sean and V 2026-10-05 and 2026-10-10):
// the 12 roster artists with their transparent portraits, group chat lines
// from the free days only (October 1 to 3, lib/chatAccess.ts) so nothing
// behind the supporter lock leaks, and LoLA's face for the corner badge.

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { loadChatCast } from "@/lib/server/chatCast";
import { FREE_CHAT_DAYS } from "@/lib/chatAccess";
import { ARTIST_ORDER, type HomeChatLine, type StageArtist } from "@/lib/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM = "geekfon-crew";
const TZ = "America/Los_Angeles";

// UTC bounds of a story-time (LA) day, DST-safe (same as the chat route).
function dayBounds(day: string): [string, string] {
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = noon.getTime() - local.getTime();
  const start = new Date(new Date(`${day}T00:00:00Z`).getTime() + offsetMs);
  return [start.toISOString(), new Date(start.getTime() + 86400000).toISOString()];
}

type ArtistRow = { slug: string; name: string; profile: Record<string, unknown> | null };
type LineRow = { id: string; from_slug: string; body: string | null; kind: string; media_url: string | null };

export async function GET() {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const [from] = dayBounds(FREE_CHAT_DAYS[0]);
  const [, to] = dayBounds(FREE_CHAT_DAYS[FREE_CHAT_DAYS.length - 1]);
  const now = new Date().toISOString();
  const [{ data: rows }, { data: lines }, cast] = await Promise.all([
    sb.from("gfs_artists").select("slug, name, profile").in("slug", ARTIST_ORDER as unknown as string[]),
    sb.from("gfs_chat_messages")
      .select("id, from_slug, body, kind, media_url")
      .eq("room", ROOM).eq("published", true)
      .gte("posted_at", from).lt("posted_at", to).lte("posted_at", now)
      .order("posted_at", { ascending: true }).limit(400),
    loadChatCast(sb),
  ]);

  const bySlug = new Map(((rows ?? []) as ArtistRow[]).map(r => [r.slug, r]));
  const artists: StageArtist[] = ARTIST_ORDER.flatMap(slug => {
    const r = bySlug.get(slug);
    if (!r) return [];
    const p = r.profile ?? {};
    return [{
      slug,
      name: r.name,
      tagline: (p.tagline as string) || null,
      accent: (p.accent as string) || "#F69820",
      genre: (p.genre as string) || null,
      cutout: (p.cutoutUrl as string) || (p.heroUrl as string) || null,
      avatar: (p.chatAvatar as string) || null,
    }];
  });

  const people = new Map(cast.map(c => [c.slug, c]));
  const chat: HomeChatLine[] = ((lines ?? []) as LineRow[])
    .filter(l => l.kind === "message" && !l.media_url && l.body && l.body.trim().length >= 8 && l.body.length <= 140)
    .map(l => {
      const who = people.get(l.from_slug);
      return { id: l.id, from: l.from_slug, name: who?.name || l.from_slug, avatar: who?.avatar ?? null, accent: who?.accent ?? null, body: l.body!.trim() };
    });

  return NextResponse.json(
    { artists, chat, lola: { avatar: people.get("lola")?.avatar ?? null } },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
  );
}
