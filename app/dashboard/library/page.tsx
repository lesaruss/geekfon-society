"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDashboard } from "../context";
import { supabase } from "@/lib/supabase";

const AUDIO_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";

type Track = { id: string; artist_slug: string; title: string; src_path: string; duration_seconds: number | null };
type PlaylistRow = { id: string; track_id: string; added_at: string };

// Display names for radio_tracks.artist_slug (same map used by app/radio/page.tsx
// and the command-center route - this table's slugs don't always match
// gfs_artists.slug).
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

// 2026-07-27: confirmed via direct query that radio_tracks.artist_slug and
// gfs_artists.slug (the convention gfs_artist_unlocks + the /[slug] artist
// page route both actually use) match for every artist EXCEPT Riku
// ("riku-hayasaka" vs "riku"). Without this mapping, unlock-gating and the
// "Unlock for $11" link would both be silently wrong for his tracks only.
const TO_ARTIST_SLUG: Record<string, string> = { "riku-hayasaka": "riku" };

function artistName(radioSlug: string): string {
  return ARTIST_NAMES[radioSlug] || radioSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function toArtistSlug(radioSlug: string): string {
  return TO_ARTIST_SLUG[radioSlug] || radioSlug;
}
function fmt(s: number): string {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}
function shuffleArr<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LibraryPage() {
  const { userId, member, isAdmin, viewAs, loading: ctxLoading } = useDashboard();

  const isPro = member?.is_pro === true;
  // Same real-admin-bypass / simulated-full-access pattern components/ArtistPage.tsx
  // already uses, so View As previews the Playlist the same way it previews
  // artist pages - simulating Plus/Pro shows full access regardless of real
  // unlocks, simulating Public/Passport falls back to the real unlock state.
  const realAdminBypass = isAdmin && viewAs === null;
  const simulatingFullAccess = isAdmin && (viewAs === "plus" || viewAs === "pro");
  const hasFullCatalogAccess = realAdminBypass || simulatingFullAccess || isPro;

  const [catalog, setCatalog] = useState<Track[]>([]);
  const [unlockedSlugs, setUnlockedSlugs] = useState<Set<string>>(new Set());
  const [playlistRows, setPlaylistRows] = useState<PlaylistRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyTrackId, setBusyTrackId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (ctxLoading || !userId) { setDataLoading(false); return; }
    (async () => {
      setDataLoading(true);
      const nowIso = new Date().toISOString();
      const [{ data: tracks }, { data: unlocks }, { data: pl }] = await Promise.all([
        supabase
          .from("radio_tracks")
          .select("id, artist_slug, title, src_path, duration_seconds")
          .eq("is_public", true)
          .neq("src_path", "PENDING")
          .lte("release_date", nowIso)
          .order("artist_slug", { ascending: true })
          .order("sort_order", { ascending: true }),
        supabase.from("gfs_artist_unlocks").select("artist_slug").eq("user_id", userId),
        supabase
          .from("gfs_playlist_tracks")
          .select("id, track_id, added_at")
          .eq("user_id", userId)
          .order("added_at", { ascending: true }),
      ]);
      setCatalog(tracks || []);
      setUnlockedSlugs(new Set((unlocks || []).map((u: { artist_slug: string }) => u.artist_slug)));
      setPlaylistRows(pl || []);
      setDataLoading(false);
    })();
  }, [ctxLoading, userId]);

  function canAccess(radioArtistSlug: string): boolean {
    if (hasFullCatalogAccess) return true;
    return unlockedSlugs.has(toArtistSlug(radioArtistSlug));
  }

  const playlistTrackIds = useMemo(() => new Set(playlistRows.map(r => r.track_id)), [playlistRows]);
  const playlistTracks = useMemo(() => {
    const byId = new Map(catalog.map(t => [t.id, t]));
    return playlistRows.map(r => byId.get(r.track_id)).filter((t): t is Track => !!t);
  }, [playlistRows, catalog]);

  // ---- player: a simple on-demand queue, not the synced-clock broadcast
  // /radio uses - this is the member's own personal station, so every
  // listener naturally hears their own thing at their own pace. ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const seq = playlistTracks.map((_, i) => i);
    setOrder(shuffleOn ? shuffleArr(seq) : seq);
    setPos(0);
    setPlaying(false);
  }, [playlistTracks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTrack = playlistTracks[order[pos]] || null;

  const playAt = useCallback((newPos: number) => {
    const track = playlistTracks[order[newPos]];
    if (!track) return;
    setPos(newPos);
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    a.pause();
    a.src = AUDIO_BASE + track.src_path;
    a.currentTime = 0;
    a.ontimeupdate = () => setProgress(a.currentTime);
    a.ondurationchange = () => setDuration(a.duration || 0);
    a.onended = () => playAt((newPos + 1) % order.length);
    a.onerror = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistTracks, order]);

  function togglePlay() {
    if (!currentTrack) { if (order.length) playAt(0); return; }
    const a = audioRef.current;
    if (playing) { a?.pause(); setPlaying(false); }
    else if (a) { a.play().then(() => setPlaying(true)).catch(() => {}); }
    else playAt(pos);
  }
  function nextTrack() { if (order.length) playAt((pos + 1) % order.length); }
  function prevTrack() { if (order.length) playAt((pos - 1 + order.length) % order.length); }
  function playTrackByIndex(trackIdx: number) {
    const p = order.indexOf(trackIdx);
    if (p >= 0) playAt(p);
  }
  // Shuffle never interrupts what's currently playing - it keeps the current
  // track pinned at the front of the queue and only reorders (or restores
  // sequential order for) everything else.
  function toggleShuffle() {
    setShuffleOn(v => {
      const next = !v;
      const currentIdx = order[pos];
      const rest = playlistTracks.map((_, i) => i).filter(i => i !== currentIdx);
      const arranged = next ? shuffleArr(rest) : rest.slice().sort((a, b) => a - b);
      setOrder(currentIdx !== undefined ? [currentIdx, ...arranged] : arranged);
      setPos(0);
      return next;
    });
  }

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  async function addTrack(trackId: string) {
    if (!userId) return;
    setBusyTrackId(trackId);
    setActionError("");
    const { error } = await supabase.from("gfs_playlist_tracks").insert({ user_id: userId, track_id: trackId });
    if (error) {
      setActionError("Couldn't add that song - " + error.message);
    } else {
      setPlaylistRows(rows => [...rows, { id: `${trackId}-local`, track_id: trackId, added_at: new Date().toISOString() }]);
    }
    setBusyTrackId(null);
  }
  async function removeTrack(trackId: string) {
    if (!userId) return;
    setBusyTrackId(trackId);
    await supabase.from("gfs_playlist_tracks").delete().eq("user_id", userId).eq("track_id", trackId);
    setPlaylistRows(rows => rows.filter(r => r.track_id !== trackId));
    setBusyTrackId(null);
  }

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(t => t.title.toLowerCase().includes(q) || artistName(t.artist_slug).toLowerCase().includes(q));
  }, [catalog, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of filteredCatalog) {
      if (!map.has(t.artist_slug)) map.set(t.artist_slug, []);
      map.get(t.artist_slug)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => artistName(a[0]).localeCompare(artistName(b[0])));
  }, [filteredCatalog]);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="lib-head">
        <div className="lib-eyebrow">Your Playlist</div>
        <h1 className="lib-title">Build Your Station</h1>
        <p className="lib-sub">
          {hasFullCatalogAccess
            ? "Pro access - add any GeekFon song to build your own personal radio station."
            : "Add songs from artists you've unlocked for $11 to build your own personal radio station."}
        </p>
      </div>

      <div className="lib-stats-row">
        <div className="lib-stat">
          <div className="lib-stat-num">{playlistTracks.length}</div>
          <div className="lib-stat-label">In Playlist</div>
        </div>
        <div className="lib-stat">
          <div className="lib-stat-num">{hasFullCatalogAccess ? "All" : unlockedSlugs.size}</div>
          <div className="lib-stat-label">Artists Unlocked</div>
        </div>
        <div className="lib-stat">
          <div className="lib-stat-num">{catalog.length}</div>
          <div className="lib-stat-label">Songs in Catalog</div>
        </div>
      </div>

      {playlistTracks.length > 0 && (
        <div className="pl-player">
          <div className="pl-player-main">
            <button type="button" className="pl-player-playbtn" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? (
                <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><polygon points="7 5 19 12 7 19" /></svg>
              )}
            </button>
            <button type="button" className="pl-player-ctrl" onClick={prevTrack} aria-label="Previous track">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 6h2v12H6zM10 12l8-6v12z" /></svg>
            </button>
            <button type="button" className="pl-player-ctrl" onClick={nextTrack} aria-label="Next track">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M16 6h2v12h-2zM6 6l8 6-8 6z" /></svg>
            </button>
            <div className="pl-player-info">
              <div className="pl-player-title">{currentTrack ? currentTrack.title : "Nothing playing"}</div>
              <div className="pl-player-artist">{currentTrack ? artistName(currentTrack.artist_slug) : "Press play to start your station"}</div>
            </div>
            <button type="button" className={"pl-shuffle-btn" + (shuffleOn ? " is-active" : "")} onClick={toggleShuffle} aria-pressed={shuffleOn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
              </svg>
              Shuffle
            </button>
          </div>
          {duration > 0 && (
            <div className="pl-progress">
              <span className="pl-time">{fmt(progress)}</span>
              <div className="pl-bar"><div className="pl-bar-fill" style={{ width: `${pct}%` }} /></div>
              <span className="pl-time">{fmt(duration)}</span>
            </div>
          )}
        </div>
      )}

      {actionError && <div className="pl-error">{actionError}</div>}

      <h2 className="pl-section-title">My Playlist</h2>
      {dataLoading ? (
        <div className="lib-loading">Loading your playlist...</div>
      ) : playlistTracks.length === 0 ? (
        <div className="lib-empty">
          <div className="lib-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,.1)" strokeWidth="2" />
              <circle cx="32" cy="32" r="10" stroke="rgba(246,152,32,.4)" strokeWidth="2" />
              <circle cx="32" cy="32" r="3" fill="rgba(246,152,32,.6)" />
              <line x1="32" y1="4" x2="32" y2="18" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="32" y1="46" x2="32" y2="60" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="4" y1="32" x2="18" y2="32" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="46" y1="32" x2="60" y2="32" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="lib-empty-title">Your playlist is empty</h2>
          <p className="lib-empty-sub">
            Add songs below from artists you've unlocked{hasFullCatalogAccess ? "" : ", or unlock a new artist for $11"} to start building your station.
          </p>
        </div>
      ) : (
        <div className="pl-queue">
          {order.map((trackIdx, i) => {
            const t = playlistTracks[trackIdx];
            if (!t) return null;
            const isCurrent = currentTrack?.id === t.id;
            return (
              <div key={t.id} className={"pl-queue-row" + (isCurrent ? " is-current" : "")}>
                <button type="button" className="pl-queue-playdot" onClick={() => playTrackByIndex(trackIdx)} aria-label={`Play ${t.title}`}>
                  {isCurrent && playing ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><polygon points="7 5 19 12 7 19" /></svg>
                  )}
                </button>
                <div className="pl-queue-info">
                  <div className="pl-queue-title">{t.title}</div>
                  <div className="pl-queue-artist">{artistName(t.artist_slug)}</div>
                </div>
                <button type="button" className="pl-queue-remove" disabled={busyTrackId === t.id} onClick={() => removeTrack(t.id)} aria-label={`Remove ${t.title} from playlist`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="pl-add-head">
        <h2 className="pl-section-title">Add Songs</h2>
        <input
          type="text"
          className="pl-search"
          placeholder="Search songs or artists..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {dataLoading ? null : grouped.length === 0 ? (
        <div className="lib-empty-inline">No songs match your search.</div>
      ) : (
        <div className="pl-catalog">
          {grouped.map(([slug, tracks]) => {
            const accessible = canAccess(slug);
            return (
              <div key={slug} className="pl-artist-group">
                <div className="pl-artist-group-head">
                  <span className="pl-artist-group-name">{artistName(slug)}</span>
                  {!accessible && (
                    <a href={`/${toArtistSlug(slug)}?tab=music`} className="pl-unlock-cta">Unlock for $11</a>
                  )}
                </div>
                {tracks.map(t => {
                  const inPlaylist = playlistTrackIds.has(t.id);
                  return (
                    <div key={t.id} className="pl-catalog-row">
                      <div className="pl-catalog-info">
                        <div className="pl-catalog-title">{t.title}</div>
                      </div>
                      {!accessible ? (
                        <span className="pl-locked-tag">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                          Locked
                        </span>
                      ) : inPlaylist ? (
                        <button type="button" className="pl-add-btn is-added" disabled>Added</button>
                      ) : (
                        <button type="button" className="pl-add-btn" disabled={busyTrackId === t.id} onClick={() => addTrack(t.id)}>
                          {busyTrackId === t.id ? "Adding..." : "+ Add"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const CSS = `
.lib-head{padding:28px 0 24px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:24px;}
.lib-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.lib-title{font-size:clamp(22px,3.5vw,34px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 8px;}
.lib-sub{font-size:13px;color:rgba(255,255,255,.4);margin:0;line-height:1.6;}
.lib-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
@media(max-width:600px){.lib-stats-row{grid-template-columns:1fr 1fr 1fr;}}
.lib-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;}
.lib-stat-num{font-size:26px;font-weight:900;color:#fff;letter-spacing:-.02em;}
.lib-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.3);margin-top:4px;}
.lib-loading{padding:40px 24px;text-align:center;font-size:13px;color:rgba(255,255,255,.4);}
.lib-empty{text-align:center;padding:48px 24px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:20px;display:flex;flex-direction:column;align-items:center;gap:14px;margin-bottom:32px;}
.lib-empty-icon svg{width:60px;height:60px;}
.lib-empty-title{font-size:19px;font-weight:900;color:#fff;margin:0;}
.lib-empty-sub{font-size:13px;color:rgba(255,255,255,.4);line-height:1.6;margin:0;max-width:400px;}
.lib-empty-inline{padding:20px;text-align:center;color:rgba(255,255,255,.3);font-size:12px;border:1px solid rgba(255,255,255,.07);border-radius:12px;}

/* Player */
.pl-player{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 18px;margin-bottom:24px;}
.pl-player-main{display:flex;align-items:center;gap:12px;}
.pl-player-playbtn{width:40px;height:40px;border-radius:50%;background:#F69820;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s;}
.pl-player-playbtn:hover{background:#ffaf30;}
.pl-player-ctrl{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s;}
.pl-player-ctrl:hover{background:rgba(255,255,255,.12);}
.pl-player-info{flex:1;min-width:0;}
.pl-player-title{font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pl-player-artist{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pl-shuffle-btn{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.5);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:100px;padding:7px 14px;cursor:pointer;flex-shrink:0;transition:background .15s,color .15s,border-color .15s;}
.pl-shuffle-btn:hover{color:rgba(255,255,255,.8);}
.pl-shuffle-btn.is-active{background:rgba(0,215,95,.14);border-color:rgba(0,215,95,.4);color:rgba(0,215,95,.9);}
.pl-progress{display:flex;align-items:center;gap:10px;margin-top:12px;}
.pl-time{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);font-variant-numeric:tabular-nums;white-space:nowrap;}
.pl-bar{flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;}
.pl-bar-fill{height:100%;background:#F69820;border-radius:2px;transition:width .3s linear;}
.pl-error{font-size:12px;font-weight:600;color:rgba(255,120,120,.9);background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;}

.pl-section-title{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.6);margin:0 0 12px;}

/* Queue (My Playlist) */
.pl-queue{border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;margin-bottom:32px;}
.pl-queue-row{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.05);}
.pl-queue-row:last-child{border-bottom:none;}
.pl-queue-row.is-current{background:rgba(246,152,32,.06);}
.pl-queue-playdot{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.pl-queue-row.is-current .pl-queue-playdot{background:rgba(246,152,32,.18);border-color:rgba(246,152,32,.4);color:#F69820;}
.pl-queue-info{flex:1;min-width:0;}
.pl-queue-title{font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pl-queue-artist{font-size:11px;color:rgba(255,255,255,.35);margin-top:1px;}
.pl-queue-remove{width:26px;height:26px;border-radius:50%;background:transparent;border:none;color:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:color .15s,background .15s;}
.pl-queue-remove svg{width:13px;height:13px;}
.pl-queue-remove:hover:not(:disabled){color:rgba(255,120,120,.9);background:rgba(239,68,68,.1);}
.pl-queue-remove:disabled{opacity:.4;cursor:default;}

/* Add Songs */
.pl-add-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
.pl-search{flex-shrink:0;width:100%;max-width:260px;padding:9px 14px;border:1px solid rgba(255,255,255,.1);border-radius:100px;font-family:inherit;font-size:12px;font-weight:600;background:rgba(255,255,255,.05);color:#fff;box-sizing:border-box;}
.pl-search::placeholder{color:rgba(255,255,255,.3);}
.pl-search:focus{outline:none;border-color:#F69820;}
.pl-catalog{display:flex;flex-direction:column;gap:18px;}
.pl-artist-group{border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;}
.pl-artist-group-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06);}
.pl-artist-group-name{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#fff;}
.pl-unlock-cta{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#000;background:#F69820;padding:5px 12px;border-radius:100px;text-decoration:none;white-space:nowrap;transition:background .15s;}
.pl-unlock-cta:hover{background:#ffaf30;}
.pl-catalog-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.04);}
.pl-catalog-row:last-child{border-bottom:none;}
.pl-catalog-info{min-width:0;}
.pl-catalog-title{font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pl-locked-tag{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:rgba(255,255,255,.3);flex-shrink:0;}
.pl-locked-tag svg{width:13px;height:13px;}
.pl-add-btn{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#000;background:#fff;border:none;padding:6px 14px;border-radius:100px;cursor:pointer;flex-shrink:0;white-space:nowrap;transition:background .15s;}
.pl-add-btn:hover:not(:disabled){background:#F69820;}
.pl-add-btn:disabled{opacity:.6;cursor:default;}
.pl-add-btn.is-added{background:rgba(0,215,95,.14);color:rgba(0,215,95,.9);}
`;
