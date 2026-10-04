"use client";
// Changes panel on the Admin Command Center (2026-10-04, Sean).
//
// One place to see what is happening on GeekFon without anything being
// committed behind his back:
//   - Waiting on you: previews of visible changes (open the link, then
//     Approve or Hold) and decisions with the default Logan will take.
//   - Your answers: what he approved or held, until Logan acts on it.
//   - Shipped: what is live on geekfon.ai, newest first.
// The buttons only record his answer (app/api/admin/changes/[id]); nothing
// deploys or migrates from here.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Change = {
  id: string;
  created_at: string;
  kind: "change" | "decision";
  title: string;
  summary: string | null;
  status: "awaiting_review" | "approved" | "held" | "live" | "rolled_back";
  preview_url: string | null;
  live_url: string | null;
  commit_sha: string | null;
  default_action: string | null;
  decided_at: string | null;
  decision_note: string | null;
};

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChangesPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<Change[]>([]);
  const [decided, setDecided] = useState<Change[]>([]);
  const [shipped, setShipped] = useState<Change[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/changes", { headers: await authHeaders(), cache: "no-store" });
      if (!res.ok) { setError("Couldn't load changes."); return; }
      const body = await res.json();
      setWaiting(body.waiting || []);
      setDecided(body.decided || []);
      setShipped(body.shipped || []);
      setError(null);
    } catch {
      setError("Couldn't load changes.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function decide(c: Change, decision: "approve" | "hold") {
    setBusy(c.id);
    try {
      const res = await fetch(`/api/admin/changes/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ decision, note: notes[c.id] || "" }),
      });
      if (!res.ok && res.status !== 409) setError("That didn't save. Try again.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="chg">
      <div className="chg-head">
        <h3 className="cc-widget-title">Changes</h3>
        <span className="cc-widget-sub">
          {loading ? "" : waiting.length ? `${waiting.length} waiting on you` : "nothing waiting on you"}
        </span>
      </div>
      <p className="chg-rule">Visible changes go to a preview first. Nothing reaches geekfon.ai until you approve it here.</p>

      {loading ? (
        <div className="cc-empty">Loading…</div>
      ) : error ? (
        <div className="cc-empty">{error}</div>
      ) : (
        <div className="chg-cols">
          <section>
            <div className="chg-sub">Waiting on you</div>
            {waiting.length === 0 && <div className="chg-none">All clear.</div>}
            {waiting.map(c => (
              <div key={c.id} className="chg-card">
                <div className="chg-card-top">
                  <span className={"cc-chip " + (c.kind === "decision" ? "chg-chip-decision" : "chg-chip-preview")}>
                    {c.kind === "decision" ? "Decision" : "Preview"}
                  </span>
                  <span className="chg-date">{when(c.created_at)}</span>
                </div>
                <div className="chg-title">{c.title}</div>
                {c.summary && <p className="chg-text">{c.summary}</p>}
                {c.default_action && <p className="chg-default"><strong>If you don&apos;t answer:</strong> {c.default_action}</p>}
                {c.preview_url && (
                  <a className="chg-link" href={c.preview_url} target="_blank" rel="noreferrer">Open preview &rarr;</a>
                )}
                <textarea
                  className="chg-note"
                  placeholder="Optional note for Logan"
                  value={notes[c.id] || ""}
                  onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))}
                  rows={2}
                />
                <div className="chg-actions">
                  <button className="chg-btn chg-btn-go" disabled={busy === c.id} onClick={() => decide(c, "approve")}>
                    {c.kind === "decision" ? "Go with this" : "Approve for geekfon.ai"}
                  </button>
                  <button className="chg-btn" disabled={busy === c.id} onClick={() => decide(c, "hold")}>Hold</button>
                </div>
              </div>
            ))}
          </section>

          <section>
            <div className="chg-sub">Your answers</div>
            {decided.length === 0 && <div className="chg-none">None pending action.</div>}
            {decided.map(c => (
              <div key={c.id} className="chg-row">
                <span className={"cc-chip " + (c.status === "approved" ? "cc-chip-pass" : "cc-chip-pending")}>
                  {c.status === "approved" ? "Approved" : "Held"}
                </span>
                <div className="chg-row-main">
                  <div className="chg-row-title">{c.title}</div>
                  <div className="chg-row-sub">
                    {c.status === "approved" ? "Logan ships this next" : "On hold until you say otherwise"}
                    {c.decision_note ? ` · “${c.decision_note}”` : ""}
                  </div>
                </div>
                <span className="chg-date">{when(c.decided_at)}</span>
              </div>
            ))}

            <div className="chg-sub" style={{ marginTop: 18 }}>Shipped</div>
            {shipped.length === 0 && <div className="chg-none">Nothing shipped yet.</div>}
            {shipped.map(c => (
              <div key={c.id} className="chg-row">
                <span className={"cc-chip " + (c.status === "live" ? "cc-chip-pass" : "cc-chip-fail")}>
                  {c.status === "live" ? "Live" : "Rolled back"}
                </span>
                <div className="chg-row-main">
                  <div className="chg-row-title">
                    {c.live_url ? <a href={c.live_url} target="_blank" rel="noreferrer">{c.title}</a> : c.title}
                  </div>
                  {c.summary && <div className="chg-row-sub">{c.summary}</div>}
                </div>
                <span className="chg-date">{when(c.created_at)}</span>
              </div>
            ))}
          </section>
        </div>
      )}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.chg{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px;margin-bottom:16px;}
.chg-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px;}
.chg-rule{font-size:12px;color:rgba(255,255,255,.45);margin:0 0 16px;}
.chg-cols{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;}
@media(max-width:900px){.chg-cols{grid-template-columns:1fr;}}
.chg-sub{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.35);margin-bottom:10px;}
.chg-none{font-size:12px;color:rgba(255,255,255,.3);padding:6px 0;}
.chg-card{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;margin-bottom:10px;background:rgba(255,255,255,.02);}
.chg-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.chg-chip-preview{background:rgba(246,152,32,.14);color:#F69820;}
.chg-chip-decision{background:rgba(120,160,255,.14);color:rgba(160,190,255,.95);}
.chg-date{font-size:10px;color:rgba(255,255,255,.35);white-space:nowrap;}
.chg-title{font-size:14px;font-weight:800;color:#fff;margin-bottom:6px;}
.chg-text{font-size:12px;line-height:1.55;color:rgba(255,255,255,.7);margin:0 0 8px;}
.chg-default{font-size:12px;line-height:1.5;color:rgba(255,255,255,.6);margin:0 0 8px;}
.chg-default strong{color:rgba(255,255,255,.85);}
.chg-link{display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(0,215,95,.85);text-decoration:none;margin-bottom:10px;}
.chg-note{width:100%;box-sizing:border-box;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font:inherit;font-size:12px;padding:8px;resize:vertical;margin-bottom:8px;}
.chg-actions{display:flex;gap:8px;flex-wrap:wrap;}
.chg-btn{appearance:none;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:800;cursor:pointer;}
.chg-btn-go{background:#00D75F;border-color:#00D75F;color:#04140a;}
.chg-btn:disabled{opacity:.5;cursor:default;}
.chg-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.chg-row-main{flex:1;min-width:0;}
.chg-row-title{font-size:12px;font-weight:700;color:#fff;}
.chg-row-title a{color:#fff;text-decoration:underline;text-decoration-color:rgba(255,255,255,.3);}
.chg-row-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px;line-height:1.45;}
`;
