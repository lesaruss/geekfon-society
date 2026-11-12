// Data for the Seat 2 Artists page (/roster) and artist pages (/<artist>).
// Server-only. Reuses the depot, gallery and radio loaders the old artist page
// used; nothing here is gated content: songs carry no vault path (the free view
// plays /api/songs/<id>/preview, supporters get full streams from
// /api/roster/<artist>/access), and the gallery holds only public items plus
// a count of the supporter ones.
//
// The artist's profile (gfs_artists) is readable with the anon key, so the
// page's name, art and metadata render even where the service key is missing
// (a local build); everything else needs the service key, and `complete` says
// whether it was there.

import { serviceClient, SUPABASE_URL } from "./supabaseAdmin";
import { loadArtistDepot, depotSlug, type PublicAlbum } from "./depot";
import { loadGallery, featuredGallery } from "./gallery";
import { stationsFeaturing, listStations, inkFor, MAIN_STATION } from "./radio";
import { ARTIST_ORDER } from "@/lib/roster";
import { plainDashes, type ArtistPageData, type RosterArtist, type RosterData, type StationChip, type PressItem, type GalleryTile } from "@/lib/artistPage";

type Profile = {
  name?: string; tagline?: string; bio?: string | string[]; shortBio?: string; quote?: string; genre?: string; location?: string;
  pills?: ({ label?: string } | string)[]; accent?: string; cutoutUrl?: string; profileUrl?: string; heroUrl?: string;
  chatAvatar?: string; videoThumbUrl?: string; tabPortraits?: Record<string, string>; members?: { name: string; img?: string }[];
  news?: { slug?: string; title?: string; tag?: string; date?: string; blurb?: string; thumb?: string; href?: string; draft?: boolean | null }[];
};
type ArtistRow = { slug: string; name: string | null; profile: Profile | null; updated_at?: string | null };

const FALLBACK_ACCENT = "#ECE22D";
const chip = (s: { slug: string; name: string; color?: string | null; ink?: string | null }): StationChip => ({ slug: s.slug, name: s.name, color: s.color ?? null, ink: s.ink ?? null });

/** gfs_artists rows: service key when present, else the anon REST view. */
async function artistRows(slugs?: string[]): Promise<ArtistRow[]> {
  const sb = serviceClient();
  if (sb) {
    let q = sb.from("gfs_artists").select("slug, name, profile, updated_at");
    if (slugs) q = q.in("slug", slugs);
    const { data } = await q;
    return (data ?? []) as ArtistRow[];
  }
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) return [];
  const filter = slugs ? `&slug=in.(${slugs.map(encodeURIComponent).join(",")})` : "";
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gfs_artists?select=slug,name,profile,updated_at${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
    });
    return res.ok ? ((await res.json()) as ArtistRow[]) : [];
  } catch {
    return [];
  }
}

// Portrait files are replaced in place; the row's updated_at busts caches (as the old page did).
function bust(u: string | null | undefined, v: string | null | undefined): string | null {
  if (!u) return null;
  return v ? `${u}${u.includes("?") ? "&" : "?"}v=${encodeURIComponent(v)}` : u;
}

function bioOf(p: Profile): string[] {
  const raw = p.bio ?? p.shortBio;
  if (!raw) return [];
  let list: string[] = [];
  if (Array.isArray(raw)) list = raw;
  else {
    const t = raw.trim();
    if (t.startsWith("[")) { try { const j = JSON.parse(t); if (Array.isArray(j)) list = j.map(String); } catch { list = [t]; } }
    else list = t.split(/\n{2,}/);
  }
  return list.map(x => plainDashes(String(x).trim())).filter(Boolean);
}

/** The album the $11 buys today, as the live Support tour picks it (components/roster/Storefront). */
export function sellableAlbum(albums: PublicAlbum[]): { id: string; title: string } | null {
  const pool = albums.filter(a => a.label).length ? albums.filter(a => a.label) : albums;
  const a = pool.find(x => !x.out) ?? pool[pool.length - 1] ?? null;
  return a ? { id: a.id, title: a.title } : null;
}

/** Press: the artist's profile.news (each has its own page at /<artist>/news/<slug>), with the shared Pulse store's blurb and art where it has them. */
async function pressOf(slug: string, p: Profile): Promise<PressItem[]> {
  const news = (p.news ?? []).filter(n => !n.draft && n.title);
  if (!news.length) return [];
  const extra = new Map<string, { blurb?: string; thumb?: string; tag?: string; date?: string }>();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (key) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/pulse_content_public?brand_slug=eq.geekfon-society&metadata->>original_artist_slug=eq.${encodeURIComponent(slug)}&select=metadata`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
      );
      if (res.ok) {
        for (const r of (await res.json()) as { metadata: Record<string, string> | null }[]) {
          const m = r.metadata ?? {};
          if (m.original_slug) extra.set(m.original_slug, { blurb: m.blurb, thumb: m.thumb, tag: m.publication_tag, date: m.display_date });
        }
      }
    } catch { /* the profile copy is enough */ }
  }
  return news.map(n => {
    const x = (n.slug && extra.get(n.slug)) || {};
    return {
      slug: n.slug ?? null,
      title: plainDashes(n.title!),
      tag: n.tag || x.tag || null,
      date: n.date || x.date || null,
      blurb: (n.blurb || x.blurb) ? plainDashes((n.blurb || x.blurb)!) : null,
      thumb: n.thumb || x.thumb || null,
      href: n.slug ? `/${slug}/news/${n.slug}` : null,
    };
  });
}

export async function loadArtistPage(rawSlug: string): Promise<ArtistPageData | null> {
  const slug = depotSlug(rawSlug.toLowerCase());
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const [row] = await artistRows([slug]);
  if (!row) return null;
  const p = row.profile ?? {};
  const name = row.name || p.name || slug;
  const complete = !!serviceClient();

  const [depot, galleryPublic, featuring, press] = await Promise.all([
    loadArtistDepot(slug),
    loadGallery(slug, "public"),
    stationsFeaturing(slug),
    pressOf(slug, p),
  ]);

  const accent = p.accent || FALLBACK_ACCENT;
  const portrait = bust(p.tabPortraits?.music || p.profileUrl || p.heroUrl, row.updated_at);
  const featured: GalleryTile[] = featuredGallery(name, p, depot.songs).map(g => ({ id: g.id, title: g.title, url: g.url, thumb: g.thumb ?? null, kind: g.kind }));
  const items: GalleryTile[] = [
    ...featured,
    ...galleryPublic.items.map(g => ({ id: g.id, title: g.title, url: g.url, thumb: g.thumb ?? null, kind: g.kind })),
  ];
  const stations = featuring.map(chip);
  const homeStation = featuring.find(s => s.slug !== MAIN_STATION.slug && !s.seasonal);

  return {
    complete,
    slug,
    name,
    tagline: p.tagline ? plainDashes(p.tagline) : null,
    bio: bioOf(p),
    quote: p.quote ? plainDashes(p.quote) : null,
    genre: p.genre || null,
    location: p.location || null,
    pills: (p.pills ?? []).map(x => (typeof x === "string" ? x : x?.label || "")).filter(Boolean),
    accent,
    ink: inkFor(accent),
    cutout: bust(p.cutoutUrl, row.updated_at),
    portrait,
    avatar: p.chatAvatar || portrait,
    videoThumb: p.videoThumbUrl || null,
    songs: depot.songs.map(s => ({
      id: s.id, title: s.title, durationSeconds: s.durationSeconds, coverUrl: s.coverUrl, thumbUrl: s.thumbUrl,
      isRemix: s.isRemix, single: s.access === "single", publicUrl: s.access === "single" ? s.playUrl : null,
    })),
    stations,
    homeStation: homeStation ? chip(homeStation) : null,
    press,
    gallery: { items, lockedCount: galleryPublic.lockedCount },
    album: sellableAlbum(depot.albums),
  };
}

/** Basic facts for metadata (works with the anon key). */
export async function loadArtistMeta(rawSlug: string): Promise<{ slug: string; name: string; description: string; image: string | null } | null> {
  const slug = depotSlug(rawSlug.toLowerCase());
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const [row] = await artistRows([slug]);
  if (!row) return null;
  const p = row.profile ?? {};
  const name = row.name || p.name || slug;
  return {
    slug,
    name,
    description: p.tagline ? plainDashes(p.tagline) : `${name} is an original artist on GeekFon Society.`,
    image: bust(p.tabPortraits?.music || p.profileUrl || p.heroUrl, row.updated_at),
  };
}

export async function loadRoster(): Promise<RosterData> {
  const sb = serviceClient();
  const rows = await artistRows();
  const bySlug = new Map(rows.map(r => [r.slug, r]));

  // Song counts and station lineups need the service key.
  const counts = new Map<string, number>();
  let lineups: { slug: string; name: string; color: string | null; ink: string | null; artist_slugs: string[] | null }[] = [];
  let groups: StationChip[] = [];
  if (sb) {
    const [{ data: songs }, { data: st }, all] = await Promise.all([
      sb.from("pulse_songs").select("primary_artist_slug").is("retired_at", null).eq("is_remix", false).not("src_path", "is", null).limit(5000),
      sb.from("gfs_radio_stations").select("slug, name, color, ink, artist_slugs, exclusive").eq("active", true).order("sort_order", { ascending: true }),
      listStations(),
    ]);
    for (const s of (songs ?? []) as { primary_artist_slug: string }[]) counts.set(s.primary_artist_slug, (counts.get(s.primary_artist_slug) ?? 0) + 1);
    lineups = ((st ?? []) as (typeof lineups[number] & { exclusive: boolean | null })[]).filter(s => !s.exclusive && (s.artist_slugs ?? []).length);
    groups = all.filter(s => lineups.some(l => l.slug === s.slug)).map(chip);
  }

  // The roster in the order the home lineup uses, then anyone else with songs.
  const order: string[] = [...ARTIST_ORDER];
  for (const [slug, n] of counts) if (n > 0 && !order.includes(slug) && bySlug.has(slug)) order.push(slug);

  const artists: RosterArtist[] = order.flatMap(slug => {
    const r = bySlug.get(slug);
    if (!r) return [];
    const p = r.profile ?? {};
    const accent = p.accent || FALLBACK_ACCENT;
    return [{
      slug,
      name: r.name || p.name || slug,
      genre: p.genre || null,
      location: p.location || null,
      picture: p.chatAvatar || bust(p.tabPortraits?.music || p.profileUrl || p.heroUrl, r.updated_at),
      accent,
      ink: inkFor(accent),
      stations: lineups.filter(l => (l.artist_slugs ?? []).includes(slug)).map(chip),
      songCount: counts.get(slug) ?? 0,
    }];
  });
  return { complete: !!sb, artists, groups };
}
