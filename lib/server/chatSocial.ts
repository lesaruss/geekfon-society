// Group-chat media onto the artists' Social feeds (2026-10-05, Sean: "anytime
// there's a photo or a video, it's also social media that will go onto their
// feeds. Whoever's included, they'll be tagged, so it'll be on... both of
// their social feeds for that day").
//
// When a day is approved, every line with media and tagged roster artists
// becomes a post on each tagged artist's Social feed (gfs_artists.profile.pulse);
// taking the day down removes exactly those posts. Posts are keyed by the chat
// line (id "chat-<line id>"), so approving twice never duplicates them, and
// they carry the line's time, so the feed shows them when the chat does.
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadChatCast } from "./chatCast";

type Line = {
  id: string; from_slug: string; body: string; posted_at: string;
  media_url: string | null; media_kind: "image" | "video" | "audio" | null; media_poster: string | null; tagged: string[] | null;
};
type Post = Record<string, unknown> & { id?: string };

export async function syncDaySocial(sb: SupabaseClient, dayId: string, publish: boolean): Promise<{ posted: number; artists: string[] }> {
  const { data } = await sb
    .from("gfs_chat_messages")
    .select("id, from_slug, body, posted_at, media_url, media_kind, media_poster, tagged")
    .eq("day_id", dayId)
    .not("media_url", "is", null);
  const lines = ((data ?? []) as Line[]).filter(l => (l.tagged?.length ?? 0) > 0);
  if (!lines.length) return { posted: 0, artists: [] };

  const lineIds = new Set(lines.map(l => `chat-${l.id}`));
  const names = Object.fromEntries((await loadChatCast(sb)).map(m => [m.slug, m.name]));
  const targets = [...new Set(lines.flatMap(l => l.tagged ?? []))];

  const { data: artists } = await sb.from("gfs_artists").select("slug, profile").in("slug", targets);
  let posted = 0;
  const touched: string[] = [];
  for (const a of (artists ?? []) as { slug: string; profile: Record<string, unknown> | null }[]) {
    const profile = a.profile || {};
    const pulse = (Array.isArray(profile.pulse) ? profile.pulse : []) as Post[];
    const kept = pulse.filter(p => !(typeof p.id === "string" && lineIds.has(p.id)));
    const added: Post[] = [];
    if (publish) {
      for (const l of lines) {
        if (!(l.tagged ?? []).includes(a.slug)) continue;
        const thumb = l.media_kind === "image" ? l.media_url : l.media_poster;
        if (!thumb) continue; // the Social grid shows posts with a picture
        const by = l.from_slug === a.slug ? "" : `\n\n${names[l.from_slug] || l.from_slug}, in the GeekFon group chat`;
        added.push({
          id: `chat-${l.id}`,
          type: l.media_kind === "video" ? "video" : "photo",
          text: `${l.body}${by}`,
          thumb,
          ...(l.media_kind === "video" ? { videoUrl: l.media_url } : { media: l.media_url }),
          timestamp: l.posted_at,
          source: "group-chat",
          engagement: { likes: 0, comments: 0, shares: 0 },
        });
      }
    }
    if (kept.length === pulse.length && added.length === 0) continue;
    const { error } = await sb.from("gfs_artists").update({ profile: { ...profile, pulse: [...kept, ...added] } }).eq("slug", a.slug);
    if (!error) { posted += added.length; touched.push(a.slug); }
  }
  return { posted, artists: touched };
}
