// GET /api/radio/lyrics?song=<pulse_songs id>
//
// Lyrics for one song, for GeekFon Radio's lyrics view and "What is this?"
// panel. Lyrics are free for every listener (Sean, 2026-11-11), so this is
// public: any song that is not retired. The radio's rotation carries each
// song's id (songId) so the player can ask for the song on air.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("song") || "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data, error } = await sb
    .from("pulse_songs")
    .select("lyrics_en, lyrics_original, lyrics_original_lang")
    .eq("id", id)
    .is("retired_at", null)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = data as { lyrics_en: string | null; lyrics_original: string | null; lyrics_original_lang: string | null };
  return NextResponse.json(
    { lyricsEn: row.lyrics_en, lyricsOriginal: row.lyrics_original, lyricsOriginalLang: row.lyrics_original_lang },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
  );
}
