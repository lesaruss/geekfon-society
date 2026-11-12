// GeekFon Radio's rotation, built from the depot. Server-only.
//
// CONTROL vs CONTENT. radio_tracks stays the control plane: the admin Radio
// Schedule page (dashboard/radio-schedule) decides which songs are on air
// (is_public, release_date) and in what order (radio_order, sort_order), and
// pinned overrides reference radio_tracks ids. The AUDIO and METADATA now
// come from the linked depot row (pulse_songs.source_radio_track_id): the
// depot's stream, its real duration (radio_tracks had 15 nulls defaulting
// to 180s, which cut songs short or left dead air) and the artist's real
// name. Verified 2026-10-04: all 67 songs on air link to a live depot row.
//
// One builder for every surface (/radio, the homepage mini player, the admin
// Command Center's Now Playing) so the synced clock agrees everywhere.
//
// VAULT SONGS ON AIR. The rotation is unchanged from before this switch, so
// unreleased songs that Sean has on air keep playing in full, as they did.
// Their URLs are short-lived signed links rather than public bucket paths.
// Whether radio should play only public singles for non-supporters is an
// open decision in the geekfon-launch playbook (radio ideas, V session).

import { serviceClient } from "./supabaseAdmin";
import { STREAM_BUCKET, publicStreamUrl, titleKey, labelStates, sizedImage, depotSlug, type LabelState } from "./depot";
import type { RadioTrack, ScheduleOverride } from "@/lib/radioSchedule";

const SIGNED_TTL_SECONDS = 24 * 60 * 60;
const MAIN_STATION_SLUG = "main";

// ---------------------------------------------------------------------------
// Sponsor spots (Sean, 2026-10-05): a station's own artist reads a short spot
// with their instrumental underneath, BETWEEN songs, never over one. Each
// station's active public.radio_spots rows are slotted into its rotation after
// every `every_n_songs` songs, taking turns when a station has several. Being
// part of the rotation keeps the synced clock identical for every listener.
// Managed from the admin Radio Schedule page (Spots).

type SpotRow = { label: string; sponsor_name: string; voiced_by: string | null; src_url: string; duration_seconds: number; click_url: string | null; every_n_songs: number; starts_at: string | null; ends_at: string | null };

async function stationSpots(sb: NonNullable<ReturnType<typeof serviceClient>>, slug: string): Promise<SpotRow[]> {
  const { data } = await sb
    .from("radio_spots")
    .select("label, sponsor_name, voiced_by, src_url, duration_seconds, click_url, every_n_songs, starts_at, ends_at")
    .eq("is_active", true)
    .contains("station_slugs", [slug])
    .order("sort_order", { ascending: true });
  const now = Date.now();
  return ((data ?? []) as SpotRow[]).filter(s =>
    (!s.starts_at || Date.parse(s.starts_at) <= now) && (!s.ends_at || Date.parse(s.ends_at) > now));
}

function withSpots(rotation: RadioTrack[], spots: SpotRow[], names: Map<string, string>): RadioTrack[] {
  if (!spots.length || !rotation.length) return rotation;
  const every = Math.max(1, Math.min(...spots.map(s => s.every_n_songs || 4)));
  const out: RadioTrack[] = [];
  let next = 0;
  rotation.forEach((t, i) => {
    out.push(t);
    if ((i + 1) % every !== 0) return;
    const s = spots[next++ % spots.length];
    out.push({
      kind: "spot",
      path: s.src_url,
      title: s.label,
      artist: (s.voiced_by && names.get(s.voiced_by)) || s.sponsor_name,
      durationSeconds: Number(s.duration_seconds),
      linkUrl: s.click_url || undefined,
      sponsor: s.sponsor_name,
    });
  });
  return out;
}

// Radio plays every song in the catalog, released or not, for discovery:
// listeners can't pick or see what's next (Sean, 2026-10-04). The Radio
// Schedule's per-track on/off is the way to hold a song back. Release state
// only decides whether a song streams from its public path (out now) or a
// signed link (everything else).
function labelSingle(states: Map<string, LabelState>, artist: string, id: string): boolean | null {
  const st = states.get(artist);
  return st ? st.liveIds.has(id) : null;
}

type RtRow = { id: string; artist_slug: string; title: string; radio_order: number | null; sort_order: number | null };
type PsRow = { id: string; title: string; primary_artist_slug: string; src_path: string | null; duration_seconds: number | null; source_radio_track_id: string; cover_art_path: string | null; thumb_path: string | null };

// mode "urls": path is a playable URL (public for singles, signed for vault).
// mode "ids":  path is the depot song id; for server-side Now Playing only.
export async function buildRadioSchedule(mode: "urls" | "ids"): Promise<{ rotation: RadioTrack[]; overrides: ScheduleOverride[] }> {
  const sb = serviceClient();
  if (!sb) return { rotation: [], overrides: [] };
  const nowIso = new Date().toISOString();

  const [{ data: rt }, { data: ov }, { data: artists }, spots] = await Promise.all([
    sb.from("radio_tracks")
      .select("id, artist_slug, title, radio_order, sort_order")
      .eq("is_public", true)
      .neq("src_path", "PENDING")
      .lte("release_date", nowIso)
      .order("radio_order", { ascending: true, nullsFirst: false })
      .order("artist_slug", { ascending: true })
      .order("sort_order", { ascending: true }),
    sb.from("radio_schedule_overrides")
      .select("kind, label, ad_src_path, starts_at, duration_seconds, cadence_seconds, track_id")
      .eq("is_active", true),
    sb.from("gfs_artists").select("slug, name, profile"),
    stationSpots(sb, MAIN_STATION_SLUG),
  ]);

  const rtRows = (rt ?? []) as RtRow[];
  const pinnedIds = (ov ?? []).filter((o: { kind: string; track_id: string | null }) => o.kind === "pinned" && o.track_id).map((o: { track_id: string }) => o.track_id);
  const linkIds = Array.from(new Set([...rtRows.map(r => r.id), ...pinnedIds]));
  const { data: ps } = linkIds.length
    ? await sb.from("pulse_songs")
        .select("id, title, primary_artist_slug, src_path, duration_seconds, source_radio_track_id, cover_art_path, thumb_path")
        .in("source_radio_track_id", linkIds)
        .is("retired_at", null)
    : { data: [] as PsRow[] };
  const byRt = new Map(((ps ?? []) as PsRow[]).map(p => [p.source_radio_track_id, p]));

  type ArtistRow = { slug: string; name: string | null; profile: { tracks?: { n?: string; v?: string }[] } | null };
  const names = new Map<string, string>();
  const singles = new Set<string>(); // `${artist}|${titleKey}`
  for (const a of (artists ?? []) as ArtistRow[]) {
    if (a.name) names.set(a.slug, a.name);
    for (const t of a.profile?.tracks ?? []) if (t.v === "public" && t.n) singles.add(`${a.slug}|${titleKey(t.n)}`);
  }

  const states = await labelStates(((ps ?? []) as PsRow[]).map(p => p.primary_artist_slug));
  const songs = new Map<string, PsRow>(); // depot id -> row, for everything referenced
  for (const p of (ps ?? []) as PsRow[]) {
    songs.set(p.id, p);
  }
  const isSingleRow = (p: { id: string; primary_artist_slug: string; title: string }) =>
    labelSingle(states, p.primary_artist_slug, p.id) ?? singles.has(`${p.primary_artist_slug}|${titleKey(p.title)}`);

  // Resolve each referenced song's playable URL once.
  const urlFor = new Map<string, string>();
  if (mode === "urls") {
    const vault: PsRow[] = [];
    for (const p of songs.values()) {
      if (!p.src_path) continue;
      if (isSingleRow(p)) urlFor.set(p.id, publicStreamUrl(p.src_path));
      else vault.push(p);
    }
    if (vault.length) {
      const { data: signed } = await sb.storage.from(STREAM_BUCKET).createSignedUrls(vault.map(v => v.src_path!), SIGNED_TTL_SECONDS);
      (signed ?? []).forEach((s, i) => { if (s.signedUrl) urlFor.set(vault[i].id, s.signedUrl); });
    }
  }
  const pathOf = (p: PsRow) => (mode === "ids" ? p.id : urlFor.get(p.id));
  const artistOf = (p: PsRow) => names.get(p.primary_artist_slug) || p.primary_artist_slug;

  const rotation: RadioTrack[] = [];
  for (const r of rtRows) {
    const p = byRt.get(r.id);
    const path = p && pathOf(p);
    if (!p || !path) continue;
    rotation.push({ artist: artistOf(p), slug: p.primary_artist_slug, songId: p.id, title: p.title, path, durationSeconds: p.duration_seconds || 180, coverUrl: radioCover(p) });
  }

  type OvRow = { kind: string; label: string | null; ad_src_path: string | null; starts_at: string | null; duration_seconds: number | null; cadence_seconds: number | null; track_id: string | null };
  const overrides: ScheduleOverride[] = ((ov ?? []) as OvRow[]).flatMap((o): ScheduleOverride[] => {
    if (o.kind === "pinned" && o.starts_at && o.track_id) {
      const p = byRt.get(o.track_id);
      const path = p && pathOf(p);
      if (!p || !path) return [];
      return [{
        kind: "pinned",
        path,
        title: p.title,
        artist: artistOf(p),
        slug: p.primary_artist_slug,
        songId: p.id,
        coverUrl: radioCover(p),
        startsAtMs: new Date(o.starts_at).getTime(),
        durationSeconds: o.duration_seconds || p.duration_seconds || 180,
        label: o.label || undefined,
      }];
    }
    if (o.kind === "ad_cadence") {
      return [{
        kind: "ad_cadence",
        // Ads live in the same public bucket as before; they are not vault audio.
        adSrcPath: o.ad_src_path ? (mode === "urls" ? publicStreamUrl(o.ad_src_path) : o.ad_src_path) : null,
        cadenceSeconds: o.cadence_seconds || 0,
        durationSeconds: o.duration_seconds || 30,
        label: o.label || undefined,
      }];
    }
    return [];
  });

  return { rotation: withSpots(rotation, spots, names), overrides };
}

// ---------------------------------------------------------------------------
// Genre stations (Sean, 2026-10-04): "having just one radio station that
// plays every song may not be appealing, especially if people don't like
// J-pop." Each station in public.gfs_radio_stations names its ARTISTS, and
// plays every non-remix depot song by them, so a newly imported song joins its
// artist's station with no manual step. Unreleased songs play in full here
// too: Sean, same day, "everything minus the remixes... fair game."
//
// Order is a stable round-robin across the station's artists (each artist's
// songs by sort_order, then title), so listeners hear a mix instead of one
// artist's whole catalog in a row, and every listener's synced clock agrees.

// Each station's color and ink (text on that color) come from the database
// (Sean, 2026-11-11), so the GeekFon brand sequence restyles the player
// without code. `seasonal` is a station that holds its songs (exclusive), like
// Holiday Radio, shown on its own shelf.
export type RadioStation = { slug: string; name: string; tagline: string | null; color?: string | null; ink?: string | null; seasonal?: boolean };

export const MAIN_STATION: RadioStation = { slug: MAIN_STATION_SLUG, name: "GeekFon Radio", tagline: "The whole roster", color: "#ECE22D", ink: "#0B0B0C", seasonal: false };

type StationRow = { slug: string; name: string; tagline: string | null; color: string | null; ink: string | null; exclusive: boolean | null };
const toStation = (r: StationRow): RadioStation => ({ slug: r.slug, name: r.name, tagline: r.tagline, color: r.color, ink: r.ink, seasonal: !!r.exclusive });

export async function listStations(): Promise<RadioStation[]> {
  const sb = serviceClient();
  if (!sb) return [MAIN_STATION];
  const { data } = await sb
    .from("gfs_radio_stations")
    .select("slug, name, tagline, color, ink, exclusive")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return [MAIN_STATION, ...((data ?? []) as StationRow[]).map(toStation)];
}

// The song's cover art for the radio's center circle (Sean, 2026-10-05), as a
// resized square copy.
function radioCover(p: { cover_art_path: string | null; thumb_path: string | null }): string | null {
  return sizedImage(p.cover_art_path || p.thumb_path, 720, "cover");
}

type StationSong = PsRow & { is_remix: boolean | null; sort_order: number | null };

export async function buildStationSchedule(slug: string): Promise<{ rotation: RadioTrack[]; overrides: ScheduleOverride[] } | null> {
  if (slug === MAIN_STATION.slug) return buildRadioSchedule("urls");
  const sb = serviceClient();
  if (!sb) return null;

  const { data: station } = await sb
    .from("gfs_radio_stations")
    .select("slug, artist_slugs, song_ids, include_remixes")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!station) return null;
  const songIds = (station.song_ids ?? []) as string[];

  // Two kinds of station (2026-10-04): an artist lineup (genre stations), or
  // a hand-picked song list from any artist (Holiday Radio). Songs held by an
  // `exclusive` station (seasonal ones) stay off every other station.
  let q = sb
    .from("pulse_songs")
    .select("id, title, primary_artist_slug, src_path, duration_seconds, source_radio_track_id, is_remix, sort_order, cover_art_path, thumb_path")
    .is("retired_at", null)
    .not("src_path", "is", null);
  q = songIds.length ? q.in("id", songIds) : q.in("primary_artist_slug", (station.artist_slugs ?? []) as string[]);
  if (!station.include_remixes) q = q.eq("is_remix", false);
  const [{ data: rawSongs }, { data: exclusiveRows }, spots] = await Promise.all([
    q,
    sb.from("gfs_radio_stations").select("slug, song_ids").eq("active", true).eq("exclusive", true).neq("slug", slug),
    stationSpots(sb, slug),
  ]);
  const heldElsewhere = new Set(((exclusiveRows ?? []) as { song_ids: string[] | null }[]).flatMap(r => r.song_ids ?? []));
  const candidates = ((rawSongs ?? []) as StationSong[]).filter(s => !heldElsewhere.has(s.id));
  const states = await labelStates(candidates.map(s => s.primary_artist_slug));
  const songs = candidates;

  // Artist order: the lineup as listed, or for a song list, the order the
  // artists first appear in it.
  const artists: string[] = songIds.length
    ? Array.from(new Set(songIds.map(id => songs.find(s => s.id === id)?.primary_artist_slug).filter((a): a is string => !!a)))
    : ((station.artist_slugs ?? []) as string[]);
  const voices = spots.map(sp => sp.voiced_by).filter((v): v is string => !!v);
  const { data: artistRows } = await sb.from("gfs_artists").select("slug, name, profile").in("slug", Array.from(new Set([...artists, ...voices])));

  type ArtistRow = { slug: string; name: string | null; profile: { tracks?: { n?: string; v?: string }[] } | null };
  const names = new Map<string, string>();
  const singles = new Set<string>();
  for (const a of (artistRows ?? []) as ArtistRow[]) {
    if (a.name) names.set(a.slug, a.name);
    for (const t of a.profile?.tracks ?? []) if (t.v === "public" && t.n) singles.add(`${a.slug}|${titleKey(t.n)}`);
  }

  // Per-artist queues in a stable order, then interleave.
  const queues = artists.map(a =>
    songs
      .filter(s => s.primary_artist_slug === a)
      .sort((x, y) => (x.sort_order ?? 9999) - (y.sort_order ?? 9999) || x.title.localeCompare(y.title))
  );
  const ordered: StationSong[] = [];
  for (let i = 0; queues.some(qu => i < qu.length); i++) {
    for (const qu of queues) if (i < qu.length) ordered.push(qu[i]);
  }

  const rotation = await tracksFor(sb, ordered, names, singles, states);
  return { rotation: withSpots(rotation, spots, names), overrides: [] };
}

// Depot rows to playable radio tracks. Singles stream from their public path;
// everything else is a signed link (one storage request for all of them).
async function tracksFor(
  sb: NonNullable<ReturnType<typeof serviceClient>>,
  ordered: StationSong[],
  names: Map<string, string>,
  singles: Set<string>,
  states: Map<string, LabelState>,
): Promise<RadioTrack[]> {
  const isSingleRow = (s: StationSong) =>
    labelSingle(states, s.primary_artist_slug, s.id) ?? singles.has(`${s.primary_artist_slug}|${titleKey(s.title)}`);
  const vault = ordered.filter(s => !isSingleRow(s));
  const signedBy = new Map<string, string>();
  if (vault.length) {
    const { data: signed } = await sb.storage.from(STREAM_BUCKET).createSignedUrls(vault.map(v => v.src_path!), SIGNED_TTL_SECONDS);
    (signed ?? []).forEach((s, i) => { if (s.signedUrl) signedBy.set(vault[i].id, s.signedUrl); });
  }
  const rotation: RadioTrack[] = [];
  for (const s of ordered) {
    const path = signedBy.get(s.id) ?? (isSingleRow(s) ? publicStreamUrl(s.src_path!) : undefined);
    if (!path) continue;
    rotation.push({ artist: names.get(s.primary_artist_slug) || s.primary_artist_slug, slug: s.primary_artist_slug, songId: s.id, title: s.title, path, durationSeconds: s.duration_seconds || 180, coverUrl: radioCover(s) });
  }
  return rotation;
}

// ---------------------------------------------------------------------------
// Artist radio (Sean, 2026-11-12: every artist gets their own artist radio).
// Station slug "artist:<slug>". One synced rotation: the artist's own songs
// first (no remixes), then the songs of the genre station(s) the artist is on,
// the closest-sounding company. An artist on no genre station (Rustblood
// Prophets, Straight & Narrow while Rock Radio is off) is followed by the main
// GeekFon Radio rotation. Songs a seasonal station holds stay off, as on every
// other station. The player shows it as "<Artist> Radio" in the artist's
// accent color (gfs_artists.profile.accent).

export const ARTIST_STATION_PREFIX = "artist:";
const ARTIST_STATION = /^artist:([a-z0-9-]{1,64})$/;

export function artistStationSlug(slug: string): string { return `${ARTIST_STATION_PREFIX}${slug}`; }

/** Text color that reads on a background color: near-black or white. */
export function inkFor(hex: string | null | undefined): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#FFFFFF";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // Pick whichever of the two inks has the higher contrast ratio.
  return (L + 0.05) / 0.0545 >= 1.05 / (L + 0.05) ? "#0B0B0C" : "#FFFFFF";
}

export type ArtistStationInfo = RadioStation & { artistSlug: string; basedOn: string[] };

export async function buildArtistSchedule(station: string): Promise<{ rotation: RadioTrack[]; overrides: ScheduleOverride[]; info: ArtistStationInfo } | null> {
  const m = ARTIST_STATION.exec(station);
  if (!m) return null;
  const sb = serviceClient();
  if (!sb) return null;
  const slug = depotSlug(m[1]);

  const [{ data: artist }, { data: lineups }, { data: exclusiveRows }, { data: rawSongs }] = await Promise.all([
    sb.from("gfs_artists").select("slug, name, profile").eq("slug", slug).maybeSingle(),
    sb.from("gfs_radio_stations").select("slug, name, artist_slugs, exclusive").eq("active", true).contains("artist_slugs", [slug]).order("sort_order", { ascending: true }),
    sb.from("gfs_radio_stations").select("slug, song_ids").eq("active", true).eq("exclusive", true),
    sb.from("pulse_songs")
      .select("id, title, primary_artist_slug, src_path, duration_seconds, source_radio_track_id, is_remix, sort_order, cover_art_path, thumb_path")
      .eq("primary_artist_slug", slug).eq("is_remix", false).is("retired_at", null).not("src_path", "is", null),
  ]);
  if (!artist) return null;
  type ArtistRow = { slug: string; name: string | null; profile: { accent?: string; tracks?: { n?: string; v?: string }[] } | null };
  const a = artist as ArtistRow;
  const name = a.name || slug;
  const held = new Set(((exclusiveRows ?? []) as { song_ids: string[] | null }[]).flatMap(r => r.song_ids ?? []));
  const own = ((rawSongs ?? []) as StationSong[])
    .filter(s => !held.has(s.id))
    .sort((x, y) => (x.sort_order ?? 9999) - (y.sort_order ?? 9999) || x.title.localeCompare(y.title));

  const names = new Map<string, string>([[slug, name]]);
  const singles = new Set<string>();
  for (const t of a.profile?.tracks ?? []) if (t.v === "public" && t.n) singles.add(`${slug}|${titleKey(t.n)}`);
  const states = await labelStates([slug]);
  const mine = await tracksFor(sb, own, names, singles, states);

  // The company: every genre station the artist is on, else GeekFon Radio.
  const genre = ((lineups ?? []) as { slug: string; name: string; exclusive: boolean | null }[]).filter(s => !s.exclusive);
  const parts = genre.length
    ? await Promise.all(genre.map(s => buildStationSchedule(s.slug)))
    : [await buildRadioSchedule("urls")];
  const ownIds = new Set(mine.map(t => t.songId));
  const company: RadioTrack[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    for (const t of p?.rotation ?? []) {
      if (t.kind !== "spot" && (t.slug === slug || (t.songId && (ownIds.has(t.songId) || seen.has(t.songId))))) continue;
      if (t.songId) seen.add(t.songId);
      company.push(t);
    }
  }

  const accent = a.profile?.accent || MAIN_STATION.color || "#ECE22D";
  const info: ArtistStationInfo = {
    slug: artistStationSlug(slug),
    name: `${name} Radio`,
    tagline: genre.length ? `${name}, then ${genre.map(s => s.name).join(" and ")}` : `${name}, then GeekFon Radio`,
    color: accent,
    ink: inkFor(accent),
    seasonal: false,
    artistSlug: slug,
    basedOn: genre.length ? genre.map(s => s.slug) : [MAIN_STATION.slug],
  };
  return { rotation: [...mine, ...company], overrides: [], info };
}

// Stations an artist can be heard on, for the "on GeekFon Radio" strip on
// their page: GeekFon Radio itself, every lineup station that lists them,
// and any song-list station (Holiday) holding one of their announced songs.
export async function stationsFeaturing(artistSlug: string): Promise<RadioStation[]> {
  const sb = serviceClient();
  if (!sb) return [MAIN_STATION];
  const [{ data: stations }, { data: songs }] = await Promise.all([
    sb.from("gfs_radio_stations").select("slug, name, tagline, color, ink, exclusive, artist_slugs, song_ids").eq("active", true).order("sort_order", { ascending: true }),
    sb.from("pulse_songs").select("id").eq("primary_artist_slug", artistSlug).is("retired_at", null),
  ]);
  const mine = new Set(((songs ?? []) as { id: string }[]).map(s => s.id));
  type Row = StationRow & { artist_slugs: string[] | null; song_ids: string[] | null };
  const featured = ((stations ?? []) as Row[]).filter(s =>
    (s.song_ids?.length ? s.song_ids.some(id => mine.has(id)) : (s.artist_slugs ?? []).includes(artistSlug))
  );
  return [MAIN_STATION, ...featured.map(toStation)];
}
