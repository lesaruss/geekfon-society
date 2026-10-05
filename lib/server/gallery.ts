// Fan gallery per artist (wallpapers and art made for fans). Server-only.
//
// 2026-10-04, Sean: "a custom gallery with wallpaper and things like that
// that we're creating specifically" for supporters, with some things only
// admins see. Rows live in public.gfs_artist_gallery (RLS on, no anon or
// authenticated grants); images live in the PRIVATE geekfon-gallery bucket
// and reach a browser only as short-lived signed URLs, chosen by the
// viewer's level:
//   public    everyone, signed in or not
//   supporter supporters of the artist (and Lifetime, Pro, staff)
//   admin     staff only
import { serviceClient } from "./supabaseAdmin";
import { depotSlug, asDownload } from "./depot";

export const GALLERY_BUCKET = "geekfon-gallery";
const TTL_SECONDS = 6 * 60 * 60;

export type GalleryLevel = "public" | "supporter" | "admin";
export type GalleryItem = {
  id: string;
  title: string | null;
  kind: "wallpaper" | "art" | "photo";
  visibility: GalleryLevel;
  url: string;
  download: string;
  width: number | null;
  height: number | null;
  thumb?: string;      // smaller render for the mosaic tile
  featured?: boolean;  // the artist's current art, not a gallery row
};

const VISIBLE: Record<GalleryLevel, GalleryLevel[]> = {
  public: ["public"],
  supporter: ["public", "supporter"],
  admin: ["public", "supporter", "admin"],
};

type Row = { id: string; title: string | null; kind: GalleryItem["kind"]; visibility: GalleryLevel; storage_path: string; width: number | null; height: number | null };

// Items this level may see, plus how many more sit above it (for the
// "supporters get N wallpapers" teaser; admin-only items are never counted).
export async function loadGallery(artistSlug: string, level: GalleryLevel): Promise<{ items: GalleryItem[]; lockedCount: number }> {
  const sb = serviceClient();
  if (!sb) return { items: [], lockedCount: 0 };
  const { data, error } = await sb
    .from("gfs_artist_gallery")
    .select("id, title, kind, visibility, storage_path, width, height")
    .eq("artist_slug", depotSlug(artistSlug))
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) { console.error("gallery", artistSlug, error.message); return { items: [], lockedCount: 0 }; }
  const rows = (data ?? []) as Row[];
  const mine = rows.filter(r => VISIBLE[level].includes(r.visibility));
  const lockedCount = level === "public" ? rows.filter(r => r.visibility === "supporter").length : 0;
  if (!mine.length) return { items: [], lockedCount };

  const paths = mine.map(r => r.storage_path);
  // One storage request for every image; the download link is the same
  // signed URL with a file name (one request per image used to pile up
  // storage connections).
  const view = await sb.storage.from(GALLERY_BUCKET).createSignedUrls(paths, TTL_SECONDS);
  const items: GalleryItem[] = [];
  mine.forEach((r, i) => {
    const url = view.data?.[i]?.signedUrl;
    if (!url) return;
    items.push({ id: r.id, title: r.title, kind: r.kind, visibility: r.visibility, url, download: asDownload(url, fileName(r)), width: r.width, height: r.height });
  });
  return { items, lockedCount };
}

function fileName(r: Row): string {
  const ext = r.storage_path.split(".").pop() || "png";
  return `${(r.title || "GeekFon wallpaper").replace(/[\\/:*?"<>|]+/g, "")}.${ext}`;
}

// The artist's current art, first in the Gallery (2026-10-05, Sean: the
// Gallery should look like the Support tour's Gallery screen and show the new
// portraits and covers, not only the archived ones). Everything here is
// already public on the artist's page, so it shows to every viewer. Order:
// music portrait, support portrait, new member portraits, song covers.
const RENDER = "/storage/v1/render/image/public/";
const OBJECT = "/storage/v1/object/public/";

function original(url: string): string {
  return url.includes(RENDER) ? url.replace(RENDER, OBJECT).split("?")[0] : url.split("?")[0];
}

function rendered(url: string, w: number, h: number): string {
  const o = original(url);
  return o.includes(OBJECT) ? `${o.replace(OBJECT, RENDER)}?width=${w}&height=${h}&resize=contain&quality=78` : url;
}

const MEDIA_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/";

export function featuredGallery(
  artistName: string,
  profile: { tabPortraits?: Record<string, string>; heroUrl?: string; members?: { name: string; img?: string }[] },
  songs: { title: string; coverUrl: string | null }[],
): GalleryItem[] {
  const out: GalleryItem[] = [];
  const seen = new Set<string>();
  const add = (id: string, title: string, src: string | null | undefined, w: number, h: number) => {
    if (!src) return;
    const o = original(src);
    if (seen.has(o)) return;
    seen.add(o);
    const ext = o.split(".").pop() || "png";
    out.push({
      id: `featured:${id}`,
      title,
      kind: "art",
      visibility: "public",
      url: rendered(o, w * 2, h * 2),
      thumb: rendered(o, w, h),
      download: `${o}?${new URLSearchParams({ download: `${title.replace(/[\\/:*?"<>|]+/g, "")}.${ext}` }).toString()}`,
      width: null,
      height: null,
      featured: true,
    });
  };
  add("music", artistName, profile.tabPortraits?.music || profile.heroUrl, 720, 960);
  add("support", `${artistName}, offstage`, profile.tabPortraits?.support, 720, 960);
  // Only the new-look member portraits (portraits/members/), never the old art.
  for (const m of profile.members || []) {
    if (!m.img || !m.img.includes("portraits/members/")) continue;
    add(`member:${m.name}`, m.name, m.img.startsWith("http") ? m.img : MEDIA_BASE + m.img, 720, 960);
  }
  for (const s of songs) add(`cover:${s.title}`, s.title, s.coverUrl, 600, 600);
  return out;
}
