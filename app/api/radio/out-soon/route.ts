// GET /api/radio/out-soon
// The home page's "Out soon" banners (Sean, 2026-11-21: "on the front page, we
// need to promote the new albums that are coming out"). Upcoming albums and EPs
// (two or more tracks) from the release calendar in song_release_briefs, the
// same rows HQ's BrandDesk > Releases reads, so a date or cover changed there
// shows here too. Each banner gets the album to buy early when one artist owns
// it (gfs_albums), else the station that plays its songs. Public.
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type OutSoon = {
  key: string; title: string; date: string; cover: string | null; accent: string | null;
  artists: { slug: string; name: string }[];
  tracks: { title: string; artist: string }[];
  album: { id: string; title: string; artistSlug: string } | null;
  station: string | null;
};

type Brief = { artist_slug: string; artist_name: string; track_name: string; album_title: string | null; track_number: number | null; release_date: string; cover_url: string | null };

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const norm = (s: string) => s.toLowerCase().replace(/\s*\(feat\.[^)]*\)/i, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function GET() {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ releases: [] });
  const { data, error } = await sb.from("song_release_briefs")
    .select("artist_slug, artist_name, track_name, album_title, track_number, release_date, cover_url")
    .eq("brand_slug", "geekfon").gte("release_date", today()).not("album_title", "is", null).order("release_date");
  if (error) return NextResponse.json({ releases: [] }, { status: 200 });

  const groups = new Map<string, Brief[]>();
  for (const b of (data ?? []) as Brief[]) {
    const k = `${b.album_title}|${b.release_date}`;
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  const albums = [...groups.values()].filter(g => g.length >= 2).slice(0, 3);
  if (!albums.length) return NextResponse.json({ releases: [] });

  const slugs = [...new Set(albums.flatMap(g => g.map(b => b.artist_slug)))];
  const [{ data: artists }, { data: rows }, { data: songs }, { data: stations }] = await Promise.all([
    sb.from("gfs_artists").select("slug, name, profile").in("slug", slugs),
    sb.from("gfs_albums").select("id, title, artist_slug").in("artist_slug", slugs),
    sb.from("pulse_songs").select("id, primary_artist_slug, title").in("primary_artist_slug", slugs).is("retired_at", null).eq("is_remix", false),
    sb.from("gfs_radio_stations").select("slug, song_ids").eq("active", true).order("sort_order"),
  ]);
  const who = new Map(((artists ?? []) as { slug: string; name: string; profile: { accent?: string } | null }[]).map(a => [a.slug, a]));

  const releases: OutSoon[] = albums.map(g => {
    const rowsSorted = [...g].sort((a, b) => (a.track_number ?? 99) - (b.track_number ?? 99));
    const first = rowsSorted[0];
    const artistSlugs = [...new Set(rowsSorted.map(b => b.artist_slug))];
    const solo = artistSlugs.length === 1 ? artistSlugs[0] : null;
    const owned = solo ? ((rows ?? []) as { id: string; title: string; artist_slug: string }[]).find(a => a.artist_slug === solo && norm(a.title || "") === norm(first.album_title!)) : null;
    const ids = new Set(((songs ?? []) as { id: string; primary_artist_slug: string; title: string }[])
      .filter(s => rowsSorted.some(b => b.artist_slug === s.primary_artist_slug && norm(s.title) === norm(b.track_name))).map(s => s.id));
    const station = ((stations ?? []) as { slug: string; song_ids: string[] | null }[]).find(s => (s.song_ids ?? []).some(id => ids.has(id)))?.slug ?? null;
    return {
      key: `${norm(first.album_title!).replace(/ /g, "-")}-${first.release_date}`,
      title: first.album_title!,
      date: first.release_date,
      cover: rowsSorted.find(b => b.cover_url)?.cover_url ?? null,
      accent: solo ? who.get(solo)?.profile?.accent ?? null : null,
      artists: artistSlugs.map(s => ({ slug: s, name: who.get(s)?.name || rowsSorted.find(b => b.artist_slug === s)!.artist_name })),
      tracks: rowsSorted.map(b => ({ title: b.track_name, artist: who.get(b.artist_slug)?.name || b.artist_name })),
      album: owned ? { id: owned.id, title: owned.title, artistSlug: solo! } : null,
      station: owned ? null : station,
    };
  });
  return NextResponse.json({ releases }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
}
