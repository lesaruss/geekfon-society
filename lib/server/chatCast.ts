// Who can appear in the artists' group chat, with how they look there. One
// list for the Chat Writers' Room and the chat on the artist pages, so a
// line from anyone the room can cast always renders with a name and face.
//
// The roster (gfs_artists) plus the GeekFon figures who aren't roster artists
// (2026-10-04, Sean: "we don't need to have V on there. Logan's now going to
// take the role that V used to have... he definitely needs to be on there...
// LoLA needs to be on there for sure"). V is left out; Mr. Russell is the old
// display identity merged into Logan, so it's left out too.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabaseAdmin";

export type ChatCastMember = { slug: string; name: string; avatar: string | null; accent: string | null; hasVoice: boolean };

const LEAVE_OUT = new Set(["v", "mr-russell"]);
// Non-roster figures who take part in the chat: slug -> character_agents slug.
const FIGURES = ["logan", "lola"];
// gfs_artists slugs that differ from their character_agents slug.
export const AGENT_SLUG: Record<string, string> = { riku: "riku-hayasaka" };

function mediaAvatar(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/render/image/public/geekfon-media/artists/${path}?width=240&quality=80`;
}

export async function loadChatCast(sb: SupabaseClient): Promise<ChatCastMember[]> {
  const [{ data: artists }, { data: agents }, { data: figures }] = await Promise.all([
    sb.from("gfs_artists").select("slug, name, profile").order("name"),
    sb.from("character_agents").select("slug, display_name").eq("brand_slug", "geekfon-society").eq("active", true),
    sb.from("artists").select("slug, name, hero_art_path, color").in("slug", FIGURES),
  ]);
  const voice = new Map((agents ?? []).map((a: { slug: string; display_name: string }) => [a.slug, a.display_name]));

  const roster: ChatCastMember[] = (artists ?? [])
    .filter((a: { slug: string }) => !LEAVE_OUT.has(a.slug))
    .map((a: { slug: string; name: string; profile: Record<string, unknown> | null }) => ({
      slug: a.slug,
      name: a.name,
      avatar: (a.profile?.profileUrl as string) || null,
      accent: (a.profile?.accent as string) || null,
      hasVoice: voice.has(AGENT_SLUG[a.slug] || a.slug),
    }));

  const extra: ChatCastMember[] = FIGURES.map(slug => {
    const f = (figures ?? []).find((x: { slug: string }) => x.slug === slug) as { name: string; hero_art_path: string | null; color: string | null } | undefined;
    return {
      slug,
      name: voice.get(slug) || f?.name || slug,
      avatar: mediaAvatar(f?.hero_art_path ?? null),
      accent: f?.color || null,
      hasVoice: voice.has(slug),
    };
  });

  return [...extra, ...roster];
}
