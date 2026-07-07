"use client";
import { useState, useEffect } from "react";
import { useDashboard } from "../context";
import { supabase } from "@/lib/supabase";

const AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";

type OwnedTrack = { artist_slug: string; track_name: string; lesars_spent: number; purchased_at: string; track_url: string | null };

const ARTIST_LABEL: Record<string, string> = {
  roxanne: "Roxanne",
  "shamanic-resin": "Shamanic Resin",
  "riku-hayasaka": "Riku Hayasaka",
  "lex-from-brixton": "Lex from Brixton",
  "lickle-bro": "Lickle Bro",
  "lickle-sis": "Lickle Sis",
  "mad-tings": "Mad Tings",
  "nilo-wave": "Nilo Wave",
  "mr-russell": "Mr. Russell",
  "rustblood-prophets": "Rustblood Prophets",
  "straight-and-narrow": "Straight and Narrow",
};

export default function LibraryPage() {
  const { userId, member, points } = useDashboard();
  const [owned, setOwned] = useState<OwnedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("gfs_track_purchases")
      .select("artist_slug, track_name, lesars_spent, purchased_at, track_url")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false })
      .then(({ data }) => {
        setOwned(data || []);
        setLoading(false);
      });
  }, [userId]);

  const songsOwned = owned.length;

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

      {loading ? (
        <div className="lib-loading">Loading your collection...</div>
      ) : songsOwned === 0 ? (
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
          {owned.map((t, i) => (
            <div key={i} className="lib-card">
              <a href={`/${t.artist_slug}?tab=music`} className="lib-card-main">
                <div className="lib-card-art" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <div className="lib-card-body">
                  <div className="lib-card-title">{t.track_name}</div>
                  <div className="lib-card-sub">{ARTIST_LABEL[t.artist_slug] || t.artist_slug}</div>
                </div>
              </a>
              <div className="lib-card-actions">
                {t.track_url ? (
                  <a
                    className="lib-card-download"
                    href={AUDIO + t.track_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${t.track_name}`}
                    title="Download to upload into Apple Music, Spotify, or any other app"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/></svg>
                    Download
                  </a>
                ) : (
                  <span className="lib-card-soon">Audio coming soon</span>
                )}
                <div className="lib-card-cost">{t.lesars_spent} LESARs</div>
              </div>
            </div>
          ))}
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
.lib-loading{padding:60px 24px;text-align:center;font-size:13px;color:rgba(255,255,255,.4);}
/* Owned tracks grid */
.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.lib-card{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px 16px;transition:border-color .15s,background .15s;}
.lib-card:hover{border-color:rgba(246,152,32,.3);background:rgba(255,255,255,.06);}
.lib-card-main{flex:1;min-width:0;display:flex;align-items:center;gap:14px;text-decoration:none;}
.lib-card-art{flex-shrink:0;width:40px;height:40px;border-radius:10px;background:rgba(246,152,32,.1);color:#F69820;display:flex;align-items:center;justify-content:center;}
.lib-card-body{flex:1;min-width:0;}
.lib-card-title{font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lib-card-sub{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;}
.lib-card-actions{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
.lib-card-cost{font-size:10px;font-weight:800;color:rgba(246,152,32,.8);white-space:nowrap;}
.lib-card-download{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#000;background:#F69820;padding:6px 12px;border-radius:100px;text-decoration:none;white-space:nowrap;transition:background .15s;}
.lib-card-download:hover{background:#ffaf30;}
.lib-card-soon{font-size:10px;font-weight:600;color:rgba(255,255,255,.3);white-space:nowrap;}
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
