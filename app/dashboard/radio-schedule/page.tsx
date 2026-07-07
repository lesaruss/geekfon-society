"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDashboard } from "../context";
import { supabase } from "@/lib/supabase";

interface RadioTrack {
  id: string;
  artist_slug: string;
  title: string;
  src_path: string;
  duration_seconds: number | null;
  release_date: string;
  is_public: boolean;
  required_tier: string;
  radio_order: number | null;
  sort_order: number;
}

interface ArtistOpt { slug: string; name: string; }

const ADMIN_EMAIL = "contact@lesaruss.com";

function isOnAir(t: RadioTrack): boolean {
  return t.is_public && t.src_path !== "PENDING" && new Date(t.release_date).getTime() <= Date.now();
}

function artistName(artists: ArtistOpt[], slug: string): string {
  if (slug === "promo") return "Promo";
  return artists.find((a) => a.slug === slug)?.name || slug;
}

export default function RadioSchedulePage() {
  const { userEmail, loading } = useDashboard();
  const [tracks, setTracks]       = useState<Record<string, RadioTrack>>({});
  const [onAirIds, setOnAirIds]   = useState<string[]>([]);
  const [artists, setArtists]     = useState<ArtistOpt[]>([]);
  const [pending, setPending]     = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [catalogCollapsed, setCatalogCollapsed] = useState(true);
  const [addOpen, setAddOpen]     = useState(false);
  const [addArtist, setAddArtist] = useState("");
  const [addTitle, setAddTitle]   = useState("");
  const [addBusy, setAddBusy]     = useState(false);

  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const isAdmin = userEmail === ADMIN_EMAIL;

  // Same real-account-only gate as Release Schedule - not a tier perk, never derived
  // from role, never visible while simulating another tier via View As.
  const [viewAs, setViewAs] = useState<string | null>(null);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gfs-view-as") : null;
    if (saved) setViewAs(saved);
    const onViewAs = (e: Event) => setViewAs((e as CustomEvent).detail ?? null);
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);
  const simulating = isAdmin && viewAs !== null;
  const hasAccess = isAdmin && !simulating;

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  useEffect(() => {
    if (loading || !hasAccess) { setDataLoading(false); return; }
    authHeaders().then((headers) =>
      fetch("/api/admin/radio-schedule", { headers })
        .then((r) => r.json())
        .then((j) => {
          const rows: RadioTrack[] = j.tracks || [];
          const map: Record<string, RadioTrack> = {};
          const air: string[] = [];
          for (const r of rows) {
            map[r.id] = r;
            if (isOnAir(r)) air.push(r.id);
          }
          setTracks(map);
          setOnAirIds(air);
          setArtists(j.artists || []);
          setDataLoading(false);
        })
    );
  }, [loading, hasAccess]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function markPending(id: string, fields: Record<string, unknown>) {
    setPending((prev) => ({ ...prev, [id]: { ...prev[id], ...fields } }));
  }

  function updateField(id: string, field: keyof RadioTrack, value: unknown) {
    setTracks((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    markPending(id, { [field]: value });
  }

  function reorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setOnAirIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      next.forEach((id, i) => markPending(id, { radio_order: i }));
      return next;
    });
  }

  function airTrack(id: string) {
    const nowIso = new Date().toISOString();
    setTracks((prev) => {
      const t = prev[id];
      const needsDate = new Date(t.release_date).getTime() > Date.now();
      return { ...prev, [id]: { ...t, is_public: true, release_date: needsDate ? nowIso : t.release_date } };
    });
    setOnAirIds((prev) => {
      const next = [...prev, id];
      markPending(id, { is_public: true, radio_order: next.length - 1, release_date: nowIso });
      return next;
    });
  }

  function pullTrack(id: string) {
    setTracks((prev) => ({ ...prev, [id]: { ...prev[id], is_public: false } }));
    setOnAirIds((prev) => prev.filter((x) => x !== id));
    markPending(id, { is_public: false, radio_order: null });
  }

  async function saveAll() {
    const ids = Object.keys(pending);
    if (ids.length === 0) return;
    setSaving(true);
    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    const updates = ids.map((id) => ({ id, ...pending[id] }));
    const res = await fetch("/api/admin/radio-schedule", {
      method: "PUT",
      headers,
      body: JSON.stringify({ updates }),
    });
    setSaving(false);
    if (res.ok) {
      setPending({});
      showToast(`Saved ${ids.length} track${ids.length === 1 ? "" : "s"}`);
    } else {
      showToast("Save failed - try again");
    }
  }

  async function handleUpload(id: string, file: File) {
    const t = tracks[id];
    setUploadStatus((p) => ({ ...p, [id]: "uploading" }));
    const form = new FormData();
    form.append("file", file);
    form.append("artistSlug", t.artist_slug);
    form.append("replaceId", id);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/radio-schedule/upload", { method: "POST", headers, body: form });
    const json = await res.json();
    if (res.ok && json.path) {
      updateField(id, "src_path", json.path);
      setUploadStatus((p) => ({ ...p, [id]: "done" }));
      setTimeout(() => setUploadStatus((p) => { const n = { ...p }; delete n[id]; return n; }), 3000);
    } else {
      setUploadStatus((p) => ({ ...p, [id]: "error" }));
    }
  }

  async function handleAddTrack(file: File) {
    if (!addArtist || !addTitle) { showToast("Pick an artist and a title first"); return; }
    setAddBusy(true);
    const form = new FormData();
    form.append("file", file);
    form.append("artistSlug", addArtist);
    form.append("title", addTitle);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/radio-schedule/upload", { method: "POST", headers, body: form });
    const json = await res.json();
    setAddBusy(false);
    if (res.ok && json.track) {
      const t: RadioTrack = json.track;
      setTracks((prev) => ({ ...prev, [t.id]: t }));
      setOnAirIds((prev) => [...prev, t.id]);
      setAddOpen(false);
      setAddTitle("");
      setAddArtist("");
      showToast(`Added "${t.title}" to the rotation`);
    } else {
      showToast(json.error || "Upload failed");
    }
  }

  const onAirTracks = onAirIds.map((id) => tracks[id]).filter(Boolean);
  const catalogByArtist = useMemo(() => {
    const onAirSet = new Set(onAirIds);
    const groups: Record<string, RadioTrack[]> = {};
    Object.values(tracks).forEach((t) => {
      if (onAirSet.has(t.id)) return;
      (groups[t.artist_slug] ||= []).push(t);
    });
    Object.values(groups).forEach((g) => g.sort((a, b) => a.sort_order - b.sort_order));
    return groups;
  }, [tracks, onAirIds]);
  const catalogCount = Object.values(catalogByArtist).reduce((s, g) => s + g.length, 0);

  if (loading) return <div className="rdc-center"><div className="rdc-spinner" /></div>;

  if (!hasAccess) {
    return (
      <div className="rdc-gate">
        <style>{RDC_CSS}</style>
        <div className="rdc-gate-card">
          <div className="rdc-gate-lock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>Admin Only</h2>
          <p>Radio Schedule is restricted to the GeekFon Society admin account.</p>
          <a href="/dashboard" className="rdc-gate-btn">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{RDC_CSS}</style>
      {toast && <div className="rdc-toast">{toast}</div>}

      <div className="rdc-header">
        <div>
          <div className="dp-eyebrow">Admin Tool</div>
          <h1 className="rdc-title">Radio Schedule</h1>
        </div>
        <div className="rdc-header-actions">
          <div className="rdc-stats">
            <span>{onAirTracks.length} on air</span>
            <span>{catalogCount} in catalog</span>
          </div>
          <button className="rdc-add-btn" onClick={() => setAddOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" width="13" height="13">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Track
          </button>
          {Object.keys(pending).length > 0 && (
            <button className="rdc-save-btn" onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : `Save Changes (${Object.keys(pending).length})`}
            </button>
          )}
        </div>
      </div>

      {addOpen && (
        <div className="rdc-add-panel">
          <select className="rdc-sel" value={addArtist} onChange={(e) => setAddArtist(e.target.value)}>
            <option value="">Artist...</option>
            <option value="promo">Promo (ads / station IDs)</option>
            {artists.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
          <input
            className="rdc-input"
            placeholder="Track title"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
          />
          <label className="rdc-upload-btn rdc-upload-btn-lg" style={addBusy ? { opacity: 0.5, pointerEvents: "none" } : {}}>
            {addBusy ? "Uploading..." : "Choose audio file"}
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddTrack(f); }}
            />
          </label>
        </div>
      )}

      {dataLoading ? (
        <div className="rdc-center" style={{ padding: "60px 0" }}><div className="rdc-spinner" /></div>
      ) : (
        <>
          {/* On-air rotation - this exact order is what plays on /radio */}
          <div className="rdc-section-hdr">
            <span className="rdc-live-dot" /> On Air Rotation - drag to reorder
          </div>
          <div className="rdc-track-list">
            <div className="rdc-track-head">
              <span style={{ width: 24 }} />
              <span style={{ width: 28 }}>#</span>
              <span className="rdc-th-grow">Track</span>
              <span style={{ width: 110 }}>Audio</span>
              <span style={{ width: 60 }} />
            </div>
            {onAirTracks.map((track, idx) => {
              const us = uploadStatus[track.id];
              const isDragTarget = dragOver === idx;
              return (
                <div
                  key={track.id}
                  className={`rdc-track-row${isDragTarget ? " rdc-drag-target" : ""}`}
                  draggable
                  onDragStart={() => { dragIdx.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    if (dragIdx.current !== null) reorder(dragIdx.current, idx);
                    dragIdx.current = null;
                  }}
                  onDragEnd={() => { setDragOver(null); dragIdx.current = null; }}
                >
                  <span className="rdc-drag-handle" title="Drag to reorder">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <circle cx="8" cy="6" r="1.5" /><circle cx="16" cy="6" r="1.5" />
                      <circle cx="8" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" />
                      <circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
                    </svg>
                  </span>
                  <span className="rdc-num">{idx + 1}</span>
                  <div className="rdc-track-cell rdc-th-grow">
                    <input
                      className="rdc-input rdc-title-input"
                      value={track.title}
                      onChange={(e) => updateField(track.id, "title", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="rdc-artist-sub">{artistName(artists, track.artist_slug)}</span>
                  </div>
                  <span className="rdc-audio-cell" style={{ width: 110 }}>
                    <label
                      className={`rdc-upload-btn${us === "uploading" ? " rdc-uploading" : ""}${us === "done" ? " rdc-uploaded" : ""}${us === "error" ? " rdc-upload-err" : ""}`}
                      title="Replace audio"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {us === "uploading" ? "Uploading..." : us === "done" ? "Replaced" : "Replace audio"}
                      <input
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(track.id, f); }}
                      />
                    </label>
                  </span>
                  <button className="rdc-pull-btn" style={{ width: 60 }} onClick={() => pullTrack(track.id)} title="Remove from rotation">
                    Pull
                  </button>
                </div>
              );
            })}
            {onAirTracks.length === 0 && (
              <div className="rdc-empty">Nothing on air yet - air a track from the catalog below, or add a new one.</div>
            )}
          </div>

          {/* Full catalog - everything not currently on air */}
          <button className="rdc-catalog-hdr" onClick={() => setCatalogCollapsed((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14" className={`rdc-caret${!catalogCollapsed ? " open" : ""}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
            Full Catalog ({catalogCount} not on air)
          </button>
          {!catalogCollapsed && (
            <div className="rdc-artist-list">
              {Object.entries(catalogByArtist).map(([slug, list]) => (
                <div key={slug} className="rdc-artist-card">
                  <div className="rdc-artist-hdr-static">{artistName(artists, slug)}</div>
                  <div className="rdc-track-list">
                    {list.map((track) => {
                      const pendingRelease = new Date(track.release_date).getTime() > Date.now();
                      return (
                        <div key={track.id} className="rdc-track-row rdc-track-row-static">
                          <span className="rdc-th-grow rdc-catalog-title">{track.title}</span>
                          {track.src_path === "PENDING" && <span className="rdc-pending-badge">No audio</span>}
                          {pendingRelease && track.src_path !== "PENDING" && <span className="rdc-pending-badge">Future release</span>}
                          <button
                            className="rdc-air-btn"
                            disabled={track.src_path === "PENDING"}
                            style={track.src_path === "PENDING" ? { opacity: 0.35, cursor: "not-allowed" } : {}}
                            onClick={() => airTrack(track.id)}
                            title="Add to on-air rotation"
                          >
                            Air it
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

const RDC_CSS = `
.rdc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
.rdc-title { font-size: clamp(22px, 4vw, 32px); font-weight: 900; text-transform: uppercase; letter-spacing: -.02em; color: #fff; margin: 4px 0 0; }
.rdc-header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rdc-stats { display: flex; gap: 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.35); }
.rdc-add-btn { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.7); font-family: inherit; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 9px 16px; border-radius: 100px; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
.rdc-add-btn:hover { background: rgba(255,255,255,.13); color: #fff; }
.rdc-save-btn { background: #AAFF00; color: #000; border: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 10px 20px; border-radius: 100px; transition: background .15s; white-space: nowrap; }
.rdc-save-btn:hover:not(:disabled) { background: #c8ff40; }
.rdc-save-btn:disabled { opacity: .5; cursor: default; }
.rdc-add-panel { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 14px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; flex-wrap: wrap; }
.rdc-section-hdr { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: rgba(255,255,255,.5); margin: 8px 0 10px; }
.rdc-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #00D75F; box-shadow: 0 0 8px rgba(0,215,95,.6); flex-shrink: 0; }
.rdc-catalog-hdr { display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: none; color: rgba(255,255,255,.45); font-family: inherit; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; padding: 16px 4px 10px; cursor: pointer; text-align: left; }
.rdc-catalog-hdr:hover { color: rgba(255,255,255,.7); }
.rdc-caret { transition: transform .2s; flex-shrink: 0; }
.rdc-caret.open { transform: rotate(180deg); }
.rdc-artist-list { display: flex; flex-direction: column; gap: 10px; }
.rdc-artist-card { border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.rdc-artist-hdr-static { padding: 12px 18px; background: rgba(255,255,255,.03); font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; color: rgba(255,255,255,.8); }
.rdc-track-list { padding: 0 0 8px; }
.rdc-track-head { display: flex; align-items: center; gap: 8px; padding: 6px 12px 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.25); border-bottom: 1px solid rgba(255,255,255,.05); }
.rdc-th-grow { flex: 1; }
.rdc-track-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,.03); cursor: grab; transition: background .1s; }
.rdc-track-row:last-child { border-bottom: none; }
.rdc-track-row:hover { background: rgba(255,255,255,.025); }
.rdc-track-row:active { cursor: grabbing; }
.rdc-track-row-static { cursor: default; }
.rdc-drag-target { background: rgba(246,152,32,.08) !important; border-bottom: 2px solid #F69820 !important; }
.rdc-drag-handle { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: rgba(255,255,255,.2); flex-shrink: 0; cursor: grab; }
.rdc-drag-handle:hover { color: rgba(255,255,255,.5); }
.rdc-num { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); width: 28px; text-align: center; white-space: nowrap; flex-shrink: 0; }
.rdc-input { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; padding: 5px 9px; border-radius: 6px; min-width: 0; box-sizing: border-box; }
.rdc-input.rdc-th-grow { flex: 1; }
.rdc-input:focus { outline: none; border-color: #F69820; }
.rdc-track-cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rdc-title-input { width: 100%; }
.rdc-artist-sub { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.4); padding-left: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rdc-catalog-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,.75); }
.rdc-sel { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); font-family: inherit; font-size: 11px; font-weight: 700; padding: 5px 8px; border-radius: 6px; cursor: pointer; color: #fff; flex-shrink: 0; }
.rdc-sel option { background: #1a1a1a; color: #fff; }
.rdc-audio-cell { display: flex; align-items: center; flex-shrink: 0; }
.rdc-upload-btn { display: inline-flex; align-items: center; justify-content: center; height: 26px; border-radius: 5px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); cursor: pointer; color: rgba(255,255,255,.55); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; flex-shrink: 0; padding: 0 10px; white-space: nowrap; }
.rdc-upload-btn:hover { background: rgba(255,255,255,.13); color: #fff; }
.rdc-upload-btn-lg { height: 32px; padding: 0 14px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
.rdc-uploading { background: rgba(246,152,32,.15) !important; border-color: rgba(246,152,32,.3) !important; color: #F69820 !important; }
.rdc-uploaded { background: rgba(0,215,95,.12) !important; border-color: rgba(0,215,95,.3) !important; color: rgba(0,215,95,.9) !important; }
.rdc-upload-err { background: rgba(255,100,100,.1) !important; border-color: rgba(255,100,100,.3) !important; color: rgba(255,100,100,.9) !important; }
.rdc-pull-btn { background: none; border: 1px solid rgba(255,100,100,.25); color: rgba(255,100,100,.75); font-family: inherit; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: 5px 8px; border-radius: 6px; cursor: pointer; flex-shrink: 0; }
.rdc-pull-btn:hover { background: rgba(255,100,100,.1); }
.rdc-air-btn { background: rgba(170,255,0,.1); border: 1px solid rgba(170,255,0,.25); color: #AAFF00; font-family: inherit; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: 5px 10px; border-radius: 6px; cursor: pointer; flex-shrink: 0; margin-left: auto; }
.rdc-air-btn:hover:not(:disabled) { background: rgba(170,255,0,.18); }
.rdc-pending-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.3); flex-shrink: 0; white-space: nowrap; }
.rdc-empty { padding: 24px 12px; font-size: 12px; color: rgba(255,255,255,.35); text-align: center; }
.rdc-center { display: flex; align-items: center; justify-content: center; }
.rdc-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(255,255,255,.1); border-top-color: #F69820; border-radius: 50%; animation: rdcSpin .8s linear infinite; }
@keyframes rdcSpin { to { transform: rotate(360deg); } }
.rdc-toast { position: fixed; bottom: 24px; right: 24px; background: rgba(0,215,95,.12); border: 1px solid rgba(0,215,95,.3); color: rgba(0,215,95,.9); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: 12px 20px; border-radius: 100px; z-index: 999; animation: rdcSlide .2s ease; }
@keyframes rdcSlide { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.rdc-gate { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
.rdc-gate-card { max-width: 360px; width: 100%; text-align: center; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 40px 32px; }
.rdc-gate-lock { color: rgba(255,255,255,.25); margin-bottom: 16px; }
.rdc-gate-lock svg { width: 44px; height: 44px; }
.rdc-gate-card h2 { font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 10px; }
.rdc-gate-card p { font-size: 13px; color: rgba(255,255,255,.45); line-height: 1.6; margin: 0 0 20px; }
.rdc-gate-btn { display: inline-block; background: #E91E8C; color: #fff; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 12px 24px; border-radius: 100px; text-decoration: none; }
.rdc-gate-btn:hover { background: #c41874; }
`;
