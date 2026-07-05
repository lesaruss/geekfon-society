"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import SiteChrome from "@/components/SiteChrome";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
const AUDIO_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";
const radioSupabase = createClient(SUPA_URL, SUPA_ANON);

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type RadioTrack = { artist: string; title: string; path: string };

const CITIES = [
  { name: "London, UK", accent: "#F69820", desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  { name: "Fort Lauderdale, FL", accent: "#00BCD4", desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  { name: "Seoul, South Korea", accent: "#9C27B0", desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  { name: "Tokyo, Japan", accent: "#E91E8C", desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  { name: "Berlin, Germany", accent: "#2196F3", desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  { name: "Johannesburg, SA", accent: "#F44336", desktop: CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png", mobile: CDN + "hf_20260619_064547_2906c350-a205-4c96-9bb1-114dc53fc237.png" },
  { name: "Orlando, FL", accent: "#FF9800", desktop: CDN + "hf_20260619_125302_4c4f6747-3bcb-45b2-a743-610912078942.png", mobile: CDN + "hf_20260619_125452_ad933e6f-0b03-43a4-b111-341e76b9efd9.jpeg" },
];

// PLAYLIST is now loaded live from Supabase radio_tracks (see loadPlaylist below) -
// the previous hardcoded 15-track list only covered 3 of 11 artists and included
// two tracks (the-flex.mp3, vibration.mp3) that were actually superadmin-gated,
// plus one dead file (good-luck.mp3, 400) that broke playback on rotation.

export default function RadioPage() {
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cityRef = useRef(0);
  const cityPanelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackIdxRef = useRef(0);
  const [playlist, setPlaylist] = useState<RadioTrack[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const playlistRef = useRef<RadioTrack[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlaylist() {
      const nowIso = new Date().toISOString();
      const { data, error } = await radioSupabase
        .from("radio_tracks")
        .select("artist_slug, title, src_path, release_date")
        .eq("is_public", true)
        .neq("src_path", "PENDING")
        .lte("release_date", nowIso)
        .order("artist_slug", { ascending: true })
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const rows = !error && data ? data : [];
      const mapped: RadioTrack[] = rows.map(r => ({
        artist: artistName(r.artist_slug as string),
        title: r.title as string,
        path: r.src_path as string,
      }));
      const shuffled = shuffle(mapped);
      playlistRef.current = shuffled;
      setPlaylist(shuffled);
      setLoadingPlaylist(false);
    }
    loadPlaylist();
    return () => { cancelled = true; };
  }, []);

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
    timerRef.current = setInterval(() => goCity((cityRef.current + 1) % CITIES.length), 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [goCity]);

  useEffect(() => {
    cityPanelRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.transition = "none";
      p.style.transform = i === 0 ? "translateX(0)" : "translateX(100%)";
    });
  }, []);

  function playTrack(idx: number, attempt = 0) {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const safeIdx = ((idx % list.length) + list.length) % list.length;
    const track = list[safeIdx];
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const a = audioRef.current;
    a.src = AUDIO_BASE + track.path;
    a.onended = () => {
      const next = (trackIdxRef.current + 1) % list.length;
      trackIdxRef.current = next;
      setTrackIdx(next);
      playTrack(next);
    };
    a.ontimeupdate = () => { setProgress(a.currentTime); };
    a.ondurationchange = () => { setDuration(a.duration || 0); };
    a.onerror = () => {
      // Skip a dead/blocked file and try the next one, but bail after a full
      // lap so a bad rotation can't spin the player forever.
      if (attempt >= list.length) { setPlaying(false); return; }
      const next = (trackIdxRef.current + 1) % list.length;
      trackIdxRef.current = next;
      setTrackIdx(next);
      playTrack(next, attempt + 1);
    };
    a.play().then(() => setPlaying(true)).catch(() => {});
  }

  function toggle() {
    if (playlistRef.current.length === 0) return;
    if (!audioRef.current || audioRef.current.paused || audioRef.current.ended) {
      playTrack(trackIdx);
    } else if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }

  const track = playlist.length > 0 ? playlist[trackIdx % playlist.length] : null;
  const city = CITIES[current];
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <SiteChrome crumb={[{ label: "GeekFon Radio" }]}>
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
            disabled={loadingPlaylist || !track}
            aria-label={playing ? "Pause GeekFon Radio" : "Play GeekFon Radio"}
          >
            <img src="/geekfon-logo.png" alt="GeekFon Radio" className="rd-logo-img" />
            <div className="rd-play-icon">
              {playing ? (
                <svg viewBox="0 0 24 24" fill="white" width="36" height="36"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" width="36" height="36"><polygon points="8 5 19 12 8 19"/></svg>
              )}
            </div>
            {playing && <div className="rd-pulse-ring" />}
            {playing && <div className="rd-pulse-ring rd-pulse-ring-2" />}
          </button>

          <div className="rd-brand-row">
            <span className="rd-brand-geekfon"><span className="rd-brand-geek">GEEK</span><span className="rd-brand-fon">FON</span></span>
            <span className="rd-brand-sep"></span>
            <span className="rd-brand-radio">RADIO</span>
          </div>
        </div>

        <div className="rd-now-playing">
          <div className="rd-np-eyebrow">
            <span className="rd-live-dot" aria-hidden="true" />
            {loadingPlaylist ? "TUNING IN" : playing ? "NOW PLAYING" : "READY TO TUNE IN"}
          </div>
          <div className="rd-np-title">{track ? track.title : loadingPlaylist ? "Loading Season 1..." : "No tracks available"}</div>
          {track && <div className="rd-np-artist">{track.artist}</div>}

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

        {!playing && !loadingPlaylist && track && (
          <p className="rd-hint">Tap the logo to tune in</p>
        )}
      </div>
    </SiteChrome>
  );
}

const CSS = `
html, body { background: #020c0a !important; overflow-x: hidden; }
.gtop { background: rgba(2,12,10,0.85) !important; border-bottom-color: rgba(255,255,255,0.08) !important; backdrop-filter: blur(12px); }
.gham { color: #fff !important; }
.gham:hover { background: rgba(255,255,255,0.08) !important; }
.gfs-geek { color: #fff !important; }
.gbody { background: transparent !important; min-height: 100vh; position: relative; }

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

.rd-main { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 60px); gap: 36px; padding: 60px 24px; }

.rd-logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }

.rd-play-btn {
  position: relative; width: 190px; height: 190px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.12);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  backdrop-filter: blur(24px);
}
.rd-play-btn:hover { transform: scale(1.05); box-shadow: 0 0 70px rgba(0,180,255,0.28); border-color: rgba(0,180,255,0.4); }
.rd-play-btn.playing { border-color: rgba(0,180,255,0.45); box-shadow: 0 0 50px rgba(0,180,255,0.22); }
.rd-play-btn:focus-visible { outline: 2px solid #00B4FF; outline-offset: 4px; }

.rd-logo-img { width: 130px; height: 130px; object-fit: contain; display: block; transition: opacity 0.25s; }
.rd-play-btn:hover .rd-logo-img,
.rd-play-btn.playing .rd-logo-img { opacity: 0.25; }

.rd-play-icon { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s; }
.rd-play-btn:hover .rd-play-icon,
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

.rd-brand-row { display: flex; align-items: center; gap: 10px; }
.rd-brand-geekfon { display: inline-flex; align-items: baseline; }
.rd-brand-geek { font-family: 'Montserrat', sans-serif; font-size: 32px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #fff; }
@keyframes fonHue { 0% { color: #E91E8C; } 25% { color: #00B4FF; } 50% { color: #AAFF00; } 75% { color: #F69820; } 100% { color: #E91E8C; } }
.rd-brand-fon { font-family: 'Montserrat', sans-serif; font-size: 32px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; animation: fonHue 6s ease-in-out infinite; }
.rd-brand-sep { width: 1px; height: 22px; background: rgba(255,255,255,0.2); }
.rd-brand-radio { font-size: 13px; font-weight: 800; letter-spacing: .38em; text-transform: uppercase; color: rgba(255,255,255,0.45); }

.rd-now-playing { text-align: center; max-width: 420px; }
.rd-np-eyebrow { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 10px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 12px; }
.rd-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #00e676; box-shadow: 0 0 8px rgba(0,230,118,0.7); display: inline-block; flex-shrink: 0; animation: rdLivePulse 2s ease-in-out infinite; }
@keyframes rdLivePulse { 0%,100% { box-shadow: 0 0 6px rgba(0,230,118,0.6); } 50% { box-shadow: 0 0 16px rgba(0,230,118,0.95); } }

.rd-np-title { font-size: clamp(24px, 5vw, 32px); font-weight: 900; color: #fff; letter-spacing: -0.01em; margin-bottom: 8px; }
.rd-np-artist { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.45); letter-spacing: 0.05em; }

.rd-progress { display: flex; align-items: center; gap: 10px; margin-top: 18px; }
.rd-time { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35); font-variant-numeric: tabular-nums; white-space: nowrap; }
.rd-bar { flex: 1; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.rd-bar-fill { height: 100%; background: #00B4FF; border-radius: 2px; transition: width 0.5s linear; }

.rd-hint { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.28); letter-spacing: 0.12em; text-transform: uppercase; margin: 0; }

@media(max-width:480px) {
  .rd-play-btn { width: 150px; height: 150px; }
  .rd-logo-img { width: 100px; height: 100px; }
  .rd-brand-geek, .rd-brand-fon { font-size: 26px; }
  .rd-np-title { font-size: 22px; }
}
`;
