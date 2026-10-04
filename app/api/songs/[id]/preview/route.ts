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
// playback. The ID3 tag at the front is measured, not guessed: the depot's
// streams carry ~250-byte tags, but one with embedded cover art could be
// hundreds of KB, which a fixed allowance would either cut into or overpay.
const PREVIEW_PAD_SECONDS = 2;
const FIRST_READ_ALLOWANCE = 16 * 1024;

// Size of a leading ID3v2 tag (header + body + optional footer), else 0.
function id3Length(b: Uint8Array): number {
  if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0;
  const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
  const footer = b[5] & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

async function readHead(url: string, bytes: number): Promise<Uint8Array | null> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` }, cache: "no-store" });
  if (!res.ok && res.status !== 206) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  // Never hand out more than asked for, even if storage ignored the Range.
  return buf.byteLength > bytes ? buf.subarray(0, bytes) : buf;
}

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
  const audioBytes = Math.ceil(bytesPerSecond * (PREVIEW_SECONDS + PREVIEW_PAD_SECONDS));
  const clamp = (n: number) => (size ? Math.min(n, size) : n);

  const signed = await signStream(song.row.src_path, 60);
  if (!signed) return new NextResponse("Unavailable", { status: 503 });

  let body = await readHead(signed, clamp(audioBytes + FIRST_READ_ALLOWANCE));
  if (!body) return new NextResponse("Unavailable", { status: 502 });
  const tag = id3Length(body);
  const cut = clamp(tag + audioBytes);
  if (cut > body.byteLength) {
    body = await readHead(signed, cut);
    if (!body) return new NextResponse("Unavailable", { status: 502 });
  }
  body = body.subarray(0, cut);
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

  return new NextResponse(body.slice(), { status: 200, headers: { ...headers, "Content-Length": String(total) } });
}
