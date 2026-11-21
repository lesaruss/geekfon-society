"use client";
// The home page's three views (Home, Stations, Hearted songs), unchanged from
// GeekFon Radio v1 (Sean, 2026-11-12: Seat 2: Discovery, locked). The view
// lives in the address (?view=home|stations|hearted); the shell
// (RadioShell) owns it, the rail and the player, so this only draws.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtistCard } from "./ArtistsView";
import type { RosterArtist } from "@/lib/artistPage";
import { useShell, songsOf, coversOf, artistHref } from "./RadioShell";
import { fmtTime, PREVIEW_SECONDS, type Heart } from "./useLiveRadio";
import { stColor, stInk } from "./radioData";
import { IcPlay, IcPause, IcHeart, IcHeartSolid, IcLyrics, IcRadio, Eq } from "./icons";
import { useI18n } from "@/components/i18n/I18n";
import type { OutSoon } from "@/app/api/radio/out-soon/route";

export default function HomeView() {
  const S = useShell();
  const { t, locale } = useI18n();
  const { R, view, go, tuneTo, openPanel, openLyrics, heart, openUnlock, homeStationOf, hello } = S;
  const pv = R.preview;
  // Meet the artists (Sean, 2026-11-15 panel): the cast on the home page, one row, in the Artists page card.
  const [cast, setCast] = useState<RosterArtist[]>([]);
  useEffect(() => {
    let on = true;
    fetch("/api/radio/roster").then(r => (r.ok ? r.json() : null)).then(d => { if (on && d?.artists?.length) setCast(d.artists); }).catch(() => {});
    return () => { on = false; };
  }, []);

  // Out soon (Sean, 2026-11-21): the next albums on the release calendar, as stacked banners. New Talent is gone from the home page.
  const [soon, setSoon] = useState<OutSoon[]>([]);
  const [openList, setOpenList] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    fetch("/api/radio/out-soon").then(r => (r.ok ? r.json() : null)).then(d => { if (on && d?.releases) setSoon(d.releases); }).catch(() => {});
    return () => { on = false; };
  }, []);
  const todayLA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const daysTo = (d: string) => Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${todayLA}T12:00:00Z`)) / 86400000);
  const outSoon = soon.length ? (
    <section className="shelf osoon">
      <div className="shelf-h"><h2>{t("home.outSoon")}</h2></div>
      <div className="os">
        {soon.map(r => {
          const n = daysTo(r.date);
          const st = r.station ? R.stations.find(x => x.slug === r.station) : null;
          const c = r.accent || (st ? stColor(st) : "#7a1020");
          return (
            <div key={r.key} className="os-c" style={{ "--c": c } as React.CSSProperties}>
              {r.cover ? <img src={r.cover} alt="" /> : <span className="os-ph" />}
              <div className="os-b">
                <span className="os-d">{new Date(`${r.date}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}</span>
                <small className="os-n">{n <= 0 ? t("home.outToday") : t("home.inDays", { count: n })}</small>
                <b>{r.title}</b>
                <small>{r.artists.map(a => a.name).join(", ")} · {t("home.songs", { count: r.tracks.length })}</small>
                <div className="os-a">
                  {r.album ? <button type="button" className="p" onClick={() => openUnlock(r.album!.artistSlug, { id: r.album!.id, title: r.album!.title })}>{t("home.getEarly")}</button>
                    : st ? <button type="button" className="p" onClick={() => tuneTo(st.slug)}><IcPlay size={16} />{t("home.playStation", { name: st.name })}</button> : null}
                  {r.artists.length === 1 ? <Link className="g" href={artistHref(r.artists[0].slug)}>{r.artists[0].name}</Link>
                    : <button type="button" className="g" aria-expanded={openList === r.key} onClick={() => setOpenList(openList === r.key ? null : r.key)}>{t("home.tracklist")}</button>}
                </div>
                {openList === r.key ? <ol className="os-t">{r.tracks.map(x => <li key={x.title}><b>{x.title}</b> <span>{x.artist}</span></li>)}</ol> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  ) : null;

  // One whole sentence for translators; the bold "What is this?" sits where {what} is.
  const lede = t("home.lede").split("{what}");
  const renderHome = () => (
    <>
      <section className="hero">
        <h1 className="hello">{hello}</h1>
        <p className="lede">{lede[0]}<b>{t("home.whatIsThis")}</b>{lede[1]}</p>
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
            <span className="sq hsq"><IcHeartSolid /></span><b>{t("home.heartedSongs")}</b>
          </button>
        </div>
      </section>
      {outSoon}
      {cast.length ? (
        <section className="shelf meet">
          <div className="shelf-h"><h2>{t("home.meetArtists")}</h2><Link className="more" href="/roster">{t("home.showAll")}</Link></div>
          <div className="agrid">{cast.slice(0, 4).map(a => <ArtistCard key={a.slug} a={a} />)}</div>
        </section>
      ) : null}
      <section className="shelf">
        <div className="shelf-h"><h2>{t("home.recentlyPlayed")}</h2></div>
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
          <div className="empty"><IcRadio size={26} /><span>{t("home.recentEmpty")}</span></div>
        )}
      </section>
    </>
  );

  const renderStations = () => (
    <>
      <div className="vhead"><h1>{t("home.stations")}</h1><p>{t("home.stationsIntro")}</p></div>
      <div className="rows">
        {R.stations.map(s => {
          const on = s.slug === R.station && !pv;
          const songs = songsOf(R.schedules[s.slug]?.rotation);
          const covers = coversOf(R.schedules[s.slug]?.rotation, 2);
          return (
            <div key={s.slug} className="srow">
              <div className="art" style={{ "--c": stColor(s) } as React.CSSProperties}>{covers.map(c => <img key={c} src={c} alt="" />)}</div>
              <div>
                <h2>{s.name} {s.seasonal ? <span className="tag">{t("home.seasonal")}</span> : null}</h2>
                <p>{s.tagline}{songs.length ? ` · ${t("home.inRotation", { count: songs.length })}` : ""}</p>
              </div>
              <div className="act">
                <button type="button" className={"pill" + (on ? "" : " ghost")} onClick={() => tuneTo(s.slug)}>
                  {on && R.live ? <><IcPause size={18} />{t("home.pause")}</> : <><IcPlay size={18} />{on ? t("home.play") : t("home.listen")}</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const songRow = (h: Heart) => <HeartRow key={h.songId} h={h} />;

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
            <small>{t("home.savedOnDevice")}</small>
            <h1>{t("home.heartedSongs")}</h1>
            <p>{t("home.heartedIntro", { count: n })}</p>
          </div>
        </section>
        {n ? groups.map(g => (
          <section key={g.slug} className="hg">
            {multi ? (
              <div className="hg-h">
                {g.items[0].coverUrl ? (g.items[0].slug ? <Link href={artistHref(g.items[0].slug)} aria-label={g.artist}><img src={g.items[0].coverUrl} alt="" /></Link> : <img src={g.items[0].coverUrl} alt="" />) : null}
                <div>
                  {g.items[0].slug ? <Link href={artistHref(g.items[0].slug)}>{g.artist}</Link> : <b>{g.artist}</b>}
                  <span className="s">{t("home.heartedCount", { count: g.items.length })}</span>
                </div>
              </div>
            ) : null}
            <div className="slist">{g.items.map(songRow)}</div>
          </section>
        )) : (
          <div className="empty" style={{ marginTop: 20 }}><IcHeart size={26} /><span>{t("home.heartsEmpty")}</span></div>
        )}
        <p className="foot">{t("home.heartedFoot")}</p>
      </>
    );
  };

  return view === "home" ? renderHome() : view === "stations" ? renderStations() : renderHearted();
}

/** One hearted song: a 30-second preview, the artist, the $11 unlock, the heart and the lyrics. Shared by Hearted songs and Your GeekFon. */
export function HeartRow({ h }: { h: Heart }) {
  const { R, openLyrics, heart, openUnlock, homeStationOf, me } = useShell();
  const { t, locale } = useI18n();
  const pv = R.preview;
  // Unlocked already (one by one, or every artist): the full song is on the artist's page.
  const full = !!h.slug && me.state === "in" && (me.allArtists || me.unlocked.includes(h.slug));
    const home = homeStationOf(h.slug);
  const on = !!pv && pv.song.songId === h.songId;
  const playing = on && pv!.playing && !pv!.ended;
  const len = h.durationSeconds ? fmtTime(h.durationSeconds) : "";
  const pt = on ? pv!.time : 0;
  return (
    <div className={"sng" + (on ? " on" : "")} style={{ "--ac": stColor(home), "--ac-ink": stInk(home) } as React.CSSProperties}>
      <button type="button" className="pvb" onClick={() => R.startPreview(h)} aria-label={playing ? t("home.pausePreview", { title: h.title }) : t("home.playPreview", { title: h.title })}>
        {playing ? <IcPause /> : <IcPlay />}
      </button>
      {h.coverUrl ? <img src={h.coverUrl} alt="" loading="lazy" /> : <span className="ph" />}
      <div className="st">
        <div className="tl"><b>{h.title}</b><span className="ptag">{t("home.preview")}</span></div>
        <span className="sub">
          {h.slug ? <Link className="alink" href={artistHref(h.slug)}>{h.artist}</Link> : <span>{h.artist}</span>}
          {len ? <span className="mlen">{on ? `${fmtTime(pt)} / 0:30` : len}</span> : null}
        </span>
      </div>
      <span className="sx">{h.slug ? (full
    ? <Link className="unl" href={artistHref(h.slug)}>{t("home.fullOnPage", { artist: h.artist })}</Link>
    : <button type="button" className="unl" onClick={() => openUnlock(h.slug!)}>{t("home.unlockFull", { artist: h.artist })}</button>) : null}</span>
      <span className="len">{on ? `${fmtTime(pt)} / 0:30` : len}</span>
      <span className="ops">
        <button type="button" className="ib hearted" onClick={() => heart(h)} aria-pressed="true" aria-label={t("home.removeHeart", { title: h.title })}><IcHeart on /></button>
        <button type="button" className="ib" onClick={() => openLyrics(h)} aria-label={t("home.lyricsFree", { title: h.title })}><IcLyrics size={18} /></button>
      </span>
      <i className="rp" aria-hidden="true"><i style={{ width: on ? `${(pt / PREVIEW_SECONDS) * 100}%` : 0 }} /></i>
    </div>
  );
}
