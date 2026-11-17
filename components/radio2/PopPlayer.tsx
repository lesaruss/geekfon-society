"use client";
// GeekFon Radio pop-out (/radio/pop), the locked pop-out design (Sean,
// 2026-11-12) in the Seat 2 look. Same engine as /radio (useLiveRadio): live,
// synced, no skip. Lyrics show in place; "What is this?" opens a sheet with
// the artist and a way into the full site in a new tab, so this window keeps
// playing. The OS window does the minimizing, so there is no mini pill here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveRadio, songOf, fmtTime, FALLBACK_MAIN, type Station } from "./useLiveRadio";
import { useArtist, useLyrics, useLyricView, lyricPreview, NEW_TALENT, stColor, stInk } from "./radioData";
import { LyricToggle } from "./LyricToggle";
import type { RadioTrack } from "@/lib/radioSchedule";
import { POP_CSS } from "./popCss";
import { IcPlay, IcPause, IcHeart, IcLyrics, IcX, IcOut, IcInstall, Eq } from "./icons";
import { useT } from "@/components/i18n/I18n";

// The brand kit's vector wheel (BrandDesk > GeekFon Society > Logo).
const LOGO = "/brands/geekfon-society/geekfon-wheel.svg";
const WORDMARK = "/brands/geekfon-society/geekfon-wordmark-reverse.svg";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const coverOf = (rot?: RadioTrack[]) => (rot ?? []).find(t => t.kind !== "spot" && t.coverUrl)?.coverUrl ?? null;

export default function PopPlayer() {
  const t = useT();
  const R = useLiveRadio();
  const [lyrOpen, setLyrOpen] = useState(false);
  const [sheet, setSheet] = useState<"what" | "install" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const tilesRef = useRef<HTMLDivElement | null>(null);
  const sheetClose = useRef<HTMLButtonElement | null>(null);
  const whatBtn = useRef<HTMLButtonElement | null>(null);

  const st: Station = R.stationInfo ?? FALLBACK_MAIN;
  const song = songOf(R.onAir);
  const isSpot = R.onAir?.type === "ad";
  const lyrics = useLyrics(song?.songId);
  const artist = useArtist(sheet === "what" ? song?.slug : null);
  const lv = useLyricView(lyrics);
  const { lines, lang } = lv;
  const heartOn = R.isHearted(song);
  const dur = R.onAir?.durationSeconds || 0;
  const at = Math.min(R.position, dur);
  const pct = dur > 0 ? Math.min(100, (at / dur) * 100) : 0;

  /* ---------- install ---------- */
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  // A small pop-up window (opened by Pop out) has no address bar, and browsers do not install apps from it:
  // there the button explains that and opens the player in a full window (Sean, 2026-11-12: "when I click
  // install app, nothing happens... something flash[es] for a few seconds").
  const [inPopup, setInPopup] = useState(false);
  useEffect(() => {
    try { setInPopup(window.name === "gfradio" || window.toolbar?.visible === false || window.menubar?.visible === false); } catch { /* ignore */ }
  }, []);
  const install = useCallback(async () => {
    if (!inPopup && installEvt) {
      let accepted = false;
      try {
        await installEvt.prompt();
        const choice = await installEvt.userChoice;
        accepted = choice.outcome === "accepted";
        if (accepted) setInstalled(true);
      } catch { /* dismissed */ }
      setInstallEvt(null);
      if (!accepted) setSheet("install");
      return;
    }
    setSheet("install");
  }, [installEvt, inPopup]);

  /* ---------- toast ---------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- keep the tuned station in view ---------- */
  useEffect(() => {
    const box = tilesRef.current;
    const t = box?.querySelector<HTMLElement>(`[data-slug="${R.station}"]`);
    if (!box || !t) return;
    if (t.offsetLeft < box.scrollLeft || t.offsetLeft + t.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollLeft = Math.max(0, t.offsetLeft - 16);
    }
  }, [R.station, R.stations.length]);

  /* ---------- sheet focus and Escape ---------- */
  useEffect(() => {
    if (sheet) sheetClose.current?.focus();
  }, [sheet]);
  const closeSheet = useCallback(() => {
    const was = sheet;
    setSheet(null);
    if (was === "what") whatBtn.current?.focus();
  }, [sheet]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (sheet) closeSheet(); else if (lyrOpen) setLyrOpen(false); }
      if (e.key === " " && e.target === document.body) { e.preventDefault(); R.toggleLive(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet, lyrOpen, closeSheet, R]);

  useEffect(() => {
    document.title = R.live && R.onAir ? t("pop.docTitle", { title: R.onAir.title, artist: R.onAir.artist }) : "GeekFon Radio";
  }, [R.live, R.onAir, t]);

  const toggleHeart = () => {
    if (!song?.songId) return;
    const on = R.toggleHeart(song);
    setToast(on ? t("pop.heartAdded") : t("pop.heartRemoved"));
  };

  return (
    <div className={"gfp" + (R.live ? " playing" : "") + (lyrOpen ? " lyr" : "")} style={{ "--st": stColor(st), "--st-ink": stInk(st) } as React.CSSProperties}>
      <style>{POP_CSS}</style>
      {/* The brand kit's wordmark on night, the same logo as the site (Sean, 16 Nov 2026: the pop-out still showed the old
          wheel-and-typed-name setup). */}
      <header className="tbar">
        <img className="wm" src={WORDMARK} alt="GeekFon Society" />
      </header>

      <div className="wbody">
        <div className="tiles" ref={tilesRef} role="group" aria-label={t("pop.stations")}>
          {R.stations.map(s => {
            const on = s.slug === R.station;
            const c = coverOf(R.schedules[s.slug]?.rotation);
            return (
              <button
                key={s.slug}
                type="button"
                className="tile"
                data-slug={s.slug}
                aria-pressed={on}
                style={{ "--c": stColor(s), "--i": stInk(s) } as React.CSSProperties}
                onClick={() => R.tune(s.slug, on ? true : R.live)}
                aria-label={t(on ? (R.live ? "pop.tileOnAir" : "pop.tileTunedIn") : "pop.tileTuneIn", { name: s.name })}
              >
                <span className="nm">{s.name.replace(/ Radio$/, "")}</span>
                {s.seasonal ? <span className="sea">{t("pop.seasonal")}</span> : null}
                {c ? <img src={c} alt="" /> : null}
                <span className="air">{on ? <><Eq still={!R.live} />{R.live ? t("pop.onAir") : t("pop.tunedIn")}</> : null}</span>
              </button>
            );
          })}
          <div className="tile coming" aria-label={t("pop.comingLabel", { name: NEW_TALENT.name })} style={{ "--c": NEW_TALENT.color, "--i": NEW_TALENT.ink } as React.CSSProperties}>
            <span className="ring" /><span className="nm">{NEW_TALENT.name}</span><span className="tag">{t("pop.coming")}</span>
          </div>
        </div>

        <div className="np">
          <div className="cvw">
            {R.onAir?.coverUrl ? <img src={R.onAir.coverUrl} alt={song ? t("pop.coverOf", { title: song.title, artist: song.artist }) : ""} /> : <img className="logo" src={LOGO} alt="" />}
            <span className="livechip"><i />{R.onAir?.type === "pinned" ? t("pop.premiere") : t("pop.live")}<span>{st.name}</span></span>
          </div>
          <div className="meta">
            {R.onAir?.coverUrl ? <img className="thumb" src={R.onAir.coverUrl} alt="" /> : null}
            <div className="tx">
              <h1 className="song">{R.onAir?.title || (R.loading ? t("pop.tuningIn") : "GeekFon Radio")}</h1>
              {isSpot ? (
                R.onAir?.linkUrl
                  ? <a className="who sponsor" href={R.onAir.linkUrl} target="_blank" rel="noopener sponsored">{t("pop.visitSponsor", { name: R.onAir.sponsor || R.onAir.artist })}</a>
                  : <span className="who">{R.onAir?.sponsor ? t("pop.withSponsor", { name: R.onAir.sponsor }) : R.onAir?.artist}</span>
              ) : song ? (
                <button type="button" className="who" aria-haspopup="dialog" aria-label={t("pop.artistWhat", { artist: song.artist })} onClick={() => setSheet("what")}>{song.artist}</button>
              ) : null}
              <div className="lv"><i /><span>{t("pop.liveOn", { station: st.name })}</span></div>
            </div>
          </div>
        </div>

        {lyrOpen ? (
          <div className="lyrics" aria-label={t("pop.lyrics")}>
            <div className="lyr-h"><b>{t("pop.lyrics")}</b>{lv.both ? <LyricToggle showing={lv.showing} native={lv.native} lang={lang} code={lv.code} /> : <span>{lang ? t("pop.sungInShownEn", { lang }) : t("pop.freeForEveryone")}</span>}</div>
            <div className="lyr-s" tabIndex={0} aria-label={t("pop.lyricsScrolls")}>
              {lyrics === undefined && song?.songId ? <p className="fine">{t("pop.loadingLyrics")}</p>
                : lines.length ? lines.map((l, i) => l.kind === "sec" ? <p key={i} className="sec">{l.text}</p> : <p key={i} className="ln">{l.text}</p>)
                : <p className="fine">{isSpot ? (R.onAir?.sponsor ? t("pop.sponsorWord") : t("pop.quickHello", { artist: R.onAir?.artist ?? "" })) : t("pop.noLyrics")}</p>}
              {lines.length ? <p className="fine">{t("pop.lyricsFree")}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="ctl">
          <div className="l">
            <button type="button" className={"ib" + (heartOn ? " hearted" : "")} onClick={toggleHeart} disabled={!song?.songId} aria-pressed={heartOn} aria-label={heartOn ? t("pop.removeHeart") : t("pop.heartSong")}><IcHeart on={heartOn} size={22} /></button>
            <button type="button" className="ib" onClick={() => setLyrOpen(o => !o)} aria-expanded={lyrOpen} aria-label={t("pop.lyrics")} title={t("pop.lyrics")}><IcLyrics /></button>
          </div>
          <button type="button" className="play" onClick={R.toggleLive} disabled={R.loading && !R.onAir} aria-label={R.live ? t("pop.pause") : t("pop.play")}>{R.live ? <IcPause /> : <IcPlay />}</button>
          <button type="button" ref={whatBtn} className="wit r" aria-haspopup="dialog" aria-expanded={sheet === "what"} onClick={() => setSheet("what")} disabled={!song}><span className="q" aria-hidden="true">?</span>{t("pop.whatIsThis")}</button>
        </div>

        <div className="prog" aria-hidden="true"><span>{fmtTime(at)}</span><div className="track"><i style={{ width: `${pct}%` }} /></div><span>{fmtTime(dur)}</span></div>

        <div className="wfoot">
          {installed ? <span style={{ flex: "none", textAlign: "left" }}>{t("pop.appName")}</span> : (
            <button type="button" className="inst" onClick={install}><IcInstall />{t("pop.installApp")}</button>
          )}
          <span>{t("pop.freeNoSignUp")}</span>
          <a href="/" target="_blank" rel="noopener">{t("pop.openGeekFon")}</a>
        </div>
      </div>

      {sheet ? <div className="wscrim" onClick={closeSheet} aria-hidden="true" /> : null}

      {sheet === "what" && song ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="gfp-what">
          <div className="grab" aria-hidden="true" />
          <div className="sh-h"><h2 id="gfp-what">{t("pop.whatIsThis")}</h2><button type="button" className="ib" ref={sheetClose} onClick={closeSheet} aria-label={t("pop.close")}><IcX size={18} /></button></div>
          <div className="card2">
            <p className="lab">{t("pop.aboutArtist")}</p>
            <div className="artist">
              {artist?.avatar || song.coverUrl ? <img src={(artist?.avatar || song.coverUrl)!} alt="" /> : null}
              <div><b>{artist?.name || song.artist}</b><span>{artist?.tagline || t("pop.fromRoster")}</span></div>
            </div>
            {artist?.stations?.length ? <div className="facts">{artist.stations.map(s => <span key={s.slug}>{s.name}</span>)}</div> : null}
            <a className="visit" href="/" target="_blank" rel="noopener" aria-label={t("pop.goDeeperLabel")}>
              {t("pop.goDeeper")}<small>geekfon.ai</small><IcOut />
            </a>
            <p className="visit-note">{t("pop.visitNote")}</p>
          </div>
          <div className="card2 lyrc">
            <p className="lab">{t("pop.lyrics")}</p>
            {lv.both ? <div className="lyh"><p className="lang">{t(lv.showing === "en" ? "pop.sungInShownEn" : "pop.sungIn", { lang: lang ?? "" })}</p><LyricToggle showing={lv.showing} native={lv.native} lang={lang} code={lv.code} /></div> : <p className="lang">{lang ? t("pop.sungInShownEn", { lang }) : t("pop.freeForEveryoneDot")}</p>}
            {lines.length ? (
              <>
                <div className="lprev">{lyricPreview(lines, 5).map((l, i) => l.kind === "sec" ? <p key={i} className="sec">{l.text}</p> : <p key={i} className="ln">{l.text}</p>)}</div>
                <button type="button" className="full" onClick={() => { setSheet(null); setLyrOpen(true); }}><IcLyrics size={18} />{t("pop.showFullLyrics")}</button>
              </>
            ) : <p className="none">{lyrics === undefined ? t("pop.loadingLyrics") : t("pop.noLyrics")}</p>}
          </div>
        </div>
      ) : null}

      {sheet === "install" ? (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="gfp-inst">
          <div className="grab" aria-hidden="true" />
          <div className="sh-h"><h2 id="gfp-inst">{t("pop.installTitle")}</h2><button type="button" className="ib" ref={sheetClose} onClick={closeSheet} aria-label={t("pop.close")}><IcX size={18} /></button></div>
          {inPopup ? (
            <div className="card2">
              <p className="inote">{t("pop.popupNote")}</p>
              <a className="visit" href="/radio/pop" target="_blank" rel="noopener"><span>{t("pop.openFullWindow")}</span><IcOut /></a>
            </div>
          ) : null}
          <div className="card2">
            <ul className="steps">
              <li><b>{t("pop.stepChrome")}</b>{t("pop.stepChromeHow")}</li>
              <li><b>{t("pop.stepSafari")}</b>{t("pop.stepSafariHow")}</li>
              <li><b>{t("pop.stepIos")}</b>{t("pop.stepIosHow")}</li>
            </ul>
          </div>
        </div>
      ) : null}

      <div className={"toast" + (toast ? " show" : "")} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
