// DELETE /api/admin/gallery/<id>   (staff only)
// Removes a gallery image: the row and its file in the private bucket.
import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { GALLERY_BUCKET } from "@/lib/server/gallery";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  const { data: row } = await sb.from("gfs_artist_gallery").select("artist_slug, storage_path").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ent = await entitlementFor(viewer, row.artist_slug);
  if (ent.reason !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await sb.from("gfs_artist_gallery").delete().eq("id", id);
  await sb.storage.from(GALLERY_BUCKET).remove([row.storage_path]);
  return NextResponse.json({ ok: true });
}
