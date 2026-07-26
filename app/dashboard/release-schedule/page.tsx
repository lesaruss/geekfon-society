"use client";
import { useState, useEffect, useRef } from "react";
import { useDashboard } from "../context";
import { supabase } from "@/lib/supabase";

type Visibility = "public" | "preview" | "members" | "pro";

interface Track {
  n: string;
  m: string;
  v: Visibility;
  url?: string;
  isRemix?: boolean;
  scheduledFor?: string;
  isFinale?: boolean;
  isPremiere?: boolean;
}

interface Artist {
  slug: string;
  name: string;
  tracks: Track[];
}

const VIS_OPTS: { value: Visibility; label: string; color: string }[] = [
  { value: "public",  label: "Public",   color: "#4CAF50" },
  { value: "preview", label: "Passport", color: "#E91E8C" },
  { value: "members", label: "Plus",     color: "#F69820" },
  { value: "pro",     label: "Pro",      color: "#AAFF00" },
];

const SEASON_OPTS = ["Season 1", "Season 2", "Season 3"];
const ADMIN_EMAIL = "contact@lesaruss.com";

// Schedule generation constants
const BATCH1 = ["roxanne", "shamanic-resin", "riku", "lex-from-brixton"];
const BATCH2 = ["straight-and-narrow", "mad-tings", "nilo-wave", "rustblood-prophets"];
const ACTIVE_ORDER = [
  "roxanne", "mad-tings", "shamanic-resin", "lex-from-brixton",
  "straight-and-narrow", "riku", "nilo-wave", "rustblood-prophets",
];

function toDateInput(d: string | undefined): string {
  if (!d) return "";
  // Strip time component if ISO string (e.g. 2026-07-12T00:00:00Z -> 2026-07-12)
  return d.split("T")[0];
}

export default function ReleaseSchedulePage() {
  const { userEmail, loading } = useDashboard();
  const [artists, setArtists]           = useState<Artist[]>([]);
  const [dirty, setDirty]               = useState<Set<string>>(new Set());
  const [filter, setFilter]             = useState("all");
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState<string | null>(null);
  const [dataLoading, setDataLoading]   = useState(true);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());
  const [schedulePreview, setSchedulePreview] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const [addingArtist, setAddingArtist]   = useState(false);

  // DnD state
  const dragArtist = useRef<string | null>(null);
  const dragIdx    = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<{ slug: string; idx: number } | null>(null);

  const isAdmin   = userEmail === ADMIN_EMAIL;

  // Respect the admin "View As Membership" simulation (same localStorage key SiteChrome
  // and ArtistPage use) so a direct visit to /dashboard/release-schedule while simulating
  // another tier behaves the same as the nav link hiding itself.
  const [viewAs, setViewAs] = useState<string | null>(null);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gfs-view-as") : null;
    if (saved) setViewAs(saved);
    const onViewAs = (e: Event) => setViewAs((e as CustomEvent).detail ?? null);
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);
  const simulating = isAdmin && viewAs !== null;

  // Release Schedule is restricted to Sean's account (ADMIN_EMAIL) only - locked
  // 2026-07-07 per Sean. No tier (Pro, Plus, Lifetime, Promoter) grants access anymore;
  // it is not a membership perk. If access needs to be shared with someone else, that
  // is a deliberate decision made by adding them explicitly, not a side effect of tier.
  const hasAccess = isAdmin && !simulating;
  const readOnly  = false;

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  useEffect(() => {
    if (loading || !hasAccess) { setDataLoading(false); return; }
    authHeaders().then((headers) =>
      fetch("/api/admin/release-schedule", { headers })
        .then((r) => r.json())
        .then((j) => {
          const loaded = j.artists || [];
          setArtists(loaded);
          // Default every artist to collapsed on load per Sean 2026-07-26 ("everything
          // should be automatically closed so I can get to them quicker") - previously
          // `collapsed` started as an empty Set, which meant every artist rendered fully
          // open (isOpen = !collapsed.has(slug)). rs-collapse-all / individual carets still
          // work the same after this, this only changes the initial state.
          setCollapsed(new Set(loaded.map((a: Artist) => a.slug)));
          setDataLoading(false);
        })
    );
  }, [loading, hasAccess]);

  function updateTrack(slug: string, idx: number, field: keyof Track, value: unknown) {
    setArtists((prev) =>
      prev.map((a) =>
        a.slug !== slug ? a
          : { ...a, tracks: a.tracks.map((t, i) => (i !== idx ? t : { ...t, [field]: value })) }
      )
    );
    setDirty((prev) => new Set(prev).add(slug));
  }

  function reorderTrack(slug: string, fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setArtists((prev) =>
      prev.map((a) => {
        if (a.slug !== slug) return a;
        const tracks = [...a.tracks];
        const [moved] = tracks.splice(fromIdx, 1);
        tracks.splice(toIdx, 0, moved);
        return { ...a, tracks };
      })
    );
    setDirty((prev) => new Set(prev).add(slug));
  }

  // 2026-07-26 per Sean: "I need to know how do I add songs, and how do I add
  // new artists too" - adds a blank editable row using the exact same inline
  // fields every other track row already has (title/season/tier/date/audio/
  // flags), so there's nothing new to learn. Nothing hits the DB until the
  // normal Save Changes flow runs, same as editing any existing track.
  function addTrack(slug: string) {
    setArtists((prev) =>
      prev.map((a) =>
        a.slug !== slug ? a : {
          ...a,
          tracks: [...a.tracks, { n: "", m: "Season 1", v: "public" as Visibility, scheduledFor: undefined }],
        }
      )
    );
    setDirty((prev) => new Set(prev).add(slug));
    setCollapsed((prev) => { const next = new Set(prev); next.delete(slug); return next; });
  }

  function slugify(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
  }

  // New artists DO need a real DB row created (unlike a new track, which just
  // lives in an existing artist's tracks array) - POST to the same route,
  // then drop the result straight into local state as an empty, expanded
  // artist ready for "+ Add Track".
  async function addArtist() {
    const name = newArtistName.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) { showToast("Enter a valid artist name"); return; }
    if (artists.some((a) => a.slug === slug)) { showToast(`"${name}" already exists`); return; }
    setAddingArtist(true);
    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    const res = await fetch("/api/admin/release-schedule", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug, name }),
    });
    setAddingArtist(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showToast(j.error || "Failed to add artist");
      return;
    }
    setArtists((prev) => [...prev, { slug, name, tracks: [] }]);
    setCollapsed((prev) => { const next = new Set(prev); next.delete(slug); return next; });
    setNewArtistName("");
    showToast(`Added ${name} - now add their first track below`);
  }

  async function saveAll() {
    setSaving(true);
    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    const toSave = artists.filter((a) => dirty.has(a.slug));
    const results = await Promise.all(
      toSave.map((a) =>
        fetch("/api/admin/release-schedule", {
          method: "PUT",
          headers,
          body: JSON.stringify({ slug: a.slug, tracks: a.tracks }),
        }).then((r) => r.ok)
      )
    );
    setSaving(false);
    setDirty(new Set());
    setSchedulePreview(false);
    showToast(results.every(Boolean) ? `Saved ${toSave.length} artists` : "Some saves failed");
  }

  function generateSchedule() {
    // Step 1: assign track[0] to launch dates
    const draft = artists.map((a) => {
      const tracks = a.tracks.map((t, i) => {
        if (i !== 0) return t;
        if (BATCH1.includes(a.slug)) return { ...t, scheduledFor: "2026-07-12" };
        if (BATCH2.includes(a.slug)) return { ...t, scheduledFor: "2026-07-13" };
        return t;
      });
      return { ...a, tracks };
    });

    // Step 2: build round-robin queue of remaining (batch1 + batch2) tracks
    const remaining: Record<string, number[]> = {};
    for (const slug of ACTIVE_ORDER) {
      const a = draft.find((x) => x.slug === slug);
      if (!a) continue;
      remaining[slug] = a.tracks.slice(1).map((_, i) => i + 1);
    }

    const queue: { slug: string; idx: number }[] = [];
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const slug of ACTIVE_ORDER) {
        const rem = remaining[slug];
        if (rem && rem.length > 0) {
          queue.push({ slug, idx: rem.shift()! });
          hasMore = true;
        }
      }
    }

    // Step 3: generate date slots — Mon + Thu each week starting Jul 19
    const slots: string[] = [];
    const start = new Date("2026-07-19");
    for (let week = 0; slots.length < queue.length + 4; week++) {
      const mon = new Date(start);
      mon.setDate(mon.getDate() + week * 7);
      const thu = new Date(mon);
      thu.setDate(thu.getDate() + 3);
      slots.push(mon.toISOString().split("T")[0]);
      slots.push(thu.toISOString().split("T")[0]);
    }

    // Step 4: apply dates
    const final = draft.map((a) => ({ ...a, tracks: [...a.tracks] }));
    queue.forEach(({ slug, idx }, i) => {
      const artist = final.find((a) => a.slug === slug);
      if (!artist || !slots[i]) return;
      artist.tracks[idx] = { ...artist.tracks[idx], scheduledFor: slots[i] };
    });

    setArtists(final);
    setDirty(new Set([...ACTIVE_ORDER]));
    setSchedulePreview(true);
    showToast("Schedule generated - review then save");
  }

  async function handleUpload(slug: string, idx: number, file: File) {
    const key = `${slug}-${idx}`;
    setUploadStatus((p) => ({ ...p, [key]: "uploading" }));
    const form = new FormData();
    form.append("file", file);
    form.append("artistSlug", slug);
    const headers = await authHeaders();
    const res  = await fetch("/api/admin/release-schedule/upload", { method: "POST", headers, body: form });
    const json = await res.json();
    if (res.ok && json.path) {
      updateTrack(slug, idx, "url", json.path);
      setUploadStatus((p) => ({ ...p, [key]: "done" }));
      setTimeout(() => setUploadStatus((p) => { const n = { ...p }; delete n[key]; return n; }), 3000);
    } else {
      setUploadStatus((p) => ({ ...p, [key]: "error" }));
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function toggleCollapse(slug: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const filtered = filter === "all" ? artists : artists.filter((a) => a.slug === filter);
  const totalTracks    = artists.reduce((s, a) => s + a.tracks.length, 0);
  const scheduledCount = artists.reduce((s, a) => s + a.tracks.filter((t) => t.scheduledFor).length, 0);
  const audioCount     = artists.reduce((s, a) => s + a.tracks.filter((t) => t.url).length, 0);

  if (loading) return <div className="rs-center"><div className="rs-spinner" /></div>;

  if (!hasAccess) {
    return (
      <div className="rs-gate">
        <div className="rs-gate-card">
          <div className="rs-gate-lock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>Admin Only</h2>
          <p>Song Manager is restricted to the GeekFon Society admin account.</p>
          <a href="/dashboard" className="rs-gate-btn">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{RS_CSS}</style>
      {toast && <div className="rs-toast">{toast}</div>}

      {/* Header */}
      <div className="rs-header">
        <div>
          <div className="dp-eyebrow">Admin Tool</div>
          <h1 className="rs-title">Song Manager</h1>
        </div>
        <div className="rs-header-actions">
          {readOnly && (
            <div className="rs-readonly-badge">View Only — upgrade to Pro to edit</div>
          )}
          <div className="rs-stats">
            <span>{totalTracks} tracks</span>
            <span>{scheduledCount} scheduled</span>
            <span>{audioCount} w/ audio</span>
          </div>
          <button className="rs-gen-btn" onClick={generateSchedule} title="Auto-fill dates based on track order" disabled={readOnly} style={readOnly ? { opacity: 0.35, cursor: "not-allowed" } : {}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="13" height="13">
              <path d="M8 6l4-4 4 4M12 2v10.5M16 18l-4 4-4-4M12 22V11.5M3 12h18"/>
            </svg>
            Generate Schedule
          </button>
          {dirty.size > 0 && !readOnly && (
            <button className="rs-save-btn" onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : `Save Changes (${dirty.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="rs-controls">
        <label className="rs-label">Artist</label>
        <select className="rs-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Artists</option>
          {artists.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name} ({a.tracks.length})</option>
          ))}
        </select>
        <button className="rs-collapse-all" onClick={() => setCollapsed(new Set(artists.map((a) => a.slug)))}>
          Collapse all
        </button>
        <button className="rs-collapse-all" onClick={() => setCollapsed(new Set())}>
          Expand all
        </button>
        {schedulePreview && (
          <div className="rs-preview-badge">Schedule preview - unsaved</div>
        )}
        <div className="rs-add-artist">
          <input
            className="rs-input rs-add-artist-input"
            placeholder="New artist name"
            value={newArtistName}
            onChange={(e) => setNewArtistName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addArtist(); }}
            disabled={addingArtist}
          />
          <button className="rs-add-artist-btn" onClick={addArtist} disabled={addingArtist || !newArtistName.trim()}>
            {addingArtist ? "Adding..." : "+ Add Artist"}
          </button>
        </div>
      </div>

      {/* Artist groups */}
      {dataLoading ? (
        <div className="rs-center" style={{ padding: "60px 0" }}><div className="rs-spinner" /></div>
      ) : (
        <div className="rs-artist-list">
          {filtered.map((artist) => {
            const isOpen = !collapsed.has(artist.slug);
            const isDirty = dirty.has(artist.slug);
            const scheduledHere = artist.tracks.filter((t) => t.scheduledFor).length;
            const isBatch1 = BATCH1.includes(artist.slug);
            const isBatch2 = BATCH2.includes(artist.slug);
            return (
              <div key={artist.slug} className={`rs-artist-card${isDirty ? " rs-artist-dirty" : ""}`}>
                {/* Artist header */}
                <button className="rs-artist-hdr" onClick={() => toggleCollapse(artist.slug)}>
                  <div className="rs-artist-hdr-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14" className={`rs-caret${isOpen ? " open" : ""}`}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    <span className="rs-artist-name">{artist.name}</span>
                    {isBatch1 && <span className="rs-batch rs-batch1">Live</span>}
                    {isBatch2 && <span className="rs-batch rs-batch2">Jul 13</span>}
                    {isDirty && <span className="rs-unsaved-dot" title="Unsaved changes" />}
                  </div>
                  <div className="rs-artist-hdr-right">
                    <span className="rs-artist-meta">{scheduledHere}/{artist.tracks.length} scheduled</span>
                  </div>
                </button>

                {/* Track rows */}
                {isOpen && (
                  <div className="rs-track-list">
                    <div className="rs-track-head">
                      <span style={{ width: 24 }} />
                      <span style={{ width: 28 }}>#</span>
                      <span className="rs-th-grow">Track</span>
                      <span style={{ width: 52 }}>Season</span>
                      <span style={{ width: 72 }}>Tier</span>
                      <span style={{ width: 120 }}>Release Date</span>
                      <span style={{ width: 80 }}>Audio</span>
                      <span style={{ width: 64 }}>Flags</span>
                    </div>
                    {artist.tracks.map((track, idx) => {
                      const key = `${artist.slug}-${idx}`;
                      const us  = uploadStatus[key];
                      const vis = VIS_OPTS.find((v) => v.value === track.v) || VIS_OPTS[1];
                      const isDragTarget = dragOver?.slug === artist.slug && dragOver?.idx === idx;
                      return (
                        <div
                          key={key}
                          className={`rs-track-row${isDragTarget ? " rs-drag-target" : ""}`}
                          draggable={!readOnly}
                          onDragStart={readOnly ? undefined : () => { dragArtist.current = artist.slug; dragIdx.current = idx; }}
                          onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setDragOver({ slug: artist.slug, idx }); }}
                          onDragLeave={readOnly ? undefined : () => setDragOver(null)}
                          onDrop={readOnly ? undefined : (e) => {
                            e.preventDefault();
                            setDragOver(null);
                            if (dragArtist.current === artist.slug && dragIdx.current !== null) {
                              reorderTrack(artist.slug, dragIdx.current, idx);
                            }
                            dragArtist.current = null;
                            dragIdx.current = null;
                          }}
                          onDragEnd={readOnly ? undefined : () => { setDragOver(null); dragArtist.current = null; dragIdx.current = null; }}
                        >
                          {/* Drag handle */}
                          <span className="rs-drag-handle" title="Drag to reorder">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                              <circle cx="8" cy="6"  r="1.5"/><circle cx="16" cy="6"  r="1.5"/>
                              <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
                              <circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
                            </svg>
                          </span>

                          {/* Up/down reorder - 2026-07-26 per Sean: HTML5 drag-and-drop
                              (the handle above) doesn't fire on touch, so it's unusable on
                              mobile. These buttons call the same reorderTrack() the drop
                              handler already uses, just via tap instead of drag. */}
                          <span className="rs-reorder">
                            <button
                              type="button"
                              className="rs-reorder-btn"
                              title="Move up"
                              disabled={readOnly || idx === 0}
                              onClick={(e) => { e.stopPropagation(); reorderTrack(artist.slug, idx, idx - 1); }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                                <path d="M18 15l-6-6-6 6" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="rs-reorder-btn"
                              title="Move down"
                              disabled={readOnly || idx === artist.tracks.length - 1}
                              onClick={(e) => { e.stopPropagation(); reorderTrack(artist.slug, idx, idx + 1); }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>
                          </span>

                          {/* # */}
                          <span className="rs-num">{idx + 1}</span>

                          {/* Track name */}
                          <input
                            className="rs-input rs-th-grow"
                            value={track.n}
                            readOnly={readOnly}
                            onChange={readOnly ? undefined : (e) => updateTrack(artist.slug, idx, "n", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={readOnly ? { opacity: 0.7, cursor: "default" } : {}}
                          />

                          {/* Season */}
                          <select
                            className="rs-sel"
                            style={{ width: 52, ...(readOnly ? { opacity: 0.7, cursor: "default" } : {}) }}
                            value={track.m}
                            disabled={readOnly}
                            onChange={readOnly ? undefined : (e) => updateTrack(artist.slug, idx, "m", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {SEASON_OPTS.map((s) => (
                              <option key={s} value={s}>{s.replace("Season ", "S")}</option>
                            ))}
                          </select>

                          {/* Tier */}
                          <select
                            className="rs-sel"
                            style={{ width: 72, color: vis.color, ...(readOnly ? { opacity: 0.7, cursor: "default" } : {}) }}
                            value={track.v}
                            disabled={readOnly}
                            onChange={readOnly ? undefined : (e) => updateTrack(artist.slug, idx, "v", e.target.value as Visibility)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {VIS_OPTS.map((v) => (
                              <option key={v.value} value={v.value} style={{ color: v.color }}>{v.label}</option>
                            ))}
                          </select>

                          {/* Release date */}
                          <div style={{ width: 120 }} className="rs-date-cell">
                            <input
                              type="date"
                              className={`rs-input rs-date${track.scheduledFor ? " rs-date-filled" : ""}`}
                              value={toDateInput(track.scheduledFor)}
                              readOnly={readOnly}
                              onChange={readOnly ? undefined : (e) => updateTrack(artist.slug, idx, "scheduledFor", e.target.value || undefined)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Audio */}
                          <div className="rs-audio-cell" style={{ width: 80 }}>
                            {track.url
                              ? <span className="rs-audio-ok">Audio</span>
                              : <span className="rs-audio-none">None</span>
                            }
                            {!readOnly && <label
                              className={`rs-upload-btn${us === "uploading" ? " rs-uploading" : us === "done" ? " rs-uploaded" : us === "error" ? " rs-upload-err" : ""}`}
                              title="Upload audio"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {us === "uploading" ? "..." : us === "done" ? "OK" : us === "error" ? "Err" : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                </svg>
                              )}
                              <input type="file" accept="audio/*" style={{ display: "none" }}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(artist.slug, idx, f); e.target.value = ""; }} />
                            </label>}
                          </div>

                          {/* Flags */}
                          <div className="rs-flags" style={{ width: 64 }}>
                            {([["isPremiere","P","Premiere"],["isFinale","F","Finale"],["isRemix","R","Remix"]] as const).map(([field, label, title]) => (
                              <label key={field} className="rs-flag" title={title} onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={!!track[field as keyof Track]}
                                  disabled={readOnly}
                              onChange={readOnly ? undefined : (e) => updateTrack(artist.slug, idx, field as keyof Track, e.target.checked)} />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className="rs-add-track-btn"
                      onClick={() => addTrack(artist.slug)}
                      disabled={readOnly}
                    >
                      + Add Track
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const RS_CSS = `
.rs-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.rs-title { font-size: clamp(22px, 4vw, 32px); font-weight: 900; text-transform: uppercase; letter-spacing: -.02em; color: #fff; margin: 4px 0 0; }
.rs-header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rs-readonly-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #F69820; border: 1px solid rgba(246,152,32,.4); background: rgba(246,152,32,.1); border-radius: 20px; padding: 5px 12px; flex-shrink: 0; }
.rs-stats { display: flex; gap: 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.35); }
.rs-gen-btn { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.7); font-family: inherit; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 9px 16px; border-radius: 100px; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
.rs-gen-btn:hover { background: rgba(255,255,255,.13); color: #fff; }
.rs-save-btn { background: #AAFF00; color: #000; border: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 10px 20px; border-radius: 100px; transition: background .15s; white-space: nowrap; }
.rs-save-btn:hover:not(:disabled) { background: #c8ff40; }
.rs-save-btn:disabled { opacity: .5; cursor: default; }
.rs-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.rs-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.35); white-space: nowrap; }
.rs-select { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); color: #fff; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
.rs-select option { background: #1a1a1a; }
.rs-collapse-all { background: none; border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.4); font-family: inherit; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; padding: 7px 12px; border-radius: 6px; cursor: pointer; }
.rs-collapse-all:hover { color: rgba(255,255,255,.7); border-color: rgba(255,255,255,.2); }
.rs-add-artist { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.rs-add-artist-input { width: 160px; }
.rs-add-artist-btn { background: #F69820; color: #000; border: none; font-family: inherit; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 8px 14px; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.rs-add-artist-btn:hover:not(:disabled) { background: #ffaf30; }
.rs-add-artist-btn:disabled { opacity: .4; cursor: default; }
.rs-add-track-btn { display: block; width: calc(100% - 24px); margin: 6px 12px 4px; background: none; border: 1px dashed rgba(255,255,255,.15); color: rgba(255,255,255,.35); font-family: inherit; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; padding: 8px; border-radius: 6px; cursor: pointer; }
.rs-add-track-btn:hover:not(:disabled) { color: rgba(255,255,255,.7); border-color: rgba(255,255,255,.3); }
.rs-add-track-btn:disabled { opacity: .3; cursor: default; }
.rs-preview-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #AAFF00; padding: 5px 12px; border-radius: 20px; background: rgba(170,255,0,.08); border: 1px solid rgba(170,255,0,.2); }
/* Artist list */
.rs-artist-list { display: flex; flex-direction: column; gap: 10px; }
.rs-artist-card { border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.rs-artist-dirty { border-color: rgba(246,152,32,.25); }
.rs-artist-hdr { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: rgba(255,255,255,.03); border: none; cursor: pointer; color: #fff; font-family: inherit; text-align: left; transition: background .12s; }
.rs-artist-hdr:hover { background: rgba(255,255,255,.055); }
.rs-artist-hdr-left { display: flex; align-items: center; gap: 10px; }
.rs-artist-hdr-right { display: flex; align-items: center; gap: 10px; }
.rs-caret { transition: transform .2s; color: rgba(255,255,255,.4); flex-shrink: 0; }
.rs-caret.open { transform: rotate(180deg); }
.rs-artist-name { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
.rs-batch { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; padding: 2px 8px; border-radius: 20px; }
.rs-batch1 { background: rgba(0,215,95,.1); color: rgba(0,215,95,.9); border: 1px solid rgba(0,215,95,.2); }
.rs-batch2 { background: rgba(233,30,140,.1); color: #E91E8C; border: 1px solid rgba(233,30,140,.2); }
.rs-unsaved-dot { width: 7px; height: 7px; border-radius: 50%; background: #F69820; flex-shrink: 0; }
.rs-artist-meta { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); }
/* Track list */
.rs-track-list { padding: 0 0 8px; }
.rs-track-head { display: flex; align-items: center; gap: 8px; padding: 6px 12px 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.25); border-bottom: 1px solid rgba(255,255,255,.05); }
.rs-th-grow { flex: 1; }
.rs-track-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,.03); cursor: grab; transition: background .1s; }
.rs-track-row:last-child { border-bottom: none; }
.rs-track-row:hover { background: rgba(255,255,255,.025); }
.rs-track-row:active { cursor: grabbing; }
.rs-drag-target { background: rgba(246,152,32,.08) !important; border-bottom: 2px solid #F69820 !important; }
.rs-drag-handle { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: rgba(255,255,255,.2); flex-shrink: 0; cursor: grab; }
.rs-drag-handle:hover { color: rgba(255,255,255,.5); }
.rs-reorder { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.rs-reorder-btn { display: flex; align-items: center; justify-content: center; width: 20px; height: 15px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 4px; color: rgba(255,255,255,.45); cursor: pointer; padding: 0; font-family: inherit; }
.rs-reorder-btn:hover:not(:disabled) { background: rgba(255,255,255,.14); color: #fff; }
.rs-reorder-btn:disabled { opacity: .2; cursor: default; }
.rs-num { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); width: 28px; text-align: center; white-space: nowrap; flex-shrink: 0; }
.rs-input { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; padding: 5px 9px; border-radius: 6px; min-width: 0; box-sizing: border-box; }
.rs-input.rs-th-grow { flex: 1; }
.rs-input:focus { outline: none; border-color: #F69820; }
.rs-date { min-width: 110px; width: 120px; }
.rs-sel { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); font-family: inherit; font-size: 11px; font-weight: 700; padding: 5px 8px; border-radius: 6px; cursor: pointer; color: #fff; flex-shrink: 0; }
.rs-sel option { background: #1a1a1a; color: #fff; }
.rs-date-cell { display: flex; align-items: center; flex-shrink: 0; }
.rs-date-filled { border-color: rgba(170,255,0,.3) !important; color: rgba(170,255,0,.85) !important; }
.rs-audio-cell { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.rs-audio-ok { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: rgba(0,215,95,.8); }
.rs-audio-none { font-size: 9px; font-weight: 700; color: rgba(255,255,255,.22); }
.rs-upload-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 5px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); cursor: pointer; color: rgba(255,255,255,.5); font-size: 9px; font-weight: 800; flex-shrink: 0; }
.rs-upload-btn:hover { background: rgba(255,255,255,.13); color: #fff; }
.rs-uploading { background: rgba(246,152,32,.15) !important; border-color: rgba(246,152,32,.3) !important; color: #F69820 !important; }
.rs-uploaded { background: rgba(0,215,95,.12) !important; border-color: rgba(0,215,95,.3) !important; color: rgba(0,215,95,.9) !important; }
.rs-upload-err { background: rgba(255,100,100,.1) !important; border-color: rgba(255,100,100,.3) !important; color: rgba(255,100,100,.9) !important; }
.rs-flags { display: flex; gap: 5px; flex-shrink: 0; }
.rs-flag { display: flex; align-items: center; gap: 3px; cursor: pointer; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.25); user-select: none; }
.rs-flag input { width: 11px; height: 11px; cursor: pointer; accent-color: #F69820; margin: 0; }
.rs-flag:has(input:checked) span { color: #F69820; }
/* Shared */
.rs-center { display: flex; align-items: center; justify-content: center; }
.rs-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(255,255,255,.1); border-top-color: #F69820; border-radius: 50%; animation: rsSpin .8s linear infinite; }
@keyframes rsSpin { to { transform: rotate(360deg); } }
.rs-toast { position: fixed; bottom: 24px; right: 24px; background: rgba(0,215,95,.12); border: 1px solid rgba(0,215,95,.3); color: rgba(0,215,95,.9); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: 12px 20px; border-radius: 100px; z-index: 999; animation: rsSlide .2s ease; }
@keyframes rsSlide { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.rs-gate { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
.rs-gate-card { max-width: 360px; width: 100%; text-align: center; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 40px 32px; }
.rs-gate-lock { color: rgba(255,255,255,.25); margin-bottom: 16px; }
.rs-gate-lock svg { width: 44px; height: 44px; }
.rs-gate-card h2 { font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 10px; }
.rs-gate-card p { font-size: 13px; color: rgba(255,255,255,.45); line-height: 1.6; margin: 0 0 20px; }
.rs-gate-btn { display: inline-block; background: #E91E8C; color: #fff; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 12px 24px; border-radius: 100px; text-decoration: none; }
.rs-gate-btn:hover { background: #c41874; }

/* Mobile 2026-07-26 per Sean: on phone the fixed-width flex row (season/tier/date/
   audio/flags columns) squeezed the track-title input down to almost nothing or
   pushed it off-screen entirely - "I don't know which song it is because it doesn't
   have the title... things are cut off." Header labels are dropped (each control is
   self-labeling: S1/S2/S3, tier color+text, a date input, Audio/None text, P/F/R
   checkboxes) and the title gets forced onto its own full-width line so it is always
   readable, with the rest of the controls wrapping compactly below it. No DOM/JSX
   changes, pure CSS reflow - drag-to-reorder still works. */
@media (max-width: 640px) {
  .rs-track-head { display: none; }
  .rs-track-row { flex-wrap: wrap; row-gap: 8px; padding: 10px 12px; }
  .rs-drag-handle { order: 1; }
  .rs-reorder { order: 2; flex-direction: row; gap: 6px; }
  .rs-reorder-btn { width: 32px; height: 28px; }
  .rs-num { order: 3; }
  .rs-input.rs-th-grow { order: 4; flex-basis: 100%; width: 100%; margin: 2px 0 2px 0; }
  .rs-sel { order: 5; }
  .rs-date-cell { order: 6; }
  .rs-audio-cell { order: 7; }
  .rs-flags { order: 8; }
}
`;


