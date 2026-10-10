// The live roster, shared by the homepage stage, the roster page and the
// homepage data route. 12 artists (V is administrative and stays out, Sean
// 2026-07-13. Lord Zorlot is held back until he has songs).
export const ARTIST_ORDER = [
  "roxanne", "lex-from-brixton", "shamanic-resin", "riku",
  "straight-and-narrow", "nilo-wave", "rustblood-prophets", "mad-tings",
  "vuka", "likkle-bro", "likkle-sis", "mr-russell",
] as const;

export type StageArtist = {
  slug: string;
  name: string;
  tagline: string | null;
  accent: string;
  genre: string | null;
  /** Transparent full-body portrait (profile.cutoutUrl), made 2026-10-10. */
  cutout: string | null;
  /** Square face crop used in the group chat. */
  avatar: string | null;
};

export type HomeChatLine = { id: string; from: string; name: string; avatar: string | null; accent: string | null; body: string };

// Supabase storage objects resized on the fly. Transparent PNGs come back as
// transparent WebP when the browser takes it.
export function sized(url: string | null, width: number): string | null {
  if (!url) return null;
  if (!url.includes("/storage/v1/object/public/")) return url;
  return url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&resize=contain&quality=82`;
}

// Group chat names that are not roster slugs: Logan's lines belong to the
// Mr. Russell profile (one face, one link, Sean 2026-10-05).
export const CHAT_TO_ROSTER: Record<string, string> = { logan: "mr-russell" };
