// POST /api/admin/gallery   (staff only, multipart form)
//   fields: artist, file (png/jpeg/webp, up to 25MB), title?, kind?, visibility?, width?, height?
// Adds an image to an artist's fan gallery: stores it in the private
// geekfon-gallery bucket and writes the gfs_artist_gallery row. Supporter
// and admin items are only ever served as signed URLs (lib/server/gallery.ts).
import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { depotSlug } from "@/lib/server/depot";
import { GALLERY_BUCKET } from "@/lib/server/gallery";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const KINDS = new Set(["wallpaper", "art", "photo"]);
const LEVELS = new Set(["public", "supporter", "admin"]);

export async function POST(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const artist = depotSlug(String(form?.get("artist") || "").trim());
  if (!form || !/^[a-z0-9-]{2,60}$/.test(artist)) return NextResponse.json({ error: "artist required" }, { status: 400 });
  const ent = await entitlementFor(viewer, artist);
  if (ent.reason !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = form.get("file");
  if (!(file instanceof File) || !TYPES[file.type]) return NextResponse.json({ error: "PNG, JPEG or WebP image required" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Image is over 25MB" }, { status: 413 });

  const kind = KINDS.has(String(form.get("kind"))) ? String(form.get("kind")) : "wallpaper";
  const visibility = LEVELS.has(String(form.get("visibility"))) ? String(form.get("visibility")) : "supporter";
  const title = String(form.get("title") || "").trim().slice(0, 120) || null;
  const num = (k: string) => { const n = parseInt(String(form.get(k) || ""), 10); return n > 0 && n < 20000 ? n : null; };

  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  const path = `${artist}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${TYPES[file.type]}`;
  const up = await sb.storage.from(GALLERY_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  const { data, error } = await sb
    .from("gfs_artist_gallery")
    .insert({ artist_slug: artist, title, kind, visibility, storage_path: path, width: num("width"), height: num("height"), created_by: viewer.email })
    .select("id")
    .single();
  if (error) {
    await sb.storage.from(GALLERY_BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
