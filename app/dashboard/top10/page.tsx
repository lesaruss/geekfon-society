"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/artists";

type Artist = {
  slug: string;
  name: string;
  genre: string | null;
};

// Seed scores - will be replaced by real data when artist_plays table exists
const SEED_SCORES: Record<string, { plays: number; views: number; votes: number; trend: "up" | "down" | "same"; trendVal: string }> = {
  "roxanne":          { plays: 12480, views: 8310,  votes: 4200, trend: "up",   trendVal: "+2" },
  "lord-zorlot":      { plays: 10990, views: 7640,  votes: 3870, trend: "up",   trendVal: "NEW" },
  "shamanic-resin":   { plays: 9210,  views: 6880,  votes: 3440, trend: "same", trendVal: "--" },
  "riku-hayasaka":    { plays: 8760,  views: 5920,  votes: 2990, trend: "down", trendVal: "-1" },
  "lex-from-brixton": { plays: 7340,  views: 5100,  votes: 2610, trend: "up",   trendVal: "+1" },
  "nilo-wave":        { plays: 6820,  views: 4730,  votes: 2280, trend: "up",   trendVal: "+2" },
  "rustblood-prophets":{ plays: 5950, views: 4110,  votes: 1940, trend: "down", trendVal: "-2" },
  "straight-and-narrow":{ plays: 4870, views: 3560, votes: 1620, trend: "same", trendVal: "--" },
  "lickle-sis":       { plays: 4120,  views: 2890,  votes: 1370, trend: "up",   trendVal: "+1" },
  "lickle-bro":       { plays: 3760,  views: 2440,  votes: 1190, trend: "down", trendVal: "-1" },
  "mr-russell":       { plays: 3200,  views: 2100,  votes: 980,  trend: "same", trendVal: "--" },
};

function score(slug: string) {
  const s = SEED_SCORES[slug];
  if (!s) return 0;
  return Math.round(s.plays * 0.4 + s.views * 0.3 + s.votes * 0.3);
}

export default function Top10Page() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("gfs_artists")
        .select("slug, name, profile")
        .order("created_at", { ascending: true });

      if (data) {
        const mapped: Artist[] = data.map(a => ({
          slug: a.slug,
          name: a.name,
          genre: (a.profile as { genre?: string } | null)?.genre ?? null,
        }));
        // Sort by seed score descending
        mapped.sort((a, b) => score(b.slug) - score(a.slug));
        setArtists(mapped.slice(0, 10));
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="t10-head">
        <div className="t10-eyebrow">Artist Rankings</div>
        <h1 className="t10-title">Artist Top 10</h1>
        <p className="t10-sub">Rankings reset every Monday. Score = plays (40%) + page views (30%) + votes (30%).</p>
      </div>

      <div className="t10-season-bar">
        <span className="t10-season-label">Updated Weekly</span>
        <span className="t10-vote-note">Voting open to all Passport members</span>
      </div>

      {loading ? (
        <div className="dp-spinner" style={{display:"block",margin:"60px auto"}} />
      ) : (
        <div className="t10-card">
          <div className="t10-header">
            <div className="t10-col t10-col-rank"></div>
            <div className="t10-col">Artist</div>
            <div className="t10-col t10-col-right t10-col-plays">Plays</div>
            <div className="t10-col t10-col-right t10-col-views">Views</div>
            <div className="t10-col t10-col-right">Votes</div>
            <div className="t10-col t10-col-right">Score</div>
          </div>

          {artists.map((artist, i) => {
            const s = SEED_SCORES[artist.slug];
            const sc = score(artist.slug);
            const rankClass = i === 0 ? " rank-1" : i === 1 ? " rank-2" : i === 2 ? " rank-3" : "";
            const rankColor = i === 0 ? " gold" : i === 1 ? " silver" : i === 2 ? " bronze" : "";
            const imgSrc = `${STORAGE_BASE}/${artist.slug}/profile.jpg`;
            return (
              <a key={artist.slug} href={`/${artist.slug}`} className={"t10-row" + rankClass}>
                <div className={"t10-rank" + rankColor}>{i + 1}</div>
                <div className="t10-identity">
                  <img
                    className="t10-avatar"
                    src={imgSrc}
                    alt={artist.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const sib = e.currentTarget.nextSibling as HTMLElement;
                      if (sib) sib.style.display = "flex";
                    }}
                  />
                  <div className="t10-avatar-init" style={{display:"none"}}>{artist.name.charAt(0)}</div>
                  <div className="t10-info">
                    <div className="t10-name">{artist.name}</div>
                    {artist.genre && <div className="t10-genre">{artist.genre}</div>}
                  </div>
                </div>
                <div className="t10-stat t10-plays">{s ? s.plays.toLocaleString() : "-"}</div>
                <div className="t10-stat t10-views">{s ? s.views.toLocaleString() : "-"}</div>
                <div className="t10-stat">{s ? s.votes.toLocaleString() : "-"}</div>
                <div className="t10-score-cell">
                  <div className={"t10-score" + rankColor}>{sc > 0 ? sc.toLocaleString() : "-"}</div>
                  {s && (
                    <div className={"t10-trend t10-trend-" + s.trend}>
                      {s.trend === "up" && (
                        <svg viewBox="0 0 10 10" fill="currentColor" width="10" height="10"><path d="M5 2L9 7H1L5 2Z"/></svg>
                      )}
                      {s.trend === "down" && (
                        <svg viewBox="0 0 10 10" fill="currentColor" width="10" height="10"><path d="M5 8L9 3H1L5 8Z"/></svg>
                      )}
                      {s.trend === "same" && (
                        <svg viewBox="0 0 10 10" fill="currentColor" width="10" height="10"><rect x="1" y="4" width="8" height="2"/></svg>
                      )}
                      {s.trendVal}
                    </div>
                  )}
                </div>
              </a>
            );
          })}

          <div className="t10-footnote">
            Score = weighted total of plays (40%), page views (30%), and votes (30%). Rankings reset every Monday at midnight.
          </div>
        </div>
      )}

      <div className="t10-vote-strip">
        <div className="t10-vote-inner">
          <div className="t10-vote-copy">
            <div className="t10-vote-title">Cast your vote</div>
            <p className="t10-vote-sub">Passport members can vote once per week. Your vote counts toward the weekly score.</p>
          </div>
          <a href="/roster" className="t10-vote-cta">Browse All Artists</a>
        </div>
      </div>
    </>
  );
}

const CSS = `
.t10-head{padding:28px 0 24px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:24px;}
.t10-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.t10-title{font-size:clamp(22px,3.5vw,34px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 8px;}
.t10-sub{font-size:13px;color:rgba(255,255,255,.4);margin:0;line-height:1.6;}
.t10-season-bar{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 18px;margin-bottom:18px;}
.t10-season-label{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#F69820;}
.t10-vote-note{font-size:10px;font-weight:700;color:rgba(255,255,255,.3);}
/* Table */
.t10-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;overflow:hidden;margin-bottom:24px;}
.t10-header{display:grid;grid-template-columns:40px 1fr 80px 80px 80px 70px;padding:10px 20px;border-bottom:1px solid rgba(255,255,255,.05);}
.t10-col{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.2);}
.t10-col-right{text-align:right;}
.t10-col-rank{width:40px;}
.t10-row{display:grid;grid-template-columns:40px 1fr 80px 80px 80px 70px;align-items:center;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.04);text-decoration:none;color:inherit;transition:background .15s;cursor:pointer;}
.t10-row:last-of-type{border-bottom:none;}
.t10-row:hover{background:rgba(255,255,255,.03);}
.t10-row.rank-1{background:rgba(246,152,32,.04);}
.t10-row.rank-2{background:rgba(255,255,255,.025);}
.t10-row.rank-3{background:rgba(255,255,255,.015);}
.t10-rank{font-size:14px;font-weight:900;color:rgba(255,255,255,.2);text-align:center;}
.t10-rank.gold{color:#F69820;}
.t10-rank.silver{color:rgba(255,255,255,.55);}
.t10-rank.bronze{color:rgba(205,127,50,.7);}
.t10-identity{display:flex;align-items:center;gap:12px;}
.t10-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:top;background:rgba(255,255,255,.07);flex-shrink:0;}
.t10-avatar-init{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:rgba(255,255,255,.3);flex-shrink:0;}
.t10-info{display:flex;flex-direction:column;gap:3px;}
.t10-name{font-size:12px;font-weight:800;color:#fff;}
.t10-genre{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3);}
.t10-stat{font-size:11px;font-weight:700;color:rgba(255,255,255,.45);text-align:right;}
.t10-plays,.t10-views{}
.t10-score-cell{display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.t10-score{font-size:13px;font-weight:900;color:rgba(255,255,255,.8);}
.t10-score.gold{color:#F69820;}
.t10-trend{display:flex;align-items:center;gap:3px;font-size:9px;font-weight:800;}
.t10-trend-up{color:rgba(0,215,95,.8);}
.t10-trend-down{color:rgba(255,100,100,.7);}
.t10-trend-same{color:rgba(255,255,255,.2);}
.t10-footnote{padding:12px 20px;font-size:9px;font-weight:600;color:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.05);line-height:1.7;}
/* Responsive: hide plays/views on small screens */
@media(max-width:700px){
  .t10-header{grid-template-columns:32px 1fr 0 0 70px 60px;}
  .t10-row{grid-template-columns:32px 1fr 0 0 70px 60px;}
  .t10-col-plays,.t10-col-views,.t10-plays,.t10-views{display:none;}
}
/* Vote strip */
.t10-vote-strip{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:22px 24px;}
.t10-vote-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;}
@media(max-width:600px){.t10-vote-inner{flex-direction:column;align-items:flex-start;}}
.t10-vote-title{font-size:15px;font-weight:900;color:#fff;margin-bottom:4px;}
.t10-vote-sub{font-size:12px;font-weight:500;color:rgba(255,255,255,.4);line-height:1.5;margin:0;}
.t10-vote-cta{display:inline-block;flex-shrink:0;padding:11px 24px;border-radius:100px;background:#F69820;color:#000;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;text-decoration:none;transition:background .15s;}
.t10-vote-cta:hover{background:#ffaf30;}
`;
