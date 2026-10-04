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
