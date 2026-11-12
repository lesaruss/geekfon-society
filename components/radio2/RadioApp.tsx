"use client";
// GeekFon Radio v1, /radio (Sean, 2026-11-12: Seat 2: Discovery, locked).
// Free, no login. Live: everyone hears the same song, no skip or rewind.
// "What is this?" beside every song: the artist, their stations and the
// lyrics, which are free for every listener. Hearts save on this device and
// play a 30-second preview, with the full song one unlock away on the
// artist's page.
//
// The view lives in the address (?view=home|stations|hearted, plus
// ?station=<slug>) so a view can be shared and Back works. The app is full
// height with its own rail, so it does not sit inside SiteChrome; the rail
// and the phone header link back to the GeekFon home page.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveRadio, songOf, sameSong, fmtTime, PREVIEW_SECONDS, FALLBACK_MAIN, type Song, type Station, type Heart } from "./useLiveRadio";
import { useArtist, useLyrics, lyricLines, lyricPreview, langName, NEW_TALENT, stColor, stInk, greeting } from "./radioData";
import { RADIO_CSS } from "./radioCss";
import type { RadioTrack } from "@/lib/radioSchedule";
import {
  IcPlay, IcPause, IcHeart, IcHeartSolid, IcLyrics, IcX, IcBack, IcRadio, IcHome, IcArrow, IcOut, IcPopOut, Eq, IcArtists, IcUser,
} from "./icons";

type View = "home" | "stations" | "hearted";
const VIEWS: View[] = ["home", "stations", "hearted"];
// The brand kit's logo files (BrandDesk > GeekFon Society > Logo): the wordmark on night for the brand spots, the vector wheel elsewhere.
const LOGO = "/brands/geekfon-society/geekfon-wheel.svg";
const WORDMARK = "/brands/geekfon-society/geekfon-wordmark-reverse.svg";

function readView(): View {
  try {
    const v = new URLSearchParams(window.location.search).get("view") as View | null;
    return v && VIEWS.includes(v) ? v : "home";
  } catch {
    return "home";
  }
}

/** The songs a station has on the air (no sponsor spots), first one first. */
function songsOf(rotation: RadioTrack[] | undefined): RadioTrack[] {
  return (rotation ?? []).filter(t => t.kind !== "spot");
}
function coversOf(rotation: RadioTrack[] | undefined, n: number): string[] {
  const out: string[] = [];
  for (const t of songsOf(rotation)) {
    if (t.coverUrl && !out.includes(t.coverUrl)) out.push(t.coverUrl);
    if (out.length >= n) break;
  }
  return out;
}

const artistHref = (slug?: string) => (slug ? `/${slug}` : "/roster");

export default function RadioApp() {
  const R = useLiveRadio();
  const [view, setView] = useState<View>("home");
  const [hello, setHello] = useState("Good evening");
  const [panelOpen, setPanelOpen] = useState(false);
  const [flash, setFlash] = useState(0);
  const [pinned, setPinned] = useState<Song | null>(null);
  const [lyricsFor, setLyricsFor] = useState<Song | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const lyricsClose = useRef<HTMLButtonElement | null>(null);

  /* ---------- routing: the view is in the address ---------- */
  useEffect(() => {
    setView(readView());
    const onPop = () => { setView(readView()); setPanelOpen(false); setLyricsFor(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((v: View) => {
    setPanelOpen(false);
    setLyricsFor(null);
    setView(v);
    try {
      const url = new URL(window.location.href);
      if (v === "home") url.searchParams.delete("view"); else url.searchParams.set("view", v);
      if (url.toString() !== window.location.href) window.history.pushState({ gfr: v }, "", url.toString());
    } catch { /* ignore */ }
    if (mainRef.current) mainRef.current.scrollTop = 0;
    if (window.innerWidth <= 760) window.scrollTo(0, 0);
  }, []);

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
  const regular = R.stations.filter(s => !s.seasonal);
  const seasonal = R.stations.filter(s => s.seasonal);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (lyricsFor) setLyricsFor(null); else setPanelOpen(false); }
      if (e.key === " " && e.target === document.body) { e.preventDefault(); barPlay(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lyricsFor, barPlay]);

  // The tab's title names the song while the radio plays.
  useEffect(() => {
    const base = "GeekFon Society";
    document.title = R.live && R.onAir ? `${R.onAir.title} by ${R.onAir.artist} on ${st.name}, ${base}` : base;
  }, [R.live, R.onAir, st.name]);

  // Pop out: a small window of its own (fallback: the link opens a tab).
  const popOut = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const url = `/radio/pop${R.station !== "main" ? `?station=${encodeURIComponent(R.station)}` : ""}`;
    const w = window.open(url, "gfradio", "popup,width=380,height=700");
    if (w) { e.preventDefault(); try { w.focus(); } catch { /* ignore */ } }
  }, [R.station]);

  /* ---------- progress (the clock, not the audio element) ---------- */
  const dur = pv ? PREVIEW_SECONDS : R.onAir?.durationSeconds || 0;
  const at = pv ? pv.time : Math.min(R.position, dur);
  const pct = dur > 0 ? Math.min(100, (at / dur) * 100) : 0;
  const barPlaying = pv ? pv.playing : R.live;
  const rootStyle = { "--st": stColor(st), "--st-ink": stInk(st) } as React.CSSProperties;

  /* ---------- pieces ---------- */
  const stationCard = (s: Station, wide = false) => {
    const on = s.slug === R.station && !pv;
    const playing = on && R.live;
    const covers = coversOf(R.schedules[s.slug]?.rotation, 3);
    return (
      <button
        key={s.slug}
        type="button"
        className={"card" + (wide ? " wide" : "") + (on ? " on" : "")}
        style={{ "--c": stColor(s), "--i": stInk(s) } as React.CSSProperties}
        onClick={() => tuneTo(s.slug)}
        aria-label={s.name + (on ? (playing ? ", playing, press to pause" : ", tuned in, press to play") : ", press to listen")}
      >
        <span className="name">{s.name}</span>
        {s.tagline ? <span className="line">{s.tagline}</span> : null}
        <span className="collage">{covers.map(c => <img key={c} src={c} alt="" loading="lazy" />)}</span>
        <span className="go">{playing ? <IcPause /> : <IcPlay />}</span>
        <span className="air"><Eq still={!playing} />{playing ? "On air" : "Tuned in"}</span>
      </button>
    );
  };

  const comingCard = (
    <div key={NEW_TALENT.slug} className="card coming" style={{ "--c": NEW_TALENT.color, "--i": NEW_TALENT.ink } as React.CSSProperties} aria-label={`${NEW_TALENT.name}, coming soon`}>
      <span className="ring" />
      <span className="name">{NEW_TALENT.name}</span>
      <span className="line">{NEW_TALENT.tagline}</span>
      <span className="tag">Coming</span>
    </div>
  );

  const renderHome = () => (
    <>
      <section className="hero">
        <h1 className="hello">{hello}</h1>
        <p className="lede">Pick a station and let it play. Hear something you like? Tap <b>What is this?</b> to meet the artist and read the lyrics.</p>
        <div className="quick">
          {R.stations.map(s => {
            const cover = coversOf(R.schedules[s.slug]?.rotation, 1)[0];
            const on = s.slug === R.station && !pv;
            return (
              <button key={s.slug} type="button" className="qt" onClick={() => tuneTo(s.slug)}>
                <span className="sq" style={{ background: stColor(s) }}>{cover ? <img src={cover} alt="" /> : null}</span>
                <b>{s.name}</b>
                {on ? <span className="eqw" style={{ color: stColor(s) }}><Eq still={!R.live} /></span> : null}
              </button>
            );
          })}
          <button type="button" className="qt" onClick={() => go("hearted")}>
            <span className="sq hsq"><IcHeartSolid /></span><b>Hearted songs</b>
          </button>
        </div>
      </section>
      <section className="shelf">
        <div className="shelf-h"><h2>Stations</h2><button type="button" className="more" onClick={() => go("stations")}>Show all</button></div>
        <div className="grid">{regular.map(s => stationCard(s))}</div>
      </section>
      <section className="shelf">
        <div className="shelf-h"><h2>{seasonal.length ? "Holiday shelf" : "Coming to the dial"}</h2>{seasonal.length ? <span className="tag">Seasonal</span> : null}</div>
        <div className="grid">{seasonal.map(s => stationCard(s, true))}{comingCard}</div>
      </section>
      <section className="shelf">
        <div className="shelf-h"><h2>Recently played</h2></div>
        {R.recent.length ? (
          <div className="recent">
            {R.recent.map(x => (
              <button type="button" key={(x.songId || x.title) + x.artist} className="rc" onClick={() => openPanel(x)}>
                {x.coverUrl ? <img src={x.coverUrl} alt="" /> : <span className="ph" style={{ display: "block" }} />}
                <b>{x.title}</b><span>{x.artist}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty"><IcRadio size={26} /><span>Songs you hear show up here, so you can always find who sang them. Press Play on any station to start.</span></div>
        )}
      </section>
    </>
  );

  const renderStations = () => (
    <>
      <div className="vhead"><h1>Stations</h1><p>Live and free. Every station is already on air when you tune in.</p></div>
      <div className="rows">
        {R.stations.map(s => {
          const on = s.slug === R.station && !pv;
          const songs = songsOf(R.schedules[s.slug]?.rotation);
          const covers = coversOf(R.schedules[s.slug]?.rotation, 2);
          return (
            <div key={s.slug} className="srow">
              <div className="art" style={{ "--c": stColor(s) } as React.CSSProperties}>{covers.map(c => <img key={c} src={c} alt="" />)}</div>
              <div>
                <h2>{s.name} {s.seasonal ? <span className="tag">Seasonal</span> : null}</h2>
                <p>{s.tagline}{songs.length ? ` · ${songs.length} songs in rotation` : ""}</p>
              </div>
              <div className="act">
                <button type="button" className={"pill" + (on ? "" : " ghost")} onClick={() => tuneTo(s.slug)}>
                  {on && R.live ? <><IcPause size={18} />Pause</> : <><IcPlay size={18} />{on ? "Play" : "Listen"}</>}
                </button>
              </div>
            </div>
          );
        })}
        <div className="srow dim">
          <div className="art" style={{ "--c": NEW_TALENT.color } as React.CSSProperties} />
          <div><h2>{NEW_TALENT.name} <span className="tag">Coming</span></h2><p>{NEW_TALENT.tagline}</p></div>
          <div className="act" />
        </div>
      </div>
    </>
  );

  const songRow = (h: Heart) => {
    const home = homeStationOf(h.slug);
    const on = !!pv && pv.song.songId === h.songId;
    const playing = on && pv!.playing && !pv!.ended;
    const len = h.durationSeconds ? fmtTime(h.durationSeconds) : "";
    const t = on ? pv!.time : 0;
    return (
      <div key={h.songId} className={"sng" + (on ? " on" : "")} style={{ "--ac": stColor(home), "--ac-ink": stInk(home) } as React.CSSProperties}>
        <button type="button" className="pvb" onClick={() => R.startPreview(h)} aria-label={`${playing ? "Pause" : "Play"} 30-second preview of ${h.title}`}>
          {playing ? <IcPause /> : <IcPlay />}
        </button>
        {h.coverUrl ? <img src={h.coverUrl} alt="" loading="lazy" /> : <span className="ph" />}
        <div className="st">
          <div className="tl"><b>{h.title}</b><span className="ptag">Preview</span></div>
          <span className="sub">
            <a className="alink" href={artistHref(h.slug)} target="_blank" rel="noopener">{h.artist}</a>
            {len ? <span className="mlen">{on ? `${fmtTime(t)} / 0:30` : len}</span> : null}
          </span>
        </div>
        <span className="sx"><a className="unl" href={artistHref(h.slug)} target="_blank" rel="noopener">Hear the full song: unlock {h.artist}, $11</a></span>
        <span className="len">{on ? `${fmtTime(t)} / 0:30` : len}</span>
        <span className="ops">
          <button type="button" className="ib hearted" onClick={() => heart(h)} aria-pressed="true" aria-label={`Remove heart from ${h.title}`}><IcHeart on /></button>
          <button type="button" className="ib" onClick={() => openLyrics(h)} aria-label={`Lyrics for ${h.title}, free`}><IcLyrics size={18} /></button>
        </span>
        <i className="rp" aria-hidden="true"><i style={{ width: on ? `${(t / PREVIEW_SECONDS) * 100}%` : 0 }} /></i>
      </div>
    );
  };

  const renderHearted = () => {
    const groups: { slug: string; artist: string; items: Heart[] }[] = [];
    for (const h of R.hearts) {
      const key = h.slug || h.artist;
      let g = groups.find(x => x.slug === key);
      if (!g) { g = { slug: key, artist: h.artist, items: [] }; groups.push(g); }
      g.items.push(h);
    }
    const multi = groups.length > 1;
    const n = R.hearts.length;
    return (
      <>
        <section className="hhero">
          <div className="big"><IcHeart on size={56} /></div>
          <div>
            <small>Saved on this device</small>
            <h1>Hearted songs</h1>
            <p>{n} {n === 1 ? "song" : "songs"}. Radio is live, so there is no rewind and no skip. Heart a song and it waits here with a 30-second preview.</p>
          </div>
        </section>
        {n ? groups.map(g => (
          <section key={g.slug} className="hg">
            {multi ? (
              <div className="hg-h">
                {g.items[0].coverUrl ? <img src={g.items[0].coverUrl} alt="" /> : null}
                <div>
                  <a href={artistHref(g.items[0].slug)} target="_blank" rel="noopener">{g.artist}</a>
                  <span className="s">{g.items.length} {g.items.length === 1 ? "hearted song" : "hearted songs"}</span>
                </div>
              </div>
            ) : null}
            <div className="slist">{g.items.map(songRow)}</div>
          </section>
        )) : (
          <div className="empty" style={{ marginTop: 20 }}><IcHeart size={26} /><span>Tap the heart on any song while it plays. It saves here, on this device, with a 30-second preview.</span></div>
        )}
        <p className="foot">Want the full song, on demand? Unlock that artist, $11 one time. Your hearts stay on this device until then.</p>
      </>
    );
  };

  /* ---------- bar pieces ---------- */
  const heartOn = R.isHearted(barSong);
  const cover = pv ? pv.song.coverUrl : R.onAir?.coverUrl;

  return (
    <div className={"gfr" + (pv ? " pv" : "")} style={rootStyle}>
      <style>{RADIO_CSS}</style>
      <div className="app">
        <nav className="rail" aria-label="GeekFon Radio">
          <button type="button" className="brand" onClick={() => go("home")}>
            <img className="wm" src={WORDMARK} alt="GeekFon Society" />
          </button>
          <div className="nav">
            <button type="button" aria-current={view === "home" ? "page" : undefined} onClick={() => go("home")}><IcHome />Home</button>
            <button type="button" aria-current={view === "stations" ? "page" : undefined} onClick={() => go("stations")}><IcRadio />Stations</button>
            <button type="button" aria-current={view === "hearted" ? "page" : undefined} onClick={() => go("hearted")}><IcHeartSolid />Hearted songs<span className="count">{R.hearts.length}</span></button>
            <a href="/roster"><IcArtists />Artists</a>
          </div>
          <h3>On the dial</h3>
          <div className="dial">
            {R.stations.map(s => {
              const on = s.slug === R.station;
              const c = coversOf(R.schedules[s.slug]?.rotation, 1)[0];
              return (
                <button key={s.slug} type="button" aria-pressed={on} style={{ "--hl": stColor(s) } as React.CSSProperties} onClick={() => tuneTo(s.slug)}>
                  <span className="sw" style={{ background: stColor(s) }}>{c ? <img src={c} alt="" /> : null}</span>
                  <span><span className="nm">{s.name}</span><span className="sub">{s.seasonal ? "Seasonal" : "Live"}</span></span>
                  {on && !pv ? <span className="eqw" style={{ color: stColor(s) }}><Eq still={!R.live} /></span> : null}
                </button>
              );
            })}
            <div className="soon" aria-label={`${NEW_TALENT.name}, coming`}>
              <span className="sw" style={{ boxShadow: `inset 0 0 0 2px ${NEW_TALENT.color}` }} />
              <span><span className="nm">{NEW_TALENT.name}</span><span className="sub">Coming</span></span>
            </div>
          </div>
          <a className="home" href="/login"><IcUser />Sign in</a>
        </nav>

        <main className="main" ref={mainRef}>
          <div className="top">
            <button type="button" className="mlogo" onClick={() => go("home")}><img className="wm" src={WORDMARK} alt="GeekFon Society" /></button>
            <a className="chip" href="/login"><IcUser size={12} />Sign in</a>
          </div>
          <div className="view">
            {view === "home" ? renderHome() : view === "stations" ? renderStations() : renderHearted()}
          </div>
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
            loading={R.loading}
          />
        </aside>

        <div className="bar" role="region" aria-label="Now playing">
          <div className="np">
            <button type="button" className="cv" onClick={() => (isSpot && !pv ? undefined : openPanel())} aria-label="What is this?">
              {cover ? <img src={cover} alt={barSong ? `Cover of ${barSong.title}` : ""} /> : <img className="logo" src={LOGO} alt="" />}
            </button>
            <div className="tx">
              <button type="button" className="tt" onClick={() => openPanel()}><b>{pv ? pv.song.title : R.onAir?.title || (R.loading ? "Tuning in" : "GeekFon Radio")}</b></button>
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
              <span className={"live" + (pv ? " pvm" : R.live ? " on" : "")}><i />{pv ? "Preview" : R.onAir?.type === "pinned" ? "Premiere" : "Live"}</span>
              <button type="button" className="play" onClick={barPlay} disabled={!pv && R.loading && !R.onAir} aria-label={pv ? (barPlaying ? "Pause preview" : "Play preview") : R.live ? "Pause" : "Play"}>
                {barPlaying ? <IcPause /> : <IcPlay />}
              </button>
              <span className="stname">{pv ? "Radio paused" : st.name}</span>
            </div>
            <div className="prog" aria-hidden="true">
              <span>{fmtTime(at)}</span><div className="track"><i style={{ width: `${pct}%` }} /></div><span>{fmtTime(dur)}</span>
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
          <button type="button" aria-current={view === "home" ? "page" : undefined} onClick={() => go("home")}><IcHome size={24} />Home</button>
          <button type="button" aria-current={view === "stations" ? "page" : undefined} onClick={() => go("stations")}><IcRadio size={24} />Stations</button>
          <button type="button" aria-current={view === "hearted" ? "page" : undefined} onClick={() => go("hearted")}><IcHeartSolid size={24} />Hearts</button>
          <a href="/roster"><IcArtists size={24} />Artists</a>
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
              <span>This preview could not play.</span>
            ) : pv.ended ? (
              <>
                <span>That was the 30-second preview.</span>
                <a className="pvn-u" href={artistHref(pv.song.slug)} target="_blank" rel="noopener">Hear it all: unlock {pv.song.artist}, $11</a>
              </>
            ) : (
              <><Eq still={!pv.playing} /><span>Radio paused while you preview</span></>
            )}
            <button type="button" className="pvn-b" onClick={() => R.leavePreview(true)}><IcRadio size={16} />Back to live</button>
          </div>
        );
      })() : null}

      <div className={"toast" + (toast ? " show" : "")} role="status" aria-live="polite">{toast?.text}</div>
    </div>
  );
}

/* ---------- "What is this?" ---------- */
function WhatPanel(props: {
  song: Song | null; pinned: boolean; station: Station; spot: { title: string; artist: string; sponsor?: string; linkUrl?: string } | null;
  recent: Song[]; loading: boolean;
  onBack: () => void; onClose: () => void; onLyrics: (s: Song) => void; onPick: (s: Song) => void;
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
          {artist?.avatar ? <img src={artist.avatar} alt="" /> : x.coverUrl ? <img src={x.coverUrl} alt="" /> : <span className="ph" />}
          <div>
            <a href={`/${pageSlug}`} target="_blank" rel="noopener"><b>{artist?.name || x.artist}</b></a>
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
          <a className="visit" href={`/${pageSlug}`} target="_blank" rel="noopener"><span>Visit artist page</span><small>geekfon.ai/{pageSlug}</small><IcOut /></a>
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
            {artist?.avatar || song.coverUrl ? <img src={(artist?.avatar || song.coverUrl)!} alt="" /> : null}
            <b>{artist?.name || song.artist}</b>
            <span>{artist?.tagline || "From the GeekFon Society roster"}</span>
            {pageSlug ? <a href={`/${pageSlug}`} target="_blank" rel="noopener">Visit artist page<IcArrow /></a> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
