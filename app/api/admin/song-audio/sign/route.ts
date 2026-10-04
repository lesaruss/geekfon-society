// POST /api/admin/song-audio/sign   (staff only)   body: { songId, kind: "stream" | "master" }
// Returns a one-time signed upload URL in the song audio bucket. The browser
// uploads the file there directly (files are too large to pass through here).
import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest, isStaff } from "@/lib/server/entitlements";
import { AUDIO_BUCKET, objectPathFor, type AudioKind } from "@/lib/server/songAudio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isStaff(viewer))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const songId = String(body?.songId || "");
  const kind: AudioKind = body?.kind === "master" ? "master" : "stream";
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return NextResponse.json({ error: "songId required" }, { status: 400 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  const { data: song } = await sb.from("pulse_songs").select("slug, primary_artist_slug").eq("id", songId).is("retired_at", null).maybeSingle();
  if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
  const path = objectPathFor(song.primary_artist_slug, song.slug, kind);
  const { data, error } = await sb.storage.from(AUDIO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not sign upload" }, { status: 500 });
  return NextResponse.json({ bucket: AUDIO_BUCKET, path: data.path, token: data.token });
}
