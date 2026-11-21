// An artist's Social tab (Sean, 2026-11-21): everything posted that features
// the artist, for everyone, plus an Exclusive tab of what is queued and not
// posted yet. Two sources:
//   - gfs_artists.profile.pulse, the artist's own posts (a future timestamp
//     means it is not out yet);
//   - ve_social_slots, the GeekFon Society social calendar, by artist_slugs
//     (posted -> the main mix; proposed, approved or scheduled -> Exclusive).
// When a queued post goes out it leaves Exclusive and joins the main mix by
// itself, because both lists are worked out from the clock on every request.
// Exclusive media is only ever sent to members (the access route); the public
// page gets a locked card: kind, date and a poster to blur, no video, no text.

import { serviceClient } from "@/lib/server/supabaseAdmin";
import type { SocialPost } from "@/lib/artistPage";

const MEDIA = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/";
const abs = (u?: string | null) => (u ? (u.startsWith("http") ? u : MEDIA + u.replace(/^\//, "")) : null);
const QUEUED = ["proposed", "approved", "scheduled"];

type Pulse = { id?: string; type?: string; text?: string; caption?: string; title?: string; timestamp?: string; date?: string; media?: string; thumb?: string; videoUrl?: string; draft?: boolean };
type Slot = { id: string; slot_at: string; status: string; title: string | null; caption: string | null; assets: { type?: string; url?: string; thumb?: string }[] | null; posted_at: string | null };

/** First paragraph of a social caption, without the call to action and hashtags under it. */
function lead(caption: string | null): string | null {
  const first = (caption || "").split(/\n\s*\n/)[0]?.trim();
  return first ? first : null;
}

export async function loadSocial(slug: string, pulse: Pulse[] | undefined): Promise<{ posts: SocialPost[]; queued: SocialPost[] }> {
  const now = Date.now();
  const posts: SocialPost[] = [];
  const queued: SocialPost[] = [];

  for (const [i, p] of (pulse ?? []).entries()) {
    if (p.draft) continue;
    const when = p.timestamp || p.date;
    const t = when ? Date.parse(when) : NaN;
    const video = p.type === "video" && !!p.videoUrl;
    const media = video ? abs(p.videoUrl) : abs(p.media || p.thumb);
    if (!media) continue;
    const post: SocialPost = {
      id: `p-${p.id || i}`, kind: video ? "video" : "photo", date: Number.isFinite(t) ? new Date(t).toISOString() : null,
      text: (p.text || p.caption || p.title || "").trim() || null, media, thumb: video ? abs(p.thumb) : media,
    };
    (Number.isFinite(t) && t > now ? queued : posts).push(post);
  }

  const sb = serviceClient();
  if (sb) {
    const { data } = await sb.from("ve_social_slots")
      .select("id, slot_at, status, title, caption, assets, posted_at")
      .eq("brand_slug", "geekfon-society").contains("artist_slugs", [slug])
      .in("status", ["posted", ...QUEUED]).order("slot_at", { ascending: false }).limit(200);
    for (const s of (data ?? []) as Slot[]) {
      const assets = s.assets ?? [];
      const vid = assets.find(a => a.type === "video" && a.url);
      const img = assets.find(a => a.type === "image" && a.url);
      const poster = assets.find(a => (a.type === "poster" || a.type === "cover") && (a.thumb || a.url));
      const media = vid?.url || img?.url;
      if (!media) continue;
      const post: SocialPost = {
        id: `s-${s.id}`, kind: vid ? "video" : "photo", date: s.posted_at || s.slot_at,
        text: lead(s.caption), media, thumb: poster ? (poster.thumb || poster.url)! : vid ? null : media!,
      };
      if (s.status === "posted") posts.push(post);
      else if (Date.parse(s.slot_at) > now) queued.push(post);
    }
  }

  const newest = (a: SocialPost, b: SocialPost) => (b.date ?? "").localeCompare(a.date ?? "");
  const soonest = (a: SocialPost, b: SocialPost) => (a.date ?? "").localeCompare(b.date ?? "");
  return { posts: posts.sort(newest), queued: queued.sort(soonest) };
}

/** What a non-member sees of a queued post: that it exists, its kind, when, and a poster to blur. */
export const lockedCard = (p: SocialPost): SocialPost => ({ id: p.id, kind: p.kind, date: p.date, text: null, media: null, thumb: p.thumb, locked: true });
