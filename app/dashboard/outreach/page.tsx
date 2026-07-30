"use client";
import { useState, useEffect, useMemo } from "react";
import { useDashboard, TIER_LABEL, ADMIN_EMAIL } from "../context";
import { supabase } from "@/lib/supabase";

// Same roster this dashboard already ranks on (app/dashboard/top10/page.tsx) -
// duplicated here rather than shared since neither page currently imports a
// common constants file. Keep in sync if the roster changes.
const FEATURED_SLUGS = [
  "roxanne", "lex-from-brixton", "shamanic-resin", "riku",
  "straight-and-narrow", "nilo-wave", "rustblood-prophets", "mad-tings",
  "vuka", "likkle-bro", "likkle-sis", "mr-russell",
];

type OutreachMember = {
  user_id: string; name: string | null; email: string | null; tier: string | null;
  created_at: string; last_sign_in: string | null;
  artists_liked: string[]; artists_unlocked: string[]; total_likes: number;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}
function toCsv(rows: OutreachMember[]): string {
  const header = ["Name", "Email", "Tier", "Artists Liked", "Artists Unlocked", "Total Likes", "Joined"];
  const lines = rows.map(r => [
    csvEscape(r.name || ""),
    csvEscape(r.email || ""),
    csvEscape(r.tier || ""),
    csvEscape(r.artists_liked.join("; ")),
    csvEscape(r.artists_unlocked.join("; ")),
    String(r.total_likes),
    r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
  ].join(","));
  return [header.join(","), ...lines].join("\n");
}
function downloadCsv(rows: OutreachMember[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `geekfon-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OutreachPage() {
  const { userEmail, loading } = useDashboard();

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

  const [rows, setRows] = useState<OutreachMember[]>([]);
  const [excludedMinors, setExcludedMinors] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState<"any" | "liked" | "unlocked">("any");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    if (loading || !hasAccess) { setDataLoading(false); return; }
    (async () => {
      setDataLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const res = await fetch("/api/admin/outreach-list", { headers });
        const json = await res.json();
        setRows(json.rows || []);
        setExcludedMinors(json.excludedMinors || 0);
      } catch (_) {}
      setDataLoading(false);
    })();
  }, [loading, hasAccess]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (tierFilter !== "all" && (r.tier || "passport") !== tierFilter) return false;
      if (artistFilter !== "all") {
        const engaged =
          (engagementFilter !== "unlocked" && r.artists_liked.includes(artistFilter)) ||
          (engagementFilter !== "liked" && r.artists_unlocked.includes(artistFilter));
        if (!engaged) return false;
      } else if (engagementFilter === "liked" && r.artists_liked.length === 0) {
        return false;
      } else if (engagementFilter === "unlocked" && r.artists_unlocked.length === 0) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${r.name || ""} ${r.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, artistFilter, engagementFilter, tierFilter]);

  async function copyEmails() {
    const emails = filtered.map(r => r.email).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (_) {}
  }

  if (loading) return <div className="ol-center"><div className="ol-spinner" /></div>;

  if (!hasAccess) {
    return (
      <>
        <style>{OL_CSS}</style>
        <div className="ol-gate">
          <div className="ol-gate-card">
            <div className="ol-gate-lock">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>Superadmin Only</h2>
            <p>The outreach list is restricted to the GeekFon Society admin account.</p>
            <a href="/dashboard" className="ol-gate-btn">Back to Dashboard</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{OL_CSS}</style>
      <div className="ol-header">
        <div>
          <div className="ol-eyebrow">Admin Tool</div>
          <h1 className="ol-title">Outreach List</h1>
          <p className="ol-sub">Segment members by engagement, export or copy for use in Resend / Beehiiv.</p>
        </div>
        <div className="ol-actions">
          <button className="ol-btn ol-btn-copy" onClick={copyEmails} disabled={filtered.length === 0}>
            {copyStatus === "copied" ? "Copied!" : "Copy Emails"}
          </button>
          <button className="ol-btn ol-btn-export" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {excludedMinors > 0 && (
        <div className="ol-notice">
          {excludedMinors} minor account{excludedMinors === 1 ? "" : "s"} automatically excluded from this list.
          Marketing outreach to minors needs its own consent handling - don&apos;t add them back in manually without checking with Sean first.
        </div>
      )}

      <div className="ol-filters">
        <input
          className="ol-input"
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="ol-select" value={artistFilter} onChange={e => setArtistFilter(e.target.value)}>
          <option value="all">All Artists</option>
          {FEATURED_SLUGS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="ol-select" value={engagementFilter} onChange={e => setEngagementFilter(e.target.value as "any" | "liked" | "unlocked")}>
          <option value="any">Liked or Unlocked</option>
          <option value="liked">Liked only</option>
          <option value="unlocked">Unlocked only</option>
        </select>
        <select className="ol-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="all">All Tiers</option>
          <option value="passport">Passport</option>
          <option value="promoter">Plus</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {dataLoading ? (
        <div className="ol-center" style={{ padding: "60px 0" }}><div className="ol-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="ol-empty">No members match these filters.</div>
      ) : (
        <div className="ol-wrap">
          <table className="ol-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Tier</th><th>Liked</th><th>Unlocked</th><th>Total Likes</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.user_id} className="ol-row" onClick={() => { window.location.href = `/dashboard/members/${r.user_id}`; }}>
                  <td className="ol-name">{r.name || "-"}</td>
                  <td className="ol-email">{r.email || "-"}</td>
                  <td><span className={"ol-tier t-" + (r.tier || "passport")}>{TIER_LABEL[r.tier || "passport"] || r.tier}</span></td>
                  <td className="ol-chips">
                    {r.artists_liked.length === 0 ? <span className="ol-none">-</span> : r.artists_liked.map(a => <span key={a} className="ol-chip">{a}</span>)}
                  </td>
                  <td className="ol-chips">
                    {r.artists_unlocked.length === 0 ? <span className="ol-none">-</span> : r.artists_unlocked.map(a => <span key={a} className="ol-chip ol-chip-gold">{a}</span>)}
                  </td>
                  <td className="ol-count">{r.total_likes}</td>
                  <td className="ol-date">{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const OL_CSS = `
.ol-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:16px;flex-wrap:wrap;}
.ol-eyebrow{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.4);}
.ol-title{font-size:clamp(22px,4vw,32px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:4px 0 6px;}
.ol-sub{font-size:13px;color:rgba(255,255,255,.4);margin:0;max-width:480px;line-height:1.5;}
.ol-actions{display:flex;gap:10px;flex-shrink:0;}
.ol-btn{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;border:none;cursor:pointer;font-family:inherit;padding:9px 18px;border-radius:100px;transition:background .15s;}
.ol-btn:disabled{opacity:.4;cursor:default;}
.ol-btn-copy{color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);}
.ol-btn-copy:hover:not(:disabled){background:rgba(255,255,255,.14);}
.ol-btn-export{color:#000;background:#F69820;}
.ol-btn-export:hover:not(:disabled){background:#ffaf30;}
.ol-notice{background:rgba(246,152,32,.08);border:1px solid rgba(246,152,32,.25);color:#F69820;font-size:12px;font-weight:600;line-height:1.6;padding:12px 16px;border-radius:10px;margin-bottom:16px;}
.ol-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ol-input{flex:1 1 220px;padding:10px 14px;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;background:rgba(255,255,255,.06);color:#fff;box-sizing:border-box;}
.ol-select{padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;font-family:inherit;font-size:12px;font-weight:700;background:rgba(255,255,255,.06);color:#fff;}
.ol-select option{background:#1a1a1a;color:#fff;}
.ol-input:focus,.ol-select:focus{outline:none;border-color:#F69820;}
.ol-wrap{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:12px;}
.ol-table{width:100%;border-collapse:collapse;font-size:12px;}
.ol-table th{text-align:left;padding:10px 14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.3);border-bottom:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);white-space:nowrap;}
.ol-table td{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle;}
.ol-table tr:last-child td{border-bottom:none;}
.ol-row{cursor:pointer;}
.ol-row:hover td{background:rgba(255,255,255,.02);}
.ol-name{font-weight:700;color:#fff;white-space:nowrap;}
.ol-email{color:rgba(255,255,255,.5);font-size:11px;white-space:nowrap;}
.ol-tier{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:20px;background:rgba(246,152,32,.1);color:#F69820;white-space:nowrap;}
.ol-chips{display:flex;flex-wrap:wrap;gap:4px;max-width:220px;}
.ol-chip{font-size:9px;font-weight:700;color:rgba(255,255,255,.55);background:rgba(255,255,255,.06);padding:2px 7px;border-radius:20px;white-space:nowrap;}
.ol-chip-gold{color:#F69820;background:rgba(246,152,32,.1);}
.ol-none{color:rgba(255,255,255,.2);font-size:11px;}
.ol-count{font-weight:800;color:rgba(0,215,95,.8);text-align:center;}
.ol-date{font-size:10px;color:rgba(255,255,255,.3);white-space:nowrap;}
.ol-empty{padding:60px 0;text-align:center;color:rgba(255,255,255,.35);font-size:13px;}
.ol-center{display:flex;align-items:center;justify-content:center;}
.ol-spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,.1);border-top-color:#F69820;border-radius:50%;animation:olSpin .8s linear infinite;}
@keyframes olSpin{to{transform:rotate(360deg);}}
.ol-gate{display:flex;align-items:center;justify-content:center;min-height:50vh;}
.ol-gate-card{max-width:360px;width:100%;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 32px;}
.ol-gate-lock{color:rgba(255,255,255,.25);margin-bottom:16px;}
.ol-gate-lock svg{width:44px;height:44px;}
.ol-gate-card h2{font-size:20px;font-weight:900;color:#fff;margin:0 0 10px;}
.ol-gate-card p{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6;margin:0 0 20px;}
.ol-gate-btn{display:inline-block;background:#E91E8C;color:#fff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:12px 24px;border-radius:100px;text-decoration:none;}
.ol-gate-btn:hover{background:#c41874;}
@media(max-width:700px){.ol-filters{flex-direction:column;}.ol-input,.ol-select{width:100%;}}
`;
