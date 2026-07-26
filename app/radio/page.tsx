"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";
import { resolvePlayhead, RadioTrack as ScheduleTrack, ScheduleOverride, ResolvedPlayhead } from "@/lib/radioSchedule";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
const AUDIO_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";

// Display names for radio_tracks.artist_slug (this table uses full-name slugs,
// which don't always match gfs_artists.slug - e.g. "riku-hayasaka" vs "riku").
const ARTIST_NAMES: Record<string, string> = {
  "lex-from-brixton": "Lex from Brixton",
  "lickle-bro": "Lickle Bro",
  "lickle-sis": "Lickle Sis",
  "mad-tings": "Mad Tings",
  "mr-russell": "Mr. Russell",
  "nilo-wave": "Nilo Wave",
  "riku-hayasaka": "Riku Hayasaka",
  "roxanne": "Roxanne",
  "rustblood-prophets": "Rustblood Prophets",
  "shamanic-resin": "Shamanic Resin",
  "straight-and-narrow": "Straight and Narrow",
};

function artistName(slug: string): string {
  return ARTIST_NAMES[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const CITIES = [
  { name: "London, UK", accent: "#F69820", desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  { name: "Fort Lauderdale, FL", accent: "#00BCD4", desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  { name: "Seoul, South Korea", accent: "#9C27B0", desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  { name: "Tokyo, Japan", accent: "#E91E8C", desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  { name: "Berlin, Germany", accent: "#2196F3", desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  { name: "Johannesburg, SA", accent: "#F44336", desktop: CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png", mobile: CDN + "hf_20260619_064547_2906c350-a205-4c96-9bb1-114dc53fc237.png" },
  { name: "Orlando, FL", accent: "#FF9800", desktop: "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/city-backgrounds/orlando-desktop-cropped.png", mobile: CDN + "hf_20260619_125452_ad933e6f-0b03-43a4-b111-341e76b9efd9.jpeg" },
];

const RESYNC_DRIFT_TOLERANCE_SEC = 2;
const RESYNC_INTERVAL_MS = 5000;

export default function RadioPage() {
  // 2026-07-26 per Sean: "let people be able to listen to the radio station
  // without being logged in." This used to require a gfs_members row and
  // redirect anyone without one to /passport?next=/radio - removed entirely.
  // radio_tracks / radio_schedule_overrides both have public-read RLS
  // policies and the audio lives in a public storage bucket (confirmed
  // 2026-07-26), so there was never a data-layer reason for this gate - it
  // was purely this page-level check. authChecked/isMember are kept (always
  // true post-mount) rather than ripped out everywhere below, to keep this a
  // minimal, low-risk diff on an otherwise-working page.
  const [authChecked, setAuthChecked] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    setIsMember(true);
    setAuthChecked(true);
  }, []);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<ResolvedPlayhead | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cityRef = useRef(0);
  const cityPanelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rotation, setRotation] = useState<ScheduleTrack[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const rotationRef = useRef<ScheduleTrack[]>([]);
  const overridesRef = useRef<ScheduleOverride[]>([]);
  const currentPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authChecked || !isMember) return;
    let cancelled = false;
    async function loadSchedule() {
      const nowIso = new Date().toISOString();
      const { data: trackRows } = await supabase
        .from("radio_tracks")
        .select("artist_slug, title, src_path, duration_seconds, release_date")
        .eq("is_public", true)
        .neq("src_path", "PENDING")
        .lte("release_date", nowIso)
        .order("radio_order", { ascending: true, nullsFirst: false })
        .order("artist_slug", { ascending: true })
        .order("sort_order", { ascending: true });
      if (cancelled) return;

      const fixed: ScheduleTrack[] = (trackRows || []).map(r => ({
        artist: artistName(r.artist_slug as string),
        title: r.title as string,
        path: r.src_path as string,
        durationSeconds: (r.duration_seconds as number | null) || 180,
      }));
      rotationRef.current = fixed;
      setRotation(fixed);

      const { data: overrideRows } = await supabase
        .from("radio_schedule_overrides")
        .select("kind, label, ad_src_path, starts_at, duration_seconds, cadence_seconds, track_id, radio_tracks(artist_slug, title, src_path)")
        .eq("is_active", true);

      const mapped: ScheduleOverride[] = (overrideRows || []).flatMap((o: any): ScheduleOverride[] => {
        if (o.kind === "pinned" && o.starts_at && o.radio_tracks) {
          const pinned: ScheduleOverride = {
            kind: "pinned",
            path: o.radio_tracks.src_path,
            title: o.radio_tracks.title,
            artist: artistName(o.radio_tracks.artist_slug),
            startsAtMs: new Date(o.starts_at).getTime(),
            durationSeconds: o.duration_seconds || 180,
            label: o.label || undefined,
          };
          return [pinned];
        }
        if (o.kind === "ad_cadence") {
          const ad: ScheduleOverride = {
            kind: "ad_cadence",
            adSrcPath: o.ad_src_path || null,
            cadenceSeconds: o.cadence_seconds || 0,
            durationSeconds: o.duration_seconds || 0,
            label: o.label || undefined,
          };
          return [ad];
        }
        return [];
      });
      overridesRef.current = mapped;
      setOverrides(mapped);
      setLoadingPlaylist(false);
    }
    loadSchedule();
    return () => { cancelled = true; };
  }, [authChecked, isMember]);

  const goCity = useCallback((next: number) => {
    const prev = cityRef.current;
    if (next === prev) return;
    const prevP = cityPanelRefs.current[prev];
    const nextP = cityPanelRefs.current[next];
    if (!prevP || !nextP) return;
    nextP.style.transition = "none";
    nextP.style.transform = "translateX(100%)";
    void nextP.offsetHeight;
    const ease = "cubic-bezier(0.25,0.46,0.45,0.94)";
    nextP.style.transition = `transform 0.95s ${ease}`;
    prevP.style.transition = `transform 0.95s ${ease}`;
    nextP.style.transform = "translateX(0)";
    prevP.style.transform = "translateX(-105%)";
    setTimeout(() => { if (prevP) { prevP.style.transition = "none"; prevP.style.transform = "translateX(100%)"; } }, 980);
    cityRef.current = next;
    setCurrent(next);
  }, []);

  useEffect(() => {
    cityTimerRef.current = setInterval(() => goCity((cityRef.current + 1) % CITIES.length), 6000);
    return () => { if (cityTimerRef.current) clearInterval(cityTimerRef.current); };
  }, [goCity]);

  // Fixed 2026-07-26 per Sean ("stuck on the Orlando background for the
  // first couple rotations, then after one full round it starts to work"):
  // this effect is supposed to park every panel except the first one
  // off-screen right after mount. But its dependency array was `[]`, so React
  // only ever ran it once - on the component's very FIRST render, which is
  // the `if (!authChecked || !isMember) return null;` render below (leftover
  // from the pre-2026-07-26 login gate; authChecked/isMember flip true a
  // moment later via their own mount effect, but that's a SECOND render).
  // On that first render nothing under SiteChrome exists yet, so
  // cityPanelRefs.current was still empty and this ran as a total no-op -
  // every panel kept `transform:none` (fully overlapping, all at the same
  // spot) until goCity() happened to touch it directly during a real
  // rotation. Since Orlando is last in CITIES/last in the DOM, it's the one
  // that visually wins that overlap and appears "stuck" until the rotation
  // reaches it for the first time (~one full lap), which is exactly the
  // reported symptom. Adding authChecked/isMember as deps (same guard style
  // already used by the schedule-loading effect above) makes this re-run
  // once the real panels actually exist, so all 7 get positioned correctly
  // from the start instead of only the ones goCity has already visited.
  useEffect(() => {
    if (!authChecked || !isMember) return;
    cityPanelRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.transition = "none";
      p.style.transform = i === 0 ? "translateX(0)" : "translateX(100%)";
    });
  }, [authChecked, isMember]);

  // Load + seek to wherever the deterministic clock says this listener should
  // land right now, then keep playback locked to that same clock going
  // forward - this is what makes every listener worldwide hear the same
  // thing at the same time instead of each browser running its own copy.
  const tuneToNow = useCallback((autoplay: boolean) => {
    const resolved = resolvePlayhead(Date.now(), rotationRef.current, overridesRef.current);
    if (!resolved) return;
    setNowPlaying(resolved);
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    const changedTrack = currentPathRef.current !== resolved.path;
    if (changedTrack) {
      currentPathRef.current = resolved.path;
      a.ontimeupdate = () => setProgress(a.currentTime);
      a.ondurationchange = () => setDuration(a.duration || 0);
      a.onended = () => tuneToNow(true);
      a.onerror = () => { /* skip forward on next resync tick */ };
      // Set currentTime again once metadata is ready - some browsers ignore
      // a seek issued before the media is seekable, so this is a safety net
      // on top of the immediate assignment below, not the primary path.
      a.onloadedmetadata = () => { a.currentTime = resolved.offsetSeconds; };
      a.src = AUDIO_BASE + resolved.path;
      a.currentTime = resolved.offsetSeconds;
    } else if (Math.abs(a.currentTime - resolved.offsetSeconds) > RESYNC_DRIFT_TOLERANCE_SEC) {
      a.currentTime = resolved.offsetSeconds;
    }
    // play() must stay in the same synchronous tick as the click that
    // triggered it, or the browser's autoplay policy silently blocks it -
    // deferring this into an onloadedmetadata callback (async, off the
    // user-gesture stack) caused the first bug. This has to run every time,
    // not just on a track change - resuming from pause is the SAME track
    // (changedTrack is false) and was the case that silently never called
    // play() again, which is why it "didn't always play."
    if (autoplay && a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, []);

  // Show what's currently on, even before the listener presses play, so the
  // page never reads as broken/empty while data is actually loaded and the
  // clock is already running for everyone else.
  useEffect(() => {
    if (loadingPlaylist || playing) return;
    const tick = () => {
      const resolved = resolvePlayhead(Date.now(), rotationRef.current, overridesRef.current);
      if (resolved) setNowPlaying(resolved);
    };
    tick();
    const id = setInterval(tick, RESYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadingPlaylist, playing]);

  function toggle() {
    if (rotationRef.current.length === 0) return;
    if (!playing) {
      tuneToNow(true);
      if (resyncTimerRef.current) clearInterval(resyncTimerRef.current);
      resyncTimerRef.current = setInterval(() => tuneToNow(true), RESYNC_INTERVAL_MS);
    } else {
      audioRef.current?.pause();
      setPlaying(false);
      if (resyncTimerRef.current) { clearInterval(resyncTimerRef.current); resyncTimerRef.current = null; }
    }
  }

  useEffect(() => {
    return () => { if (resyncTimerRef.current) clearInterval(resyncTimerRef.current); };
  }, []);

  function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }

  const city = CITIES[current];
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  if (!authChecked || !isMember) return null;

  return (
    <SiteChrome>
      <style>{CSS}</style>

      <div className="rd-city-stage">
        {CITIES.map((c, i) => (
          <div key={c.name} className="rd-city-panel" ref={(el) => { cityPanelRefs.current[i] = el; }}>
            <picture>
              <source media="(max-width:768px)" srcSet={c.mobile} />
              <img src={c.desktop} alt="" aria-hidden="true" />
            </picture>
          </div>
        ))}
      </div>

      <div className="rd-overlay" />

      <div className="rd-city-label">
        <span className="rd-city-dot" style={{ backgroundColor: city.accent }} />
        <span className="rd-city-name">{city.name}</span>
      </div>

      <div className="rd-main">
        <div className="rd-logo-wrap">
          <button
            className={"rd-play-btn" + (playing ? " playing" : "")}
            onClick={toggle}
            disabled={loadingPlaylist || rotation.length === 0}
            aria-label={playing ? "Pause GeekFon Radio" : "Play GeekFon Radio"}
          >
            <img src="/geekfon-logo.png" alt="" aria-hidden="true" className="rd-logo-img" />
            <div className="rd-play-icon">
              {playing ? (
                <svg viewBox="0 0 24 24" fill="white" width="44" height="44"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" width="44" height="44"><polygon points="8 5 19 12 8 19"/></svg>
              )}
            </div>
            {playing && <div className="rd-pulse-ring" />}
            {playing && <div className="rd-pulse-ring rd-pulse-ring-2" />}
          </button>
        </div>

        <div className="rd-now-playing">
          <div className="rd-np-eyebrow">
            <span className="rd-live-dot" aria-hidden="true" />
            {loadingPlaylist
              ? "TUNING IN"
              : nowPlaying?.type === "ad"
              ? "AD BREAK"
              : nowPlaying?.type === "pinned"
              ? "LIVE PREMIERE"
              : playing ? "NOW PLAYING - LIVE WORLDWIDE" : "READY TO TUNE IN"}
          </div>
          <div className="rd-np-title">{nowPlaying ? nowPlaying.title : loadingPlaylist ? "Loading Season 1..." : "No tracks available"}</div>
          {nowPlaying && <div className="rd-np-artist">{nowPlaying.artist}</div>}

          {playing && duration > 0 && (
            <div className="rd-progress">
              <span className="rd-time">{fmt(progress)}</span>
              <div className="rd-bar">
                <div className="rd-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="rd-time">{fmt(duration)}</span>
            </div>
          )}
        </div>

        {!playing && !loadingPlaylist && rotation.length > 0 && (
          <p className="rd-hint">Tap the logo to tune in - everyone hears the same moment, live</p>
        )}
      </div>
    </SiteChrome>
  );
}

const CSS = `
html, body { background: #020c0a !important; overflow: hidden !important; height: 100%; }
.gtop { background: rgba(2,12,10,0.85) !important; border-bottom-color: rgba(255,255,255,0.08) !important; backdrop-filter: blur(12px); }
.gham { color: #fff !important; }
.gham:hover { background: rgba(255,255,255,0.08) !important; }
.gfs-geek { color: #fff !important; }
.gbody { background: transparent !important; height: calc(100vh - 60px); position: relative; overflow: hidden; }

.rd-city-stage { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.rd-city-panel { position: absolute; inset: 0; will-change: transform; }
.rd-city-panel picture { display: block; width: 100%; height: 100%; }
.rd-city-panel img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }

.rd-overlay {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(2,12,10,0.88) 100%);
}

.rd-city-label { position: fixed; bottom: 24px; right: 28px; z-index: 20; display: flex; align-items: center; gap: 8px; pointer-events: none; }
.rd-city-dot { width: 5px; height: 5px; border-radius: 50%; transition: background-color 1s ease; }
.rd-city-name { font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: rgba(255,255,255,.5); }

/* 2026-07-26 per Sean: "could be centered a little more, brought up a bit."
   Mathematically this box already fills exactly the space below the fixed
   header (height: calc(100vh - 60px), confirmed via computed layout - no
   double-counted gap here like the /dashboard pages had). The play button
   is the single largest, heaviest visual element, sitting ABOVE the now-
   playing text + hint line below it - centering the whole stack puts the
   circle's own optical weight slightly below true-center rather than at it,
   a common effect with one big element over smaller ones. Asymmetric
   padding (more on the bottom than the top) shifts the centered group up
   within the box without touching the header-clearance math at all. */
.rd-main { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100vh - 60px); overflow: hidden; gap: 24px; padding: 24px 24px calc(24px + 6vh) 24px; box-sizing: border-box; }

.rd-logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; flex-shrink: 0; }

.rd-play-btn {
  /* Sized to match the homepage hero circle (.hero-circle-wrap) more closely,
     per Sean 2026-07-26: "as big as what we have on the home page... same play
     button." Same min()-of-vw/vh formula as the homepage so it scales down
     safely on short viewports too, just tuned a bit smaller than the
     homepage's own 44vw/72vh since this page still has a separate now-playing
     text block + progress bar below the circle that needs its own vertical
     room (the homepage puts its text inside the circle instead). */
  position: relative; width: min(360px, min(42vw, 60vh)); height: min(360px, min(42vw, 60vh)); border-radius: 50%;
  background: rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.12);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  backdrop-filter: blur(24px);
}
.rd-play-btn:hover { transform: scale(1.05); box-shadow: 0 0 70px rgba(0,180,255,0.28); border-color: rgba(0,180,255,0.4); }
.rd-play-btn.playing { border-color: rgba(0,180,255,0.45); box-shadow: 0 0 50px rgba(0,180,255,0.22); }
.rd-play-btn:focus-visible { outline: 2px solid #00B4FF; outline-offset: 4px; }

/* Percentage-based (was a fixed 130px) so the logo keeps the same proportion
   inside the circle automatically as the circle itself now scales with
   viewport size, instead of needing its own separate breakpoint overrides. */
.rd-logo-img { width: 68%; height: 68%; object-fit: contain; display: block; transition: opacity 0.25s; }
.rd-play-btn:hover .rd-logo-img,
.rd-play-btn.playing .rd-logo-img { opacity: 0.25; }

/* 2026-07-26 per Sean: the play icon used to be fully invisible until hover
   (opacity:0) - "it doesn't make sense that you don't see it, you might not
   know it's a play button without it." Now always visible at a dim/grayed
   opacity by default so the button reads as clickable at a glance, brightens
   slightly on hover as a preview, and goes fully bright ("full color") once
   actually playing - same visual language as the hero button on the homepage
   (icon always present, never a mystery circle) but with a clearer
   dim-to-bright state change since this circle is the page's one focal action. */
.rd-play-icon { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.4; transition: opacity 0.25s; }
.rd-play-btn:hover .rd-play-icon { opacity: 0.7; }
.rd-play-btn.playing .rd-play-icon { opacity: 1; }

@keyframes rdPulse1 { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.65); opacity: 0; } }
@keyframes rdPulse2 { 0% { transform: scale(1); opacity: 0.35; } 100% { transform: scale(1.9); opacity: 0; } }
.rd-pulse-ring {
  position: absolute; inset: -8px; border-radius: 50%;
  border: 2px solid rgba(0,180,255,0.45);
  animation: rdPulse1 2.2s ease-out infinite;
  pointer-events: none;
}
.rd-pulse-ring-2 {
  animation: rdPulse2 2.2s ease-out infinite 1.1s;
}

.rd-now-playing { text-align: center; max-width: 420px; flex-shrink: 0; }
.rd-np-eyebrow { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 10px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 10px; }
.rd-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #00e676; box-shadow: 0 0 8px rgba(0,230,118,0.7); display: inline-block; flex-shrink: 0; animation: rdLivePulse 2s ease-in-out infinite; }
@keyframes rdLivePulse { 0%,100% { box-shadow: 0 0 6px rgba(0,230,118,0.6); } 50% { box-shadow: 0 0 16px rgba(0,230,118,0.95); } }

.rd-np-title {
  font-size: clamp(20px, 4vw, 32px); font-weight: 900; color: #fff; letter-spacing: -0.01em; margin-bottom: 6px;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}
.rd-np-artist { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.45); letter-spacing: 0.05em; }

.rd-progress { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
.rd-time { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35); font-variant-numeric: tabular-nums; white-space: nowrap; }
.rd-bar { flex: 1; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.rd-bar-fill { height: 100%; background: #00B4FF; border-radius: 2px; transition: width 0.5s linear; }

.rd-hint { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.28); letter-spacing: 0.12em; text-transform: uppercase; margin: 0; flex-shrink: 0; text-align: center; }

@media(max-width:480px) {
  /* Mirrors the homepage's mobile hero-circle-wrap (min(280px,70vw)) - logo
     scales with it automatically since it's percentage-based now. */
  .rd-play-btn { width: min(260px, 68vw); height: min(260px, 68vw); }
  .rd-np-title { font-size: 20px; }
}

@media(max-height:700px) {
  /* Circle no longer needs its own override here - the 60vh term already
     built into .rd-play-btn's width/height shrinks it on short viewports.
     Just tighten the surrounding gap/padding like before. */
  .rd-main { gap: 16px; padding: 16px; }
}
`;
