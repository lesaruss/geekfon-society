// The song depot (pulse_songs) as geekfon.ai sees it. Server-only.
//
// pulse_songs is the one source of truth for songs (121 active across 12
// artists, each with a WAV master, an MP3 stream, duration, cover art and
// lyrics). geekfon.ai used to read two drifted copies instead:
// gfs_artists.profile.tracks for artist pages and radio_tracks for radio.
//
// ACCESS MODEL. Every song is either a PUBLIC SINGLE (plays in full for
// everyone) or a VAULT song (30-second preview for everyone, full stream for
// supporters of that artist, and for Lifetime). The vault's audio path is never
// sent to a browser that is not entitled to it: the public payload carries
// only a preview URL (/api/songs/<id>/preview), and full streams come back
// as short-lived signed URLs from /api/roster/<artist>/access after a
// server-side entitlement check (lib/server/entitlements.ts).
//
// WHICH SONGS ARE SINGLES (interim, 2026-10-04). pulse_songs.visibility_tier
// is not usable for this yet: its 'free' tag sits on 50 rows, while only
// a handful of songs are actually released (HQ's roster route documents the
// same trap). Until the tier collapse ships (playbook geekfon-launch, Work
// Queue "Collapse visibility_tier"), a single is a depot song whose title
// matches a track Sean tagged "public" in the geekfon.ai Song Manager
// (gfs_artists.profile.tracks[].v). That is exactly the set of songs the
// live site already played in full, so this switch changes no one's access.
// When the collapse lands, isSingle() reads the new column instead and
// everything downstream stays the same.

import { serviceClient, SUPABASE_URL } from "./supabaseAdmin";

// Bucket that holds the MP3 streams. Public today; the vault files move to a
// private bucket in the follow-up storage step, which only changes this
// constant and the stored paths, never the callers.
export const STREAM_BUCKET = "geekfon-radio-audio";
export const PREVIEW_SECONDS = 30;

const PUBLIC_STREAM_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STREAM_BUCKET}/`;

export type SongAccess = "single" | "vault";

// What a browser may see for any song. Vault songs carry no stream path and
// no lyrics here; supporters receive those from the access route.
export type PublicSong = {
  id: string;
  slug: string;
  title: string;
  artistSlug: string;
  season: string | null;
  isRemix: boolean;
  durationSeconds: number | null;
  coverUrl: string | null;
  releaseDate: string | null;
  access: SongAccess;
  // Singles: the full public stream. Vault: the 30-second preview route.
  playUrl: string;
  lyricsEn: string | null;
  lyricsOriginal: string | null;
  lyricsOriginalLang: string | null;
  hasLyrics: boolean;
};

export type PublicAlbum = {
  id: string;
  title: string;
  status: string; // released | in_progress | ...
  trackTarget: number;
  geekfonReleaseDate: string | null;
  tracks: { songId: string; kind: string; position: number }[];
};

export type DepotRow = {
  id: string;
  slug: string;
  title: string;
  primary_artist_slug: string;
  season: string | null;
  is_remix: boolean | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  cover_art_path: string | null;
  thumb_path: string | null;
  release_date: string | null;
  sort_order: number | null;
  radio_order: number | null;
  src_path: string | null;
  lyrics_en: string | null;
  lyrics_original: string | null;
  lyrics_original_lang: string | null;
  source_radio_track_id: string | null;
};

const ROW_COLUMNS =
  "id, slug, title, primary_artist_slug, season, is_remix, duration_seconds, size_bytes, cover_art_path, thumb_path, release_date, sort_order, radio_order, src_path, lyrics_en, lyrics_original, lyrics_original_lang, source_radio_track_id";

// Riku is 'riku' in gfs_artists and pulse_songs but 'riku-hayasaka' in
// radio_tracks, gfs_artist_bible and a few older tables. Everything on this
// side normalises to the depot slug.
export function depotSlug(slug: string): string {
  return slug === "riku-hayasaka" ? "riku" : slug;
}

// Title key used to match Song Manager tags to depot rows. Drops case,
// punctuation, "(feat. ...)" and the "Solo Mix" suffix the Song Manager
// carried for Mr. Russell's re-record; keeps "(Remix)" so a remix never
// inherits its original's single status. Verified 2026-10-04: all 33
// "public" Song Manager tags resolve to exactly one active depot row.
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(feat[^)]*\)/g, "")
    .replace(/solo mix/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function singleKeysFor(artistSlug: string): Promise<Set<string>> {
  const sb = serviceClient();
  if (!sb) return new Set();
  const { data } = await sb.from("gfs_artists").select("profile").eq("slug", artistSlug).maybeSingle();
  const tracks = ((data?.profile as { tracks?: { n?: string; v?: string }[] } | null)?.tracks) ?? [];
  return new Set(tracks.filter(t => t.v === "public" && t.n).map(t => titleKey(t.n!)));
}

function isSingle(row: DepotRow, singleKeys: Set<string>): boolean {
  return singleKeys.has(titleKey(row.title));
}

export function publicStreamUrl(srcPath: string): string {
  return PUBLIC_STREAM_BASE + srcPath.split("/").map(encodeURIComponent).join("/");
}

export function previewUrl(songId: string): string {
  return `/api/songs/${songId}/preview`;
}

function toPublic(row: DepotRow, access: SongAccess): PublicSong {
  const single = access === "single";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artistSlug: row.primary_artist_slug,
    season: row.season,
    isRemix: !!row.is_remix,
    durationSeconds: row.duration_seconds,
    coverUrl: row.cover_art_path || row.thumb_path || null,
    releaseDate: row.release_date,
    access,
    playUrl: single && row.src_path ? publicStreamUrl(row.src_path) : previewUrl(row.id),
    lyricsEn: single ? row.lyrics_en : null,
    lyricsOriginal: single ? row.lyrics_original : null,
    lyricsOriginalLang: single ? row.lyrics_original_lang : null,
    hasLyrics: !!(row.lyrics_en || row.lyrics_original),
  };
}

// Display order, matching the HQ Discography: album tracks in album order,
// then everything not yet on an album (originals by sort_order, then
// remixes). Songs are never dropped for not being on an album.
function orderRows(rows: DepotRow[]): DepotRow[] {
  return [...rows].sort((a, b) => {
    const r = Number(!!a.is_remix) - Number(!!b.is_remix);
    if (r) return r;
    const sa = a.sort_order ?? a.radio_order ?? 9999;
    const sb = b.sort_order ?? b.radio_order ?? 9999;
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });
}

export async function loadArtistRows(artistSlug: string): Promise<{ rows: DepotRow[]; singleKeys: Set<string> }> {
  const sb = serviceClient();
  if (!sb) return { rows: [], singleKeys: new Set() };
  const slug = depotSlug(artistSlug);
  const [{ data, error }, singleKeys] = await Promise.all([
    sb.from("pulse_songs").select(ROW_COLUMNS).eq("primary_artist_slug", slug).is("retired_at", null),
    singleKeysFor(slug),
  ]);
  if (error) {
    console.error("depot rows", slug, error.message);
    return { rows: [], singleKeys };
  }
  return { rows: orderRows((data ?? []) as DepotRow[]), singleKeys };
}

export function accessOf(row: DepotRow, singleKeys: Set<string>): SongAccess {
  return isSingle(row, singleKeys) ? "single" : "vault";
}

export async function loadArtistDepot(artistSlug: string): Promise<{ songs: PublicSong[]; albums: PublicAlbum[] }> {
  const sb = serviceClient();
  if (!sb) return { songs: [], albums: [] };
  const slug = depotSlug(artistSlug);
  const [{ rows, singleKeys }, albumRes] = await Promise.all([
    loadArtistRows(slug),
    sb
      .from("gfs_albums")
      .select("id, title, working_title, status, track_target, sort_order, geekfon_release_date, gfs_album_tracks(song_id, kind, position)")
      .eq("artist_slug", slug)
      .order("sort_order", { ascending: true }),
  ]);
  if (albumRes.error) console.error("depot albums", slug, albumRes.error.message);

  const songs = rows.map(r => toPublic(r, accessOf(r, singleKeys)));
  const ids = new Set(songs.map(s => s.id));
  type AlbumRow = {
    id: string; title: string | null; working_title: string | null; status: string; track_target: number | null;
    geekfon_release_date: string | null; gfs_album_tracks: { song_id: string; kind: string; position: number }[] | null;
  };
  const albums: PublicAlbum[] = ((albumRes.error ? [] : albumRes.data ?? []) as AlbumRow[]).map(a => ({
    id: a.id,
    title: a.title || a.working_title || "Untitled album",
    status: a.status,
    trackTarget: a.track_target ?? 7,
    geekfonReleaseDate: a.geekfon_release_date,
    tracks: [...(a.gfs_album_tracks ?? [])]
      // An album can only reference songs that are live in the depot; a
      // retired song silently leaves its album rather than rendering a hole.
      .filter(t => ids.has(t.song_id))
      .sort((x, y) => x.position - y.position)
      .map(t => ({ songId: t.song_id, kind: t.kind, position: t.position })),
  }));
  return { songs, albums };
}

// One song with everything the server needs to gate it.
export async function loadSong(songId: string): Promise<{ row: DepotRow; access: SongAccess } | null> {
  const sb = serviceClient();
  if (!sb) return null;
  const { data, error } = await sb.from("pulse_songs").select(ROW_COLUMNS).eq("id", songId).is("retired_at", null).maybeSingle();
  if (error || !data) return null;
  const row = data as DepotRow;
  const singleKeys = await singleKeysFor(row.primary_artist_slug);
  return { row, access: accessOf(row, singleKeys) };
}

export async function signStream(srcPath: string, ttlSeconds: number, downloadName?: string): Promise<string | null> {
  const sb = serviceClient();
  if (!sb) return null;
  const { data, error } = await sb.storage
    .from(STREAM_BUCKET)
    .createSignedUrl(srcPath, ttlSeconds, downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) {
    console.error("signStream", srcPath, error?.message);
    return null;
  }
  return data.signedUrl;
}
