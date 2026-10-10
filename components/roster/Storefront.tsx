"use client";
// The artist storefront (2026-10-04, Sean), modelled on the artist sections
// of lesaruss.com/projects/geekfon-society: full-body portrait on the left;
// on the right the kicker, name, tagline and short bio up top, and all the
// real estate below for the music.
//
// MUSIC. Listed like Apple Music: thumbnail, song, artist, album, time. Songs
// that are out (DistroKid live, lib/server/depot.ts) play in full; the rest
// play a 30-second preview cut on the server. A floating player sits at the
// bottom. The goal is to get a listener interested enough to support the
// artist, so the list ends on that call to action.
//
// TOUR. "Support <artist>" swaps the portrait and turns the music panel into
// a guided tour of what $11 gets you, each stop with a visual of the feature
// (mocked where the feature is not live yet, and labelled as a preview). A
// Support now button stays in reach the whole way; the last stop is the offer.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useArtistPlayer, type PlayerTrack } from "./ArtistPlayer";
import type { PublicAlbum, PublicSong } from "@/lib/server/depot";
import type { RadioStation } from "@/lib/server/radio";
import type { RosterAccess } from "./useRosterAccess";
import { startSupportCheckout } from "./checkout";
import { PLATFORM_ICONS } from "@/lib/platformIcons";
import { AlbumScreen, FeedScreen, GalleryScreen, ChatScreen, RadioScreen, PressScreen } from "./TourMockups";
import Chat from "./Chat";
import "./storefront.css";

// Music (the storefront), Support (the tour and the $11 offer), or the group
// chat, which opens free to everyone for its first days (Sean, 2026-10-10).
export type StoreMode = "music" | "tour" | "chat";

export type StorefrontPost = { text?: string; title?: string; thumb?: string; media?: string; date?: string };

type Props = {
  slug: string;
  artistName: string;
  kicker: string;
  tagline: string | null;
  blurb: string | null;
  portraitUrl: string | null;
  tourPortraitUrl: string | null;
  songs: PublicSong[];
  albums: PublicAlbum[];
  access: RosterAccess;
  supporter: boolean;
  /** Signed in and the access answer isn't back yet: hold the Support asks. */
  pending?: boolean;
  stations: RadioStation[];
  // Articles featuring the artist (what Pulse used to be; Sean 2026-10-04).
  press: { title?: string; blurb?: string; thumb?: string; tag?: string; date?: string; href?: string }[];
  // Founding Fan badge art (profile.badgeUrl), shown on the offer slide.
  badgeUrl?: string | null;
  posts: StorefrontPost[];
  galleryCount: number;
  mode: StoreMode;
  onMode: (m: StoreMode) => void;
  // Direct profile links per platform when known (profile.platformLinks);
  // otherwise each platform opens a search for the artist and latest single.
  platformLinks?: Record<string, string>;
  // Scripted group-chat preview (lib/chatPreview.ts) with the cast's thumbnails.
  chat?: StoreChat;
  // Group shot (bands): show the whole image, never zoom or crop it, so no
  // member is cut off. Solo portraits keep the head-to-hip zoom.
  group?: boolean;
};

export type StoreChat = { room: string; me: string; people: Record<string, { name: string; avatar: string | null }>; lines: { from: string; text: string }[] };

// Where the artist can be found. DistroKid gives no per-store links, so
// unless a direct link is stored the button opens that store's search.
const PLATFORMS: { key: string; title: string; search: (q: string) => string; primary?: boolean }[] = [
  { key: "spotify", title: "Spotify", search: q => `https://open.spotify.com/search/${q}`, primary: true },
  { key: "apple-music", title: "Apple Music", search: q => `https://music.apple.com/us/search?term=${q}`, primary: true },
  { key: "youtube-music", title: "YouTube Music", search: q => `https://music.youtube.com/search?q=${q}`, primary: true },
  { key: "amazon-music", title: "Amazon Music", search: q => `https://music.amazon.com/search/${q}` },
  { key: "tidal", title: "TIDAL", search: q => `https://listen.tidal.com/search?q=${q}` },
  { key: "deezer", title: "Deezer", search: q => `https://www.deezer.com/search/${q}` },
  { key: "pandora", title: "Pandora", search: q => `https://www.pandora.com/search/${q}/all` },
  { key: "iheartradio", title: "iHeartRadio", search: q => `https://www.iheart.com/search/?q=${q}` },
];

function PlatformIcon({ k }: { k: string }) {
  const ic = PLATFORM_ICONS[k];
  if (!ic) return null;
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={ic.path} fill={ic.hex === "#000000" ? "currentColor" : ic.hex} /></svg>;
}

function ListenOn({ artistName, single, links }: { artistName: string; single: string | null; links?: Record<string, string> }) {
  const q = encodeURIComponent(single ? `${artistName} ${single}` : artistName);
  const href = (pl: (typeof PLATFORMS)[number]) => links?.[pl.key] || pl.search(q);
  return (
    <div className="sf-listen">
      <span className="sf-listen-label">Listen on</span>
      {PLATFORMS.filter(pl => pl.primary).map(pl => (
        <a key={pl.key} className="sf-listen-btn" href={href(pl)} target="_blank" rel="noopener noreferrer" aria-label={`${artistName} on ${pl.title}`}>
          <PlatformIcon k={pl.key} /><span>{pl.title}</span>
        </a>
      ))}
      <details className="sf-listen-more">
        <summary>More</summary>
        <div className="sf-listen-menu">
          {PLATFORMS.filter(pl => !pl.primary).map(pl => (
            <a key={pl.key} href={href(pl)} target="_blank" rel="noopener noreferrer">
              <PlatformIcon k={pl.key} />{pl.title}
            </a>
          ))}
        </div>
      </details>
    </div>
  );
}

function fmt(s: number | null | undefined): string {
  if (!s || !isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function Storefront(p: Props) {
  // Label artists sell their current album; other artists sell any album
  // they have, and with none the Support tour sells the artist's season pass.
  const labelAlbums = p.albums.filter(a => a.label).length ? p.albums.filter(a => a.label) : p.albums;
  const album = labelAlbums.find(a => !a.out) ?? labelAlbums[labelAlbums.length - 1] ?? null;
  const albumOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of p.albums) for (const t of a.tracks) if (!m.has(t.songId)) m.set(t.songId, a.title);
    return m;
  }, [p.albums]);

  // Album tracks in order, then remixes, then anything else announced.
  const list = useMemo(() => {
    const byId = new Map(p.songs.map(s => [s.id, s]));
    const seen = new Set<string>();
    const out: PublicSong[] = [];
    const push = (s?: PublicSong) => { if (s && !seen.has(s.id)) { seen.add(s.id); out.push(s); } };
    for (const a of labelAlbums) [...a.tracks].sort((x, y) => x.position - y.position).forEach(t => { const s = byId.get(t.songId); if (s && !s.isRemix) push(s); });
    p.songs.filter(s => !s.isRemix).forEach(push);
    p.songs.filter(s => s.isRemix).forEach(push);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.songs, p.albums]);


  return (
    <section className={"sf" + (p.mode === "tour" ? " sf-touring" : "")}>
      <div className="sf-left">
        <div className={"sf-portrait" + (p.group ? " sf-portrait-group" : "")}>
          {p.portraitUrl && <img key="music" className={"sf-img" + (p.mode !== "tour" ? " on" : "")} src={p.portraitUrl} alt={`${p.artistName}`} />}
          {p.tourPortraitUrl && <img key="tour" className={"sf-img" + (p.mode === "tour" ? " on" : "")} src={p.tourPortraitUrl} alt="" aria-hidden={p.mode !== "tour"} />}
        </div>
      </div>
      <div className="sf-right">
        {p.mode === "music" ? (
          <>
            {/* Same element and style as the Support page title (Sean, 2026-10-04). */}
            <div className="sf-title-row">
              <div className="tour-name sf-title" role="heading" aria-level={1}>{p.artistName}</div>
              {/* Back to the roster (Sean, 2026-10-04): far right of the name row,
                  a step smaller, in the accent's complementary color. */}
              <a className="sf-roster-link" href="/roster">← Roster</a>
            </div>
            <div className="sf-kicker">{p.kicker}</div>
            {p.tagline && <div className="sf-tagline">{p.tagline}</div>}
            {p.blurb && <p className="sf-blurb">{p.blurb}</p>}
            {/* Straight into the characters (Sean, 2026-10-10): the group chat's
                first days read free, no sign-in. */}
            <button type="button" className="sf-chat-link" onClick={() => p.onMode("chat")}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
              Read the crew&apos;s group chat · free
            </button>
            {list.some(x => x.access === "single") && (
              <ListenOn artistName={p.artistName} single={[...list].reverse().find(x => x.access === "single" && !x.isRemix)?.title ?? null} links={p.platformLinks} />
            )}
            <Music {...p} list={list} albumOf={albumOf} album={album} />
          </>
        ) : p.mode === "chat" ? (
          <div className="sf-chat">
            <div className="sf-title-row">
              <div className="tour-name sf-title" role="heading" aria-level={1}>{p.artistName}</div>
              <button type="button" className="sf-btn" onClick={() => p.onMode("music")} aria-label="Back to the music">← Music</button>
            </div>
            <Chat slug={p.slug} artistName={p.artistName} onSupport={() => p.onMode("tour")} />
          </div>
        ) : (
          <Tour {...p} album={album} list={list} />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- music ---

// What an artist with no album on file is selling: the songs on the page, as
// their first album.
function firstAlbumTitle(artist: string): string {
  return `${artist}'s first album`;
}

function Music(p: Props & { list: PublicSong[]; albumOf: Map<string, string>; album: PublicAlbum | null }) {
  // The player itself lives in the artist layout (ArtistPlayer), so it keeps
  // playing across sections; this list only feeds it.
  const player = useArtistPlayer();
  const setDock = player?.setDock;
  // Stable ref callback: mounts register the dock slot, unmounts release it.
  const dockRef = useCallback((el: HTMLDivElement | null) => { setDock?.(el); }, [setDock]);
  const { onMode } = p;
  useEffect(() => {
    player?.setHearAll(() => onMode("tour"));
    return () => player?.setHearAll(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.setHearAll, onMode]);

  function source(s: PublicSong): { url: string; capped: boolean } {
    if (s.access === "single") return { url: s.playUrl, capped: false };
    const g = p.access.songs[s.id];
    return g ? { url: g.stream, capped: false } : { url: s.playUrl, capped: true };
  }
  const queue: PlayerTrack[] = p.list.map(s => {
    const src = source(s);
    return { id: s.id, title: s.title, artist: p.artistName, coverUrl: s.coverUrl, url: src.url, capped: src.capped, durationSeconds: s.durationSeconds };
  });
  const curId = player?.current?.id ?? null;
  const playing = !!player?.playing;
  const outCount = p.list.filter(s => s.access === "single").length;

  // Nothing released yet (HQ release state): no list, just what's coming.
  if (!p.list.length) {
    return (
      <div className="sf-music">
        <div className="sf-soon">
          <span className="sf-soon-kicker">Music</span>
          <p className="sf-soon-title">{p.artistName}&apos;s first release is on the way.</p>
          <p className="sf-soon-text">Songs appear here the day they come out.{p.supporter ? " You're a supporter, so you'll hear every one in full." : ""}</p>
        </div>
        {!p.supporter && !p.pending && (
          <div className="sf-cta-bar">
            <p><strong>Be there from the first song.</strong> Support {p.artistName} for $11: their first album in full as it&apos;s released, plus the Gallery, Chat and Press.</p>
            <button className="sf-btn sf-btn-go" onClick={() => p.onMode("tour")}>Support {p.artistName}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sf-music">
      <div className="sf-music-note">
        {p.supporter
          ? "You're a supporter. Every song plays in full."
          : `${outCount ? `${outCount === 1 ? "The single that's out plays" : "Singles that are out play"} in full. ` : ""}Everything else is a 30-second preview.`}
      </div>

      <div className="am" role="table" aria-label={`${p.artistName} songs`}>
        <div className="am-head" role="row">
          <span role="columnheader" className="am-c-song">Song</span>
          <span role="columnheader" className="am-c-artist">Artist</span>
          <span role="columnheader" className="am-c-album">Album</span>
          <span role="columnheader" className="am-c-time">Time</span>
        </div>
        <div className="am-scroll">
        {p.list.map((s, i) => {
          const isCur = curId === s.id;
          const full = !queue[i].capped;
          return (
            <button key={s.id} role="row" className={"am-row" + (isCur ? " cur" : "")} onClick={() => player?.playQueue(queue, i)} aria-label={`${isCur && playing ? "Pause" : "Play"} ${s.title}${full ? "" : " (30-second preview)"}`}>
              <span className="am-c-song" role="cell">
                <span className="am-thumb">
                  {s.thumbUrl || s.coverUrl ? <img src={s.thumbUrl || s.coverUrl!} alt="" loading="lazy" decoding="async" /> : null}
                  <span className="am-thumb-icon" aria-hidden="true">
                    {isCur && playing
                      ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                      : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
                  </span>
                </span>
                <span className="am-title-wrap">
                  <span className="am-title">{s.title}</span>
                  <span className="am-sub">{p.artistName}</span>
                </span>
              </span>
              <span className="am-c-artist" role="cell">{p.artistName}</span>
              <span className="am-c-album" role="cell">{p.albumOf.get(s.id) || (s.isRemix ? "GeekFon exclusive" : p.album ? "Single" : "First album")}</span>
              <span className="am-c-time" role="cell">
                {full
                  ? <span className={"am-tag " + (s.access === "single" ? "am-tag-out" : "am-tag-full")}>{s.access === "single" ? "Out now" : "Full"}</span>
                  : <span className="am-tag">Preview</span>}
                <span className="am-dur">{fmt(s.durationSeconds)}</span>
              </span>
            </button>
          );
        })}

        </div>
      </div>

      {/* The player docks here, above the Support bar, taking one row's room. */}
      <div className="am-dock" ref={dockRef} />
      {!p.supporter && !p.pending && (
        <div className="sf-cta-bar">
          <p>
            <strong>Want to hear all of it?</strong> Support {p.artistName} for $11: <em>{p.album ? p.album.title : firstAlbumTitle(p.artistName)}</em>, the songs on this page, in full, plus the Gallery, Chat and Press.
          </p>
          <button className="sf-btn sf-btn-go" onClick={() => p.onMode("tour")}>Support {p.artistName}</button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- tour ---

function Tour(props: Props & { album: PublicAlbum | null; list: PublicSong[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // No album on file yet: the tour sells the songs on the page as the
  // artist's first album (Sean, 2026-10-05: support buys an album, not every
  // song they ever make; a new album is its own release).
  const realAlbum = props.album;
  const p = {
    ...props,
    album: realAlbum ?? ({
      id: "", title: firstAlbumTitle(props.artistName), status: "released", out: true, label: false,
      coverUrl: props.list.find(s => s.coverUrl)?.coverUrl ?? props.tourPortraitUrl ?? props.portraitUrl ?? null, trackTarget: props.list.length, geekfonReleaseDate: null,
      tracks: props.list.map((s, i) => ({ songId: s.id, kind: s.isRemix ? "remix" : "track", position: i + 1 })),
    } as unknown as PublicAlbum),
  };
  const albumSongs = p.list.filter(s => p.album.tracks.some(t => t.songId === s.id));
  const mains = albumSongs.filter(s => !s.isRemix);
  const remixes = albumSongs.filter(s => s.isRemix);
  const covers = p.list.map(s => s.coverUrl).filter((u): u is string => !!u);

  async function buy() {
    setBusy(true);
    setError(await startSupportCheckout(realAlbum ? realAlbum.id : null, p.slug));
    setBusy(false);
  }

  const single = p.list.find(x => x.access === "single" && !x.isRemix) ?? p.list[0];
  const images = Array.from(new Set([p.portraitUrl, p.tourPortraitUrl, ...covers].filter((u): u is string => !!u)));
  const stationWithArtist = p.stations.find(st => st.slug !== "main")?.slug || "main";

  const stops: { key: string; title: string; text: string; visual: React.ReactNode }[] = [
    {
      key: "album",
      title: `${p.album.title}, in full`,
      text: realAlbum
        ? p.album.out
          ? `All ${mains.length} songs${remixes.length ? ` and ${remixes.length} GeekFon-exclusive remixes` : ""}, streaming in full with downloads. Only on GeekFon.`
          : `${mains.length} of ${p.album.trackTarget} songs so far${remixes.length ? `, plus ${remixes.length} GeekFon-exclusive remixes` : ""}, streaming in full, and every song added to the album until it's complete. Only on GeekFon.`
        : mains.length
          ? `The ${mains.length} songs${remixes.length ? ` and ${remixes.length} GeekFon-exclusive remixes` : ""} on ${p.artistName}'s first album, streaming in full. A new album is a new release of its own.`
          : `${p.artistName}'s first album, streaming in full the day it comes out.`,
      visual: <AlbumScreen artist={p.artistName} slug={p.slug} album={p.album} songs={mains} />,
    },
    {
      key: "social",
      title: "Social feed",
      text: `${p.artistName}'s posts, photos and behind-the-scenes, as they land.`,
      visual: <FeedScreen artist={p.artistName} avatar={p.portraitUrl} posts={p.posts} images={covers} />,
    },
    {
      key: "gallery",
      title: "The Gallery",
      text: `Phone and desktop wallpapers and art made just for ${p.artistName}'s supporters${p.galleryCount ? ` (${p.galleryCount} so far)` : ""}, with new ones as they're made.`,
      visual: <GalleryScreen slug={p.slug} images={images} wallpaper={p.tourPortraitUrl || p.portraitUrl} />,
    },
    {
      key: "chat",
      title: "Chat",
      text: `Read the artists' group chat every day, from ${p.artistName}'s side: how the crew talks, plans and teases each other. A new episode daily. October 1 to 3 are free to read now, and supporters read every day after.`,
      visual: p.chat
        ? <ChatScreen artist={p.artistName} chat={p.chat} />
        : <div className="tv-chat"><p className="tv-chat-empty">The artists&apos; group chat opens here soon.</p></div>,
    },
    {
      key: "radio",
      title: "Radio",
      text: `Every GeekFon station ${p.artistName} is on, playing live with everyone else listening.`,
      visual: <RadioScreen artist={p.artistName} song={single?.title || p.album.title} stations={p.stations} active={stationWithArtist} />,
    },
    {
      key: "press",
      title: "Press",
      text: `Every article featuring ${p.artistName}: features, interviews and news, as they're published.`,
      visual: <PressScreen artist={p.artistName} slug={p.slug} articles={p.press} images={covers} />,
    },
  ];

  const offer = (
    <div className="tour-offer2">
      <div className="to-art">
        {p.album.coverUrl && <img src={p.album.coverUrl} alt="" />}

      </div>
      <div className="to-copy">
        <span className="tour-num">Support {p.artistName}</span>
        <div className="to-price-row">
          <div className="tour-offer-price">$11<span>one time</span></div>
          {!p.album.out && (
            <div className="to-badge2">
              {p.badgeUrl && <img src={p.badgeUrl} alt="Founding Fan badge" />}
              <span>Founding Fan</span>
            </div>
          )}
        </div>
        <ul>
          <li><strong>{p.album.title}</strong> in full{!realAlbum ? `: all ${mains.length} songs${remixes.length ? ` and ${remixes.length} remixes` : ""}` : p.album.out ? `: all ${mains.length} songs${remixes.length ? ` and ${remixes.length} remixes` : ""}, with downloads` : `: ${mains.length} of ${p.album.trackTarget} songs so far, and the rest as they're finished`}</li>
          <li><strong>Social feed, Press and Chat</strong>, every day</li>
          <li><strong>The Gallery</strong> of wallpapers and art</li>
          <li><strong>Radio</strong>: every station {p.artistName} is on</li>
          {!p.album.out && <li>Counts as your pre-order, with a <strong>Founding Fan</strong> badge</li>}
        </ul>
        <button className="sf-btn sf-btn-go sf-btn-big" onClick={buy} disabled={busy}>{busy ? "Starting checkout..." : `Support ${p.artistName} · $11`}</button>
        {error && <p className="tour-error">{error}</p>}
      </div>
    </div>
  );
  const total = stops.length + 1; // the stops, then the offer
  const [i, setI] = useState(0);
  const last = total - 1;
  const stop = stops[i];
  const nextLabel = i + 1 < stops.length ? stops[i + 1].title : "Support";

  return (
    <div className="tour">
      <div className="tour-top">
        <div className="tour-name">{p.artistName}</div>
        <div className="tour-top-actions">
          {/* Roster link on both pages (Sean, 2026-10-05); the way back to the
              music is the Back button below. */}
          <a className="sf-roster-link" href="/roster">← Roster</a>
          <button className="sf-btn sf-btn-go" onClick={buy} disabled={busy}>{busy ? "Starting..." : "Support now · $11"}</button>
        </div>
      </div>
      <div className="tour-panel" aria-live="polite">
        {i < last && stop ? (
          <div className="tour-slide">
            <div className="tour-visual">{stop.visual}</div>
            <div className="tour-copy">
              <span className="tour-num">What you get · {i + 1} of {total}</span>
              <h3>{stop.title}</h3>
              <p>{stop.text}</p>
            </div>
          </div>
        ) : offer}
      </div>
      <div className="tour-nav">
        {i === 0
          ? <button className="sf-btn" onClick={() => p.onMode("music")} aria-label="Back to the music">← Back</button>
          : <button className="sf-btn" onClick={() => setI(i - 1)} aria-label="Previous">← Back</button>}
        <div className="tour-dots" role="tablist" aria-label="Steps">
          {Array.from({ length: total }, (_, n) => (
            <button key={n} role="tab" aria-selected={n === i} aria-label={n === last ? "Support" : stops[n].title} className={"tour-dot" + (n === i ? " on" : "")} onClick={() => setI(n)} />
          ))}
        </div>
        {i < last
          ? <button className="sf-btn sf-btn-dark" onClick={() => setI(i + 1)}>Next: {nextLabel} →</button>
          : <button className="sf-btn" onClick={() => setI(0)}>Start over</button>}
      </div>
    </div>
  );
}
