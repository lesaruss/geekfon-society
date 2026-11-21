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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useShell, artistStation, coversOf } from "./RadioShell";
import { fmtTime, PREVIEW_SECONDS, readStore, writeStore, type Song } from "./useLiveRadio";
import { useRosterAccess } from "@/components/roster/useRosterAccess";
import ArtistChat from "./ArtistChat";
import { IcPlay, IcPause, IcHeart, IcLyrics, IcArrow, IcRadio } from "./icons";
import { IcLock, IcPin, IcChat, IcCheck } from "./artistIcons";
import type { AlbumCard, ArtistPageData, ArtistSong, GalleryTile, SocialPost } from "@/lib/artistPage";
import { useI18n, useT } from "@/components/i18n/I18n";

type Tab = "music" | "chat" | "social" | "press" | "gallery" | "about";
const TABS: Tab[] = ["music", "chat", "social", "press", "gallery", "about"];
const TAB_KEYS: Record<Tab, string> = { music: "artist.tabMusic", chat: "artist.tabChat", social: "artist.tabSocial", press: "artist.tabPress", gallery: "artist.tabGallery", about: "artist.tabAbout" };
type SocFilter = "all" | "videos" | "photos" | "exclusive";
const SOC_FILTERS: SocFilter[] = ["all", "videos", "photos", "exclusive"];
const SOC_KEYS: Record<SocFilter, string> = { all: "artist.socAll", videos: "artist.socVideos", photos: "artist.socPhotos", exclusive: "artist.socExclusive" };
const signInHref = () => `/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "")}`;
const PRICE = "$11";
const LS_SAVED = "gfr-saved-artists-v1";

/** "Roxanne's", "Rustblood Prophets'". */
const possessive = (t: ReturnType<typeof useT>, name: string) => t(/s$/i.test(name) ? "artist.possessiveS" : "artist.possessive", { name });

function readTab(): Tab {
  try {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    return t && TABS.includes(t) ? t : "music";
  } catch {
    return "music";
  }
}

export default function ArtistView({ initial }: { initial: ArtistPageData }) {
  const { t, locale } = useI18n();
  const { R, tuneTo, openLyrics, heart, openUnlock, showToast, setBaseTitle, setPageFocus } = useShell();
  const [A, setA] = useState<ArtistPageData>(initial);
  const [tab, setTab] = useState<Tab>("music");
  const [saved, setSaved] = useState(false);
  const access = useRosterAccess(A.slug);
  const supporter = access.supporter;
  const [soc, setSoc] = useState<SocFilter>("all");
  // One viewer for social posts and album videos: a picture or a video over the page.
  const [viewing, setViewing] = useState<{ kind: "video" | "photo"; url: string; poster?: string | null; text?: string | null } | null>(null);
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setViewing(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewing]);

  useEffect(() => { setA(initial); }, [initial]);
  useEffect(() => { setBaseTitle(t("artist.pageTitle", { name: A.name })); }, [A.name, setBaseTitle, t]);
  // The server could not reach the catalog (no service key): ask the API.
  useEffect(() => {
    if (initial.complete) return;
    let on = true;
    fetch(`/api/radio/artist-page?slug=${encodeURIComponent(initial.slug)}`).then(r => (r.ok ? r.json() : null)).then((d: ArtistPageData | null) => { if (on && d) setA(d); }).catch(() => {});
    return () => { on = false; };
  }, [initial.complete, initial.slug]);

  // Albums (Sean, 2026-11-17): with two or more, Music opens on one square per
  // album, newest first; each album is its own $11. One album: unchanged.
  const gridAlbums: AlbumCard[] = (A.albums || []).length >= 2 ? [...A.albums].reverse() : [];
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const picked = gridAlbums.find(a => a.id === openAlbum) ?? null;
  // An album video plays when it is public, or for a member (the access route sends its url).
  const videoUrl = (albumId: string, videoId: string, pub: string | null) => pub || access.albumVideos?.[albumId]?.[videoId] || null;
  const owns = (id: string) => access.ownedAlbums === "all" || access.ownedAlbums.includes(id);
  const unlock = useCallback(() => openUnlock(A.slug, picked ? { id: picked.id, title: picked.title, inProgress: picked.inProgress } : A.album), [openUnlock, A.slug, A.album, picked]);

  // Arrival: the tab from the address; ?tab=support (the old Support link) opens the unlock sheet; back from checkout says thanks.
  useEffect(() => {
    setTab(readTab());
    setSaved(readStore<string[]>(LS_SAVED, []).includes(initial.slug));
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("tab") === "support") openUnlock(initial.slug, initial.album);
      if (q.get("checkout") === "success") showToast(t("artist.checkoutThanks"));
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
    showToast(on ? t("artist.savedToast") : t("artist.removedToast"));
  };

  // The artist's name never breaks inside a word (Sean, 2026-11-17: "Shamanic"
  // was splitting as "Shaman / ic"). The CSS forbids mid-word breaks; this
  // shrinks the font until the longest word fits, so names wrap only between
  // words ("Shamanic / Resin") or sit on one line.
  const nameRef = useRef<HTMLHeadingElement | null>(null);
  const [nameSize, setNameSize] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize) || 64;
      while (el.scrollWidth > el.clientWidth + 1 && size > 22) { size -= 2; el.style.fontSize = `${size}px`; }
      setNameSize(el.style.fontSize ? size : null);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement || el);
    return () => ro.disconnect();
  }, [A.name]);

  // The right panel follows this artist (Sean, 2026-11-17): by default their
  // latest release (the newest album's lead song, else their first song);
  // an opened album points it at that album's lead song. A song being
  // previewed or played on demand takes over from the shell.
  useEffect(() => {
    const albumsNewest = [...(A.albums || [])].reverse();
    const pick = (ids: string[]) => ids.map(id => A.songs.find(x => x.id === id)).find(x => x && !x.isRemix) ?? null;
    const opened = openAlbum ? albumsNewest.find(a => a.id === openAlbum) : null;
    const lead = (opened ? pick(opened.songIds) : null)
      ?? (albumsNewest.length ? pick(albumsNewest[0].songIds) : null)
      ?? A.songs.find(x => x.single && !x.isRemix) ?? A.songs.find(x => !x.isRemix) ?? null;
    setPageFocus({ slug: A.slug, song: lead ? { songId: lead.id, title: lead.title, artist: A.name, slug: A.slug, coverUrl: lead.coverUrl, durationSeconds: lead.durationSeconds ?? undefined } : null });
  }, [A.slug, A.name, A.songs, A.albums, openAlbum, setPageFocus]);
  useEffect(() => () => setPageFocus(null), [setPageFocus]);

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
    const time = on ? pv!.time : 0;
    const total = on && pv!.full ? pv!.duration || s.durationSeconds || 0 : PREVIEW_SECONDS;
    const lenText = on ? `${fmtTime(time)} / ${fmtTime(total)}` : len;
    const x = song(s);
    const hearted = R.isHearted(x);
    return (
      <div key={s.id} className={"sng" + (on ? " on" : "")}>
        <button type="button" className="pvb" onClick={() => R.startPreview(x, full)} aria-label={t(full ? (playing ? "artist.pauseSong" : "artist.playSong") : (playing ? "artist.pausePreview" : "artist.playPreview"), { title: s.title })}>
          {playing ? <IcPause /> : <IcPlay />}
        </button>
        {s.thumbUrl || s.coverUrl ? <img src={(s.thumbUrl || s.coverUrl)!} alt="" loading="lazy" /> : <span className="ph" />}
        <div className="st">
          <div className="tl"><b>{s.title}</b><span className="ptag">{full ? t("artist.onDemand") : t("artist.preview")}</span></div>
          <span className="sub">
            <span>{s.isRemix ? t("artist.remix") : s.single ? t("artist.single") : A.name}</span>
            {len ? <span className="mlen">{lenText}</span> : null}
            {!full ? <span className="mlock" title={t("artist.fullSongWithUnlock")}><IcLock size={12} /></span> : null}
          </span>
        </div>
        <span className="sx lk">
          {full ? <span className="lockb ok"><IcCheck size={13} />{t("artist.fullSong")}</span> : <button type="button" className="lockb" onClick={unlock} title={t("artist.unlockFullSongTitle", { name: A.name })}><IcLock size={13} />{t("artist.fullSongWithUnlock")}</button>}
        </span>
        <span className="len">{lenText}</span>
        <span className="ops">
          <button type="button" className={"ib" + (hearted ? " hearted" : "")} onClick={() => heart(x)} aria-pressed={hearted} aria-label={t(hearted ? "artist.removeHeart" : "artist.heartSong", { title: s.title })}><IcHeart on={hearted} /></button>
          <button type="button" className="ib" onClick={() => openLyrics(x)} aria-label={t("artist.lyricsFor", { title: s.title })}><IcLyrics size={18} /></button>
        </span>
        <i className="rp" aria-hidden="true"><i style={{ width: on && total ? `${Math.min(100, (time / total) * 100)}%` : 0 }} /></i>
      </div>
    );
  };

  const inAlbum = (s: ArtistSong) => !picked || picked.songIds.includes(s.id);
  const order = (list: ArtistSong[]) => picked ? [...list].sort((x, y) => picked.songIds.indexOf(x.id) - picked.songIds.indexOf(y.id)) : list;
  const originals = order(A.songs.filter(s => !s.isRemix && inAlbum(s)));
  const remixes = order(A.songs.filter(s => s.isRemix && inAlbum(s)));
  const radioCovers = coversOf(R.schedules[myRadio]?.rotation, 2);
  const covers = radioCovers.length ? radioCovers : A.songs.map(s => s.thumbUrl || s.coverUrl).filter((u): u is string => !!u).slice(0, 2);

  const tabMusic = () => (
    <>
      <div className="mtop">
        <div className="onair" style={{ "--c": A.accent, "--i": A.ink } as React.CSSProperties}>
          <div className="oa-art">{covers.map(c => <img key={c} src={c} alt="" />)}</div>
          <div>
            <p className="eyebrow">{t("artist.artistRadio")}</p>
            <b>{t("artist.radioName", { name: A.name })}</b>
            <span className="s">{radioPlaying ? t("artist.onAirLive") : t("artist.onlyOnShuffle", { name: A.name })}</span>
          </div>
          <button type="button" className="oa-play" onClick={() => tuneTo(myRadio)} aria-label={t(radioPlaying ? "artist.pauseRadio" : "artist.playRadio", { name: A.name })}>{radioPlaying ? <IcPause /> : <IcPlay />}</button>
        </div>
        <button type="button" className="cteaser" onClick={() => pickTab("chat")}>
          <span className="avs">{A.avatar ? <img src={A.avatar} alt="" /> : null}</span>
          <span><b>{t("artist.crewTalking")}</b><span className="s">{t("artist.chatTeaserSub", { name: A.name, who: possessive(t, A.name) })}</span></span>
          <IcArrow />
        </button>
      </div>
      {gridAlbums.length && !picked ? (
        <>
          <div className="shelf-h" style={{ margin: "28px 0 12px" }}><h2>{t("artist.albums")}</h2><span className="tag">{t("artist.priceEach", { price: PRICE })}</span></div>
          <p className="msub">{access.ownedAlbums === "all"
            ? t("artist.everyAlbumFull", { name: A.name })
            : gridAlbums.some(a => owns(a.id))
              ? t("artist.ownedAlbums", { count: gridAlbums.filter(a => owns(a.id)).length, titles: gridAlbums.filter(a => owns(a.id)).map(a => a.title).join(` ${t("artist.and")} `), price: PRICE })
              : t("artist.pickAlbum", { price: PRICE })}</p>
          <div className="albg">
            {gridAlbums.map(a => {
              const n = a.songIds.filter(id => originals.some(o => o.id === id)).length;
              return (
                <button key={a.id} type="button" className="albc" onClick={() => setOpenAlbum(a.id)} aria-label={t("artist.openAlbum", { title: a.title })}>
                  <span className="albc-art">
                    {a.coverUrl ? <img src={a.coverUrl} alt="" loading="lazy" /> : <span className="ph" />}
                    {owns(a.id) ? <span className="albc-b">{t("artist.owned")}</span> : a.inProgress ? <span className="albc-b new">{t("artist.new")}</span> : null}
                  </span>
                  <b>{a.title}</b>
                  <span className="s">{a.inProgress ? t("artist.albumProgress", { n, target: a.trackTarget }) : t("artist.albumSongs", { songs: t("artist.songCount", { count: n }) })}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
      {picked ? (
        <div className="albh">
          <button type="button" className="albh-back" onClick={() => setOpenAlbum(null)}>&larr; {t("artist.allAlbums")}</button>
          <div className="albh-row">
            {picked.coverUrl ? <img src={picked.coverUrl} alt="" /> : <span className="ph" />}
            <div>
              <p className="eyebrow">{picked.inProgress ? t("artist.albumInProgress") : t("artist.album")}</p>
              <h2>{picked.title}</h2>
              <p className="msub" style={{ margin: "4px 0 10px" }}>{owns(picked.id)
                ? t("artist.youOwnAlbum")
                : picked.inProgress
                  ? t("artist.getItEarlyDesc")
                  : t("artist.albumFullDesc")}</p>
              {owns(picked.id) ? <span className="lockb ok"><IcCheck size={13} />{t("artist.owned")}</span> : <button type="button" className="pill" onClick={unlock}><IcLock />{picked.inProgress ? t("artist.getItEarly", { price: PRICE }) : t("artist.unlockFor", { name: picked.title, price: PRICE })}</button>}
            </div>
          </div>
        </div>
      ) : null}
      {gridAlbums.length && !picked ? null : <>
      <div className="shelf-h" style={{ margin: "28px 0 12px" }}><h2>{picked ? t("artist.songs") : t("artist.songs")}</h2><span className="tag">{(picked ? owns(picked.id) : supporter) ? t("artist.unlocked") : t("artist.previewsFree")}</span></div>
      {picked ? null : <p className="msub">{supporter
        ? t("artist.supporterSongsNote")
        : t("artist.freeSongsNote", { name: A.name })}</p>}
      {originals.length ? <div className="slist">{originals.map(songRow)}</div> : <div className="empty"><IcRadio size={24} /><span>{t("artist.noSongs", { name: A.name })}</span></div>}
      {remixes.length ? (
        <>
          <div className="shelf-h" style={{ margin: "26px 0 8px" }}><h2>{t("artist.remixes")}</h2></div>
          <div className="slist">{remixes.map(songRow)}</div>
        </>
      ) : null}
      {picked && picked.videos?.length ? (
        <>
          <div className="shelf-h" style={{ margin: "26px 0 8px" }}><h2>{t("artist.videos")}</h2>{picked.videos.some(v => !videoUrl(picked.id, v.id, v.url)) ? <span className="tag">{t("artist.socExclusive")}</span> : null}</div>
          <div className="vids">
            {picked.videos.map(v => {
              const url = videoUrl(picked.id, v.id, v.url);
              return url ? (
                <button key={v.id} type="button" className="vt" onClick={() => setViewing({ kind: "video", url, poster: v.poster })} aria-label={t("artist.playVideo", { title: v.title })}>
                  {v.poster ? <img src={v.poster} alt="" loading="lazy" /> : null}
                  <span className="vp"><IcPlay size={26} /></span>
                  <span className="cap">{v.title}</span>
                </button>
              ) : (
                <a key={v.id} className="vt lk" href={signInHref()} aria-label={t("artist.mvLockedLabel", { title: v.title })}>
                  {v.poster ? <img src={v.poster} alt="" loading="lazy" /> : null}
                  <span className="gl"><span className="lc"><IcLock size={18} /></span><b>{v.title}</b><span>{t("artist.mvLocked")}</span><span className="pill sm">{t("artist.mvJoin")}</span></span>
                </a>
              );
            })}
          </div>
          {picked.videos.some(v => !videoUrl(picked.id, v.id, v.url)) ? <p className="foot">{t("artist.mvFoot")}</p> : null}
        </>
      ) : null}
      </>}
      {!gridAlbums.length && originals.length ? <p className="foot">{remixes.length ? t("artist.catalogFootRemixes", { songs: t("artist.songCount", { count: originals.length }), remixes: t("artist.remixCount", { count: remixes.length }) }) : t("artist.catalogFoot", { songs: t("artist.songCount", { count: originals.length }) })}</p> : null}
    </>
  );

  /* ---------- Social ---------- */
  // Sean, 2026-11-21: Social is for everyone; All shows only what has been
  // posted. Exclusive holds what is queued: signed-in members see it in full,
  // everyone else a locked card and the way in. A queued post moves to All on
  // its own once it is out (the server works it out from the clock).
  const member = access.signedIn;
  const queued: SocialPost[] = member && access.exclusive ? access.exclusive : A.social.locked;
  const socDate = (d: string | null) => d ? new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" }) : "";
  const socTile = (p: SocialPost) => {
    if (p.locked || !p.media) return (
      <a key={p.id} className="gi so lk" href={signInHref()} aria-label={t("artist.socLockedLabel", { name: A.name })}>
        {p.thumb ? <img src={p.thumb} alt="" loading="lazy" /> : blurSrc.length ? <img src={blurSrc[0]} alt="" loading="lazy" /> : null}
        <span className="gl"><span className="lc"><IcLock size={18} /></span>{t("artist.socMembersFirst")}</span>
        {p.date ? <span className="cap">{t("artist.socPosts", { date: socDate(p.date) })}</span> : null}
      </a>
    );
    return (
      <button key={p.id} type="button" className="gi so" onClick={() => setViewing({ kind: p.kind, url: p.media!, poster: p.thumb, text: p.text })} aria-label={p.text || t("artist.openPicture")}>
        {p.thumb ? <img src={p.thumb} alt="" loading="lazy" /> : p.kind === "video" ? <video src={`${p.media}#t=1`} preload="metadata" muted playsInline /> : null}
        {p.kind === "video" ? <span className="vp sm"><IcPlay size={20} /></span> : null}
        {soc === "exclusive" && p.date ? <span className="cap">{t("artist.socPosts", { date: socDate(p.date) })}</span> : p.date ? <span className="cap">{socDate(p.date)}</span> : null}
      </button>
    );
  };
  const tabSocial = () => {
    const list = soc === "exclusive" ? queued : A.social.posts.filter(p => soc === "all" || (soc === "videos" ? p.kind === "video" : p.kind === "photo"));
    return (
      <>
        <div className="days soc-f" role="group" aria-label={t("artist.tabSocial")}>
          {SOC_FILTERS.map(f => (
            <button key={f} type="button" className="dchip" aria-pressed={soc === f} onClick={() => setSoc(f)}>
              {f === "exclusive" && !member ? <IcLock size={12} /> : null}{t(SOC_KEYS[f])}{f === "exclusive" && queued.length ? ` · ${queued.length}` : ""}
            </button>
          ))}
        </div>
        {soc === "exclusive" ? (
          member
            ? <p className="msub soc-n">{t("artist.socExclusiveMember", { name: A.name })}</p>
            : <div className="soc-join"><IcLock /><div><b>{queued.length ? t("artist.socExclusiveJoin", { count: queued.length, name: A.name }) : t("artist.socExclusiveJoinNone", { name: A.name })}</b><span>{t("artist.socExclusiveHow")}</span></div><a className="pill" href={signInHref()}>{t("artist.socJoinCta")}</a></div>
        ) : null}
        {list.length ? <div className="gal">{list.map(socTile)}</div>
          : <div className="empty"><IcChat /><span>{soc === "exclusive" ? t("artist.socQueueEmpty", { name: A.name }) : soc === "all" ? t("artist.socEmpty", { name: A.name }) : t("artist.socEmptyFilter")}</span></div>}
      </>
    );
  };

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
              {p.href ? <span className="rdl">{t("artist.read")}<IcArrow /></span> : null}
            </span>
          </>
        );
        return p.href
          ? <a key={p.title} className="pc" href={p.href} target="_blank" rel="noopener">{inner}</a>
          : <div key={p.title} className="pc">{inner}</div>;
      })}
    </div>
  ) : <div className="empty"><IcChat /><span>{t("artist.noPress", { name: A.name })}</span></div>;

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
            <a key={g.id} className="gi" href={g.url} target="_blank" rel="noopener" aria-label={g.title || t("artist.openPicture")}>
              <img src={g.thumb || g.url} alt={g.title || ""} loading="lazy" />
              {g.title ? <span className="cap">{g.title}</span> : null}
            </a>
          ))}
          {Array.from({ length: lockedN }).map((_, i) => (
            <button key={`lk${i}`} type="button" className="gi lk" onClick={unlock} aria-label={t("artist.lockedPictureLabel", { name: A.name })}>
              {blurSrc.length ? <img src={blurSrc[i % blurSrc.length]} alt="" loading="lazy" /> : null}
              <span className="gl"><span className="lc"><IcLock size={18} /></span>{t("artist.supportersOnly")}</span>
            </button>
          ))}
        </div>
      ) : <div className="empty"><IcLock /><span>{t("artist.noPictures", { name: A.name })}</span></div>}
      {lockedN ? <p className="foot">{t("artist.lockedPictures", { count: lockedN, name: A.name })}</p> : null}
    </>
  );

  /* ---------- About ---------- */
  const spotImg = A.videoThumb || A.portrait || A.cutout;
  const catalog = originals.length;
  const tabAbout = () => (
    <>
      <section className="aspot" aria-label={t("artist.artistSpotlight")}>
        <div className="aspot-h"><small>{t("artist.artistSpotlight")}</small><span>{t("artist.videoComingSoon")}</span></div>
        <div className={"sv" + (A.videoThumb ? "" : " fit")}>
          {spotImg ? <img src={spotImg} alt="" loading="lazy" /> : null}
          <div className="bug"><i />{t("artist.pulseSpotlight")}</div>
          <div className="samp">{t("artist.placeholder")}</div>
        </div>
        <p className="spot-note">{t("artist.spotNote", { name: A.name })}</p>
      </section>
      <div className="about">
        <div>
          <h2 className="ab-h">{t("artist.bio")}</h2>
          {A.bio.length ? A.bio.map((p, i) => <p key={i} className="bio">{p}</p>) : <p className="bio dim">{t("artist.noBio")}</p>}
          {A.quote ? <blockquote className="aq"><p>&ldquo;{A.quote}&rdquo;</p><cite>{A.name}</cite></blockquote> : null}
          <dl className="facts2">
            <div><dt>{t("artist.genre")}</dt><dd>{A.genre || t("artist.notListed")}</dd></div>
            <div><dt>{t("artist.from")}</dt><dd>{A.location || t("artist.notListed")}</dd></div>
            <div><dt>{t("artist.onTheRadio")}</dt><dd>
              <button type="button" onClick={() => tuneTo(myRadio)}>{t("artist.radioName", { name: A.name })}</button>
              {A.stations.map(s => <button key={s.slug} type="button" onClick={() => tuneTo(s.slug)}>{s.name}</button>)}
            </dd></div>
            <div><dt>{t("artist.catalog")}</dt><dd>{catalog ? t("artist.songCount", { count: catalog }) : t("artist.noSongsYet")}</dd></div>
          </dl>
        </div>
        {art ? <div className="ab-art"><img src={art} alt="" loading="lazy" /></div> : null}
      </div>
    </>
  );

  const body = tab === "music" ? tabMusic() : tab === "chat" ? <ArtistChat slug={A.slug} artistName={A.name} onUnlock={unlock} /> : tab === "social" ? tabSocial() : tab === "press" ? tabPress() : tab === "gallery" ? tabGallery() : tabAbout();

  return (
    <div className="aview" style={{ "--ac": A.accent, "--ac-ink": A.ink } as React.CSSProperties}>
      <section className="ahead">
        <div className="atext">
          <nav className="crumbs" aria-label={t("artist.breadcrumb")}><Link href="/">GeekFon Society</Link><span aria-hidden="true">›</span><Link href="/roster">{t("artist.artists")}</Link></nav>
          <h1 className="aname" ref={nameRef} style={nameSize ? { fontSize: nameSize } : undefined}>{A.name}</h1>
          {A.tagline ? <p className="atag">{A.tagline}</p> : null}
          <div className="apills">
            {A.pills.map(p => <span key={p}>{p}</span>)}
            {A.location ? <span><IcPin />{A.location}</span> : null}
          </div>
        </div>
        {art ? <div className={"aart " + (A.cutout ? "cut" : "sq")}><img src={art} alt={t("artist.illustrationAlt", { name: A.name })} /></div> : null}
      </section>
      <div className="aact">
        <button type="button" className="pill acp" onClick={() => tuneTo(myRadio)}>{radioPlaying ? <><IcPause />{t("artist.pauseRadio", { name: A.name })}</> : <><IcPlay />{t("artist.playRadio", { name: A.name })}</>}</button>
        <button type="button" className="pill ghost" onClick={toggleSave} aria-pressed={saved}><IcHeart on={saved} />{saved ? t("artist.saved") : t("artist.saveArtist")}</button>
        {supporter
          ? <span className="pill sup"><IcCheck />{access.allArtists ? t("artist.lifetimeUnlocked") : t("artist.unlocked")}</span>
          : <button type="button" className="pill" onClick={unlock}><IcLock />{t("artist.unlockFor", { name: A.name, price: PRICE })}</button>}
      </div>
      <p className="anote">{t("artist.actionsNote", { name: A.name })}</p>
      <div className="atabs" role="tablist" aria-label={t("artist.sections", { name: A.name })}>
        {TABS.map(k => (
          <button key={k} type="button" role="tab" id={`atab-${k}`} className="atab" aria-selected={k === tab} aria-controls="apanel" tabIndex={k === tab ? 0 : -1} onClick={() => pickTab(k)} onKeyDown={e => tabKey(e, k)}>{t(TAB_KEYS[k])}</button>
        ))}
      </div>
      <div className="apanel" id="apanel" role="tabpanel" aria-labelledby={`atab-${tab}`}>{body}</div>
      {viewing ? (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={t("artist.tabSocial")} onClick={() => setViewing(null)}>
          <div className="viewer-in" onClick={e => e.stopPropagation()}>
            {viewing.kind === "video"
              ? <video src={viewing.url} poster={viewing.poster ?? undefined} controls autoPlay playsInline />
              : <img src={viewing.url} alt="" />}
            {viewing.text ? <p>{viewing.text}</p> : null}
          </div>
          <button type="button" className="viewer-x" onClick={() => setViewing(null)} aria-label={t("artist.close")}>×</button>
        </div>
      ) : null}
      {radioOn ? <span className="sr" aria-live="polite">{t(R.live ? "artist.radioPlayingSr" : "artist.radioPausedSr", { name: A.name })}</span> : null}
    </div>
  );
}
