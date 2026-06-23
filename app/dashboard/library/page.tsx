"use client";
import { useDashboard } from "../context";

export default function LibraryPage() {
  const { member, points } = useDashboard();
  const songsOwned = 0; // TODO: wire to gfs_library table when created

  return (
    <>
      <style>{CSS}</style>
      <div className="lib-head">
        <div className="lib-eyebrow">Your Library</div>
        <h1 className="lib-title">Your Collection</h1>
        <p className="lib-sub">Songs and tracks you have collected in the GeekFon universe.</p>
      </div>

      <div className="lib-stats-row">
        <div className="lib-stat">
          <div className="lib-stat-num">{songsOwned}</div>
          <div className="lib-stat-label">Songs Owned</div>
        </div>
        <div className="lib-stat">
          <div className="lib-stat-num">{(points?.available_points ?? 0).toLocaleString()}</div>
          <div className="lib-stat-label">LESARs Available</div>
        </div>
        <div className="lib-stat">
          <div className="lib-stat-num">{(member?.passport_artists || []).length}</div>
          <div className="lib-stat-label">Passport Artists</div>
        </div>
      </div>

      {songsOwned === 0 ? (
        <div className="lib-empty">
          <div className="lib-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,.1)" strokeWidth="2"/>
              <circle cx="32" cy="32" r="10" stroke="rgba(246,152,32,.4)" strokeWidth="2"/>
              <circle cx="32" cy="32" r="3" fill="rgba(246,152,32,.6)"/>
              <line x1="32" y1="4" x2="32" y2="18" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="32" y1="46" x2="32" y2="60" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="4" y1="32" x2="18" y2="32" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="46" y1="32" x2="60" y2="32" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="lib-empty-title">Your library is empty</h2>
          <p className="lib-empty-sub">Start exploring artists and collecting their music with your LESARs.</p>
          <div className="lib-empty-actions">
            <a href="/roster" className="lib-cta-primary">Browse Artists</a>
            <a href="/radio" className="lib-cta-secondary">GeekFon Radio</a>
          </div>
        </div>
      ) : (
        <div className="lib-grid">
          {/* Song cards would render here once gfs_library is wired */}
        </div>
      )}

      <div className="lib-info-strip">
        <div className="lib-info-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#F69820" strokeWidth="1.5"/><path d="M10 7v4M10 13h.01" stroke="#F69820" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <p className="lib-info-text">
          Songs are purchased with LESARs. Every Passport member earns LESARs monthly. Visit an artist page to collect their tracks.
        </p>
      </div>
    </>
  );
}

const CSS = `
.lib-head{padding:28px 0 24px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:24px;}
.lib-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.lib-title{font-size:clamp(22px,3.5vw,34px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 8px;}
.lib-sub{font-size:13px;color:rgba(255,255,255,.4);margin:0;line-height:1.6;}
.lib-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px;}
@media(max-width:600px){.lib-stats-row{grid-template-columns:1fr 1fr;}}
.lib-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;}
.lib-stat-num{font-size:26px;font-weight:900;color:#fff;letter-spacing:-.02em;}
.lib-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.3);margin-top:4px;}
/* Empty state */
.lib-empty{text-align:center;padding:60px 24px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:20px;display:flex;flex-direction:column;align-items:center;gap:16px;}
.lib-empty-icon svg{width:72px;height:72px;}
.lib-empty-title{font-size:22px;font-weight:900;color:#fff;margin:0;}
.lib-empty-sub{font-size:14px;color:rgba(255,255,255,.4);line-height:1.6;margin:0;max-width:360px;}
.lib-empty-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:4px;}
.lib-cta-primary{display:inline-block;padding:12px 28px;border-radius:100px;background:#F69820;color:#000;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;text-decoration:none;transition:background .15s;}
.lib-cta-primary:hover{background:#ffaf30;}
.lib-cta-secondary{display:inline-block;padding:12px 28px;border-radius:100px;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;text-decoration:none;transition:border-color .15s,color .15s;}
.lib-cta-secondary:hover{border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.85);}
/* Info strip */
.lib-info-strip{display:flex;align-items:flex-start;gap:12px;margin-top:28px;padding:16px 20px;background:rgba(246,152,32,.05);border:1px solid rgba(246,152,32,.12);border-radius:12px;}
.lib-info-icon{flex-shrink:0;margin-top:1px;}
.lib-info-icon svg{width:18px;height:18px;}
.lib-info-text{font-size:12px;font-weight:500;color:rgba(255,255,255,.5);line-height:1.6;margin:0;}
`;
