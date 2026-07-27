"use client";
import { useState, useEffect } from "react";
import { useDashboard, TIER_LABEL, ADMIN_EMAIL } from "../context";
import { supabase } from "@/lib/supabase";

const TIER_OPTIONS = ["passport", "promoter", "pro"];
const TIER_DEFAULT_POINTS: Record<string, number> = { passport: 100, promoter: 1000, pro: 0 };

type AdminMember = {
  id: string; user_id: string; name: string | null; email: string | null;
  tier: string | null; available_points: number; created_at: string; last_sign_in: string | null;
  is_pro?: boolean;
};

export default function MembersPage() {
  const { userEmail, loading } = useDashboard();

  const [members,      setMembers]      = useState<AdminMember[]>([]);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [inviteOpen,   setInviteOpen]   = useState(false);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [invitePoints, setInvitePoints] = useState(100);
  const [inviteTier,   setInviteTier]   = useState("passport");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [inviteError,  setInviteError]  = useState("");

  const isAdmin = userEmail === ADMIN_EMAIL;

  // Respect the admin "View As Membership" simulation, same as Release Schedule /
  // Radio Schedule - a direct visit here while simulating another tier behaves the
  // same as the nav link hiding itself.
  const [viewAs, setViewAs] = useState<string | null>(null);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gfs-view-as") : null;
    if (saved) setViewAs(saved);
    const onViewAs = (e: Event) => setViewAs((e as CustomEvent).detail ?? null);
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);
  const simulating = isAdmin && viewAs !== null;

  // Members is restricted to Sean's account (ADMIN_EMAIL) only, same account-only gate
  // as Release Schedule / Radio Schedule - not a tier or role perk. Standalone page
  // pulled out of the dashboard's old inline "Members Console" section 2026-07-13.
  const hasAccess = isAdmin && !simulating;

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  async function loadMembers() {
    setDataLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/members", { headers });
      const json = await res.json();
      setMembers(json.members || []);
    } catch (_) {}
    setDataLoading(false);
  }

  useEffect(() => {
    if (loading || !hasAccess) { setDataLoading(false); return; }
    loadMembers();
  }, [loading, hasAccess]);

  function handleTierChange(t: string) {
    setInviteTier(t);
    setInvitePoints(TIER_DEFAULT_POINTS[t] ?? 0);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteStatus("sending"); setInviteError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch("/api/invite", {
        method: "POST", headers,
        body: JSON.stringify({ email: inviteEmail, initial_lesars: invitePoints, tier: inviteTier }),
      });
      const json = await res.json();
      if (!res.ok) { setInviteError(json.error || "Failed"); setInviteStatus("error"); return; }
      setInviteStatus("done");
      setInviteEmail(""); setInvitePoints(100); setInviteTier("passport");
      loadMembers();
      setTimeout(() => { setInviteOpen(false); setInviteStatus("idle"); }, 2500);
    } catch (_) { setInviteError("Network error"); setInviteStatus("error"); }
  }

  if (loading) return <div className="mc-center"><div className="mc-spinner" /></div>;

  if (!hasAccess) {
    return (
      <>
        <style>{MC_CSS}</style>
        <div className="mc-gate">
          <div className="mc-gate-card">
            <div className="mc-gate-lock">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>Superadmin Only</h2>
            <p>Members is restricted to the GeekFon Society admin account.</p>
            <a href="/dashboard" className="mc-gate-btn">Back to Dashboard</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{MC_CSS}</style>

      <div className="mc-header">
        <div>
          <div className="mc-eyebrow">Admin Tool</div>
          <h1 className="mc-title">Members</h1>
        </div>
        <button className="mc-invite-trigger" onClick={() => { setInviteOpen(v => !v); setInviteStatus("idle"); }}>
          {inviteOpen ? "Cancel" : "+ Invite Member"}
        </button>
      </div>

      {inviteOpen && (
        <form className="mc-invite-form" onSubmit={sendInvite}>
          <div className="mc-invite-row">
            <div className="mc-invite-field">
              <label className="mc-invite-label">Email address</label>
              <input className="mc-invite-input" type="email" required placeholder="member@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="mc-invite-field">
              <label className="mc-invite-label">Tier</label>
              <select className="mc-invite-select" value={inviteTier} onChange={e => handleTierChange(e.target.value)}>
                {TIER_OPTIONS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="mc-invite-field">
              <label className="mc-invite-label">Seed Points</label>
              <input className="mc-invite-input" type="number" min={0} step={100} value={invitePoints} onChange={e => setInvitePoints(Number(e.target.value))} />
            </div>
          </div>
          <div className="mc-invite-actions">
            <button type="submit" className="mc-invite-submit" disabled={inviteStatus === "sending"}>
              {inviteStatus === "sending" ? "Sending..." : inviteStatus === "done" ? "Sent!" : "Send Magic Link"}
            </button>
            {inviteError && <span className="mc-invite-error">{inviteError}</span>}
            {inviteStatus === "done" && <span className="mc-invite-success">Invite sent to {inviteEmail}</span>}
          </div>
        </form>
      )}

      {dataLoading ? (
        <div className="mc-center" style={{ padding: "60px 0" }}><div className="mc-spinner" /></div>
      ) : members.length === 0 ? (
        <div className="mc-empty">No members yet.</div>
      ) : (
        <div className="mc-members-wrap">
          <table className="mc-members-table">
            <thead><tr><th>Name</th><th>Email</th><th>Tier</th><th>Points</th><th>Joined</th><th>Last login</th></tr></thead>
            <tbody>
              {members.map(m => (
                // 2026-07-26 per Sean: clicking into a member should open their
                // profile (purchase history, like history, general info) - same
                // destination the new Rankings "who's liking what" avatars link to.
                <tr key={m.id} className="mc-m-row" onClick={() => { window.location.href = `/dashboard/members/${m.user_id}`; }}>
                  <td className="mc-m-name">{m.name || "-"}</td>
                  <td className="mc-m-email">{m.email || "-"}</td>
                  <td>
                    <span className={"mc-m-tier t-" + (m.tier || "passport")}>{TIER_LABEL[m.tier || "passport"] || m.tier}</span>
                    {m.is_pro && <span className="mc-m-pro">PRO</span>}
                  </td>
                  <td className="mc-m-points">{(m.available_points || 0).toLocaleString()}</td>
                  <td className="mc-m-date">{m.created_at ? new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "-"}</td>
                  <td className="mc-m-date">{m.last_sign_in ? new Date(m.last_sign_in).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const MC_CSS = `
.mc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.mc-eyebrow { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .18em; color: rgba(255,255,255,.4); }
.mc-title { font-size: clamp(22px, 4vw, 32px); font-weight: 900; text-transform: uppercase; letter-spacing: -.02em; color: #fff; margin: 4px 0 0; }
.mc-invite-trigger{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#000;background:#F69820;border:none;cursor:pointer;font-family:inherit;padding:9px 18px;border-radius:100px;transition:background .15s;}
.mc-invite-trigger:hover{background:#ffaf30;}
.mc-invite-form{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px;margin-bottom:20px;}
.mc-invite-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:12px;}
@media(max-width:700px){.mc-invite-row{grid-template-columns:1fr;}}
.mc-invite-label{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin-bottom:6px;}
.mc-invite-input,.mc-invite-select{width:100%;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;background:rgba(255,255,255,.06);color:#fff;box-sizing:border-box;}
.mc-invite-input:focus,.mc-invite-select:focus{outline:none;border-color:#F69820;}
.mc-invite-select option{background:#1a1a1a;color:#fff;}
.mc-invite-actions{display:flex;align-items:center;gap:14px;}
.mc-invite-submit{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#000;background:#F69820;border:none;cursor:pointer;font-family:inherit;padding:10px 22px;border-radius:100px;transition:background .15s;}
.mc-invite-submit:hover:not(:disabled){background:#ffaf30;}
.mc-invite-submit:disabled{opacity:.5;cursor:default;}
.mc-invite-error{font-size:12px;font-weight:700;color:rgba(255,100,100,.9);}
.mc-invite-success{font-size:12px;font-weight:700;color:rgba(0,215,95,.9);}
.mc-members-wrap{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:12px;}
.mc-members-table{width:100%;border-collapse:collapse;font-size:12px;}
.mc-members-table th{text-align:left;padding:10px 14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.3);border-bottom:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);}
.mc-members-table td{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle;}
.mc-members-table tr:last-child td{border-bottom:none;}
.mc-members-table tr:hover td{background:rgba(255,255,255,.02);}
.mc-m-row{cursor:pointer;}
.mc-m-name{font-weight:700;color:#fff;}
.mc-m-email{color:rgba(255,255,255,.5);font-size:11px;}
.mc-m-tier{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:20px;background:rgba(246,152,32,.1);color:#F69820;}
.mc-m-pro{margin-left:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:20px;background:rgba(233,30,140,.14);color:#E91E8C;}
.mc-m-points{font-weight:800;color:rgba(0,215,95,.8);}
.mc-m-date{font-size:10px;color:rgba(255,255,255,.3);white-space:nowrap;}
.mc-empty{padding:60px 0;text-align:center;color:rgba(255,255,255,.35);font-size:13px;}
.mc-center { display: flex; align-items: center; justify-content: center; }
.mc-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(255,255,255,.1); border-top-color: #F69820; border-radius: 50%; animation: mcSpin .8s linear infinite; }
@keyframes mcSpin { to { transform: rotate(360deg); } }
.mc-gate { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
.mc-gate-card { max-width: 360px; width: 100%; text-align: center; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 40px 32px; }
.mc-gate-lock { color: rgba(255,255,255,.25); margin-bottom: 16px; }
.mc-gate-lock svg { width: 44px; height: 44px; }
.mc-gate-card h2 { font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 10px; }
.mc-gate-card p { font-size: 13px; color: rgba(255,255,255,.45); line-height: 1.6; margin: 0 0 20px; }
.mc-gate-btn { display: inline-block; background: #E91E8C; color: #fff; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 12px 24px; border-radius: 100px; text-decoration: none; }
.mc-gate-btn:hover { background: #c41874; }
`;

