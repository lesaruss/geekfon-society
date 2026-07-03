"use client";
import { useState, useEffect } from "react";
import { useDashboard } from "../context";

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

export default function ReleaseSchedulePage() {
  const { userEmail, member, loading } = useDashboard();
  const [artists, setArtists]         = useState<Artist[]>([]);
  const [dirty, setDirty]             = useState<Set<string>>(new Set());
  const [filter, setFilter]           = useState("all");
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  const isAdmin   = userEmail === ADMIN_EMAIL;
  const tier      = member?.tier || "public";
  const hasAccess = isAdmin || tier === "pro";

  useEffect(() => {
    if (loading || !hasAccess) { setDataLoading(false); return; }
    fetch("/api/admin/release-schedule")
      .then((r) => r.json())
      .then((j) => { setArtists(j.artists || []); setDataLoading(false); });
  }, [loading, hasAccess]);

  function updateTrack(slug: string, idx: number, field: keyof Track, value: unknown) {
    setArtists((prev) =>
      prev.map((a) =>
        a.slug !== slug
          ? a
          : { ...a, tracks: a.tracks.map((t, i) => (i !== idx ? t : { ...t, [field]: value })) }
      )
    );
    setDirty((prev) => new Set(prev).add(slug));
  }

  async function saveAll() {
    setSaving(true);
    const toSave = artists.filter((a) => dirty.has(a.slug));
    await Promise.all(
      toSave.map((a) =>
        fetch("/api/admin/release-schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: a.slug, tracks: a.tracks }),
        })
      )
    );
    setSaving(false);
    setDirty(new Set());
    showToast(`Saved ${toSave.length} artist${toSave.length !== 1 ? "s" : ""}`);
  }

  async function handleUpload(slug: string, idx: number, file: File) {
    const key = `${slug}-${idx}`;
    setUploadStatus((p) => ({ ...p, [key]: "uploading" }));
    const form = new FormData();
    form.append("file", file);
    form.append("artistSlug", slug);
    const res  = await fetch("/api/admin/release-schedule/upload", { method: "POST", body: form });
    const json = await res.json();
    if (res.ok && json.path) {
      updateTrack(slug, idx, "url", json.path);
      setUploadStatus((p) => ({ ...p, [key]: "done" }));
      setTimeout(
        () => setUploadStatus((p) => { const n = { ...p }; delete n[key]; return n; }),
        3000
      );
    } else {
      setUploadStatus((p) => ({ ...p, [key]: "error" }));
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const filtered  = filter === "all" ? artists : artists.filter((a) => a.slug === filter);
  const rows      = filtered.flatMap((a) => a.tracks.map((t, i) => ({ artist: a, track: t, idx: i })));
  const scheduled = rows.filter((r) => r.track.scheduledFor).length;
  const withAudio = rows.filter((r) => r.track.url).length;

  if (loading) {
    return <div className="rs-center"><div className="rs-spinner" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="rs-gate">
        <div className="rs-gate-card">
          <div className="rs-gate-lock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>Pro Access Required</h2>
          <p>Release Schedule is available to Pro members and admins only.</p>
          <a href="/plus" className="rs-gate-btn">Upgrade to Pro</a>
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
          <h1 className="rs-title">Release Manager</h1>
        </div>
        <div className="rs-header-actions">
          <div className="rs-stats">
            <span>{rows.length} tracks</span>
            <span>{scheduled} scheduled</span>
            <span>{withAudio} w/ audio</span>
          </div>
          {dirty.size > 0 && (
            <button className="rs-save-btn" onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : `Save Changes (${dirty.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="rs-controls">
        <label className="rs-label">Artist</label>
        <select
          className="rs-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">
            All Artists ({artists.reduce((s, a) => s + a.tracks.length, 0)} tracks)
          </option>
          {artists.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name} ({a.tracks.length})
            </option>
          ))}
        </select>
        {dirty.size > 0 && (
          <div className="rs-dirty-badge">{dirty.size} unsaved</div>
        )}
      </div>

      {/* Table */}
      {dataLoading ? (
        <div className="rs-center" style={{ padding: "60px 0" }}>
          <div className="rs-spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="dp-empty"><p>No tracks found.</p></div>
      ) : (
        <div className="rs-table-wrap">
          <table className="rs-table">
            <thead>
              <tr>
                <th>#</th>
                {filter === "all" && <th>Artist</th>}
                <th>Track Name</th>
                <th>Season</th>
                <th>Tier</th>
                <th>Release Date</th>
                <th>Audio</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ artist, track, idx }) => {
                const key = `${artist.slug}-${idx}`;
                const us  = uploadStatus[key];
                const vis = VIS_OPTS.find((v) => v.value === track.v) || VIS_OPTS[1];
                return (
                  <tr key={key} className={dirty.has(artist.slug) ? "rs-dirty-row" : ""}>
                    <td className="rs-num">{idx + 1}</td>
                    {filter === "all" && (
                      <td>
                        <span className="rs-artist-tag">{artist.name}</span>
                      </td>
                    )}
                    <td>
                      <input
                        className="rs-input"
                        value={track.n}
                        onChange={(e) => updateTrack(artist.slug, idx, "n", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="rs-sel"
                        value={track.m}
                        onChange={(e) => updateTrack(artist.slug, idx, "m", e.target.value)}
                      >
                        {SEASON_OPTS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("Season ", "S")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="rs-sel"
                        value={track.v}
                        onChange={(e) =>
                          updateTrack(artist.slug, idx, "v", e.target.value as Visibility)
                        }
                        style={{ color: vis.color }}
                      >
                        {VIS_OPTS.map((v) => (
                          <option key={v.value} value={v.value} style={{ color: v.color }}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        className="rs-input rs-date"
                        value={track.scheduledFor || ""}
                        onChange={(e) =>
                          updateTrack(artist.slug, idx, "scheduledFor", e.target.value || undefined)
                        }
                      />
                    </td>
                    <td className="rs-audio-cell">
                      {track.url ? (
                        <span className="rs-audio-ok">Audio</span>
                      ) : (
                        <span className="rs-audio-none">None</span>
                      )}
                      <label
                        className={`rs-upload-btn${
                          us === "uploading" ? " rs-uploading" :
                          us === "done"      ? " rs-uploaded"  :
                          us === "error"     ? " rs-upload-err" : ""
                        }`}
                        title="Upload audio"
                      >
                        {us === "uploading" ? "..." : us === "done" ? "Done" : us === "error" ? "Err" : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                          </svg>
                        )}
                        <input
                          type="file"
                          accept="audio/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(artist.slug, idx, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </td>
                    <td>
                      <div className="rs-flags">
                        {[
                          { field: "isPremiere" as keyof Track, label: "P", title: "Premiere" },
                          { field: "isFinale"   as keyof Track, label: "F", title: "Finale"   },
                          { field: "isRemix"    as keyof Track, label: "R", title: "Remix"    },
                        ].map(({ field, label, title }) => (
                          <label key={field} className="rs-flag" title={title}>
                            <input
                              type="checkbox"
                              checked={!!track[field]}
                              onChange={(e) => updateTrack(artist.slug, idx, field, e.target.checked)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const RS_CSS = `
.rs-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.rs-title { font-size: clamp(22px, 4vw, 32px); font-weight: 900; text-transform: uppercase; letter-spacing: -.02em; color: #fff; margin: 4px 0 0; }
.rs-header-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.rs-stats { display: flex; gap: 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.35); }
.rs-save-btn { background: #AAFF00; color: #000; border: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 10px 20px; border-radius: 100px; transition: background .15s; white-space: nowrap; }
.rs-save-btn:hover:not(:disabled) { background: #c8ff40; }
.rs-save-btn:disabled { opacity: .5; cursor: default; }
.rs-controls { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.rs-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.35); white-space: nowrap; }
.rs-select { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); color: #fff; font-family: inherit; font-size: 12px; font-weight: 700; padding: 9px 14px; border-radius: 8px; cursor: pointer; }
.rs-select option { background: #1a1a1a; }
.rs-dirty-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #F69820; padding: 5px 12px; border-radius: 20px; background: rgba(246,152,32,.1); border: 1px solid rgba(246,152,32,.2); }
.rs-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; }
.rs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.rs-table th { text-align: left; padding: 10px 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.3); border-bottom: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); white-space: nowrap; }
.rs-table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
.rs-table tr:last-child td { border-bottom: none; }
.rs-table tr:hover td { background: rgba(255,255,255,.025); }
.rs-dirty-row td { background: rgba(246,152,32,.04) !important; }
.rs-num { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.3); width: 28px; text-align: center; white-space: nowrap; }
.rs-artist-tag { display: inline-block; font-size: 10px; font-weight: 800; white-space: nowrap; padding: 3px 9px; border-radius: 20px; background: rgba(233,30,140,.1); border: 1px solid rgba(233,30,140,.2); color: #E91E8C; }
.rs-input { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 6px; width: 100%; min-width: 140px; box-sizing: border-box; }
.rs-input:focus { outline: none; border-color: #F69820; }
.rs-date { min-width: 130px; }
.rs-sel { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); font-family: inherit; font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #fff; }
.rs-sel option { background: #1a1a1a; color: #fff; }
.rs-audio-cell { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.rs-audio-ok { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: rgba(0,215,95,.8); }
.rs-audio-none { font-size: 9px; font-weight: 700; color: rgba(255,255,255,.25); }
.rs-upload-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); cursor: pointer; color: rgba(255,255,255,.6); font-size: 9px; font-weight: 800; flex-shrink: 0; }
.rs-upload-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
.rs-uploading { background: rgba(246,152,32,.15) !important; border-color: rgba(246,152,32,.3) !important; color: #F69820 !important; }
.rs-uploaded { background: rgba(0,215,95,.12) !important; border-color: rgba(0,215,95,.3) !important; color: rgba(0,215,95,.9) !important; }
.rs-upload-err { background: rgba(255,100,100,.1) !important; border-color: rgba(255,100,100,.3) !important; color: rgba(255,100,100,.9) !important; }
.rs-flags { display: flex; gap: 6px; }
.rs-flag { display: flex; align-items: center; gap: 3px; cursor: pointer; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.28); user-select: none; }
.rs-flag input { width: 12px; height: 12px; cursor: pointer; accent-color: #F69820; margin: 0; }
.rs-flag:has(input:checked) span { color: #F69820; }
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
`;
