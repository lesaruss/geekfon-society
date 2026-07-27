"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "contact@lesaruss.com";

type Application = {
  id: string;
  name: string;
  email: string;
  city: string;
  reason: string;
  video_url: string;
  video_type: string;
  status: string;
  created_at: string;
};

// Added 2026-07-27 - the first admin-facing surface for gfs_plus_applications
// (renamed from Plus to Pro alongside app/pro/page.tsx). Before this, applications
// just sat in the table with no way to act on them except directly in Supabase
// Studio, and nothing anywhere connected acceptance to actually granting catalog
// access or creating a referral code - see app/api/admin/pro-applications/[id]/route.ts.
export default function ProApplicationsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadApps() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      setAuthorized(false);
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const res = await fetch("/api/admin/pro-applications", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setApps(json.applications || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadApps(); }, []);

  async function act(id: string, action: "accept" | "reject") {
    setErrorMsg("");
    setBusyId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/admin/pro-applications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Something went wrong.");
        return;
      }
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: action === "accept" ? "accepted" : "rejected" } : a)));
    } finally {
      setBusyId(null);
    }
  }

  const pending = apps.filter((a) => a.status === "pending");
  const decided = apps.filter((a) => a.status !== "pending");

  if (authorized === false) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(255,255,255,.4)" }}>
        Not authorized.
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="pa-eyebrow">Pro Program</div>
      <h1 className="pa-title">Pro Applications</h1>
      <p className="pa-sub">Review applications to GeekFon Pro. Accepting grants full catalog access and creates their affiliate link at the 25% placeholder rate.</p>

      {errorMsg && <div className="pa-error">{errorMsg}</div>}

      {loading ? (
        <div className="pa-empty">Loading...</div>
      ) : pending.length === 0 ? (
        <div className="pa-empty">No pending applications.</div>
      ) : (
        <div className="pa-list">
          {pending.map((a) => (
            <div key={a.id} className="pa-card">
              <div className="pa-card-top">
                <div>
                  <div className="pa-name">{a.name}</div>
                  <div className="pa-meta">{a.email} &middot; {a.city}</div>
                </div>
                <div className="pa-date">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <p className="pa-reason">{a.reason}</p>
              <a
                href={a.video_type === "upload" ? `https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/sign/${a.video_url}` : a.video_url}
                target="_blank"
                rel="noreferrer"
                className="pa-video-link"
              >
                {a.video_type === "upload" ? "View uploaded video" : "View video link"} &rarr;
              </a>
              <div className="pa-actions">
                <button className="pa-btn pa-btn-accept" disabled={busyId === a.id} onClick={() => act(a.id, "accept")}>
                  {busyId === a.id ? "Working..." : "Accept"}
                </button>
                <button className="pa-btn pa-btn-reject" disabled={busyId === a.id} onClick={() => act(a.id, "reject")}>
                  {busyId === a.id ? "Working..." : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <div className="pa-section-title">Decided</div>
          <div className="pa-decided-list">
            {decided.map((a) => (
              <div key={a.id} className="pa-decided-row">
                <span className="pa-decided-name">{a.name}</span>
                <span className="pa-decided-email">{a.email}</span>
                <span className={"pa-status pa-status-" + a.status}>{a.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const CSS = `
.pa-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.pa-title{font-size:clamp(22px,4vw,32px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 10px;}
.pa-sub{font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;margin:0 0 28px;max-width:640px;}
.pa-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:rgba(255,150,150,.95);font-size:13px;font-weight:600;padding:12px 16px;border-radius:10px;margin-bottom:20px;}
.pa-empty{font-size:13px;color:rgba(255,255,255,.3);padding:20px 0;}
.pa-list{display:flex;flex-direction:column;gap:14px;margin-bottom:36px;}
.pa-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px 22px;}
.pa-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}
.pa-name{font-size:15px;font-weight:800;color:#fff;}
.pa-meta{font-size:12px;color:rgba(255,255,255,.4);margin-top:2px;}
.pa-date{font-size:11px;color:rgba(255,255,255,.3);font-weight:600;flex-shrink:0;white-space:nowrap;}
.pa-reason{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6;margin:0 0 12px;}
.pa-video-link{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#F69820;text-decoration:none;}
.pa-video-link:hover{text-decoration:underline;}
.pa-actions{display:flex;gap:10px;margin-top:16px;}
.pa-btn{flex:1;padding:11px;border-radius:10px;font-family:inherit;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;border:none;transition:opacity .15s;}
.pa-btn:disabled{opacity:.5;cursor:not-allowed;}
.pa-btn-accept{background:rgba(0,215,95,.16);color:rgba(0,215,95,.95);border:1px solid rgba(0,215,95,.3);}
.pa-btn-accept:hover:not(:disabled){background:rgba(0,215,95,.24);}
.pa-btn-reject{background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.12);}
.pa-btn-reject:hover:not(:disabled){background:rgba(255,255,255,.09);}
.pa-section-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.35);margin-bottom:12px;}
.pa-decided-list{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;}
.pa-decided-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);}
.pa-decided-row:last-child{border-bottom:none;}
.pa-decided-name{font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}
.pa-decided-email{font-size:11px;color:rgba(255,255,255,.35);flex:1;}
.pa-status{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 9px;border-radius:100px;flex-shrink:0;}
.pa-status-accepted{background:rgba(0,215,95,.12);color:rgba(0,215,95,.9);}
.pa-status-rejected{background:rgba(255,255,255,.06);color:rgba(255,255,255,.35);}
`;
