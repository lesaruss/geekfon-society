"use client";
import { useState, useEffect } from "react";
import { useDashboard } from "../context";
import { supabase } from "@/lib/supabase";

type RankRow = {
  rank: number;
  total_score: number;
  member_id: string;
  display_name: string | null;
};

export default function LeaderboardPage() {
  const { userId, member } = useDashboard();
  const [rankings, setRankings] = useState<RankRow[]>([]);
  const [myRank,   setMyRank]   = useState<RankRow | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const { data: rankData } = await supabase
        .from("member_rankings")
        .select("rank, total_score, member_id")
        .order("total_score", { ascending: false })
        .limit(10);

      if (!rankData || rankData.length === 0) { setLoading(false); return; }

      // Get member names
      const memberIds = rankData.map(r => r.member_id);
      const { data: members } = await supabase
        .from("gfs_members")
        .select("id, name, user_id")
        .in("id", memberIds);

      const nameMap: Record<string, { name: string | null; user_id: string }> = {};
      (members || []).forEach(m => { nameMap[m.id] = { name: m.name, user_id: m.user_id }; });

      const rows: RankRow[] = rankData.map((r, i) => ({
        rank: r.rank ?? i + 1,
        total_score: r.total_score ?? 0,
        member_id: r.member_id,
        display_name: nameMap[r.member_id]?.name ?? null,
      }));

      setRankings(rows);

      // Find current user's rank
      if (userId) {
        // Check if user is in top 10
        const myRow = rows.find(r => nameMap[r.member_id]?.user_id === userId);
        if (myRow) { setMyRank(myRow); } else {
          // Query their actual rank
          const { data: myMemberData } = await supabase
            .from("gfs_members").select("id").eq("user_id", userId).maybeSingle();
          if (myMemberData) {
            const { data: myRankData } = await supabase
              .from("member_rankings")
              .select("rank, total_score, member_id")
              .eq("member_id", myMemberData.id)
              .maybeSingle();
            if (myRankData) {
              setMyRank({
                rank: myRankData.rank ?? 999,
                total_score: myRankData.total_score ?? 0,
                member_id: myMemberData.id,
                display_name: member?.name ?? null,
              });
            }
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  const displayName = member?.name || "You";
  const myInitial = displayName.charAt(0).toUpperCase();
  const inTopTen = rankings.some(r => r.member_id === myRank?.member_id);

  return (
    <>
      <style>{CSS}</style>
      <div className="lb-head">
        <div className="lb-eyebrow">Points Leaderboard</div>
        <h1 className="lb-title">Season 1 Rankings</h1>
        <p className="lb-sub">Top 10 members earn bonus Points at the end of each 111-day season.</p>
      </div>

      <div className="lb-season-bar">
        <div className="lb-season-info">
          <span className="lb-season-label">Season 1</span>
          <span className="lb-season-dates">July 13 - November 1, 2026</span>
        </div>
        <div className="lb-season-prize">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M10 2l2.5 5.5L18 8.5l-4 4 1 5.5L10 15l-5 3 1-5.5-4-4 5.5-1L10 2z" fill="#F69820"/></svg>
          Bonus Points for top 10
        </div>
      </div>

      {loading ? (
        <div className="dp-spinner" style={{display:"block",margin:"60px auto"}} />
      ) : rankings.length === 0 ? (
        <div className="dp-empty">
          <p>No rankings yet. Be the first on the board.</p>
          <a href="/roster" className="dp-btn-outline">Explore Artists</a>
        </div>
      ) : (
        <div className="lb-card">
          <div className="lb-list">
            {rankings.map((row, i) => {
              const isMe = row.member_id === myRank?.member_id;
              const initial = (row.display_name || "M").charAt(0).toUpperCase();
              return (
                <div key={row.member_id} className={"lb-row" + (isMe ? " lb-you" : "")}>
                  <div className={"lb-rank" + (i < 3 ? " lb-rank-top" : "")}>{row.rank}</div>
                  <div className={"lb-avatar" + (isMe ? " lb-av-you" : "")}>{initial}</div>
                  <div className="lb-name">{isMe ? displayName : (row.display_name || "Member")}</div>
                  <div className={"lb-score" + (i < 3 ? " lb-score-top" : "")}>{row.total_score.toLocaleString()}</div>
                </div>
              );
            })}

            {/* Gap + user's position if not in top 10 */}
            {myRank && !inTopTen && (
              <>
                <div className="lb-gap">
                  <span className="lb-gap-text">{myRank.rank - 10} members above you</span>
                </div>
                <div className="lb-row lb-you">
                  <div className="lb-rank">{myRank.rank}</div>
                  <div className="lb-avatar lb-av-you">{myInitial}</div>
                  <div className="lb-name">{displayName}</div>
                  <div className="lb-score">{myRank.total_score.toLocaleString()}</div>
                </div>
              </>
            )}

            {/* No rank yet */}
            {userId && !myRank && !inTopTen && (
              <div className="lb-no-rank">
                You are not yet ranked. Earn Points to enter the leaderboard.
              </div>
            )}
          </div>

          <div className="lb-footnote">
            Score is calculated from engagement, points, referrals, and activity. Rankings update daily. Season resets November 1, 2026.
          </div>
        </div>
      )}

      <div className="lb-earn-strip">
        <div className="lb-earn-title">Earn more Points</div>
        <div className="lb-earn-actions">
          <a href="/roster" className="lb-earn-card">
            <div className="lb-earn-card-label">Discover Artists</div>
            <div className="lb-earn-card-sub">Visit and follow artist pages</div>
          </a>
          <a href="/radio" className="lb-earn-card">
            <div className="lb-earn-card-label">GeekFon Radio</div>
            <div className="lb-earn-card-sub">Stream and earn listen points</div>
          </a>
          <a href="/passport" className="lb-earn-card">
            <div className="lb-earn-card-label">Upgrade Passport</div>
            <div className="lb-earn-card-sub">Higher tiers earn more per month</div>
          </a>
        </div>
      </div>
    </>
  );
}

const CSS = `
.lb-head{padding:28px 0 24px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:24px;}
.lb-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.lb-title{font-size:clamp(22px,3.5vw,34px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 8px;}
.lb-sub{font-size:13px;color:rgba(255,255,255,.4);margin:0;line-height:1.6;}
.lb-season-bar{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 18px;margin-bottom:20px;}
.lb-season-info{display:flex;align-items:center;gap:14px;}
.lb-season-label{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#F69820;}
.lb-season-dates{font-size:11px;font-weight:600;color:rgba(255,255,255,.4);}
.lb-season-prize{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(246,152,32,.7);}
/* Leaderboard card */
.lb-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;overflow:hidden;margin-bottom:24px;}
.lb-list{display:flex;flex-direction:column;gap:2px;padding:10px;}
.lb-row{display:flex;align-items:center;gap:14px;padding:10px 12px;border-radius:10px;transition:background .15s;}
.lb-row:hover{background:rgba(255,255,255,.04);}
.lb-you{background:rgba(246,152,32,.06);border:1px solid rgba(246,152,32,.14);}
.lb-you:hover{background:rgba(246,152,32,.09);}
.lb-rank{font-size:13px;font-weight:900;color:rgba(255,255,255,.25);width:22px;text-align:center;flex-shrink:0;}
.lb-rank-top{color:#F69820;}
.lb-avatar{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;background:rgba(255,255,255,.07);color:rgba(255,255,255,.4);}
.lb-av-you{background:rgba(246,152,32,.15);color:#F69820;}
.lb-name{font-size:13px;font-weight:700;color:rgba(255,255,255,.7);flex:1;}
.lb-score{font-size:13px;font-weight:900;color:rgba(255,255,255,.55);}
.lb-score-top{color:rgba(0,215,95,.85);}
.lb-gap{padding:6px 12px;}
.lb-gap-text{font-size:10px;font-weight:700;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:.1em;}
.lb-no-rank{padding:16px 12px;font-size:12px;font-weight:600;color:rgba(255,255,255,.25);text-align:center;}
.lb-footnote{padding:12px 20px;font-size:9px;font-weight:600;color:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.05);line-height:1.7;}
/* Earn strip */
.lb-earn-strip{margin-top:24px;}
.lb-earn-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.4);margin-bottom:14px;}
.lb-earn-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
@media(max-width:700px){.lb-earn-actions{grid-template-columns:1fr;}}
.lb-earn-card{display:block;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px 18px;text-decoration:none;transition:border-color .15s;}
.lb-earn-card:hover{border-color:rgba(246,152,32,.3);}
.lb-earn-card-label{font-size:13px;font-weight:800;color:#fff;margin-bottom:4px;}
.lb-earn-card-sub{font-size:11px;font-weight:500;color:rgba(255,255,255,.35);}
`;
