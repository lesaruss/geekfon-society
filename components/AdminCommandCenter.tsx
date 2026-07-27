"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Analytics = {
  memberCount: number;
  unlockRevenueCents: number;
  unlockCount: number;
  playCount: number;
  plays7d: number;
  likeCount: number;
  likes7d: number;
};
type HealthRow = {
  id: string;
  audited_at: string;
  functional: boolean | null;
  visual: boolean | null;
  performance: boolean | null;
  accessibility: boolean | null;
  standards: boolean | null;
  ada_score: number | null;
  ada_violations_critical: number | null;
  ada_violations_serious: number | null;
  performance_pct: number | null;
  accessibility_pct: number | null;
  summary: string;
};
type ArtistBrief = { artist_slug: string; title: string; status: string; updated_at: string };
type NowPlaying = { type: string; path: string; title: string; artist: string; offsetSeconds: number; durationSeconds: number } | null;
type MemberRow = { user_id: string; name: string | null; tier: string | null; created_at: string; email?: string | null };
type RankedArtist = { slug: string; name: string; plays: number; votes: number; score: number };

const ADMIN_EMAIL = "contact@lesaruss.com";

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminCommandCenter({ displayName }: { displayName: string }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [briefs, setBriefs] = useState<ArtistBrief[]>([]);
  const [songManager, setSongManager] = useState<{ artistCount: number; trackCount: number } | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null);
  const [radioListeners, setRadioListeners] = useState<number>(0);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [topArtists, setTopArtists] = useState<RankedArtist[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};

        const [ccRes, membersRes, rankingsRes] = await Promise.all([
          fetch("/api/admin/command-center", { headers }),
          fetch("/api/admin/members", { headers }),
          supabase.from("gfs_artist_rankings").select("slug, name, plays, votes, score").order("score", { ascending: false }).limit(5),
        ]);

        if (ccRes.ok) {
          const json = await ccRes.json();
          setAnalytics(json.analytics);
          setHealth(json.healthReport || []);
          setBriefs(json.artistBriefs || []);
          setSongManager(json.songManager);
          setNowPlaying(json.nowPlaying);
          setRadioListeners(json.radioListeners ?? 0);
        }
        if (membersRes.ok) {
          const json = await membersRes.json();
          setMembers((json.members || []).slice(0, 5));
        }
        if (rankingsRes.data) setTopArtists(rankingsRes.data as RankedArtist[]);
      } catch (_) {
        // widgets below each render their own empty state - a failed fetch here
        // just means those show "no data yet" instead of throwing.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latestHealth = health[0];
  const draftBriefCount = briefs.filter(b => b.status === "draft").length;

  return (
    <>
      <style>{CSS}</style>

      <div className="cc-welcome">
        <div className="cc-eyebrow">Command Center</div>
        <h1 className="cc-name">Welcome back, {displayName}</h1>
        <div className="cc-badge"><span className="cc-badge-dot" />Super Admin</div>
      </div>

      {/* Analytics snapshot strip */}
      <div className="cc-stats-row">
        <div className="cc-stat-card">
          <div className="cc-stat-label">Members</div>
          <div className="cc-stat-val">{loading ? "…" : analytics?.memberCount ?? 0}</div>
          <div className="cc-stat-sub">of 1,000,000 goal</div>
        </div>
        <div className="cc-stat-card">
          <div className="cc-stat-label">Unlock Revenue</div>
          <div className="cc-stat-val">{loading ? "…" : fmtMoney(analytics?.unlockRevenueCents ?? 0)}</div>
          <div className="cc-stat-sub">{analytics?.unlockCount ?? 0} unlocks</div>
        </div>
        <div className="cc-stat-card">
          <div className="cc-stat-label">Total Plays</div>
          <div className="cc-stat-val">{loading ? "…" : analytics?.playCount ?? 0}</div>
          <div className="cc-stat-sub">+{analytics?.plays7d ?? 0} last 7d</div>
        </div>
        <div className="cc-stat-card">
          <div className="cc-stat-label">Total Likes</div>
          <div className="cc-stat-val">{loading ? "…" : analytics?.likeCount ?? 0}</div>
          <div className="cc-stat-sub">+{analytics?.likes7d ?? 0} last 7d</div>
        </div>
      </div>

      <div className="cc-grid">
        {/* Health Report */}
        <div className="cc-widget">
          <div className="cc-widget-head">
            <h3 className="cc-widget-title">Health Report</h3>
            <a href="/dashboard/reports" className="cc-widget-link">Full reports &rarr;</a>
          </div>
          {loading ? (
            <div className="cc-empty">Loading…</div>
          ) : !latestHealth ? (
            <div className="cc-empty">No audits run yet.</div>
          ) : latestHealth.performance_pct == null && latestHealth.ada_score == null && latestHealth.functional === false ? (
            <div className="cc-health-fail">
              <div className="cc-health-fail-title">Last automated audit failed to complete</div>
              <div className="cc-health-fail-sub">{latestHealth.summary}</div>
              <div className="cc-health-fail-date">{timeAgo(latestHealth.audited_at)}</div>
            </div>
          ) : (
            <>
              <div className="cc-health-scores">
                <div className="cc-health-score">
                  <div className="cc-health-score-num">{latestHealth.performance_pct ?? "—"}</div>
                  <div className="cc-health-score-label">Lighthouse</div>
                </div>
                <div className="cc-health-score">
                  <div className="cc-health-score-num">{latestHealth.ada_score ?? "—"}</div>
                  <div className="cc-health-score-label">ADA Score</div>
                </div>
              </div>
              <div className="cc-health-chips">
                {(["functional", "visual", "performance", "accessibility", "standards"] as const).map(k => (
                  <span key={k} className={"cc-chip " + (latestHealth[k] === false ? "cc-chip-fail" : latestHealth[k] === true ? "cc-chip-pass" : "cc-chip-pending")}>
                    {k}
                  </span>
                ))}
              </div>
              <div className="cc-health-fail-date">{timeAgo(latestHealth.audited_at)}</div>
            </>
          )}
        </div>

        {/* Artist Briefs (A&R status) */}
        <div className="cc-widget">
          <div className="cc-widget-head">
            <h3 className="cc-widget-title">Artist Briefs</h3>
            <span className="cc-widget-sub">{draftBriefCount > 0 ? `${draftBriefCount} need attention` : "all current"}</span>
          </div>
          {loading ? (
            <div className="cc-empty">Loading…</div>
          ) : briefs.length === 0 ? (
            <div className="cc-empty">No artist briefs found.</div>
          ) : (
            <div className="cc-list">
              {briefs.slice(0, 6).map(b => (
                <a key={b.artist_slug} href={`/${b.artist_slug}`} className="cc-row">
                  <span className="cc-row-title">{b.artist_slug.replace(/-/g, " ")}</span>
                  <span className={"cc-chip " + (b.status === "draft" ? "cc-chip-fail" : b.status === "canon" ? "cc-chip-pass" : "cc-chip-pending")}>{b.status}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Radio Now Playing */}
        <div className="cc-widget">
          <div className="cc-widget-head">
            <h3 className="cc-widget-title">GeekFon Radio</h3>
            <a href="/dashboard/radio-schedule" className="cc-widget-link">Manage rotation &rarr;</a>
          </div>
          {loading ? (
            <div className="cc-empty">Loading…</div>
          ) : !nowPlaying ? (
            <div className="cc-empty">Nothing in rotation yet.</div>
          ) : (
            <>
              <div className="cc-radio-live"><span className="cc-radio-dot" />Live now</div>
              <div className="cc-radio-title">{nowPlaying.title}</div>
              <div className="cc-radio-artist">{nowPlaying.artist}</div>
              <div className="cc-radio-listeners">{radioListeners} {radioListeners === 1 ? "person" : "people"} listening now</div>
              <a href="/radio" className="cc-widget-link" style={{ marginTop: 10, display: "inline-block" }}>Open Radio &rarr;</a>
            </>
          )}
        </div>

        {/* Members quick view */}
        <div className="cc-widget">
          <div className="cc-widget-head">
            <h3 className="cc-widget-title">Members</h3>
            <a href="/dashboard/members" className="cc-widget-link">View all &rarr;</a>
          </div>
          {loading ? (
            <div className="cc-empty">Loading…</div>
          ) : members.length === 0 ? (
            <div className="cc-empty">No members yet.</div>
          ) : (
            <div className="cc-list">
              {members.map(m => (
                <a key={m.user_id} href={`/dashboard/members/${m.user_id}`} className="cc-row">
                  <span className="cc-row-avatar">{initials(m.name)}</span>
                  <span className="cc-row-title">{m.name || m.email || "Member"}</span>
                  <span className="cc-row-sub">{m.tier || "passport"}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Artist leaderboard quick view */}
        <div className="cc-widget">
          <div className="cc-widget-head">
            <h3 className="cc-widget-title">Artist Rankings</h3>
            <a href="/dashboard/top10" className="cc-widget-link">Full rankings &rarr;</a>
          </div>
          {loading ? (
            <div className="cc-empty">Loading…</div>
          ) : topArtists.length === 0 ? (
            <div className="cc-empty">No ranking data yet.</div>
          ) : (
            <div className="cc-list">
              {topArtists.map((a, i) => (
                <div key={a.slug} className="cc-row">
                  <span className="cc-row-rank">{i + 1}</span>
                  <span className="cc-row-title">{a.name}</span>
                  <span className="cc-row-sub">{a.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Song Manager quick view */}
        <div className="cc-widget">
          <div className="cc-widget-head">
            <h3 className="cc-widget-title">Song Manager</h3>
            <a href="/dashboard/release-schedule" className="cc-widget-link">Open &rarr;</a>
          </div>
          {loading ? (
            <div className="cc-empty">Loading…</div>
          ) : (
            <div className="cc-stats-mini">
              <div className="cc-stat-mini">
                <div className="cc-stat-mini-num">{songManager?.artistCount ?? 0}</div>
                <div className="cc-stat-mini-label">Artists</div>
              </div>
              <div className="cc-stat-mini">
                <div className="cc-stat-mini-num">{songManager?.trackCount ?? 0}</div>
                <div className="cc-stat-mini-label">Tracks</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const CSS = `
.cc-welcome{padding:32px 0 24px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:24px;}
.cc-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.cc-name{font-size:clamp(22px,4vw,36px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 10px;}
.cc-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:100px;padding:5px 13px;width:fit-content;}
.cc-badge-dot{width:6px;height:6px;border-radius:50%;background:#fff;}
.cc-badge{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:#fff;}

.cc-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
@media(max-width:900px){.cc-stats-row{grid-template-columns:1fr 1fr;}}
.cc-stat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;}
.cc-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.35);margin-bottom:8px;}
.cc-stat-val{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;line-height:1;}
.cc-stat-sub{font-size:10px;font-weight:500;color:rgba(255,255,255,.3);margin-top:4px;}

.cc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
@media(max-width:900px){.cc-grid{grid-template-columns:1fr;}}
.cc-widget{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px;display:flex;flex-direction:column;min-height:180px;}
.cc-widget-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
.cc-widget-title{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.7);margin:0;}
.cc-widget-link{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(0,215,95,.75);text-decoration:none;}
.cc-widget-link:hover{color:rgba(0,215,95,1);}
.cc-widget-sub{font-size:10px;font-weight:700;color:rgba(246,152,32,.8);}
.cc-empty{font-size:12px;color:rgba(255,255,255,.3);font-weight:500;margin:auto 0;}

.cc-list{display:flex;flex-direction:column;gap:2px;}
.cc-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);text-decoration:none;color:inherit;}
.cc-row:last-child{border-bottom:none;}
a.cc-row:hover{background:rgba(255,255,255,.03);}
.cc-row-title{font-size:12px;font-weight:700;color:#fff;text-transform:capitalize;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cc-row-sub{font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:capitalize;flex-shrink:0;}
.cc-row-rank{font-size:11px;font-weight:900;color:#F69820;width:16px;flex-shrink:0;}
.cc-row-avatar{width:22px;height:22px;border-radius:50%;background:rgba(246,152,32,.15);border:1px solid rgba(246,152,32,.3);color:#F69820;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

.cc-chip{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:3px 9px;border-radius:100px;flex-shrink:0;}
.cc-chip-pass{background:rgba(0,215,95,.12);color:rgba(0,215,95,.9);}
.cc-chip-fail{background:rgba(239,68,68,.12);color:rgba(255,120,120,.9);}
.cc-chip-pending{background:rgba(255,255,255,.08);color:rgba(255,255,255,.4);}

.cc-health-scores{display:flex;gap:20px;margin-bottom:12px;}
.cc-health-score-num{font-size:26px;font-weight:900;color:#fff;line-height:1;}
.cc-health-score-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-top:4px;}
.cc-health-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.cc-health-fail-title{font-size:12px;font-weight:800;color:rgba(255,120,120,.9);margin-bottom:6px;}
.cc-health-fail-sub{font-size:11px;color:rgba(255,255,255,.45);line-height:1.5;margin-bottom:8px;}
.cc-health-fail-date{font-size:10px;color:rgba(255,255,255,.3);font-weight:600;}

.cc-radio-live{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(0,215,95,.85);margin-bottom:10px;}
.cc-radio-dot{width:6px;height:6px;border-radius:50%;background:rgba(0,215,95,.9);animation:ccPulse 1.6s ease-in-out infinite;}
@keyframes ccPulse{0%,100%{opacity:1;}50%{opacity:.3;}}
.cc-radio-title{font-size:16px;font-weight:900;color:#fff;letter-spacing:-.01em;}
.cc-radio-artist{font-size:12px;font-weight:600;color:rgba(255,255,255,.5);margin-top:2px;}
.cc-radio-listeners{font-size:11px;font-weight:700;color:rgba(0,215,95,.75);margin-top:10px;}

.cc-stats-mini{display:flex;gap:24px;margin:auto 0;}
.cc-stat-mini-num{font-size:28px;font-weight:900;color:#fff;line-height:1;}
.cc-stat-mini-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.35);margin-top:4px;}
`;
