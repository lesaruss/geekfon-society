"use client";
// The artist player (2026-10-04, Sean: "I would like for it to stay on the
// page until you click the X... if I go to another artist, then it
// disappears"). It lives in the [artist] layout, not in the storefront, so
// it keeps playing while the fan moves between an artist's sections (Music,
// Press, Social, Gallery, Chat, the Support tour) and article pages, which
// are client-side navigations inside the same layout. Another artist is a
// different layout instance (and the frame's own nav reloads the page), so
// the player is gone there.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import "./storefront.css";

const PREVIEW_SECONDS = 30;

export type PlayerTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  url: string;
  /** A 30-second preview (not entitled to the full stream). */
  capped: boolean;
  durationSeconds: number | null;
};

type PlayerApi = {
  current: PlayerTrack | null;
  playing: boolean;
  /** Play track i of this queue, or toggle pause when it is already current. */
  playQueue: (queue: PlayerTrack[], i: number) => void;
  /** Where "Hear it all" goes: the page registers its Support action. */
  setHearAll: (fn: (() => void) | null) => void;
  /** The artist's accent, for the player's buttons. */
  setAccent: (color: string | null) => void;
  /** A slot in the song list the player docks into (Music section); null elsewhere. */
  setDock: (el: HTMLElement | null) => void;
};

const PlayerContext = createContext<PlayerApi | null>(null);

export function useArtistPlayer(): PlayerApi | null {
  return useContext(PlayerContext);
}

function fmtPct(time: number, max: number): string {
  return `${max ? Math.min(100, (time / max) * 100) : 0}%`;
}

export default function ArtistPlayerProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = typeof params?.artist === "string" ? params.artist : "";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const hearAllRef = useRef<(() => void) | null>(null);
  const [accent, setAccentState] = useState<string | null>(null);
  const setAccent = useCallback((c: string | null) => setAccentState(c), []);
  // Docked in the song list on the Music section (Sean, 2026-10-04: the
  // player "came up above [the Support bar], taking over a slot... it doesn't
  // interfere with the selector"); a fixed bar everywhere else.
  const [dock, setDockState] = useState<HTMLElement | null>(null);
  const setDock = useCallback((el: HTMLElement | null) => setDockState(el), []);
  const current = index !== null ? queue[index] ?? null : null;

  const close = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); a.removeAttribute("src"); a.load(); }
    setIndex(null);
    setQueue([]);
    setPlaying(false);
    setTime(0);
  }, []);

  // Room at the bottom of the page while the bar is up (storefront.css).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("artist-playing", !!current);
    root.classList.toggle("artist-docked", !!current && !!dock);
    return () => { root.classList.remove("artist-playing"); root.classList.remove("artist-docked"); };
  }, [current, dock]);

  // A different artist never inherits the last one's song.
  useEffect(() => { close(); }, [slug, close]);

  const start = useCallback((q: PlayerTrack[], i: number) => {
    const a = audioRef.current;
    const t = q[i];
    if (!a || !t) return;
    document.querySelectorAll("audio").forEach(el => { if (el !== a) el.pause(); });
    a.src = t.url;
    setQueue(q);
    setIndex(i);
    setTime(0);
    a.play().catch(() => setPlaying(false));
  }, []);

  const playQueue = useCallback((q: PlayerTrack[], i: number) => {
    const a = audioRef.current;
    if (a && current && q[i] && q[i].id === current.id) {
      if (a.paused) a.play().catch(() => setPlaying(false)); else a.pause();
      return;
    }
    start(q, i);
  }, [current, start]);

  const next = useCallback((dir = 1) => {
    if (index === null) return;
    const n = index + dir;
    if (n >= 0 && n < queue.length) start(queue, n);
    else audioRef.current?.pause();
  }, [index, queue, start]);

  function onTime() {
    const a = audioRef.current;
    if (!a || !current) return;
    if (current.capped && a.currentTime >= PREVIEW_SECONDS) { next(); return; }
    setTime(a.currentTime);
  }

  const setHearAll = useCallback((fn: (() => void) | null) => { hearAllRef.current = fn; }, []);
  const max = current ? (current.capped ? Math.min(PREVIEW_SECONDS, current.durationSeconds || PREVIEW_SECONDS) : (current.durationSeconds || 0)) : 0;

  return (
    <PlayerContext.Provider value={{ current, playing, playQueue, setHearAll, setAccent, setDock }}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={onTime}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => next()}
      />
      {current && (() => { const bar = (
        <div className={"am-player" + (dock ? " am-docked" : "")} role="region" aria-label="Player" style={accent ? { ["--rx" as string]: accent } : undefined}>
          <div className="am-p-controls">
            <button className="am-p-btn" onClick={() => next(-1)} aria-label="Previous" disabled={index === 0}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11 6v12L2.5 12zM21 6v12l-8.5-6z" /></svg>
            </button>
            <button className="am-p-btn am-p-main" onClick={() => index !== null && playQueue(queue, index)} aria-label={playing ? "Pause" : "Play"}>
              {playing
                ? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <button className="am-p-btn" onClick={() => next(1)} aria-label="Next" disabled={index === queue.length - 1}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13 6v12l8.5-6zM3 6v12l8.5-6z" /></svg>
            </button>
          </div>
          <div className="am-p-now">
            {current.coverUrl ? <img src={current.coverUrl} alt="" /> : <span className="am-p-blank" />}
            <div className="am-p-meta">
              <div className="am-p-title">{current.title}</div>
              <div className="am-p-artist">{current.artist}{current.capped ? " · 30-second preview" : ""}</div>
              <div className="am-p-bar"><div style={{ width: fmtPct(time, max) }} /></div>
            </div>
          </div>
          {current.capped && (
            <button className="sf-btn sf-btn-go am-p-cta" onClick={() => hearAllRef.current?.()}>Hear it all</button>
          )}
          <button className="am-p-btn am-p-close" onClick={close} aria-label="Close player">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ); return dock ? createPortal(bar, dock) : bar; })()}
    </PlayerContext.Provider>
  );
}
