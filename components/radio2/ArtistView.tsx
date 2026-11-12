"use client";
// An artist page (/<artist>) in the Seat 2 shell, ported from the approved
// Seat 2: Discovery mockup (#artist-roxanne). One template for every artist,
// filled from the database; anything an artist does not have yet says so in
// plain words. The tab is in the address (?tab=music|chat|press|gallery|about).
//
// Sean's rules (2026-11-12): live radio stays live everywhere; on demand is
// what unlocking adds. Free listeners hear a 30-second preview of every song,
// supporters of the artist (or Lifetime) hear every song in full on demand
// (full streams come only from /api/roster/<artist>/access). Lyrics are free
// for every song. Unlock is $11 one time per artist.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useShell, artistStation, coversOf } from "./RadioShell";
import { fmtTime, PREVIEW_SECONDS, readStore, writeStore, type Song } from "./useLiveRadio";
import { useRosterAccess } from "@/components/roster/useRosterAccess";
import ArtistChat from "./ArtistChat";
import { IcPlay, IcPause, IcHeart, IcLyrics, IcArrow, IcRadio } from "./icons";
import { IcLock, IcPin, IcChat, IcCheck } from "./artistIcons";
import type { ArtistPageData, ArtistSong, GalleryTile } from "@/lib/artistPage";

type Tab = "music" | "chat" | "press" | "gallery" | "about";
const TABS: Tab[] = ["music", "chat", "press", "gallery", "about"];
const TAB_NAMES: Record<Tab, string> = { music: "Music", chat: "Chat", press: "Press", gallery: "Gallery", about: "About" };
const LS_SAVED = "gfr-saved-artists-v1";

/** "Roxanne's", "Rustblood Prophets'". */
const possessive = (name: string) => (/s$/i.test(name) ? `${name}\u2019` : `${name}\u2019s`);

function readTab(): Tab {
  try {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    return t && TABS.includes(t) ? t : "music";
  } catch {
    return "music";
  }
}

export default function ArtistView({ initial }: { initial: ArtistPageData }) {
  const { R, tuneTo, openLyrics, heart, openUnlock, showToast, setBaseTitle } = useShell();
  const [A, setA] = useState<ArtistPageData>(initial);
  const [tab, setTab] = useState<Tab>("music");
  const [saved, setSaved] = useState(false);
  const access = useRosterAccess(A.slug);
  const supporter = access.supporter;

  useEffect(() => { setA(initial); }, [initial]);
  useEffect(() => { setBaseTitle(`${A.name}, GeekFon Society`); }, [A.name, setBaseTitle]);
  // The server could not reach the catalog (no service key): ask the API.
  useEffect(() => {
    if (initial.complete) return;
    let on = true;
    fetch(`/api/radio/artist-page?slug=${encodeURIComponent(initial.slug)}`).then(r => (r.ok ? r.json() : null)).then((d: ArtistPageData | null) => { if (on && d) setA(d); }).catch(() => {});
    return () => { on = false; };
  }, [initial.complete, initial.slug]);

  const unlock = useCallback(() => openUnlock(A.slug, A.album), [openUnlock, A.slug, A.album]);

  // Arrival: the tab from the address; ?tab=support (the old Support link) opens the unlock sheet; back from checkout says thanks.
  useEffect(() => {
    setTab(readTab());
    setSaved(readStore<string[]>(LS_SAVED, []).includes(initial.slug));
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("tab") === "support") openUnlock(initial.slug, initial.album);
      if (q.get("checkout") === "success") showToast("Thank you. Unlocking now.");
    } catch { /* ignore */ }
    const onPop = () => setTab(readTab());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.slug]);

  const pickTab = (t: Tab) => {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      if (t === "music") url.searchParams.delete("tab"); else url.searchParams.set("tab", t);
      url.searchParams.delete("checkout");
      window.history.replaceState(window.history.state, "", url.toString());
    } catch { /* ignore */ }
  };
  const tabKey = (e: React.KeyboardEvent, t: Tab) => {
    const i = TABS.indexOf(t);
    const n = e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length] : e.key === "ArrowLeft" ? TABS[(i + TABS.length - 1) % TABS.length] : null;
    if (!n) return;
    e.preventDefault();
    pickTab(n);
    (document.getElementById(`atab-${n}`) as HTMLElement | null)?.focus();
  };

  const toggleSave = () => {
    const list = readStore<string[]>(LS_SAVED, []);
    const on = !list.includes(A.slug);
    writeStore(LS_SAVED, on ? [A.slug, ...list] : list.filter(s => s !== A.slug));
    setSaved(on);
    showToast(on ? "Artist saved on this device" : "Removed from saved artists");
  };

  const myRadio = artistStation(A.slug);
  const radioOn = R.station === myRadio && !R.preview;
  const radioPlaying = radioOn && R.live;
  const company = A.homeStation?.name || "GeekFon Radio";
  const art = A.cutout || A.portrait;

  const song = (s: ArtistSong): Song => ({ songId: s.id, title: s.title, artist: A.name, slug: A.slug, coverUrl: s.coverUrl, durationSeconds: s.durationSeconds ?? undefined });
  const fullUrl = (s: ArtistSong): string | null => access.songs[s.id]?.stream ?? (supporter && s.single ? s.publicUrl : null);

  /* ---------- Music ---------- */
  const songRow = (s: ArtistSong) => {
    const full = fullUrl(s);
    const pv = R.preview;
    const on = !!pv && pv.song.songId === s.id;
    const playing = on && pv!.playing && !pv!.ended;
    const len = s.durationSeconds ? fmtTime(s.durationSeconds) : "";
    const t = on ? pv!.time : 0;
    const total = on && pv!.full ? pv!.duration || s.durationSeconds || 0 : PREVIEW_SECONDS;
    const lenText = on ? `${fmtTime(t)} / ${fmtTime(total)}` : len;
    const x = song(s);
    const hearted = R.isHearted(x);
    return (
      <div key={s.id} className={"sng" + (on ? " on" : "")}>
        <button type="button" className="pvb" onClick={() => R.startPreview(x, full)} aria-label={`${playing ? "Pause" : "Play"} ${full ? "" : "30-second preview of "}${s.title}`}>
          {playing ? <IcPause /> : <IcPlay />}
        </button>
        {s.thumbUrl || s.coverUrl ? <img src={(s.thumbUrl || s.coverUrl)!} alt="" loading="lazy" /> : <span className="ph" />}
        <div className="st">
          <div className="tl"><b>{s.title}</b><span className="ptag">{full ? "On demand" : "Preview"}</span></div>
          <span className="sub">
            <span>{s.isRemix ? "Remix" : s.single ? "Single" : A.name}</span>
            {len ? <span className="mlen">{lenText}</span> : null}
            {!full ? <span className="mlock" title="Full song with Unlock"><IcLock size={12} /></span> : null}
          </span>
        </div>
        <span className="sx lk">
          {full ? <span className="lockb ok"><IcCheck size={13} />Full song</span> : <button type="button" className="lockb" onClick={unlock} title={`Unlock ${A.name} to play the full song, on demand`}><IcLock size={13} />Full song with Unlock</button>}
        </span>
        <span className="len">{lenText}</span>
        <span className="ops">
          <button type="button" className={"ib" + (hearted ? " hearted" : "")} onClick={() => heart(x)} aria-pressed={hearted} aria-label={`${hearted ? "Remove heart from" : "Heart"} ${s.title}`}><IcHeart on={hearted} /></button>
          <button type="button" className="ib" onClick={() => openLyrics(x)} aria-label={`Lyrics for ${s.title}, free`}><IcLyrics size={18} /></button>
        </span>
        <i className="rp" aria-hidden="true"><i style={{ width: on && total ? `${Math.min(100, (t / total) * 100)}%` : 0 }} /></i>
      </div>
    );
  };

  const originals = A.songs.filter(s => !s.isRemix);
  const remixes = A.songs.filter(s => s.isRemix);
  const radioCovers = coversOf(R.schedules[myRadio]?.rotation, 2);
  const covers = radioCovers.length ? radioCovers : A.songs.map(s => s.thumbUrl || s.coverUrl).filter((u): u is string => !!u).slice(0, 2);

  const tabMusic = () => (
    <>
      <div className="mtop">
        <div className="onair" style={{ "--c": A.accent, "--i": A.ink } as React.CSSProperties}>
          <div className="oa-art">{covers.map(c => <img key={c} src={c} alt="" />)}</div>
          <div>
            <p className="eyebrow">Artist radio</p>
            <b>{A.name} Radio</b>
            <span className="s">{radioPlaying ? "On air. Live and free." : `${A.name}, then ${company}. Live and free.`}</span>
          </div>
          <button type="button" className="oa-play" onClick={() => tuneTo(myRadio)} aria-label={radioPlaying ? `Pause ${A.name} Radio` : `Play ${A.name} Radio`}>{radioPlaying ? <IcPause /> : <IcPlay />}</button>
        </div>
        <button type="button" className="cteaser" onClick={() => pickTab("chat")}>
          <span className="avs">{A.avatar ? <img src={A.avatar} alt="" /> : null}</span>
          <span><b>The crew is talking today.</b><span className="s">Read the group chat from {possessive(A.name)} side</span></span>
          <IcArrow />
        </button>
      </div>
      <div className="shelf-h" style={{ margin: "28px 0 12px" }}><h2>Songs</h2><span className="tag">{supporter ? "Unlocked" : "Previews free"}</span></div>
      <p className="msub">{supporter
        ? `Every song in full, on demand. Lyrics are free for every song.`
        : `Free: a 30-second preview of every song, and every lyric. Unlock ${A.name} to play every song in full, on demand.`}</p>
      {originals.length ? <div className="slist">{originals.map(songRow)}</div> : <div className="empty"><IcRadio size={24} /><span>No songs in the catalog yet. {A.name} Radio plays what is on the air today.</span></div>}
      {remixes.length ? (
        <>
          <div className="shelf-h" style={{ margin: "26px 0 8px" }}><h2>Remixes</h2></div>
          <div className="slist">{remixes.map(songRow)}</div>
        </>
      ) : null}
      {originals.length ? <p className="foot">{originals.length} {originals.length === 1 ? "song" : "songs"} in the catalog{remixes.length ? `, plus ${remixes.length} ${remixes.length === 1 ? "remix" : "remixes"}` : ""}.</p> : null}
    </>
  );

  /* ---------- Press ---------- */
  const tabPress = () => A.press.length ? (
    <div className="press">
      {A.press.map(p => {
        const inner = (
          <>
            {p.thumb ? <span className="pimg"><img src={p.thumb} alt="" loading="lazy" /></span> : null}
            <span className="pbody">
              {p.tag ? <span className="ptg">{p.tag}</span> : null}
              <h3>{p.title}</h3>
              {p.date ? <time>{p.date}</time> : null}
              {p.blurb ? <p>{p.blurb}</p> : null}
              {p.href ? <span className="rdl">Read<IcArrow /></span> : null}
            </span>
          </>
        );
        return p.href
          ? <a key={p.title} className="pc" href={p.href} target="_blank" rel="noopener">{inner}</a>
          : <div key={p.title} className="pc">{inner}</div>;
      })}
    </div>
  ) : <div className="empty"><IcChat /><span>No press yet. Articles about {A.name} show up here as they are published.</span></div>;

  /* ---------- Gallery ---------- */
  const supporterItems: GalleryTile[] = (access.gallery?.items ?? []).map(g => ({ id: g.id, title: g.title, url: g.url, thumb: g.thumb ?? null, kind: g.kind }));
  const shownGallery = [...A.gallery.items, ...supporterItems.filter(s => !A.gallery.items.some(x => x.id === s.id))];
  const lockedN = supporter ? 0 : A.gallery.lockedCount;
  const blurSrc = [A.portrait, ...A.songs.map(s => s.coverUrl)].filter((u): u is string => !!u);
  const tabGallery = () => (
    <>
      {shownGallery.length || lockedN ? (
        <div className="gal">
          {shownGallery.map(g => (
            <a key={g.id} className="gi" href={g.url} target="_blank" rel="noopener" aria-label={g.title || "Open picture"}>
              <img src={g.thumb || g.url} alt={g.title || ""} loading="lazy" />
              {g.title ? <span className="cap">{g.title}</span> : null}
            </a>
          ))}
          {Array.from({ length: lockedN }).map((_, i) => (
            <button key={`lk${i}`} type="button" className="gi lk" onClick={unlock} aria-label={`Picture for supporters only. Unlock ${A.name}`}>
              {blurSrc.length ? <img src={blurSrc[i % blurSrc.length]} alt="" loading="lazy" /> : null}
              <span className="gl"><span className="lc"><IcLock size={18} /></span>Supporters only</span>
            </button>
          ))}
        </div>
      ) : <div className="empty"><IcLock /><span>No pictures yet. {A.name}&apos;s Gallery fills in here.</span></div>}
      {lockedN ? <p className="foot">{lockedN} {lockedN === 1 ? "picture is" : "pictures are"} for supporters. Unlock {A.name} to see every one.</p> : null}
    </>
  );

  /* ---------- About ---------- */
  const spotImg = A.videoThumb || A.portrait || A.cutout;
  const catalog = originals.length;
  const tabAbout = () => (
    <>
      <section className="aspot" aria-label="Artist Spotlight">
        <div className="aspot-h"><small>Artist Spotlight</small><span>Video coming soon</span></div>
        <div className={"sv" + (A.videoThumb ? "" : " fit")}>
          {spotImg ? <img src={spotImg} alt="" loading="lazy" /> : null}
          <div className="bug"><i />GeekFon Pulse · Artist Spotlight</div>
          <div className="samp">Placeholder</div>
        </div>
        <p className="spot-note">Artist Spotlight video coming soon: {A.name}, in their own words.</p>
      </section>
      <div className="about">
        <div>
          <h2 className="ab-h">Bio</h2>
          {A.bio.length ? A.bio.map((p, i) => <p key={i} className="bio">{p}</p>) : <p className="bio dim">No bio yet.</p>}
          {A.quote ? <blockquote className="aq"><p>&ldquo;{A.quote}&rdquo;</p><cite>{A.name}</cite></blockquote> : null}
          <dl className="facts2">
            <div><dt>Genre</dt><dd>{A.genre || "Not listed yet"}</dd></div>
            <div><dt>From</dt><dd>{A.location || "Not listed yet"}</dd></div>
            <div><dt>On the radio</dt><dd>
              <button type="button" onClick={() => tuneTo(myRadio)}>{A.name} Radio</button>
              {A.stations.map(s => <button key={s.slug} type="button" onClick={() => tuneTo(s.slug)}>{s.name}</button>)}
            </dd></div>
            <div><dt>Catalog</dt><dd>{catalog ? `${catalog} ${catalog === 1 ? "song" : "songs"}` : "No songs yet"}</dd></div>
          </dl>
        </div>
        {art ? <div className="ab-art"><img src={art} alt="" loading="lazy" /></div> : null}
      </div>
    </>
  );

  const body = tab === "music" ? tabMusic() : tab === "chat" ? <ArtistChat slug={A.slug} artistName={A.name} onUnlock={unlock} /> : tab === "press" ? tabPress() : tab === "gallery" ? tabGallery() : tabAbout();

  return (
    <div className="aview" style={{ "--ac": A.accent, "--ac-ink": A.ink } as React.CSSProperties}>
      <section className="ahead">
        <div className="atext">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">GeekFon Society</Link><span aria-hidden="true">›</span><Link href="/roster">Artists</Link></nav>
          <h1 className="aname">{A.name}</h1>
          {A.tagline ? <p className="atag">{A.tagline}</p> : null}
          <div className="apills">
            {A.pills.map(p => <span key={p}>{p}</span>)}
            {A.location ? <span><IcPin />{A.location}</span> : null}
          </div>
        </div>
        {art ? <div className={"aart " + (A.cutout ? "cut" : "sq")}><img src={art} alt={`${A.name}, illustration`} /></div> : null}
      </section>
      <div className="aact">
        <button type="button" className="pill acp" onClick={() => tuneTo(myRadio)}>{radioPlaying ? <><IcPause />Pause {A.name} Radio</> : <><IcPlay />Play {A.name} Radio</>}</button>
        <button type="button" className="pill ghost" onClick={toggleSave} aria-pressed={saved}><IcHeart on={saved} />{saved ? "Saved" : "Save artist"}</button>
        {supporter
          ? <span className="pill sup"><IcCheck />{access.allArtists ? "Lifetime: unlocked" : "Unlocked"}</span>
          : <button type="button" className="pill" onClick={unlock}><IcLock />Unlock {A.name} · $11</button>}
      </div>
      <p className="anote">{A.name} Radio is free and live: {A.name}, then {company}. Saving an artist stays on this device.</p>
      <div className="atabs" role="tablist" aria-label={`${A.name} sections`}>
        {TABS.map(t => (
          <button key={t} type="button" role="tab" id={`atab-${t}`} className="atab" aria-selected={t === tab} aria-controls="apanel" tabIndex={t === tab ? 0 : -1} onClick={() => pickTab(t)} onKeyDown={e => tabKey(e, t)}>{TAB_NAMES[t]}</button>
        ))}
      </div>
      <div className="apanel" id="apanel" role="tabpanel" aria-labelledby={`atab-${tab}`}>{body}</div>
      {radioOn ? <span className="sr" aria-live="polite">{A.name} Radio {R.live ? "playing" : "paused"}</span> : null}
    </div>
  );
}
