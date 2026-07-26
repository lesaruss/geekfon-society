"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useDashboard, TIER_LABEL, ADMIN_EMAIL } from "../../context";
import { supabase } from "@/lib/supabase";

type MemberDetail = {
  id: string; user_id: string; name: string | null; email: string | null;
  tier: string | null; created_at: string; last_sign_in: string | null;
  is_minor?: boolean;
};
type Unlock = { id: string; artist_slug: string; amount_cents: number | null; source: string; created_at: string };
type Vote = { id: string; artist_slug: string; track_name: string | null; voted_at: string };
type LegacyPurchase = { id: string; track_name: string; lesars_spent: number; purchased_at: string };
type Play = { id: string; artist_slug: string; track_name: string; played_at: string };

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MemberDetailPage() {
  const { userEmail, loading } = useDashboard();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // Same View-As-aware admin gate as every other /dashboard/<tool> page
  // (Members, Release Schedule, Radio Schedule) - a direct visit here while
  // simulating a non-admin tier behaves like it doesn't exist.
  const [viewAs, setViewAs] = useState<string | null>(null);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gfs-view-as") : null;
    if (saved) setViewAs(saved);
    const onViewAs = (e: Event) => setViewAs((e as CustomEvent).detail ?? null);
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);
  const isAdmin = userEmail === ADMIN_EMAIL;
  const simulating = isAdmin && viewAs !== null;
  const hasAccess = isAdmin && !simulating;

  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [purchases, setPurchases] = useState<LegacyPurchase[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !hasAccess || !id) { setDataLoading(false); return; }
    (async () => {
      setDataLoading(true);
      setError("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const res = await fetch(`/api/admin/members/${id}`, { headers });
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Failed to load member"); setDataLoading(false); return; }
        setDetail(json.member);
        setUnlocks(json.unlocks || []);
        setVotes(json.votes || []);
        setPurchases(json.purchases || []);
        setPlays(json.plays || []);
      } catch (_) {
        setError("Network error");
      }
      setDataLoading(false);
    })();
  }, [loading, hasAccess, id]);

  if (loading) return <div className="mdp-center"><div className="mdp-spinner" /></div>;

  if (!hasAccess) {
    return (
      <>
        <style>{MDP_CSS}</style>
        <div className="mdp-gate">
          <div className="mdp-gate-card">
            <div className="mdp-gate-lock">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>Superadmin Only</h2>
            <p>Member profiles are restricted to the GeekFon Society admin account.</p>
            <a href="/dashboard/members" className="mdp-gate-btn">Back to Members</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{MDP_CSS}</style>
      <a href="/dashboard/members" className="mdp-back">&larr; Back to Members</a>

      {dataLoading ? (
        <div className="mdp-center" style={{ padding: "60px 0" }}><div className="mdp-spinner" /></div>
      ) : error ? (
        <div className="mdp-empty">{error}</div>
      ) : !detail ? (
        <div className="mdp-empty">Member not found.</div>
      ) : (
        <>
          <div className="mdp-header">
            <div className="mdp-avatar">{initials(detail.name)}</div>
            <div className="mdp-headinfo">
              <div className="mdp-name">{detail.name || "Unnamed Member"}</div>
              <div className="mdp-email">{detail.email || "-"}</div>
              <div className="mdp-badges">
                <span className={"mdp-tier t-" + (detail.tier || "passport")}>{TIER_LABEL[detail.tier || "passport"] || detail.tier}</span>
                <span className="mdp-meta">Joined {fmtDate(detail.created_at)}</span>
                <span className="mdp-meta">Last active {detail.last_sign_in ? fmtDate(detail.last_sign_in) : "Never"}</span>
              </div>
            </div>
          </div>

          <div className="mdp-stats">
            <div className="mdp-stat"><div className="mdp-stat-num">{unlocks.length}</div><div className="mdp-stat-label">Artist Unlocks</div></div>
            <div className="mdp-stat"><div className="mdp-stat-num">{votes.length}</div><div className="mdp-stat-label">Song Likes</div></div>
            <div className="mdp-stat"><div className="mdp-stat-num">{plays.length}</div><div className="mdp-stat-label">Recent Plays</div></div>
          </div>

          <div className="mdp-section">
            <h3 className="mdp-section-title">Purchase History</h3>
            {unlocks.length === 0 && purchases.length === 0 ? (
              <div className="mdp-empty-inline">No purchases yet.</div>
            ) : (
              <div className="mdp-list">
                {unlocks.map(u => (
                  <div key={u.id} className="mdp-row">
                    <div className="mdp-row-main">
                      <span className="mdp-row-title">{u.artist_slug} - Full Unlock</span>
                      <span className="mdp-row-sub">{u.source}{u.amount_cents ? ` – $${(u.amount_cents / 100).toFixed(2)}` : ""}</span>
                    </div>
                    <span className="mdp-row-date">{fmtDateTime(u.created_at)}</span>
                  </div>
                ))}
                {purchases.map(p => (
                  <div key={p.id} className="mdp-row">
                    <div className="mdp-row-main">
                      <span className="mdp-row-title">{p.track_name}</span>
                      <span className="mdp-row-sub">Legacy Points purchase – {p.lesars_spent} pts</span>
                    </div>
                    <span className="mdp-row-date">{fmtDateTime(p.purchased_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mdp-section">
            <h3 className="mdp-section-title">Like History</h3>
            {votes.length === 0 ? (
              <div className="mdp-empty-inline">No likes yet.</div>
            ) : (
              <div className="mdp-list">
                {votes.map(v => (
                  <div key={v.id} className="mdp-row">
                    <div className="mdp-row-main">
                      <span className="mdp-row-title">{v.track_name || "(artist-level like)"}</span>
                      <span className="mdp-row-sub">{v.artist_slug}</span>
                    </div>
                    <span className="mdp-row-date">{fmtDateTime(v.voted_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {plays.length > 0 && (
            <div className="mdp-section">
              <h3 className="mdp-section-title">Recent Listens</h3>
              <div className="mdp-list">
                {plays.slice(0, 20).map(p => (
                  <div key={p.id} className="mdp-row">
                    <div className="mdp-row-main">
                      <span className="mdp-row-title">{p.track_name}</span>
                      <span className="mdp-row-sub">{p.artist_slug}</span>
                    </div>
                    <span className="mdp-row-date">{fmtDateTime(p.played_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const MDP_CSS = `
.mdp-back{display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);text-decoration:none;margin-bottom:18px;}
.mdp-back:hover{color:#F69820;}
.mdp-header{display:flex;align-items:center;gap:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:22px;margin-bottom:16px;flex-wrap:wrap;}
.mdp-avatar{width:64px;height:64px;border-radius:50%;background:#F69820;color:#000;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;flex-shrink:0;}
.mdp-headinfo{display:flex;flex-direction:column;gap:6px;min-width:0;}
.mdp-name{font-size:20px;font-weight:900;color:#fff;}
.mdp-email{font-size:13px;color:rgba(255,255,255,.45);}
.mdp-badges{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:2px;}
.mdp-tier{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:20px;background:rgba(246,152,32,.1);color:#F69820;}
.mdp-meta{font-size:11px;font-weight:600;color:rgba(255,255,255,.3);}
.mdp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
.mdp-stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px;text-align:center;}
.mdp-stat-num{font-size:26px;font-weight:900;color:#fff;}
.mdp-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.3);margin-top:4px;}
.mdp-section{margin-bottom:20px;}
.mdp-section-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin:0 0 10px;}
.mdp-list{border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;}
.mdp-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.04);}
.mdp-row:last-child{border-bottom:none;}
.mdp-row-main{display:flex;flex-direction:column;gap:3px;min-width:0;}
.mdp-row-title{font-size:13px;font-weight:700;color:#fff;}
.mdp-row-sub{font-size:11px;color:rgba(255,255,255,.35);text-transform:capitalize;}
.mdp-row-date{font-size:10px;color:rgba(255,255,255,.3);white-space:nowrap;flex-shrink:0;}
.mdp-empty-inline{padding:20px;text-align:center;color:rgba(255,255,255,.3);font-size:12px;border:1px solid rgba(255,255,255,.07);border-radius:12px;}
.mdp-empty{padding:60px 0;text-align:center;color:rgba(255,255,255,.35);font-size:13px;}
.mdp-center{display:flex;align-items:center;justify-content:center;}
.mdp-spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,.1);border-top-color:#F69820;border-radius:50%;animation:mdpSpin .8s linear infinite;}
@keyframes mdpSpin{to{transform:rotate(360deg);}}
.mdp-gate{display:flex;align-items:center;justify-content:center;min-height:50vh;}
.mdp-gate-card{max-width:360px;width:100%;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 32px;}
.mdp-gate-lock{color:rgba(255,255,255,.25);margin-bottom:16px;}
.mdp-gate-lock svg{width:44px;height:44px;}
.mdp-gate-card h2{font-size:20px;font-weight:900;color:#fff;margin:0 0 10px;}
.mdp-gate-card p{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6;margin:0 0 20px;}
.mdp-gate-btn{display:inline-block;background:#E91E8C;color:#fff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:12px 24px;border-radius:100px;text-decoration:none;}
.mdp-gate-btn:hover{background:#c41874;}
`;
