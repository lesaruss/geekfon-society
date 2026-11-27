"use client";
// The admin home (Sean, 2026-11-27: "the dashboard is unusable for me right
// now"). Rebuilt in the November 2026 look inside AdminShell. Only true numbers:
//   - "Unlock Revenue" is gone (the unlock model was retired 2026-09-06; money
//     lives in HQ > Revenue, one click away);
//   - "Total Likes" is gone (it was counting votes);
//   - the hand-typed "1,000,000 goal" is gone;
//   - Artist Briefs, Song Manager counts and Artist Rankings moved off the home
//     (each has its own page in the menu).
// What is on it: the radio right now, this week's numbers, quick actions, the
// listener panel, newest members, what is waiting on Sean, site health.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ChangesPanel from "@/components/ChangesPanel";
import RadioListenersPanel from "@/components/admin/RadioListenersPanel";
import { BRANDDESK_URL, REVENUE_URL } from "@/components/admin/AdminShell";

type Analytics = { memberCount: number; members7d?: number; playCount: number; plays7d: number };
type HealthRow = { id: string; audited_at: string; performance_pct: number | null; ada_score: number | null; summary: string };
type NowPlaying = { type: string; title: string; artist: string; coverUrl?: string | null } | null;
type MemberRow = { user_id: string; name: string | null; email?: string | null; tier: string | null; created_at: string };
type Ga4Snapshot = { sessions: number; users: number; pageviews: number; available: boolean };
type Week = { listeners: number; minutes: number; converted: number; listening_now: number };

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

function greeting(): string {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const Ext = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

export default function AdminCommandCenter({ displayName }: { displayName: string }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [health, setHealth] = useState<HealthRow | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [ga4, setGa4] = useState<Ga4Snapshot | null>(null);
  const [week, setWeek] = useState<Week | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const [cc, mem, wk] = await Promise.all([
          fetch("/api/admin/command-center", { headers }),
          fetch("/api/admin/members", { headers }),
          fetch("/api/admin/radio-listeners?days=7", { headers }),
        ]);
        if (cc.ok) {
          const j = await cc.json();
          setAnalytics(j.analytics);
          setHealth((j.healthReport || [])[0] ?? null);
          setNowPlaying(j.nowPlaying);
          setGa4(j.ga4 ?? null);
        }
        if (mem.ok) setMembers(((await mem.json()).members || []).slice(0, 6));
        if (wk.ok) setWeek(await wk.json());
      } catch {
        /* each card shows its own empty state */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const first = displayName.includes("@") ? "" : displayName.split(/\s+/)[0];
  const today = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });
  const dash = loading ? "…" : "0";

  return (
    <div className="ah">
      <style>{CSS}</style>

      <header className="ah-head">
        <p className="ah-date">{today}</p>
        <h1>{greeting()}{first ? `, ${first}` : ""}</h1>
      </header>

      {/* The radio right now */}
      <section className="ah-onair" aria-label="On air now">
        {nowPlaying?.coverUrl ? <img src={nowPlaying.coverUrl} alt="" className="ah-cover" /> : <div className="ah-cover ah-cover-empty" />}
        <div className="ah-onair-text">
          <p className="ah-live"><span className="ah-dot" />On GeekFon Radio now</p>
          <h2>{loading ? "…" : nowPlaying ? nowPlaying.title : "Nothing in rotation"}</h2>
          <p className="ah-artist">{nowPlaying?.artist ?? ""}</p>
          <p className="ah-listening">{week ? `${week.listening_now} listening right now` : ""}</p>
        </div>
        <div className="ah-onair-actions">
          <a href="/" target="_blank" rel="noreferrer" className="ah-btn ah-btn-primary">Listen <Ext /></a>
          <Link href="/dashboard/radio-schedule" className="ah-btn">Radio Schedule</Link>
        </div>
      </section>

      {/* This week, true numbers only */}
      <section className="ah-stats" aria-label="This week">
        <div className="ah-stat"><b>{analytics?.memberCount ?? dash}</b><span>Members</span><small>{analytics?.members7d != null ? `+${analytics.members7d} this week` : ""}</small></div>
        <div className="ah-stat"><b>{week?.listeners ?? dash}</b><span>Radio listeners</span><small>last 7 days</small></div>
        <div className="ah-stat"><b>{week?.minutes ?? dash}</b><span>Minutes listened</span><small>{week ? `${week.converted} signed up after listening` : ""}</small></div>
        <div className="ah-stat"><b>{analytics?.plays7d ?? dash}</b><span>Song plays</span><small>last 7 days, on demand</small></div>
      </section>

      {/* Quick actions */}
      <section className="ah-actions" aria-label="Quick actions">
        <Link href="/dashboard/release-schedule" className="ah-action"><b>Song Manager</b><span>Add songs, set release dates</span></Link>
        <Link href="/dashboard/radio-schedule" className="ah-action"><b>Radio Schedule</b><span>What plays, and in what order</span></Link>
        <Link href="/dashboard/members" className="ah-action"><b>Members</b><span>Everyone who signed up</span></Link>
        <a href={BRANDDESK_URL} target="_blank" rel="noreferrer" className="ah-action"><b>Brand Desk <Ext /></b><span>GeekFon in HQ</span></a>
        <a href={REVENUE_URL} target="_blank" rel="noreferrer" className="ah-action"><b>Revenue <Ext /></b><span>GeekFon money in HQ</span></a>
        <Link href="/dashboard/outreach" className="ah-action"><b>Outreach List</b><span>Export members for email</span></Link>
      </section>

      <RadioListenersPanel />

      <div className="ah-cols">
        <section className="ah-card" aria-label="Newest members">
          <div className="ah-card-head"><h2>Newest members</h2><Link href="/dashboard/members">All members</Link></div>
          {loading ? <p className="ah-empty">Loading…</p> : members.length === 0 ? <p className="ah-empty">No members yet.</p> : (
            <ul className="ah-list">
              {members.map(m => (
                <li key={m.user_id}>
                  <Link href={`/dashboard/members/${m.user_id}`}>
                    <span className="ah-name">{m.name || m.email || "Member"}</span>
                    <span className="ah-meta">{timeAgo(m.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ah-card" aria-label="Site">
          <div className="ah-card-head"><h2>Site</h2><Link href="/dashboard/reports">Health reports</Link></div>
          {health ? (
            <p className="ah-line">Last check {timeAgo(health.audited_at)}: speed {health.performance_pct ?? "not scored"}, accessibility {health.ada_score ?? "not scored"}.</p>
          ) : <p className="ah-empty">{loading ? "Loading…" : "No health check on file."}</p>}
          {ga4?.available ? (
            <p className="ah-line">Last 30 days: {ga4.users} visitors, {ga4.sessions} visits, {ga4.pageviews} page views.</p>
          ) : null}
        </section>
      </div>

      <ChangesPanel />
    </div>
  );
}

const CSS = `
.ah{display:flex;flex-direction:column;gap:20px;max-width:1180px}
.ah h1,.ah h2,.ah p{margin:0}
.ah-date{font-size:13px;color:var(--muted);font-weight:600}
.ah-head h1{font-family:var(--display);font-weight:800;font-size:clamp(28px,4vw,40px);letter-spacing:-.025em;line-height:1.05;margin-top:4px}
.ah-onair{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:20px;align-items:center;background:var(--surface-2);border-radius:12px;padding:16px}
.ah-cover{width:96px;height:96px;border-radius:8px;object-fit:cover;display:block}
.ah-cover-empty{background:var(--surface-3)}
.ah-live{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.ah-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:ahPulse 1.6s ease-in-out infinite}
@keyframes ahPulse{50%{opacity:.35}}
@media(prefers-reduced-motion:reduce){.ah-dot{animation:none}}
.ah-onair h2{font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:-.015em;margin-top:6px}
.ah-artist{color:var(--muted);font-weight:600}
.ah-listening{font-size:13px;color:var(--faint);margin-top:6px}
.ah-onair-actions{display:flex;flex-direction:column;gap:8px}
.ah-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:999px;font-weight:700;font-size:14px;border:1px solid var(--line);color:var(--text);white-space:nowrap}
.ah-btn:hover{background:var(--surface-3)}
.ah-btn-primary{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.ah-btn-primary:hover{background:var(--accent);filter:brightness(1.08)}
.ah-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.ah-stat{background:var(--surface-2);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:2px}
.ah-stat b{font-family:var(--display);font-weight:800;font-size:32px;letter-spacing:-.02em;line-height:1.05}
.ah-stat span{font-weight:700;font-size:14px}
.ah-stat small{font-size:12.5px;color:var(--muted)}
.ah-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ah-action{display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:12px;border:1px solid var(--line)}
.ah-action:hover{background:var(--surface-2);border-color:var(--surface-3)}
.ah-action b{display:flex;align-items:center;gap:6px;font-size:15px}
.ah-action span{font-size:13px;color:var(--muted)}
.ah-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ah-card{background:var(--surface-2);border-radius:12px;padding:16px 18px}
.ah-card-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px}
.ah-card-head h2{font-family:var(--display);font-weight:800;font-size:18px;letter-spacing:-.01em}
.ah-card-head a{font-size:13px;font-weight:700;color:var(--accent)}
.ah-list{list-style:none;margin:0;padding:0}
.ah-list a{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}
.ah-list li:last-child a{border-bottom:0}
.ah-list a:hover .ah-name{text-decoration:underline}
.ah-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ah-meta{font-size:13px;color:var(--muted);flex:none}
.ah-line{font-size:14px;color:var(--muted);margin-bottom:6px}
.ah-empty{font-size:14px;color:var(--faint)}
@media(max-width:900px){.ah-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.ah-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.ah-cols{grid-template-columns:1fr}}
@media(max-width:560px){.ah-onair{grid-template-columns:64px minmax(0,1fr)}.ah-cover{width:64px;height:64px}.ah-onair-actions{grid-column:1/-1;flex-direction:row}.ah-actions{grid-template-columns:1fr}}
`;
