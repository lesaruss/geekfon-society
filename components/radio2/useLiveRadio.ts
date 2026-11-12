"use client";
// GeekFon Radio v1 (Sean, 2026-11-12, Seat 2: Discovery): the one playback
// engine behind /radio and the /radio/pop pop-out, so the two never drift.
//
// Live radio is the synced clock (lib/radioSchedule.ts): every listener's
// browser resolves the same song at the same offset from the rotation API, so
// there is no skip, rewind or fast-forward. On top of it:
//   - a 30-second preview of a hearted song (/api/songs/<id>/preview), which
//     pauses the live radio until the listener goes "Back to live";
//   - hearts saved on this device (localStorage), shared between tabs and the
//     pop-out window through the storage event;
//   - the last station remembered on this device;
//   - one sound at a time across geekfon.ai tabs (lib/audioFocus);
//   - the Media Session (lock screen and media keys: title, artist, artwork);
//   - the anonymous listener heartbeat (/api/radio/ping), as the old page did.
//
// Every station's rotation is fetched once on load (the CDN caches it), so
// tuning to another station starts playing inside the click itself, which
// Safari needs to allow audio.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolvePlayhead, type RadioTrack, type ResolvedPlayhead, type ScheduleOverride } from "@/lib/radioSchedule";
import { announcePlay, onOtherTabPlay } from "@/lib/audioFocus";

export type Station = { slug: string; name: string; tagline: string | null; color?: string | null; ink?: string | null; seasonal?: boolean };
export type Song = { songId?: string; title: string; artist: string; slug?: string; coverUrl?: string | null; durationSeconds?: number };
export type Heart = Song & { songId: string; at: number };
// A song played on its own, off the radio: the free 30-second preview, or
// (full: true) the whole song on demand for a supporter of that artist.
export type Preview = { song: Song & { songId: string }; playing: boolean; ended: boolean; time: number; failed: boolean; full: boolean; duration: number };
type Schedule = { rotation: RadioTrack[]; overrides: ScheduleOverride[] };
/** An artist radio ("artist:<slug>", Sean 2026-11-12): "<Artist> Radio" in the artist's accent. */
export type ArtistStation = Station & { artistSlug: string };
export const ARTIST_PREFIX = "artist:";
export const isArtistStation = (slug: string) => slug.startsWith(ARTIST_PREFIX);
const STATION_SLUG = /^(artist:)?[a-z0-9-]{1,64}$/;

export const MAIN_SLUG = "main";
export const PREVIEW_SECONDS = 30;
// Used until the rotation API answers, and if it never does.
export const FALLBACK_MAIN: Station = { slug: MAIN_SLUG, name: "GeekFon Radio", tagline: "The whole roster", color: "#ECE22D", ink: "#0B0B0C", seasonal: false };

const LS_STATION = "gfr-station";
const LS_HEARTS = "gfr-hearts-v1";
const RESYNC_MS = 5000;
const DRIFT_SEC = 2;

/* ---------- small device store: never throws (private windows, blocked storage) ---------- */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
export function writeStore(key: string, value: unknown): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* memory only */ }
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Same song? By depot id when both have one, else by title and artist. */
export function sameSong(a?: Song | null, b?: Song | null): boolean {
  if (!a || !b) return false;
  if (a.songId && b.songId) return a.songId === b.songId;
  return a.title === b.title && a.artist === b.artist;
}

export function songOf(p: ResolvedPlayhead | null): Song | null {
  if (!p || p.type === "ad") return null;
  return { songId: p.songId, title: p.title, artist: p.artist, slug: p.slug, coverUrl: p.coverUrl ?? null, durationSeconds: p.durationSeconds };
}

async function fetchSchedule(slug: string): Promise<(Schedule & { stations?: Station[]; info?: ArtistStation }) | null> {
  try {
    const res = await fetch(`/api/radio/rotation?station=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const b = (await res.json()) as { rotation?: RadioTrack[]; overrides?: ScheduleOverride[]; stations?: Station[]; info?: ArtistStation };
    return { rotation: b.rotation ?? [], overrides: b.overrides ?? [], stations: b.stations, info: b.info };
  } catch {
    return null;
  }
}

export function useLiveRadio(opts: { syncUrl?: boolean } = {}) {
  const syncUrl = opts.syncUrl !== false;

  const [stations, setStations] = useState<Station[]>([FALLBACK_MAIN]);
  const [station, setStation] = useState<string>(MAIN_SLUG);
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [loading, setLoading] = useState(true);
  const [onAir, setOnAir] = useState<ResolvedPlayhead | null>(null);
  const [position, setPosition] = useState(0);
  const [live, setLive] = useState(false);
  const [recent, setRecent] = useState<Song[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [artistStations, setArtistStations] = useState<Record<string, ArtistStation>>({});

  const liveRef = useRef<HTMLAudioElement | null>(null);
  const pvRef = useRef<HTMLAudioElement | null>(null);
  const schedRef = useRef<Record<string, Schedule>>({});
  const stationRef = useRef(MAIN_SLUG);
  const wantLive = useRef(false);
  const curPath = useRef<string | null>(null);
  const previewRef = useRef<Preview | null>(null);
  const sessionId = useRef<string>("");

  const current = (): Schedule => schedRef.current[stationRef.current] ?? { rotation: [], overrides: [] };
  const resolveNow = () => { const s = current(); return resolvePlayhead(Date.now(), s.rotation, s.overrides); };

  const liveAudio = useCallback(() => {
    if (!liveRef.current) { const a = new Audio(); a.preload = "auto"; liveRef.current = a; }
    return liveRef.current;
  }, []);
  const pvAudio = useCallback(() => {
    if (!pvRef.current) { const a = new Audio(); a.preload = "none"; pvRef.current = a; }
    return pvRef.current;
  }, []);

  const setPv = useCallback((next: Preview | null) => { previewRef.current = next; setPreview(next); }, []);

  /* ---------- the synced clock ---------- */
  // Load and seek to wherever the clock says everyone is right now. play()
  // stays in the same tick as the click that asked for it (autoplay rules).
  const tuneToNow = useCallback((autoplay: boolean) => {
    const r = resolveNow();
    if (!r) return;
    setOnAir(prev => (prev && prev.path === r.path && prev.type === r.type ? prev : r));
    const a = liveAudio();
    try {
      if (curPath.current !== r.path) {
        curPath.current = r.path;
        const asked = Date.now();
        a.onloadedmetadata = () => { try { a.currentTime = r.offsetSeconds + (Date.now() - asked) / 1000; } catch { /* next resync */ } };
        a.src = r.path;
        a.currentTime = r.offsetSeconds;
      } else if (Math.abs(a.currentTime - r.offsetSeconds) > DRIFT_SEC) {
        a.currentTime = r.offsetSeconds;
      }
    } catch { /* retried by onloadedmetadata or the next resync */ }
    if (autoplay && a.paused) {
      a.play().then(() => announcePlay()).catch(() => { wantLive.current = false; setLive(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAudio]);

  const stopLive = useCallback(() => {
    wantLive.current = false;
    setLive(false);
    liveRef.current?.pause();
  }, []);

  const pausePreviewAudio = useCallback(() => {
    const p = pvRef.current;
    if (p && !p.paused) p.pause();
  }, []);

  const startLive = useCallback(() => {
    if (!current().rotation.length) return;
    if (previewRef.current) { pausePreviewAudio(); setPv(null); }
    wantLive.current = true;
    setLive(true);
    tuneToNow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuneToNow, pausePreviewAudio, setPv]);

  const toggleLive = useCallback(() => { if (wantLive.current) stopLive(); else startLive(); }, [startLive, stopLive]);

  /* ---------- stations ---------- */
  const writeStationToUrl = useCallback((slug: string) => {
    if (!syncUrl) return;
    try {
      // Only the home page carries ?station= (artist and roster pages keep their own address).
      if (window.location.pathname !== "/") return;
      const url = new URL(window.location.href);
      if (slug === MAIN_SLUG) url.searchParams.delete("station"); else url.searchParams.set("station", slug);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch { /* ignore */ }
  }, [syncUrl]);

  const storeSchedule = useCallback((slug: string, s: Schedule & { info?: ArtistStation }) => {
    schedRef.current = { ...schedRef.current, [slug]: { rotation: s.rotation, overrides: s.overrides } };
    setSchedules(schedRef.current);
    if (s.info) { const info = s.info; setArtistStations(m => ({ ...m, [slug]: info })); }
  }, []);

  /** Tune to a station. Pressing the station already tuned in plays or pauses it. */
  const tune = useCallback((slug: string, autoplay = true) => {
    if (slug === stationRef.current) {
      if (previewRef.current) { startLive(); return; }
      toggleLive();
      return;
    }
    const keepPlaying = autoplay || wantLive.current;
    liveRef.current?.pause();
    curPath.current = null;
    if (previewRef.current) { pausePreviewAudio(); setPv(null); }
    stationRef.current = slug;
    setStation(slug);
    writeStore(LS_STATION, slug);
    writeStationToUrl(slug);
    const ready = schedRef.current[slug];
    if (ready) {
      setOnAir(resolvePlayhead(Date.now(), ready.rotation, ready.overrides));
      if (keepPlaying) startLive(); else stopLive();
      return;
    }
    // Not fetched yet: load, then play if asked (the page already has the
    // listener's interaction, which Chrome and Firefox accept).
    setLoading(true);
    setOnAir(null);
    wantLive.current = keepPlaying;
    setLive(keepPlaying);
    void fetchSchedule(slug).then(s => {
      if (stationRef.current !== slug) return;
      setLoading(false);
      if (!s) { wantLive.current = false; setLive(false); return; }
      storeSchedule(slug, s);
      setOnAir(resolvePlayhead(Date.now(), s.rotation, s.overrides));
      if (wantLive.current) tuneToNow(true);
    });
  }, [startLive, stopLive, toggleLive, pausePreviewAudio, setPv, storeSchedule, tuneToNow, writeStationToUrl]);

  // First load: the station from the address, else the last one on this
  // device, else GeekFon Radio. Then every other station in the background,
  // for the station cards' covers and instant tuning.
  useEffect(() => {
    let cancelled = false;
    let first = MAIN_SLUG;
    try { first = new URLSearchParams(window.location.search).get("station") || readStore<string>(LS_STATION, MAIN_SLUG) || MAIN_SLUG; } catch { /* main */ }
    if (!STATION_SLUG.test(first)) first = MAIN_SLUG;
    sessionId.current = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    setHearts(readStore<Heart[]>(LS_HEARTS, []).filter(h => h && h.songId && h.title));

    (async () => {
      let slug = first;
      let s = await fetchSchedule(slug);
      if (!s && slug !== MAIN_SLUG) { slug = MAIN_SLUG; s = await fetchSchedule(slug); }
      if (cancelled) return;
      stationRef.current = slug;
      setStation(slug);
      if (slug !== first) writeStationToUrl(slug);
      if (s) {
        storeSchedule(slug, s);
        if (s.stations?.length) setStations(s.stations as Station[]);
        setOnAir(resolvePlayhead(Date.now(), s.rotation, s.overrides));
      }
      setLoading(false);
      const others = (s?.stations ?? []).map(x => x.slug).filter(x => x !== slug);
      await Promise.all(others.map(async o => {
        const os = await fetchSchedule(o);
        if (!cancelled && os) storeSchedule(o, os);
      }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- the clock ticks for everyone, playing or not ---------- */
  useEffect(() => {
    const t = setInterval(() => {
      const r = resolveNow();
      if (!r) return;
      setOnAir(prev => (prev && prev.path === r.path && prev.type === r.type ? prev : r));
      setPosition(r.offsetSeconds);
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the live stream locked to the clock while it plays.
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => { if (wantLive.current) tuneToNow(true); }, RESYNC_MS);
    return () => clearInterval(t);
  }, [live, tuneToNow]);

  // One handler set for each element's whole life.
  useEffect(() => {
    const a = liveAudio();
    a.onended = () => { if (wantLive.current) tuneToNow(true); };
    a.onerror = () => { curPath.current = null; };

    const p = pvAudio();
    const end = () => {
      const cur = previewRef.current;
      if (!cur || cur.ended) return;
      p.pause();
      p.volume = 1;
      setPv({ ...cur, playing: false, ended: true, time: PREVIEW_SECONDS });
    };
    p.ontimeupdate = () => {
      const cur = previewRef.current;
      if (!cur || cur.ended) return;
      const t = p.currentTime || 0;
      if (cur.full) {
        const d = isFinite(p.duration) && p.duration > 0 ? p.duration : cur.duration;
        setPv({ ...cur, time: t, duration: d });
        return;
      }
      if (t >= PREVIEW_SECONDS - 0.05) { end(); return; }
      p.volume = t > PREVIEW_SECONDS - 2 ? Math.max(0, (PREVIEW_SECONDS - t) / 2) : 1; // soft end
      setPv({ ...cur, time: Math.min(PREVIEW_SECONDS, t) });
    };
    p.onended = () => {
      const cur = previewRef.current;
      if (cur?.full) { setPv({ ...cur, playing: false, ended: true, time: cur.duration }); return; }
      end();
    };
    p.onplay = () => { const cur = previewRef.current; if (cur) setPv({ ...cur, playing: true }); };
    p.onpause = () => { const cur = previewRef.current; if (cur && !cur.ended) setPv({ ...cur, playing: false }); };
    p.onerror = () => { const cur = previewRef.current; if (cur) setPv({ ...cur, playing: false, failed: true }); };
  }, [liveAudio, pvAudio, tuneToNow, setPv]);

  /* ---------- previews (Hearted songs) ---------- */
  /** Play a song off the radio: its 30-second preview, or with `fullUrl` (a supporter's stream) the whole song on demand. */
  const startPreview = useCallback((song: Song, fullUrl?: string | null) => {
    if (!song.songId) return;
    const p = pvAudio();
    const cur = previewRef.current;
    const full = !!fullUrl;
    if (cur && sameSong(cur.song, song) && cur.full === full && !cur.ended && !cur.failed) {
      if (p.paused) p.play().then(() => announcePlay()).catch(() => {}); else p.pause();
      return;
    }
    if (wantLive.current) stopLive();
    p.pause();
    p.volume = 1;
    p.src = fullUrl || `/api/songs/${song.songId}/preview`;
    setPv({ song: { ...song, songId: song.songId }, playing: false, ended: false, time: 0, failed: false, full, duration: full ? song.durationSeconds || 0 : PREVIEW_SECONDS });
    p.play().then(() => announcePlay()).catch(() => {});
  }, [pvAudio, stopLive, setPv]);

  /** Seek within a song played on demand (supporters only; previews and the radio never seek). */
  const seekPreview = useCallback((sec: number) => {
    const cur = previewRef.current;
    if (!cur?.full) return;
    const p = pvAudio();
    try { p.currentTime = Math.max(0, Math.min(sec, (cur.duration || sec) - 0.25)); } catch { /* not seekable yet */ }
    if (cur.ended) { setPv({ ...cur, ended: false, time: p.currentTime }); p.play().then(() => announcePlay()).catch(() => {}); }
  }, [pvAudio, setPv]);

  /** Play or pause the preview, or hear it again from the top once it ended. */
  const togglePreview = useCallback(() => {
    const cur = previewRef.current;
    if (!cur) return;
    const p = pvAudio();
    if (cur.ended) {
      p.currentTime = 0;
      p.volume = 1;
      setPv({ ...cur, ended: false, time: 0 });
      p.play().then(() => announcePlay()).catch(() => {});
      return;
    }
    if (p.paused) p.play().then(() => announcePlay()).catch(() => {}); else p.pause();
  }, [pvAudio, setPv]);

  /** Leave the preview; "Back to live" passes resume to start the radio again. */
  const leavePreview = useCallback((resume: boolean) => {
    pausePreviewAudio();
    setPv(null);
    if (resume) startLive();
  }, [pausePreviewAudio, setPv, startLive]);

  /* ---------- hearts (this device) ---------- */
  const isHearted = useCallback((s?: Song | null) => !!s?.songId && hearts.some(h => h.songId === s.songId), [hearts]);
  const toggleHeart = useCallback((s: Song): boolean => {
    if (!s.songId) return false;
    const all = readStore<Heart[]>(LS_HEARTS, hearts);
    const on = !all.some(h => h.songId === s.songId);
    const next = on
      ? [{ songId: s.songId, title: s.title, artist: s.artist, slug: s.slug, coverUrl: s.coverUrl ?? null, durationSeconds: s.durationSeconds, at: Date.now() }, ...all]
      : all.filter(h => h.songId !== s.songId);
    writeStore(LS_HEARTS, next);
    setHearts(next);
    return on;
  }, [hearts]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === LS_HEARTS) setHearts(readStore<Heart[]>(LS_HEARTS, [])); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- recently played (this visit) ---------- */
  const lastSong = useRef<Song | null>(null);
  useEffect(() => {
    const s = songOf(onAir);
    if (!s) return;
    const prev = lastSong.current;
    lastSong.current = s;
    if (!live || !prev || sameSong(prev, s)) return;
    setRecent(r => [prev, ...r.filter(x => !sameSong(x, prev))].slice(0, 8));
  }, [onAir, live]);

  /* ---------- one sound at a time across geekfon.ai tabs and windows ---------- */
  useEffect(() => onOtherTabPlay(() => {
    stopLive();
    pausePreviewAudio();
  }), [stopLive, pausePreviewAudio]);

  /* ---------- listener heartbeat (anonymous, per tab) ---------- */
  useEffect(() => {
    if (!live) return;
    const ping = () => {
      fetch("/api/radio/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId.current }) }).catch(() => {});
    };
    ping();
    const t = setInterval(ping, 20000);
    return () => clearInterval(t);
  }, [live]);

  /* ---------- Media Session: lock screen and media keys ---------- */
  const stationInfo = useMemo<Station | null>(() => stations.find(s => s.slug === station) ?? artistStations[station] ?? (station === MAIN_SLUG ? FALLBACK_MAIN : null), [stations, station, artistStations]);
  const controls = useRef({ startLive, stopLive, togglePreview });
  controls.current = { startLive, stopLive, togglePreview };
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const pv = preview;
    const x = pv ? pv.song : onAir;
    if (!x) return;
    try {
      const art = (pv ? pv.song.coverUrl : onAir?.coverUrl) || "/icons/icon-512.png";
      ms.metadata = new MediaMetadata({
        title: x.title,
        artist: x.artist,
        album: pv ? (pv.full ? "On demand" : "30-second preview") : stationInfo?.name || "GeekFon Radio",
        artwork: [{ src: art, sizes: "720x720" }],
      });
      ms.playbackState = (pv ? pv.playing : live) ? "playing" : "paused";
      ms.setActionHandler("play", () => (previewRef.current ? controls.current.togglePreview() : controls.current.startLive()));
      ms.setActionHandler("pause", () => (previewRef.current ? controls.current.togglePreview() : controls.current.stopLive()));
      // Live radio: no seeking or skipping.
      for (const a of ["seekbackward", "seekforward", "seekto", "previoustrack", "nexttrack"] as MediaSessionAction[]) {
        try { ms.setActionHandler(a, null); } catch { /* unsupported action */ }
      }
    } catch { /* older browsers */ }
  }, [onAir, preview, live, stationInfo]);

  // Clean up audio when the page goes away (client navigation).
  useEffect(() => () => { liveRef.current?.pause(); pvRef.current?.pause(); }, []);

  return {
    stations, station, stationInfo, schedules, loading,
    onAir, position, live, recent,
    tune, startLive, stopLive, toggleLive,
    preview, startPreview, togglePreview, leavePreview, seekPreview, artistStations,
    hearts, isHearted, toggleHeart,
  };
}

export type LiveRadio = ReturnType<typeof useLiveRadio>;
