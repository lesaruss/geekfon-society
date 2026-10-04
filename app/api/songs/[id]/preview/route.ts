// GET /api/songs/<id>/preview
//
// The 30-second preview of any song, served by the server. For a vault song
// this is the ONLY audio a non-supporter's browser ever receives: the route
// reads the head of the MP3 from storage and returns just enough bytes for
// ~30 seconds, so the full file's path never reaches the client and there is
// nothing to strip a client-side cap from. MP3 frames are self-contained, so
// a truncated stream plays cleanly and simply ends.
//
// Public singles are not previewed: they redirect to their full public stream.

import { NextRequest, NextResponse } from "next/server";
import { loadSong, publicStreamUrl, signStream, PREVIEW_SECONDS } from "@/lib/server/depot";

export const runtime = "nodejs";

// Headroom over 30s so the client's own 30s cap, not the byte cut, ends
// playback; plus room for an ID3 tag (embedded cover art) at the front.
const PREVIEW_PAD_SECONDS = 2;
const HEADER_ALLOWANCE = 256 * 1024;
// Fallback when a row is missing size or duration: 192 kbps.
const FALLBACK_BYTES_PER_SECOND = 24_000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const song = await loadSong(id);
  if (!song || !song.row.src_path) return new NextResponse("Not found", { status: 404 });

  if (song.access === "single") {
    return NextResponse.redirect(publicStreamUrl(song.row.src_path), 302);
  }

  const { size_bytes: size, duration_seconds: duration } = song.row;
  const bytesPerSecond = size && duration ? size / duration : FALLBACK_BYTES_PER_SECOND;
  let cut = Math.ceil(bytesPerSecond * (PREVIEW_SECONDS + PREVIEW_PAD_SECONDS)) + HEADER_ALLOWANCE;
  if (size) cut = Math.min(cut, size);

  const signed = await signStream(song.row.src_path, 60);
  if (!signed) return new NextResponse("Unavailable", { status: 503 });

  const upstream = await fetch(signed, { headers: { Range: `bytes=0-${cut - 1}` }, cache: "no-store" });
  if (!upstream.ok && upstream.status !== 206) return new NextResponse("Unavailable", { status: 502 });
  // Read at most `cut` bytes even if storage ignored the Range header.
  const full = new Uint8Array(await upstream.arrayBuffer());
  const body = full.byteLength > cut ? full.subarray(0, cut) : full;
  const total = body.byteLength;

  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    // Same bytes for everyone, so the CDN can serve repeats.
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Preview-Seconds": String(PREVIEW_SECONDS),
  };

  // Honour Range requests against the preview itself so the audio element
  // can seek within the 30 seconds.
  const range = req.headers.get("range");
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    let start = m[1] ? parseInt(m[1], 10) : Math.max(0, total - parseInt(m[2], 10));
    let end = m[1] && m[2] ? parseInt(m[2], 10) : total - 1;
    end = Math.min(end, total - 1);
    if (start > end || start >= total) {
      return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${total}` } });
    }
    start = Math.max(0, start);
    return new NextResponse(body.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new NextResponse(body, { status: 200, headers: { ...headers, "Content-Length": String(total) } });
}
