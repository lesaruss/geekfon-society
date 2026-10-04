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
//
// LABEL RELEASE MODEL (2026-10-04, Sean: "simulate it like it's a real record
// label"). For artists in LABEL_ARTISTS, release state comes from HQ's
// release pipeline, not the Song Manager tags:
//   - a song is OUT (a public single) when its release brief
//     (song_release_briefs, linked by pulse_songs.release_brief_id) is
//     distrokid_status 'live', or 'submitted' with a release_date that has
//     arrived. Setting the DistroKid date in HQ when a song is submitted makes
//     it flip on that day with no deploy and no second step;
//   - an album is VISIBLE when it is not in progress or already has a song
//     out; nothing from an album still being made (or songs on no visible
//     album) is shown to anyone outside HQ, radio included;
//   - an album is OUT when every one of its tracks (remixes aside) is out.
// Other artists keep the interim rule for radio, but on ARTIST PAGES (and the
// preview/stream gate) every artist follows HQ release state for ACCESS
// (2026-10-04, Sean): every catalog song is listed, a song plays in full
// only once HQ marks it out on DistroKid, and everything else is a 30-second
// preview that the $11 unlocks in full. The radio still plays every song in
// full; that's the discovery hack, and the $11 buys on-demand listening.
// Album-level hiding (nothing from an album still being made) applies to
// LABEL_ARTISTS only.

import { serviceClient, SUPABASE_URL } from "./supabaseAdmin";

// Bucket that holds the MP3 streams. Public today; the vault files move to a
// private bucket in the follow-up storage step, which only changes this
// constant and the stored paths, never the callers.
export const STREAM_BUCKET = "geekfon-radio-audio";
export const PREVIEW_SECONDS = 30;

const PUBLIC_STREAM_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STREAM_BUCKET}/`;

export type SongAccess = "single" | "vault";

// Artists whose public catalog follows the label release model (see top).
export const LABEL_ARTISTS = new Set<string>(["roxanne"]);

export type LabelState = {
  liveIds: Set<string>;         // songs out now (public singles)
  visibleIds: Set<string>;      // songs anyone outside HQ may see
  visibleAlbumIds: Set<string>;
  outAlbumIds: Set<string>;     // albums fully released
};

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
  // Label model: true once every track is out. Before that the album shows
  // as "coming" with its singles out and the rest previewed.
  out: boolean;
  label: boolean;
  coverUrl: string | null;
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
  release_brief_id: string | null;
};

const ROW_COLUMNS =
  "id, slug, title, primary_artist_slug, season, is_remix, duration_seconds, size_bytes, cover_art_path, thumb_path, release_date, sort_order, radio_order, src_path, lyrics_en, lyrics_original, lyrics_original_lang, source_radio_track_id, release_brief_id";

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

// Release state for label-model artists, keyed by depot slug. Artists not in
// LABEL_ARTISTS are absent from the map (callers fall back to the interim
// rule). One round trip per table regardless of how many artists.
export async function labelStates(artistSlugs: string[], anyArtist = false): Promise<Map<string, LabelState>> {
  const out = new Map<string, LabelState>();
  const slugs = Array.from(new Set(artistSlugs.map(depotSlug))).filter(a => anyArtist || LABEL_ARTISTS.has(a));
  const sb = serviceClient();
  if (!sb || !slugs.length) return out;
  const [briefs, songs, albums] = await Promise.all([
    sb.from("song_release_briefs").select("id, artist_slug, distrokid_status, release_date").in("artist_slug", slugs),
    sb.from("pulse_songs").select("id, primary_artist_slug, release_brief_id").in("primary_artist_slug", slugs).is("retired_at", null),
    sb.from("gfs_albums").select("id, artist_slug, status, gfs_album_tracks(song_id, kind)").in("artist_slug", slugs),
  ]);
  if (briefs.error || songs.error || albums.error) {
    // Fail closed: with no release data, nothing is out and nothing is shown.
    console.error("labelStates", briefs.error?.message, songs.error?.message, albums.error?.message);
  }
  const today = new Date().toISOString().slice(0, 10);
  const liveBriefs = new Set(
    ((briefs.data ?? []) as { id: string; distrokid_status: string | null; release_date: string | null }[])
      .filter(b => b.distrokid_status === "live" || (b.distrokid_status === "submitted" && !!b.release_date && b.release_date.slice(0, 10) <= today))
      .map(b => b.id)
  );
  for (const a of slugs) out.set(a, { liveIds: new Set(), visibleIds: new Set(), visibleAlbumIds: new Set(), outAlbumIds: new Set() });
  for (const r of (songs.data ?? []) as { id: string; primary_artist_slug: string; release_brief_id: string | null }[]) {
    const st = out.get(r.primary_artist_slug);
    if (st && r.release_brief_id && liveBriefs.has(r.release_brief_id)) { st.liveIds.add(r.id); st.visibleIds.add(r.id); }
  }
  type AlbumRow = { id: string; artist_slug: string; status: string; gfs_album_tracks: { song_id: string; kind: string }[] | null };
  for (const al of (albums.data ?? []) as AlbumRow[]) {
    const st = out.get(al.artist_slug);
    if (!st) continue;
    const tracks = al.gfs_album_tracks ?? [];
    const anyOut = tracks.some(t => st.liveIds.has(t.song_id));
    if (al.status === "in_progress" && !anyOut) continue;
    st.visibleAlbumIds.add(al.id);
    tracks.forEach(t => st.visibleIds.add(t.song_id));
    const mains = tracks.filter(t => t.kind !== "remix");
    if (mains.length && mains.every(t => st.liveIds.has(t.song_id))) st.outAlbumIds.add(al.id);
  }
  return out;
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

// What decides a song's access for one artist: the label state when the
// artist is on the label model, otherwise the interim Song Manager tags.
export type ReleaseRule = { singleKeys: Set<string>; label: LabelState | null };

// Rows for one artist. For label-model artists only the rows anyone outside
// HQ may see are returned, so no caller can leak an unannounced song.
// pageGate: apply HQ release state to any artist (artist pages), not only
// LABEL_ARTISTS (which radio and the stream gate key off).
export async function loadArtistRows(artistSlug: string, pageGate = false): Promise<{ rows: DepotRow[]; rule: ReleaseRule }> {
  const sb = serviceClient();
  const slug = depotSlug(artistSlug);
  if (!sb) return { rows: [], rule: { singleKeys: new Set(), label: null } };
  const [{ data, error }, singleKeys, states] = await Promise.all([
    sb.from("pulse_songs").select(ROW_COLUMNS).eq("primary_artist_slug", slug).is("retired_at", null),
    singleKeysFor(slug),
    labelStates([slug], pageGate),
  ]);
  const rule: ReleaseRule = { singleKeys, label: states.get(slug) ?? null };
  if (error) {
    console.error("depot rows", slug, error.message);
    return { rows: [], rule };
  }
  let rows = (data ?? []) as DepotRow[];
  if (rule.label && LABEL_ARTISTS.has(slug)) rows = rows.filter(r => rule.label!.visibleIds.has(r.id));
  return { rows: orderRows(rows), rule };
}

export function accessOf(row: DepotRow, rule: ReleaseRule): SongAccess {
  if (rule.label) return rule.label.liveIds.has(row.id) ? "single" : "vault";
  return isSingle(row, rule.singleKeys) ? "single" : "vault";
}

export async function loadArtistDepot(artistSlug: string): Promise<{ songs: PublicSong[]; albums: PublicAlbum[] }> {
  const sb = serviceClient();
  if (!sb) return { songs: [], albums: [] };
  const slug = depotSlug(artistSlug);
  const [{ rows, rule }, albumRes] = await Promise.all([
    loadArtistRows(slug, true),
    sb
      .from("gfs_albums")
      .select("id, title, working_title, status, track_target, sort_order, geekfon_release_date, gfs_album_tracks(song_id, kind, position)")
      .eq("artist_slug", slug)
      .order("sort_order", { ascending: true }),
  ]);
  if (albumRes.error) console.error("depot albums", slug, albumRes.error.message);

  const songs = rows.map(r => toPublic(r, accessOf(r, rule)));
  const ids = new Set(songs.map(s => s.id));
  const byId = new Map(songs.map(s => [s.id, s]));
  type AlbumRow = {
    id: string; title: string | null; working_title: string | null; status: string; track_target: number | null;
    geekfon_release_date: string | null; gfs_album_tracks: { song_id: string; kind: string; position: number }[] | null;
  };
  const albumRows = ((albumRes.error ? [] : albumRes.data ?? []) as AlbumRow[])
    .filter(a => !rule.label || !LABEL_ARTISTS.has(slug) || rule.label.visibleAlbumIds.has(a.id));
  const albums: PublicAlbum[] = albumRows.map(a => ({
    id: a.id,
    title: a.title || a.working_title || "Untitled album",
    status: a.status,
    out: rule.label ? rule.label.outAlbumIds.has(a.id) : a.status === "released",
    label: !!rule.label,
    coverUrl: albumCover(a.title || a.working_title || "", a.gfs_album_tracks ?? [], byId),
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

// An album has no cover of its own yet: use its title track's cover, else
// its first track's.
function albumCover(title: string, tracks: { song_id: string; kind: string; position: number }[], byId: Map<string, PublicSong>): string | null {
  const songs = [...tracks].sort((x, y) => x.position - y.position).map(t => byId.get(t.song_id)).filter((s): s is PublicSong => !!s);
  const key = titleKey(title);
  const titled = songs.find(s => !s.isRemix && titleKey(s.title) === key);
  return (titled ?? songs.find(s => !s.isRemix) ?? songs[0])?.coverUrl ?? null;
}

// One song with everything the server needs to gate it.
export async function loadSong(songId: string): Promise<{ row: DepotRow; access: SongAccess } | null> {
  const sb = serviceClient();
  if (!sb) return null;
  const { data, error } = await sb.from("pulse_songs").select(ROW_COLUMNS).eq("id", songId).is("retired_at", null).maybeSingle();
  if (error || !data) return null;
  const row = data as DepotRow;
  const [singleKeys, states] = await Promise.all([singleKeysFor(row.primary_artist_slug), labelStates([row.primary_artist_slug], true)]);
  const label = states.get(row.primary_artist_slug) ?? null;
  // A label-model song nobody outside HQ may see does not exist publicly.
  if (label && LABEL_ARTISTS.has(row.primary_artist_slug) && !label.visibleIds.has(row.id)) return null;
  return { row, access: accessOf(row, { singleKeys, label }) };
}

// Signs many vault paths in one storage request. One call per song (as the
// access route used to make) opened a burst of storage connections on every
// page view and exhausted the database's connection slots on 2026-10-04.
export async function signStreams(srcPaths: string[], ttlSeconds: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const paths = [...new Set(srcPaths.filter(Boolean))];
  if (paths.length === 0) return out;
  const sb = serviceClient();
  if (!sb) return out;
  const { data, error } = await sb.storage.from(STREAM_BUCKET).createSignedUrls(paths, ttlSeconds);
  if (error || !data) {
    console.error("signStreams", paths.length, error?.message);
    return out;
  }
  // Results come back in request order (the Gallery relies on the same).
  data.forEach((d, i) => {
    if (d.signedUrl && !d.error) out.set(paths[i], d.signedUrl);
    else console.error("signStreams", paths[i], d.error);
  });
  return out;
}

// A signed stream URL that downloads under a file name. The download name is
// not part of the signature; this matches what createSignedUrl appends.
export function asDownload(signedUrl: string, fileName: string): string {
  return `${signedUrl}&${encodeURI(new URLSearchParams({ download: fileName }).toString())}`;
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
