// POST /api/admin/song-audio/finalize   (staff only)
// body: { songId, kind, path, durationSeconds?, sizeBytes? }
// Points the song at the uploaded object. For the streaming MP3 it then runs
// the vocal check (lyrics-transcribe -> ElevenLabs) and reports what it heard,
// so an instrumental can't slip in again unnoticed. The previous file stays
// in storage; only the pointer moves.
import { NextRequest, NextResponse } from "next/server";
import { serviceClient, SUPABASE_URL } from "@/lib/server/supabaseAdmin";
import { viewerFromRequest, isStaff } from "@/lib/server/entitlements";
import { AUDIO_BUCKET } from "@/lib/server/songAudio";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isStaff(viewer))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const songId = String(body?.songId || "");
  const kind = body?.kind === "master" ? "master" : "stream";
  const path = String(body?.path || "");
  if (!/^[0-9a-f-]{36}$/i.test(songId) || !path || path.includes("..")) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  const { data: song } = await sb.from("pulse_songs").select("id, title, primary_artist_slug").eq("id", songId).is("retired_at", null).maybeSingle();
  if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
  // The object must exist and belong to this artist's folder.
  if (!path.startsWith(`${song.primary_artist_slug}/`)) return NextResponse.json({ error: "Path does not match the song" }, { status: 400 });
  const dir = path.slice(0, path.lastIndexOf("/"));
  const file = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await sb.storage.from(AUDIO_BUCKET).list(dir, { search: file, limit: 1 });
  if (!listed?.length) return NextResponse.json({ error: "Upload not found in storage" }, { status: 400 });

  const now = new Date().toISOString();
  const dur = Number(body?.durationSeconds);
  const size = Number(body?.sizeBytes);
  const patch: Record<string, unknown> = kind === "stream"
    ? { src_path: path, uploaded_at: now, ...(dur > 0 ? { duration_seconds: Math.round(dur) } : {}), ...(size > 0 ? { size_bytes: Math.round(size) } : {}) }
    : { master_path: path, master_uploaded_at: now, ...(size > 0 ? { master_size_bytes: Math.round(size) } : {}) };
  const { error } = await sb.from("pulse_songs").update(patch).eq("id", songId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let vocals: { words: number; sample: string } | null = null;
  let checkError: string | null = null;
  if (kind === "stream" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/lyrics-transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ src_path: path }),
        signal: AbortSignal.timeout(55000),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok) {
        const text = String(out?.text || "").trim();
        vocals = { words: text ? text.split(/\s+/).length : 0, sample: text.slice(0, 160) };
      } else checkError = out?.error || `check failed (${res.status})`;
    } catch {
      checkError = "Vocal check timed out; the audio is replaced, check again later.";
    }
  }

  await sb.from("stream_events").insert({
    owner: "logan",
    station: "geekfon",
    summary: `Audio replaced (${kind}) for ${song.primary_artist_slug} - ${song.title} by ${viewer.email}${vocals ? `; vocal check: ${vocals.words} words` : ""}`,
    keywords: ["geekfon-society", "depot", "audio-replace"],
    status: "completed",
    context_link: "https://geekfon.ai/dashboard/song-audio",
  });

  return NextResponse.json({ ok: true, path, vocals, checkError });
}
