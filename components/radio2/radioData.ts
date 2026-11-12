"use client";
// Lyrics and the artist card for GeekFon Radio, fetched once per song or
// artist and kept for the visit. Both answers are public and CDN cached.

import { useEffect, useState } from "react";
import type { Station } from "./useLiveRadio";

export type Lyrics = { lyricsEn: string | null; lyricsOriginal: string | null; lyricsOriginalLang: string | null };
export type ArtistCard = {
  slug: string; name: string; tagline: string | null; genre: string | null; location: string | null;
  avatar: string | null; portrait: string | null; cutout?: string | null; accent?: string | null; ink?: string | null; stations: Pick<Station, "slug" | "name" | "color" | "ink">[];
};

const lyricCache = new Map<string, Promise<Lyrics | null>>();
const artistCache = new Map<string, Promise<ArtistCard | null>>();

function getJson<T>(url: string): Promise<T | null> {
  return fetch(url).then(r => (r.ok ? (r.json() as Promise<T>) : null)).catch(() => null);
}

export function loadLyrics(songId: string): Promise<Lyrics | null> {
  let p = lyricCache.get(songId);
  if (!p) { p = getJson<Lyrics>(`/api/radio/lyrics?song=${encodeURIComponent(songId)}`); lyricCache.set(songId, p); }
  return p;
}

export function loadArtist(slug: string): Promise<ArtistCard | null> {
  let p = artistCache.get(slug);
  if (!p) { p = getJson<ArtistCard>(`/api/radio/artist?slug=${encodeURIComponent(slug)}`); artistCache.set(slug, p); }
  return p;
}

/** undefined while loading, null when there is nothing. */
export function useLyrics(songId?: string | null): Lyrics | null | undefined {
  const [state, setState] = useState<{ id: string | null; v: Lyrics | null | undefined }>({ id: null, v: undefined });
  useEffect(() => {
    if (!songId) return;
    let on = true;
    loadLyrics(songId).then(v => { if (on) setState({ id: songId, v }); });
    return () => { on = false; };
  }, [songId]);
  if (!songId) return null;
  return state.id === songId ? state.v : undefined;
}

export function useArtist(slug?: string | null): ArtistCard | null | undefined {
  const [state, setState] = useState<{ slug: string | null; v: ArtistCard | null | undefined }>({ slug: null, v: undefined });
  useEffect(() => {
    if (!slug) return;
    let on = true;
    loadArtist(slug).then(v => { if (on) setState({ slug, v }); });
    return () => { on = false; };
  }, [slug]);
  if (!slug) return null;
  return state.slug === slug ? state.v : undefined;
}

/** Lyric text as lines; "[Chorus]" style lines become section labels. */
export type LyricLine = { kind: "sec" | "ln"; text: string };
export function lyricLines(text: string | null | undefined): LyricLine[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => (/^\[.*\]$/.test(l) ? { kind: "sec" as const, text: l.slice(1, -1) } : { kind: "ln" as const, text: l }));
}

/** The first `limit` sung lines, with the section labels before them. */
export function lyricPreview(lines: LyricLine[], limit: number): LyricLine[] {
  const out: LyricLine[] = [];
  let n = 0;
  for (const l of lines) {
    if (n >= limit) break;
    out.push(l);
    if (l.kind === "ln") n++;
  }
  return out;
}

const LANG_FALLBACK: Record<string, string> = { ja: "Japanese", ko: "Korean", es: "Spanish", de: "German", zu: "Zulu", fr: "French", pt: "Portuguese" };
/** "ja" -> "Japanese". Stored values are codes; a full name passes through. */
export function langName(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim();
  if (!c) return null;
  if (c.length > 3) return c;
  try {
    const n = new Intl.DisplayNames(["en"], { type: "language" }).of(c);
    if (n && n.toLowerCase() !== c.toLowerCase()) return n;
  } catch { /* old browser */ }
  return LANG_FALLBACK[c.toLowerCase()] || c;
}

/** Station paint from data; New Talent is not a row yet. */
export const NEW_TALENT = { slug: "new-talent", name: "New Talent", tagline: "Brand new artists, submitted to GeekFon Radio", color: "#3EBFEE", ink: "#0B0B0C" };
export const stColor = (s?: { color?: string | null } | null) => s?.color || "#3a3a3a";
export const stInk = (s?: { ink?: string | null } | null) => s?.ink || "#ffffff";

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
