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
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicAlbum, PublicSong } from "@/lib/server/depot";
import type { RadioStation } from "@/lib/server/radio";
import type { RosterAccess } from "./useRosterAccess";
import { startSupportCheckout } from "./checkout";
import "./storefront.css";

const PREVIEW_SECONDS = 30;

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
  stations: RadioStation[];
  storyLabels: string[];
  posts: StorefrontPost[];
  galleryCount: number;
  mode: "music" | "tour";
  onMode: (m: "music" | "tour") => void;
};

function fmt(s: number | null | undefined): string {
  if (!s || !isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function Storefront(p: Props) {
  const labelAlbums = p.albums.filter(a => a.label);
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

  const tourRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (p.mode === "tour") tourRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [p.mode]);

  return (
    <section className={"sf" + (p.mode === "tour" ? " sf-touring" : "")}>
      <div className="sf-left">
        <div className="sf-portrait">
          {p.portraitUrl && <img key="music" className={"sf-img" + (p.mode === "music" ? " on" : "")} src={p.portraitUrl} alt={`${p.artistName}`} />}
          {p.tourPortraitUrl && <img key="tour" className={"sf-img" + (p.mode === "tour" ? " on" : "")} src={p.tourPortraitUrl} alt="" aria-hidden={p.mode !== "tour"} />}
        </div>
      </div>
      <div className="sf-right">
        <div className="sf-kicker">{p.kicker}</div>
        <h1 className="sf-name">{p.artistName}</h1>
        {p.tagline && <div className="sf-tagline">{p.tagline}</div>}
        {p.blurb && <p className="sf-blurb">{p.blurb}</p>}

        {p.mode === "music" ? (
          <Music {...p} list={list} albumOf={albumOf} album={album} />
        ) : (
          <div ref={tourRef}>
            {album && <Tour {...p} album={album} list={list} />}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- music ---

function Music(p: Props & { list: PublicSong[]; albumOf: Map<string, string>; album: PublicAlbum | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [cur, setCur] = useState<number | null>(null); // index in list
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const song = cur !== null ? p.list[cur] : null;

  function source(s: PublicSong): { url: string; capped: boolean } {
    if (s.access === "single") return { url: s.playUrl, capped: false };
    const g = p.access.songs[s.id];
    return g ? { url: g.stream, capped: false } : { url: s.playUrl, capped: true };
  }

  function playAt(i: number) {
    const a = audioRef.current;
    const s = p.list[i];
    if (!a || !s) return;
    if (cur === i) {
      if (a.paused) a.play().catch(() => setPlaying(false)); else a.pause();
      return;
    }
    document.querySelectorAll("audio").forEach(el => { if (el !== a) el.pause(); });
    a.src = source(s).url;
    setCur(i);
    setTime(0);
    a.play().catch(() => setPlaying(false));
  }

  function next(dir = 1) {
    if (cur === null) return;
    const n = cur + dir;
    if (n >= 0 && n < p.list.length) playAt(n);
    else { audioRef.current?.pause(); }
  }

  function onTime() {
    const a = audioRef.current;
    if (!a || !song) return;
    if (source(song).capped && a.currentTime >= PREVIEW_SECONDS) { next(); return; }
    setTime(a.currentTime);
  }

  const capped = song ? source(song).capped : false;
  const max = song ? (capped ? Math.min(PREVIEW_SECONDS, song.durationSeconds || PREVIEW_SECONDS) : (song.durationSeconds || 0)) : 0;
  const outCount = p.list.filter(s => s.access === "single").length;

  return (
    <div className="sf-music">
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={onTime}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => next()}
      />
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
        {p.list.map((s, i) => {
          const isCur = cur === i;
          const full = !source(s).capped;
          return (
            <button key={s.id} role="row" className={"am-row" + (isCur ? " cur" : "")} onClick={() => playAt(i)} aria-label={`${isCur && playing ? "Pause" : "Play"} ${s.title}${full ? "" : " (30-second preview)"}`}>
              <span className="am-c-song" role="cell">
                <span className="am-thumb">
                  {s.coverUrl ? <img src={s.coverUrl} alt="" loading="lazy" /> : null}
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
              <span className="am-c-album" role="cell">{p.albumOf.get(s.id) || (s.isRemix ? "GeekFon exclusive" : "Single")}</span>
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

      {!p.supporter && (
        <div className="sf-cta">
          <div>
            <div className="sf-cta-title">Want to hear all of it?</div>
            <p className="sf-cta-sub">
              Support {p.artistName} for $11 and get {p.album ? <><em>{p.album.title}</em> in full</> : "every song in full"}, the Gallery, Chat, and the full story.
            </p>
          </div>
          <button className="sf-btn sf-btn-go" onClick={() => p.onMode("tour")}>Support {p.artistName}</button>
        </div>
      )}

      {song && (
        <div className="am-player" role="region" aria-label="Player">
          <div className="am-p-controls">
            <button className="am-p-btn" onClick={() => next(-1)} aria-label="Previous" disabled={cur === 0}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11 6v12L2.5 12zM21 6v12l-8.5-6z" /></svg>
            </button>
            <button className="am-p-btn am-p-main" onClick={() => cur !== null && playAt(cur)} aria-label={playing ? "Pause" : "Play"}>
              {playing
                ? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <button className="am-p-btn" onClick={() => next(1)} aria-label="Next" disabled={cur === p.list.length - 1}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13 6v12l8.5-6zM3 6v12l8.5-6z" /></svg>
            </button>
          </div>
          <div className="am-p-now">
            {song.coverUrl ? <img src={song.coverUrl} alt="" /> : <span className="am-p-blank" />}
            <div className="am-p-meta">
              <div className="am-p-title">{song.title}</div>
              <div className="am-p-artist">{p.artistName}{capped ? " · 30-second preview" : ""}</div>
              <div className="am-p-bar"><div style={{ width: `${max ? Math.min(100, (time / max) * 100) : 0}%` }} /></div>
            </div>
          </div>
          {capped && !p.supporter && (
            <button className="sf-btn sf-btn-go am-p-cta" onClick={() => p.onMode("tour")}>Hear it all</button>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- tour ---

function Tour(p: Props & { album: PublicAlbum; list: PublicSong[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const albumSongs = p.list.filter(s => p.album.tracks.some(t => t.songId === s.id));
  const mains = albumSongs.filter(s => !s.isRemix);
  const remixes = albumSongs.filter(s => s.isRemix);
  const covers = p.list.map(s => s.coverUrl).filter((u): u is string => !!u);
  const post = p.posts.find(x => x.text || x.title) || null;

  async function buy() {
    setBusy(true);
    setError(await startSupportCheckout(p.album.id, p.slug));
    setBusy(false);
  }

  const stops: { key: string; title: string; text: string; visual: React.ReactNode }[] = [
    {
      key: "album",
      title: `${p.album.title}, in full`,
      text: `All ${mains.length} songs${remixes.length ? ` and ${remixes.length} GeekFon-exclusive remixes` : ""}, streaming in full${p.album.out ? " with downloads" : ", before the album is out everywhere"}.`,
      visual: (
        <div className="tv-album">
          {p.album.coverUrl && <img className="tv-album-cover" src={p.album.coverUrl} alt="" />}
          <ol className="tv-album-list">
            {mains.slice(0, 7).map(s => <li key={s.id}><span>{s.title}</span><span className="tv-check">✓ Full</span></li>)}
          </ol>
        </div>
      ),
    },
    {
      key: "pulse",
      title: "Pulse and Social",
      text: `${p.artistName}'s posts, news and behind-the-scenes, as they land.`,
      visual: (
        <div className="tv-post">
          <div className="tv-post-head">
            {p.portraitUrl && <img src={p.portraitUrl} alt="" />}
            <div><strong>{p.artistName}</strong><span>{post?.date || "Pulse"}</span></div>
          </div>
          {post?.thumb && <img className="tv-post-img" src={post.thumb} alt="" />}
          <p>{(post?.title || post?.text || `New from ${p.artistName}.`).slice(0, 160)}</p>
        </div>
      ),
    },
    {
      key: "gallery",
      title: "The Gallery",
      text: `Phone and desktop wallpapers and art made just for ${p.artistName}'s supporters${p.galleryCount ? ` (${p.galleryCount} so far)` : ""}, new ones as they're made.`,
      visual: (
        <div className="tv-gallery">
          <div className="tv-phone">{p.tourPortraitUrl || p.portraitUrl ? <img src={(p.tourPortraitUrl || p.portraitUrl)!} alt="" /> : null}</div>
          <div className="tv-grid">{covers.slice(0, 4).map((u, i) => <img key={i} src={u} alt="" />)}</div>
          <span className="tv-preview">Preview</span>
        </div>
      ),
    },
    {
      key: "chat",
      title: "Chat",
      text: `Hang out with ${p.artistName} and other supporters. Opening soon, and you're in from day one.`,
      visual: (
        <div className="tv-chat">
          <div className="tv-chat-head"># {p.artistName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-supporters</div>
          <div className="tv-msg"><span className="tv-av" style={{ background: "#7c3aed" }}>M</span><p>first listen of the full album... wow</p></div>
          <div className="tv-msg"><span className="tv-av" style={{ background: "#0ea5e9" }}>K</span><p>track 4 is my favourite so far</p></div>
          <div className="tv-msg tv-msg-me"><p>same!! can&apos;t stop playing it</p></div>
          <span className="tv-preview">Preview</span>
        </div>
      ),
    },
    {
      key: "radio",
      title: "Radio",
      text: `Every GeekFon station ${p.artistName} is on, playing live with everyone else listening.`,
      visual: (
        <div className="tv-radio">
          <span className="tv-live"><i /> Live</span>
          <div className="tv-radio-list">{p.stations.map(st => <span key={st.slug}>{st.name}</span>)}</div>
        </div>
      ),
    },
    {
      key: "story",
      title: `${p.artistName}'s full story`,
      text: "The whole Bible behind the music, and the lyrics to every song.",
      visual: (
        <div className="tv-story">
          {(p.storyLabels.length ? p.storyLabels.slice(0, 6) : ["Backstory", "Lore", "Lyrics"]).map(l => <span key={l}>{l}</span>)}
        </div>
      ),
    },
  ];

  return (
    <div className="tour">
      <div className="tour-bar">
        <button className="tour-back" onClick={() => p.onMode("music")}>← Back to the music</button>
        <button className="sf-btn sf-btn-go" onClick={buy} disabled={busy}>{busy ? "Starting..." : `Support now · $11`}</button>
      </div>
      <h2 className="tour-title">What you get when you support {p.artistName}</h2>
      <ol className="tour-stops">
        {stops.map((st, i) => (
          <li key={st.key} className="tour-stop">
            <div className="tour-copy">
              <span className="tour-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </div>
            <div className="tour-visual">{st.visual}</div>
          </li>
        ))}
      </ol>
      <div className="tour-offer">
        <div className="tour-offer-price">$11<span>one time</span></div>
        <ul>
          <li>{p.album.title} in full{p.album.out ? ", with downloads" : ", before it's out everywhere"}</li>
          <li>Pulse, Social and Chat</li>
          <li>The Gallery</li>
          <li>Radio and {p.artistName}&apos;s full story</li>
          {!p.album.out && <li>Counts as your pre-order, with a Founding Fan badge</li>}
        </ul>
        <button className="sf-btn sf-btn-go sf-btn-big" onClick={buy} disabled={busy}>{busy ? "Starting checkout..." : `Support ${p.artistName} · $11`}</button>
        {error && <p className="tour-error">{error}</p>}
      </div>
    </div>
  );
}
