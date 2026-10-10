"use client";
// One GeekFon Radio for the whole site (Sean and V, 2026-10-10: "the music
// never stops between pages"). Mounted once in app/layout.tsx, so the audio
// element survives client navigation: start the radio on the homepage, open
// the roster or an artist page, and the song keeps going.
//
// Three things share the one speaker:
//   radio  the synced-clock station (lib/radioSchedule.ts), same moment for everyone
//   clip   one song on demand: an artist's single from the stage, or a
//          30-second roster preview; when it ends the radio comes back if it was on
//   off
//
// The station's on-air track is known even before anyone presses play, so the
// homepage stage can show who is on the radio right now (useRadio().onAir).
// Any other sound on the page (an artist page player, a video with sound) or
// in another geekfon.ai tab pauses this one. /radio has its own full player,
// so this one steps aside there.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { resolvePlayhead, type RadioTrack, type ResolvedPlayhead, type ScheduleOverride } from "@/lib/radioSchedule";
import { announcePlay, onOtherTabPlay } from "@/lib/audioFocus";

const AUDIO_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";
const RESYNC_MS = 5000;
const DRIFT_SEC = 2;

export type Clip = { slug?: string; title: string; artist: string; path: string; start?: number; seconds?: number; coverUrl?: string | null };
type Mode = "off" | "radio" | "clip";

type RadioCtx = {
  /** What the station is playing right now, whether or not this visitor is listening. */
  onAir: ResolvedPlayhead | null;
  /** What this visitor hears. */
  now: { title: string; artist: string; slug?: string; coverUrl?: string | null } | null;
  mode: Mode;
  playing: boolean;
  loading: boolean;
  /** Seconds into the current clip, for preview progress. */
  clipAt: number;
  /** Songs heard to the end (radio or clip), for the in-character follow ask. */
  songsHeard: number;
  rotation: RadioTrack[];
  loadSchedule: () => Promise<void>;
  startRadio: () => Promise<void>;
  toggleRadio: () => Promise<void>;
  playClip: (c: Clip) => Promise<void>;
  stop: () => void;
};

const Ctx = createContext<RadioCtx | null>(null);

export function useRadio(): RadioCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRadio outside RadioProvider");
  return c;
}

const src = (path: string) => (path.startsWith("http") ? path : AUDIO_BASE + path);

export default function RadioProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rotationRef = useRef<RadioTrack[]>([]);
  const overridesRef = useRef<ScheduleOverride[]>([]);
  const loadingSchedule = useRef<Promise<void> | null>(null);
  const curPath = useRef<string | null>(null);
  const modeRef = useRef<Mode>("off");
  const clipRef = useRef<Clip | null>(null);
  const resumeRadio = useRef(false);

  const [rotation, setRotation] = useState<RadioTrack[]>([]);
  const [onAir, setOnAir] = useState<ResolvedPlayhead | null>(null);
  const [mode, setModeState] = useState<Mode>("off");
  const [clip, setClip] = useState<Clip | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clipAt, setClipAt] = useState(0);
  const [songsHeard, setSongsHeard] = useState(0);

  const setMode = (m: Mode) => { modeRef.current = m; setModeState(m); };

  const loadSchedule = useCallback(() => {
    if (!loadingSchedule.current) {
      loadingSchedule.current = fetch("/api/radio/rotation")
        .then(r => (r.ok ? r.json() : null))
        .then((b: { rotation?: RadioTrack[]; overrides?: ScheduleOverride[] } | null) => {
          rotationRef.current = b?.rotation ?? [];
          overridesRef.current = b?.overrides ?? [];
          setRotation(rotationRef.current);
          setOnAir(resolvePlayhead(Date.now(), rotationRef.current, overridesRef.current));
        })
        .catch(() => { loadingSchedule.current = null; });
    }
    return loadingSchedule.current ?? Promise.resolve();
  }, []);

  // The on-air clock ticks for everyone once the schedule is loaded.
  useEffect(() => {
    const t = setInterval(() => {
      if (!rotationRef.current.length) return;
      const next = resolvePlayhead(Date.now(), rotationRef.current, overridesRef.current);
      setOnAir(prev => (prev?.path === next?.path ? prev : next));
    }, RESYNC_MS);
    return () => clearInterval(t);
  }, []);

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "auto";
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const play = useCallback((a: HTMLAudioElement) => {
    return a.play().then(() => { setPlaying(true); announcePlay(); }).catch(() => setPlaying(false));
  }, []);

  // Tune to the station's clock. Seeks are guarded: a seek before metadata
  // loads can throw, and onloadedmetadata re-applies it (see the 2026-07-26
  // notes that used to live in app/page.tsx).
  const syncRadio = useCallback(() => {
    const a = audio();
    const r = resolvePlayhead(Date.now(), rotationRef.current, overridesRef.current);
    if (!r) return;
    setOnAir(prev => (prev?.path === r.path ? prev : r));
    try {
      if (curPath.current !== r.path) {
        curPath.current = r.path;
        a.src = src(r.path);
        a.onloadedmetadata = () => { try { a.currentTime = r.offsetSeconds; } catch {} };
        a.currentTime = r.offsetSeconds;
      } else if (Math.abs(a.currentTime - r.offsetSeconds) > DRIFT_SEC) {
        a.currentTime = r.offsetSeconds;
      }
    } catch { /* retried by onloadedmetadata or the next tick */ }
    if (a.paused) void play(a);
  }, [audio, play]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setMode("off");
    clipRef.current = null;
    setClip(null);
    resumeRadio.current = false;
  }, []);

  const startRadio = useCallback(async () => {
    setLoading(true);
    try {
      await loadSchedule();
      clipRef.current = null;
      setClip(null);
      setMode("radio");
      syncRadio();
    } finally {
      setLoading(false);
    }
  }, [loadSchedule, syncRadio]);

  const toggleRadio = useCallback(async () => {
    if (playing) { stop(); return; }
    await startRadio();
  }, [playing, stop, startRadio]);

  const finishClip = useCallback(() => {
    clipRef.current = null;
    setClip(null);
    if (resumeRadio.current) { resumeRadio.current = false; setMode("radio"); curPath.current = null; syncRadio(); }
    else { audioRef.current?.pause(); setPlaying(false); setMode("off"); }
  }, [syncRadio]);

  const playClip = useCallback(async (c: Clip) => {
    const a = audio();
    resumeRadio.current = modeRef.current === "radio" && !a.paused ? true : modeRef.current === "clip" ? resumeRadio.current : false;
    clipRef.current = c;
    setClip(c);
    setClipAt(0);
    setMode("clip");
    curPath.current = null;
    a.src = src(c.path);
    const start = c.start ?? 0;
    a.onloadedmetadata = () => {
      try { a.currentTime = Math.min(start, Math.max((a.duration || start + 1) - 1, 0)); } catch {}
    };
    try { a.currentTime = start; } catch {}
    await play(a);
  }, [audio, play]);

  // One handler set for the element's whole life.
  useEffect(() => {
    const a = audio();
    a.onended = () => {
      setSongsHeard(n => n + 1);
      if (modeRef.current === "clip") finishClip();
      else if (modeRef.current === "radio") syncRadio();
    };
    a.onerror = () => { curPath.current = null; };
    a.ontimeupdate = () => {
      const c = clipRef.current;
      if (modeRef.current !== "clip" || !c) return;
      const at = a.currentTime - (c.start ?? 0);
      setClipAt(Math.max(0, at));
      if (c.seconds && at >= c.seconds) finishClip();
    };
    a.onpause = () => setPlaying(false);
    a.onplay = () => setPlaying(true);
  }, [audio, finishClip, syncRadio]);

  // Keep the station on its clock while it plays.
  useEffect(() => {
    if (mode !== "radio" || !playing) return;
    const t = setInterval(syncRadio, RESYNC_MS);
    return () => clearInterval(t);
  }, [mode, playing, syncRadio]);

  // A song that changed on the radio while listening counts as heard.
  const lastHeard = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "radio" || !playing || !onAir) return;
    if (lastHeard.current && lastHeard.current !== onAir.path) setSongsHeard(n => n + 1);
    lastHeard.current = onAir.path;
  }, [onAir, mode, playing]);

  // Other sound wins: anything else on this page with sound, or another tab.
  useEffect(() => {
    const onPlay = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLMediaElement && t !== audioRef.current && !t.muted) {
        audioRef.current?.pause();
        resumeRadio.current = false;
      }
    };
    document.addEventListener("play", onPlay, true);
    const off = onOtherTabPlay(() => audioRef.current?.pause());
    return () => { document.removeEventListener("play", onPlay, true); off(); };
  }, []);

  // /radio runs its own full player.
  useEffect(() => {
    if (pathname?.startsWith("/radio")) stop();
  }, [pathname, stop]);

  const now = useMemo(() => {
    if (mode === "clip" && clip) return { title: clip.title, artist: clip.artist, slug: clip.slug, coverUrl: clip.coverUrl };
    if (mode === "radio" && onAir) return { title: onAir.title, artist: onAir.artist, slug: onAir.slug, coverUrl: onAir.coverUrl };
    return null;
  }, [mode, clip, onAir]);

  const value: RadioCtx = { onAir, now, mode, playing, loading, clipAt, songsHeard, rotation, loadSchedule, startRadio, toggleRadio, playClip, stop };

  const showMini = playing && now && pathname !== "/" && pathname !== "/roster" && !pathname?.startsWith("/radio");

  return (
    <Ctx.Provider value={value}>
      {children}
      {showMini ? (
        <div className="gfr-mini" role="region" aria-label="GeekFon Radio">
          {now.coverUrl ? <img src={now.coverUrl} alt="" className="gfr-mini-cover" /> : <span className="gfr-mini-dot" aria-hidden="true" />}
          <div className="gfr-mini-text">
            <div className="gfr-mini-title">{now.title}</div>
            <div className="gfr-mini-artist">{mode === "radio" ? "GeekFon Radio · " : ""}{now.artist}</div>
          </div>
          <button type="button" className="gfr-mini-btn" onClick={stop} aria-label="Pause">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
          </button>
          <style>{MINI_CSS}</style>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

const MINI_CSS = `
.gfr-mini{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:45;display:flex;align-items:center;gap:10px;max-width:min(340px,calc(100vw - 32px));padding:8px 8px 8px 10px;border-radius:999px;background:rgba(14,14,20,.92);border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 28px rgba(0,0,0,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:'Montserrat',sans-serif;color:#fff;}
.gfr-mini-cover{width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.gfr-mini-dot{width:10px;height:10px;border-radius:50%;background:#4caf50;flex-shrink:0;margin:0 6px;}
.gfr-mini-text{min-width:0;flex:1;}
.gfr-mini-title{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gfr-mini-artist{font-size:10px;font-weight:600;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gfr-mini-btn{width:36px;height:36px;border-radius:50%;border:none;background:#F69820;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.gfr-mini-btn svg{width:16px;height:16px;fill:#1a1a1a;}
.gfr-mini-btn:focus-visible{outline:3px solid #fff;outline-offset:2px;}
`;
