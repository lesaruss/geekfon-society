"use client";
// The new GeekFon site shell (Sean, 2026-11-12: Seat 2: Discovery, locked).
// One client layout for /, /roster and /<artist> (app/(site)/layout.tsx), so
// the live radio, the rail, the "What is this?" panel and the now playing bar
// stay mounted and the music never restarts when moving between pages.
//
// Free, no login. Live: everyone hears the same song, no skip or rewind.
// "What is this?" beside every song: the artist, their stations and the
// lyrics, which are free for every listener. Hearts save on this device and
// play a 30-second preview; unlocking an artist ($11) adds their songs on
// demand. Every artist has their own artist radio ("artist:<slug>").
//
// Pages draw inside the main area and reach the shell through useShell().
// The home page's view lives in the address (?view=home|stations|hearted,
// plus ?station=<slug>) so a view can be shared and Back works.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLiveRadio, songOf, sameSong, fmtTime, PREVIEW_SECONDS, FALLBACK_MAIN, isArtistStation, type Song, type Station, type LiveRadio } from "./useLiveRadio";
import { useArtist, useLyrics, lyricLines, lyricPreview, langName, NEW_TALENT, stColor, stInk, greeting } from "./radioData";
import { RADIO_CSS } from "./radioCss";
import { ARTIST_CSS } from "./artistCss";
import UnlockSheet from "./UnlockSheet";
import { YOU_CSS } from "./youCss";
import { useMe, type Me } from "./useMe";
import { STAFF_HOME } from "@/lib/postAuth";
import type { RadioTrack } from "@/lib/radioSchedule";
import { useRadio as useOldRadio } from "@/components/radio/RadioProvider";
import {
  IcPlay, IcPause, IcHeart, IcHeartSolid, IcLyrics, IcX, IcBack, IcRadio, IcHome, IcArrow, IcOut, IcPopOut, Eq, IcArtists, IcUser,
} from "./icons";

export type View = "home" | "stations" | "hearted";
const VIEWS: View[] = ["home", "stations", "hearted"];
// The brand kit's logo files (BrandDesk > GeekFon Society > Logo): the wordmark on night for the brand spots, the vector wheel elsewhere.
export const LOGO = "/brands/geekfon-society/geekfon-wheel.svg";
const WORDMARK = "/brands/geekfon-society/geekfon-wordmark-reverse.svg";
const BASE_TITLE = "GeekFon Society";

function readView(): View {
  try {
    if (window.location.pathname !== "/") return "home";
    const v = new URLSearchParams(window.location.search).get("view") as View | null;
    return v && VIEWS.includes(v) ? v : "home";
  } catch {
    return "home";
  }
}

/** The songs a station has on the air (no sponsor spots), first one first. */
export function songsOf(rotation: RadioTrack[] | undefined): RadioTrack[] {
  return (rotation ?? []).filter(t => t.kind !== "spot");
}
export function coversOf(rotation: RadioTrack[] | undefined, n: number): string[] {
  const out: string[] = [];
  for (const t of songsOf(rotation)) {
    if (t.coverUrl && !out.includes(t.coverUrl)) out.push(t.coverUrl);
    if (out.length >= n) break;
  }
  return out;
}

export const artistHref = (slug?: string) => (slug ? `/${slug}` : "/roster");
export const artistStation = (slug: string) => `artist:${slug}`;

type ShellCtx = {
  R: LiveRadio;
  view: View;
  go: (v: View) => void;
  hello: string;
  openPanel: (song?: Song | null) => void;
  openLyrics: (song?: Song | null) => void;
  heart: (s: Song | null) => void;
  tuneTo: (slug: string) => void;
  showToast: (text: string) => void;
  /** The $11 unlock sheet for an artist; album, when the page knows it, is what the $11 buys. */
  openUnlock: (slug: string, album?: { id: string; title: string } | null) => void;
  homeStationOf: (slug?: string) => Station | null;
  /** The tab title while nothing plays (each page sets its own). */
  setBaseTitle: (t: string) => void;
  /** Who is signed in (Your GeekFon, the rail and the top bar). */
  me: Me;
  signOut: () => Promise<void>;
};
const Ctx = createContext<ShellCtx | null>(null);
export function useShell(): ShellCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShell outside RadioShell");
  return c;
}

export default function RadioShell({ children }: { children: React.ReactNode }) {
  const R = useLiveRadio();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const onHome = pathname === "/";
  const onYou = pathname === "/you";
  const onArtists = pathname === "/roster" || (!onHome && !onYou && pathname.split("/").filter(Boolean).length === 1);
  const { me, signOut } = useMe();
  const [view, setView] = useState<View>("home");
  const [hello, setHello] = useState("Good evening");
  const [panelOpen, setPanelOpen] = useState(false);
  const [flash, setFlash] = useState(0);
  const [pinned, setPinned] = useState<Song | null>(null);
  const [lyricsFor, setLyricsFor] = useState<Song | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [unlock, setUnlock] = useState<{ slug: string; album?: { id: string; title: string } | null } | null>(null);
  const [baseTitle, setBaseTitle] = useState(BASE_TITLE);
  const mainRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const lyricsClose = useRef<HTMLButtonElement | null>(null);

  // The site's older radio (components/radio/RadioProvider, still used by
  // /classic) steps aside wherever this shell runs.
  const oldRadio = useOldRadio();
  const oldStop = useRef(oldRadio.stop);
  oldStop.current = oldRadio.stop;
  useEffect(() => { oldStop.current(); }, [pathname]);

  /* ---------- routing: the home view is in the address ---------- */
  useEffect(() => {
    setView(readView());
    setPanelOpen(false);
    setLyricsFor(null);
    setUnlock(null);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    if (typeof window !== "undefined" && window.innerWidth <= 760) window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const onPop = () => { setView(readView()); setPanelOpen(false); setLyricsFor(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((v: View) => {
    setPanelOpen(false);
    setLyricsFor(null);
    if (window.location.pathname !== "/") {
      router.push(v === "home" ? "/" : `/?view=${v}`);
      return;
    }
    setView(v);
    try {
      const url = new URL(window.location.href);
      if (v === "home") url.searchParams.delete("view"); else url.searchParams.set("view", v);
      if (url.toString() !== window.location.href) window.history.pushState({ ...window.history.state, gfr: v }, "", url.toString());
    } catch { /* ignore */ }
    if (mainRef.current) mainRef.current.scrollTop = 0;
    if (window.innerWidth <= 760) window.scrollTo(0, 0);
  }, [router]);

  /* ---------- greeting by the listener's own clock ---------- */
  useEffect(() => {
    setHello(greeting());
    const t = setInterval(() => setHello(greeting()), 60000);
    return () => clearInterval(t);
  }, []);

  const showToast = useCallback((text: string) => setToast(t => ({ text, n: (t?.n ?? 0) + 1 })), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- what is on ---------- */
  const st: Station = R.stationInfo ?? FALLBACK_MAIN;
  const onAirSong = songOf(R.onAir);
  const isSpot = R.onAir?.type === "ad";
  const pv = R.preview;
  const barSong: Song | null = pv ? pv.song : onAirSong;
  // The dial: the stations, with an artist radio on top while it is tuned in.
  const tunedArtist = isArtistStation(R.station) ? R.stationInfo : null;
  const dial: Station[] = tunedArtist ? [tunedArtist, ...R.stations] : R.stations;

  // The station an artist calls home (their genre station), for accents.
  const homeStationOf = useCallback((slug?: string): Station | null => {
    if (!slug) return null;
    const hit = R.stations.find(s => s.slug !== "main" && songsOf(R.schedules[s.slug]?.rotation).some(t => t.slug === slug));
    return hit ?? R.stations[0] ?? null;
  }, [R.stations, R.schedules]);

  /* ---------- panel and lyrics ---------- */
  const isDrawer = () => typeof window !== "undefined" && window.innerWidth <= 1180;
  const openPanel = useCallback((song?: Song | null) => {
    setPinned(song && !sameSong(song, onAirSong) ? song : null);
    if (isDrawer()) setPanelOpen(true);
    else { if (panelRef.current) panelRef.current.scrollTop = 0; setFlash(f => f + 1); }
  }, [onAirSong]);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const openLyrics = useCallback((song?: Song | null) => {
    const s = song ?? barSong;
    if (!s) return;
    setLyricsFor(s);
    setPanelOpen(false);
  }, [barSong]);
  useEffect(() => { if (lyricsFor) lyricsClose.current?.focus(); }, [lyricsFor]);
  useEffect(() => {
    const onResize = () => { if (!isDrawer()) setPanelOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ---------- controls ---------- */
  const barPlay = useCallback(() => {
    if (R.preview) { R.togglePreview(); return; }
    R.toggleLive();
  }, [R]);

  const heart = useCallback((s: Song | null) => {
    if (!s?.songId) return;
    const on = R.toggleHeart(s);
    showToast(on ? "Saved to Hearted songs on this device" : "Removed from Hearted songs");
  }, [R, showToast]);

  const tuneTo = useCallback((slug: string) => { setPinned(null); R.tune(slug, true); }, [R]);
  const openUnlock = useCallback((slug: string, album?: { id: string; title: string } | null) => { setPanelOpen(false); setUnlock({ slug, album }); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (unlock) setUnlock(null); else if (lyricsFor) setLyricsFor(null); else setPanelOpen(false); }
      if (e.key === " " && e.target === document.body) { e.preventDefault(); barPlay(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lyricsFor, unlock, barPlay]);

  // The tab's title names the song while the radio plays; otherwise the page's own.
  useEffect(() => {
    document.title = R.live && R.onAir ? `${R.onAir.title} by ${R.onAir.artist} on ${st.name}, ${BASE_TITLE}` : baseTitle;
  }, [R.live, R.onAir, st.name, baseTitle]);

  // Pop out: a small window of its own (fallback: the link opens a tab).
  const popStation = R.station;
  const popOut = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const url = `/radio/pop${popStation !== "main" ? `?station=${encodeURIComponent(popStation)}` : ""}`;
    const w = window.open(url, "gfradio", "popup,width=380,height=700");
    if (w) { e.preventDefault(); try { w.focus(); } catch { /* ignore */ } }
  }, [popStation]);

  /* ---------- progress (the clock, not the audio element) ---------- */
  const dur = pv ? (pv.full ? pv.duration : PREVIEW_SECONDS) : R.onAir?.durationSeconds || 0;
  const at = pv ? pv.time : Math.min(R.position, dur);
  const pct = dur > 0 ? Math.min(100, (at / dur) * 100) : 0;
  const barPlaying = pv ? pv.playing : R.live;
  const rootStyle = { "--st": stColor(st), "--st-ink": stInk(st) } as React.CSSProperties;
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pv?.full || !pv.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    R.seekPreview(((e.clientX - r.left) / r.width) * pv.duration);
  };

  const heartOn = R.isHearted(barSong);
  const cover = pv ? pv.song.coverUrl : R.onAir?.coverUrl;

  const ctx = useMemo<ShellCtx>(() => ({ R, view, go, hello, openPanel, openLyrics, heart, tuneTo, showToast, openUnlock, homeStationOf, setBaseTitle, me, signOut }),
    [R, view, go, hello, openPanel, openLyrics, heart, tuneTo, showToast, openUnlock, homeStationOf, me, signOut]);

  return (
    <Ctx.Provider value={ctx}>
      <div className={"gfr" + (pv ? " pv" : "")} style={rootStyle}>
        <style>{RADIO_CSS}</style>
        <style>{ARTIST_CSS}</style>
        <style>{YOU_CSS}</style>
        <div className="app">
          <nav className="rail" aria-label="GeekFon Society">
            <Link className="brand" href="/" onClick={e => { if (onHome) { e.preventDefault(); go("home"); } }}>
              <img className="wm" src={WORDMARK} alt="GeekFon Society" />
            </Link>
            <div className="nav">
              <button type="button" aria-current={onHome && view === "home" ? "page" : undefined} onClick={() => go("home")}><IcHome />Home</button>
              <button type="button" aria-current={onHome && view === "stations" ? "page" : undefined} onClick={() => go("stations")}><IcRadio />Stations</button>
              <button type="button" aria-current={onHome && view === "hearted" ? "page" : undefined} onClick={() => go("hearted")}><IcHeartSolid />Hearted songs<span className="count">{R.hearts.length}</span></button>
              <Link href="/roster" aria-current={onArtists ? "page" : undefined}><IcArtists />Artists</Link>
              <Link href="/you" aria-current={onYou ? "page" : undefined}><IcUser size={22} />You</Link>
            </div>
            <h3>On the dial</h3>
            <div className="dial">
              {dial.map(s => {
                const on = s.slug === R.station;
                const art = isArtistStation(s.slug);
                const c = coversOf(R.schedules[s.slug]?.rotation, 1)[0];
                return (
                  <button key={s.slug} type="button" aria-pressed={on} style={{ "--hl": art ? "var(--text)" : stColor(s) } as React.CSSProperties} onClick={() => tuneTo(s.slug)}>
                    <span className="sw" style={{ background: stColor(s) }}>{c ? <img src={c} alt="" /> : null}</span>
                    <span><span className="nm">{s.name}</span><span className="sub">{art ? "Artist radio" : s.seasonal ? "Seasonal" : "Live"}</span></span>
                    {on && !pv ? <span className="eqw" style={{ color: art ? "var(--text)" : stColor(s) }}><Eq still={!R.live} /></span> : null}
                  </button>
                );
              })}
              <div className="soon" aria-label={`${NEW_TALENT.name}, coming`}>
                <span className="sw" style={{ boxShadow: `inset 0 0 0 2px ${NEW_TALENT.color}` }} />
                <span><span className="nm">{NEW_TALENT.name}</span><span className="sub">Coming</span></span>
              </div>
            </div>
            <RailAccount me={me} />
          </nav>

          <main className="main" ref={mainRef}>
            <div className="top">
              <Link className="mlogo" href="/" onClick={e => { if (onHome) { e.preventDefault(); go("home"); } }}><img className="wm" src={WORDMARK} alt="GeekFon Society" /></Link>
              <TopAccount me={me} />
            </div>
            <div className="view">{children}</div>
          </main>

          <aside className={"panel" + (panelOpen ? " open" : "") + (flash ? " flash" : "")} key={`panel-${flash}`} ref={panelRef} aria-label="What is this?">
            <WhatPanel
              song={pinned ?? onAirSong}
              pinned={!!pinned}
              station={st}
              spot={!pinned && isSpot ? R.onAir : null}
              recent={R.recent}
              onBack={() => setPinned(null)}
              onClose={closePanel}
              onLyrics={openLyrics}
              onPick={s => setPinned(sameSong(s, onAirSong) ? null : s)}
              onVisit={closePanel}
              loading={R.loading}
            />
          </aside>

          <div className="bar" role="region" aria-label="Now playing">
            <div className="np">
              <button type="button" className="cv" onClick={() => (isSpot && !pv ? undefined : openPanel())} aria-label="What is this?">
                {cover ? <img src={cover} alt={barSong ? `Cover of ${barSong.title}` : ""} /> : <img className="logo" src={LOGO} alt="" />}
              </button>
              <div className="tx">
                <button type="button" className="tt" onClick={() => openPanel()}><b>{pv ? pv.song.title : R.onAir?.title || (R.loading ? "Tuning in" : st.name)}</b></button>
                {isSpot && !pv ? (
                  R.onAir?.linkUrl
                    ? <a className="ta sponsor" href={R.onAir.linkUrl} target="_blank" rel="noopener sponsored">Visit {R.onAir.sponsor || R.onAir.artist}<IcOut size={12} /></a>
                    : <span className="ta">{R.onAir?.sponsor ? `With ${R.onAir.sponsor}` : R.onAir?.artist}</span>
                ) : (
                  <button type="button" className="ta" onClick={() => openPanel()} aria-label={barSong ? `${barSong.artist}, what is this?` : "What is this?"}>{barSong?.artist || st.name}</button>
                )}
              </div>
              {barSong?.songId ? (
                <button type="button" className={"ib hide-m" + (heartOn ? " hearted" : "")} onClick={() => heart(barSong)} aria-pressed={heartOn} aria-label={heartOn ? "Remove heart" : "Heart this song"}><IcHeart on={heartOn} /></button>
              ) : null}
            </div>
            <div className="ctr">
              <div className="row">
                <span className={"live" + (pv ? " pvm" : R.live ? " on" : "")}><i />{pv ? (pv.full ? "On demand" : "Preview") : R.onAir?.type === "pinned" ? "Premiere" : "Live"}</span>
                <button type="button" className="play" onClick={barPlay} disabled={!pv && R.loading && !R.onAir} aria-label={pv ? (barPlaying ? "Pause" : "Play") : R.live ? "Pause" : "Play"}>
                  {barPlaying ? <IcPause /> : <IcPlay />}
                </button>
                <span className="stname">{pv ? "Radio paused" : st.name}</span>
              </div>
              <div className="prog" aria-hidden="true">
                <span>{fmtTime(at)}</span>
                <div className={"track" + (pv?.full ? " seek" : "")} onClick={seek}><i style={{ width: `${pct}%` }} /></div>
                <span>{fmtTime(dur)}</span>
              </div>
            </div>
            <div className="rt">
              <a className="ib hide-m" href="/radio/pop" target="_blank" rel="noopener" onClick={popOut} aria-label="Pop out the player" title="Pop out the player"><IcPopOut /></a>
              <button type="button" className="wit" onClick={() => openPanel()}><span className="q" aria-hidden="true">?</span><span className="t">What is this?</span></button>
              <button type="button" className="ib" onClick={() => openLyrics()} disabled={!barSong?.songId} aria-label="Lyrics" title="Lyrics"><IcLyrics /></button>
              {barSong?.songId ? (
                <button type="button" className={"ib show-m" + (heartOn ? " hearted" : "")} onClick={() => heart(barSong)} aria-pressed={heartOn} aria-label={heartOn ? "Remove heart" : "Heart this song"}><IcHeart on={heartOn} /></button>
              ) : null}
            </div>
            <div className="mini-prog" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          </div>

          <nav className="mtabs" aria-label="Sections">
            <button type="button" aria-current={onHome && view === "home" ? "page" : undefined} onClick={() => go("home")}><IcHome size={24} />Home</button>
            <button type="button" aria-current={onHome && view === "stations" ? "page" : undefined} onClick={() => go("stations")}><IcRadio size={24} />Stations</button>
            <Link href="/roster" aria-current={onArtists ? "page" : undefined}><IcArtists size={24} />Artists</Link>
            <Link href="/you" aria-current={onYou || (onHome && view === "hearted") ? "page" : undefined}><IcUser size={24} />You</Link>
          </nav>
        </div>

        {panelOpen ? <div className="scrim" onClick={closePanel} aria-hidden="true" /> : null}

        {lyricsFor ? (
          <LyricsOverlay
            song={lyricsFor}
            closeRef={lyricsClose}
            onClose={() => setLyricsFor(null)}
            onWhat={() => { const s = lyricsFor; setLyricsFor(null); openPanel(s); }}
          />
        ) : null}

        {pv ? (() => {
          const home = homeStationOf(pv.song.slug);
          return (
            <div className="pvnote" role="status" aria-live="polite" style={{ "--ac": stColor(home), "--ac-ink": stInk(home) } as React.CSSProperties}>
              {pv.failed ? (
                <span>This song could not play.</span>
              ) : pv.full ? (
                <><Eq still={!pv.playing} /><span>{pv.ended ? "That was the full song." : "Radio paused while you listen on demand"}</span></>
              ) : pv.ended ? (
                <>
                  <span>That was the 30-second preview.</span>
                  {pv.song.slug ? <button type="button" className="pvn-u" onClick={() => openUnlock(pv.song.slug!)}>Hear it all: unlock {pv.song.artist}, $11</button> : null}
                </>
              ) : (
                <><Eq still={!pv.playing} /><span>Radio paused while you preview</span></>
              )}
              <button type="button" className="pvn-b" onClick={() => R.leavePreview(true)}><IcRadio size={16} />Back to live</button>
            </div>
          );
        })() : null}

        {unlock ? <UnlockSheet slug={unlock.slug} album={unlock.album} onClose={() => setUnlock(null)} /> : null}

        <div className={"toast" + (toast ? " show" : "")} role="status" aria-live="polite">{toast?.text}</div>
      </div>
    </Ctx.Provider>
  );
}

/* ---------- the signed-in person, in the rail and the phone top bar ---------- */
// Signed out: Sign in. A fan: their picture (or first letter) and first name,
// opening Your GeekFon. Staff: BrandDesk in HQ, where the staff tools live.
function Face({ me, size }: { me: Extract<Me, { state: "in" }>; size: number }) {
  return (
    <span className="face" style={{ width: size, height: size }} aria-hidden="true">
      {me.avatar ? <img src={me.avatar} alt="" referrerPolicy="no-referrer" /> : me.firstName.charAt(0).toUpperCase()}
    </span>
  );
}
function RailAccount({ me }: { me: Me }) {
  if (me.state === "loading") return <span className="home" aria-hidden="true" />;
  if (me.state === "out") return <a className="home" href="/login"><IcUser />Sign in</a>;
  if (me.staff) return <a className="home who" href={STAFF_HOME}><Face me={me} size={22} /><span>BrandDesk</span><IcOut size={12} /></a>;
  return <Link className="home who" href="/you"><Face me={me} size={22} /><span>{me.firstName}</span></Link>;
}
function TopAccount({ me }: { me: Me }) {
  if (me.state === "loading") return <span className="chip ghostchip" aria-hidden="true" />;
  if (me.state === "out") return <a className="chip" href="/login"><IcUser size={12} />Sign in</a>;
  if (me.staff) return <a className="chip who" href={STAFF_HOME}><Face me={me} size={18} />BrandDesk<IcOut size={11} /></a>;
  return <Link className="chip who" href="/you"><Face me={me} size={18} />{me.firstName}</Link>;
}

/* ---------- "What is this?" ---------- */
function WhatPanel(props: {
  song: Song | null; pinned: boolean; station: Station; spot: { title: string; artist: string; sponsor?: string; linkUrl?: string } | null;
  recent: Song[]; loading: boolean;
  onBack: () => void; onClose: () => void; onLyrics: (s: Song) => void; onPick: (s: Song) => void; onVisit: () => void;
}) {
  const { song: x, pinned, station, spot, recent } = props;
  const artist = useArtist(spot ? null : x?.slug);
  const lyrics = useLyrics(spot ? null : x?.songId);
  const lines = useMemo(() => lyricLines(lyrics?.lyricsEn), [lyrics]);
  const lang = langName(lyrics?.lyricsOriginalLang);
  const pageSlug = artist?.slug || x?.slug;

  const head = (
    <div className="ph-h">
      <h2>{pinned ? "About this song" : "What is this?"}</h2>
      <button type="button" className="ib x" onClick={props.onClose} aria-label="Close"><IcX /></button>
    </div>
  );

  if (spot) {
    return (
      <div className="panel-in">
        {head}
        <div className="pcover" style={{ display: "grid", placeItems: "center" }}><img src={LOGO} alt="" style={{ width: "50%", height: "50%", objectFit: "contain" }} /></div>
        <div className="pmeta"><p className="song">{spot.title}</p><div className="who">A word from {spot.sponsor || spot.artist} · on {station.name}</div></div>
        <div className="card2">
          <p className="lab">On air between songs</p>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Sponsors keep GeekFon Radio free. The next song starts right after this.</p>
          {spot.linkUrl ? <a className="spot" href={spot.linkUrl} target="_blank" rel="noopener sponsored">Visit {spot.sponsor || "the sponsor"}<IcOut /></a> : null}
        </div>
        <div style={{ height: 16 }} />
      </div>
    );
  }

  if (!x) {
    return (
      <div className="panel-in">
        {head}
        <div className="card2"><p style={{ color: "var(--muted)" }}>{props.loading ? "Tuning in to the station." : "Press Play on any station. The song on air shows up here, with who sang it and the lyrics."}</p></div>
      </div>
    );
  }

  return (
    <div className="panel-in">
      {head}
      {pinned ? <button type="button" className="pback" onClick={props.onBack}><IcBack />Back to what is playing</button> : null}
      <div className="pcover">{x.coverUrl ? <img src={x.coverUrl} alt={`Cover of ${x.title} by ${x.artist}`} /> : null}</div>
      <div className="pmeta"><p className="song">{x.title}</p><div className="who">{x.artist}{pinned ? "" : ` · on ${station.name}`}</div></div>
      <div className="card2">
        <p className="lab">About the artist</p>
        <div className="artist">
          {pageSlug ? (
            <Link href={`/${pageSlug}`} onClick={props.onVisit} aria-label={artist?.name || x.artist} className="apic">
              {artist?.avatar ? <img src={artist.avatar} alt="" /> : x.coverUrl ? <img src={x.coverUrl} alt="" /> : <span className="ph" />}
            </Link>
          ) : <span className="ph" />}
          <div>
            {pageSlug ? <Link href={`/${pageSlug}`} onClick={props.onVisit}><b>{artist?.name || x.artist}</b></Link> : <b>{x.artist}</b>}
            <span>{artist?.tagline || "From the GeekFon Society roster"}</span>
          </div>
        </div>
        {artist ? (
          <div className="facts">
            {artist.stations.map(s => <span key={s.slug}>{s.name}</span>)}
            {artist.genre ? <span>{artist.genre}</span> : null}
            {artist.location ? <span>{artist.location}</span> : null}
          </div>
        ) : null}
        {pageSlug ? (
          <Link className="visit" href={`/${pageSlug}`} onClick={props.onVisit}><span>Visit artist page</span><small>Songs, chat and more</small><IcArrow /></Link>
        ) : null}
      </div>
      <div className="card2 lyr">
        <p className="lab">Lyrics</p>
        {lang ? <p className="lang">Sung in {lang}. Shown in English.</p> : null}
        {lyrics === undefined && x.songId ? (
          <p className="none">Loading the lyrics.</p>
        ) : lines.length ? (
          <>
            <div className="lprev">
              {lyricPreview(lines, 7).map((l, i) => l.kind === "sec" ? <p key={i} className="sec">{l.text}</p> : <p key={i} className="ln">{l.text}</p>)}
            </div>
            <button type="button" className="full" onClick={() => props.onLyrics(x)}><IcLyrics size={18} />Show full lyrics</button>
          </>
        ) : (
          <p className="none">No lyrics for this song yet.</p>
        )}
      </div>
      {recent.length ? (
        <div className="card2 recentp">
          <p className="lab">Recently played</p>
          {recent.slice(0, 4).map(r => (
            <button type="button" key={(r.songId || r.title) + r.artist} className="it" onClick={() => props.onPick(r)}>
              {r.coverUrl ? <img src={r.coverUrl} alt="" /> : <span className="ph" />}
              <span><b>{r.title}</b><span>{r.artist}</span></span>
            </button>
          ))}
        </div>
      ) : <div style={{ height: 16 }} />}
    </div>
  );
}

/* ---------- full-screen lyrics ---------- */
function LyricsOverlay({ song, onClose, onWhat, closeRef }: { song: Song; onClose: () => void; onWhat: () => void; closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const lyrics = useLyrics(song.songId);
  const artist = useArtist(song.slug);
  const lines = useMemo(() => lyricLines(lyrics?.lyricsEn), [lyrics]);
  const lang = langName(lyrics?.lyricsOriginalLang);
  const pageSlug = artist?.slug || song.slug;
  const pic = artist?.avatar || song.coverUrl;
  return (
    <div className="lyrics" role="dialog" aria-modal="true" aria-label={`Lyrics for ${song.title}`}>
      <div className="lh">
        {song.coverUrl ? <img src={song.coverUrl} alt="" /> : null}
        <div><b>{song.title}</b><span>{song.artist}</span></div>
        <button type="button" className="wit" onClick={onWhat}><span className="q" aria-hidden="true">?</span><span className="t">What is this?</span></button>
        <button type="button" className="cl" ref={closeRef} onClick={onClose} aria-label="Close lyrics"><IcX /></button>
      </div>
      <div className="lb">
        <div className="lb-in">
          <div>
            {lang ? <p className="note">Sung in {lang}. Shown in English.</p> : null}
            {lyrics === undefined ? <p className="note">Loading the lyrics.</p>
              : lines.length ? lines.map((l, i) => l.kind === "sec" ? <p key={i} className="sec">{l.text}</p> : <p key={i} className="ln">{l.text}</p>)
              : <p className="note">No lyrics for this song yet. Lyrics are free for every song as they arrive.</p>}
          </div>
          <aside className="side">
            {pic ? (pageSlug ? <Link href={`/${pageSlug}`} onClick={onClose} aria-label={artist?.name || song.artist}><img src={pic} alt="" /></Link> : <img src={pic} alt="" />) : null}
            <b>{artist?.name || song.artist}</b>
            <span>{artist?.tagline || "From the GeekFon Society roster"}</span>
            {pageSlug ? <Link href={`/${pageSlug}`} onClick={onClose}>Visit artist page<IcArrow /></Link> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
