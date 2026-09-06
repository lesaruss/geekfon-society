"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useDashboard, ADMIN_EMAIL } from "../context";

// Tracks every live roster artist (matches app/roster/page.tsx ARTIST_ORDER). Lord
// Zorlot stays out - no songs yet, nothing to rank on. V stays out - administrative,
// not a performer. Sean, 2026-07-13.
const FEATURED_SLUGS = [
  "roxanne", "lex-from-brixton", "shamanic-resin", "riku",
  "straight-and-narrow", "nilo-wave", "rustblood-prophets", "mad-tings",
  "vuka", "likkle-bro", "likkle-sis", "mr-russell",
];

type RankedArtist = {
  slug: string;
  name: string;
  genre: string | null;
  plays: number;
  votes: number;
  score: number;
  imgUrl: string | null;
};

type Liker = { user_id: string; name: string | null };

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ArtistRankingsPage() {
  const { userEmail } = useDashboard();
  const router = useRouter();
  const [artists, setArtists] = useState<RankedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  // 2026-07-26 per Sean: "as an admin, I would like to see who's liking what."
  // Real per-member vote data (gfs_artist_votes.user_id) - RLS already limits
  // every other viewer to their own rows, so this is admin-only, same
  // View-As-aware gate as Members/Release Schedule/Radio Schedule. The public
  // rankings themselves (score/plays/votes totals) are unaffected either way -
  // only the "who" layer is admin-only.
  const [viewAs, setViewAs] = useState<string | null>(null);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gfs-view-as") : null;
    if (saved) setViewAs(saved);
    const onViewAs = (e: Event) => setViewAs((e as CustomEvent).detail ?? null);
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);
  const isAdmin = userEmail === ADMIN_EMAIL;
  const canSeeLikers = isAdmin && viewAs === null;

  const [likersMap, setLikersMap] = useState<Record<string, Liker[]>>({});
  useEffect(() => {
    if (!canSeeLikers) { setLikersMap({}); return; }
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const res = await fetch("/api/admin/artist-likers", { headers });
        if (res.ok) {
          const json = await res.json();
          setLikersMap(json.likers || {});
        }
      } catch (_) {}
    })();
  }, [canSeeLikers]);

  useEffect(() => {
    async function load() {
      // Real profile images live on gfs_artists.profile (jsonb) - the rankings view
      // doesn't carry image fields, and filenames/extensions vary per artist (some
      // are .png, some have no profileUrl at all and only a heroUrl), so fetch the
      // real per-artist image instead of guessing a path. Sean, 2026-07-26.
      const imgQuery = supabase
        .from("gfs_artists")
        .select("slug, profile")
        .in("slug", FEATURED_SLUGS);

      // Fetch live rankings from the view (plays + votes = real data)
      const [{ data: rankings }, { data: profiles }] = await Promise.all([
        supabase
          .from("gfs_artist_rankings")
          .select("slug, name, plays, votes, score")
          .in("slug", FEATURED_SLUGS)
          .order("score", { ascending: false }),
        imgQuery,
      ]);

      const imgMap: Record<string, string | null> = {};
      (profiles || []).forEach((p: { slug: string; profile: { profileUrl?: string; heroUrl?: string } | null }) => {
        imgMap[p.slug] = p.profile?.profileUrl || p.profile?.heroUrl || null;
      });

      if (rankings && rankings.length > 0) {
        const mapped: RankedArtist[] = rankings.map((r: { slug: string; name: string; plays: number; votes: number; score: number }) => ({
          slug: r.slug,
          name: r.name,
          genre: null,
          plays: r.plays,
          votes: r.votes,
          score: r.score,
          imgUrl: imgMap[r.slug] ?? null,
        }));
        setArtists(mapped);
      } else {
        // Fallback: fetch artists, show all zeros
        const { data } = await supabase
          .from("gfs_artists")
          .select("slug, name")
          .in("slug", FEATURED_SLUGS);
        if (data) {
          setArtists(data.map(a => ({ slug: a.slug, name: a.name, genre: null, plays: 0, votes: 0, score: 0, imgUrl: imgMap[a.slug] ?? null })));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="t10-head">
        <div className="t10-eyebrow">Season 1</div>
        <h1 className="t10-title">Artist Rankings</h1>
        <p className="t10-sub">Score = plays + votes + points spent, weighted. Cumulative all-time, never resets.</p>
      </div>

      <div className="t10-season-bar">
        <span className="t10-season-label">Updated Daily</span>
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
            const rankClass = i === 0 ? " rank-1" : i === 1 ? " rank-2" : i === 2 ? " rank-3" : "";
            const rankColor = i === 0 ? " gold" : i === 1 ? " silver" : i === 2 ? " bronze" : "";
            const artSlug = artist.slug === "riku" ? "riku" : artist.slug;
            const artistLikers = likersMap[artist.slug] || [];
            return (
              <a key={artist.slug} href={`/${artSlug}`} className={"t10-row" + rankClass}>
                <div className={"t10-rank" + rankColor}>{i + 1}</div>
                <div className="t10-identity">
                  {artist.imgUrl ? (
                    <img
                      className="t10-avatar"
                      src={artist.imgUrl}
                      alt={artist.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        const sib = e.currentTarget.nextSibling as HTMLElement;
                        if (sib) sib.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div className="t10-avatar-init" style={{display: artist.imgUrl ? "none" : "flex"}}>{artist.name.charAt(0)}</div>
                  <div className="t10-info">
                    <div className="t10-name">{artist.name}</div>
                    {artist.genre && <div className="t10-genre">{artist.genre}</div>}
                  </div>
                </div>
                <div className="t10-stat t10-plays">{artist.plays > 0 ? artist.plays.toLocaleString() : "0"}</div>
                <div className="t10-stat t10-views">-</div>
                <div className="t10-stat">{artist.votes > 0 ? artist.votes.toLocaleString() : "0"}</div>
                <div className="t10-score-cell">
                  <div className={"t10-score" + rankColor}>{artist.score > 0 ? artist.score.toLocaleString() : "0"}</div>
                </div>
                {/* 2026-07-26 per Sean: admin-only "who's liking what" strip -
                    not nested inside an <a> for public/passport viewers since
                    it only ever renders when canSeeLikers (admin, not
                    simulating). Buttons here stop propagation + preventDefault
                    so clicking an avatar opens that member's profile instead
                    of navigating to the artist page underneath. */}
                {canSeeLikers && artistLikers.length > 0 && (
                  <div className="t10-likers" style={{ gridColumn: "1 / -1" }}>
                    <span className="t10-likers-label">Recent likes</span>
                    <div className="t10-liker-stack">
                      {artistLikers.slice(0, 6).map(l => (
                        <button
                          key={l.user_id}
                          type="button"
                          className="t10-liker-avatar"
                          title={l.name || "Member"}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/members/${l.user_id}`); }}
                        >
                          {initials(l.name)}
                        </button>
                      ))}
                    </div>
                    {artistLikers.length > 6 && <span className="t10-liker-more">+{artistLikers.length - 6}</span>}
                  </div>
                )}
              </a>
            );
          })}

          <div className="t10-footnote">
            Score = plays + votes + points spent (each spend counts extra). Cumulative all-time - this never resets.
          </div>
        </div>
      )}

      <div className="t10-vote-strip">
        <div className="t10-vote-inner">
          <div className="t10-vote-copy">
            <div className="t10-vote-title">Cast your vote</div>
            <p className="t10-vote-sub">Passport members can vote once per day, per artist. Your vote adds to their all-time score.</p>
          </div>
          <a href="/roster" className="t10-vote-cta">Browse All Artists</a>
        </div>
      </div>
    </>
  );
}

const CSS = `
.t10-head{padding:16px 0 14px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:16px;}
.t10-eyebrow{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.t10-title{font-size:clamp(28px,4vw,42px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0 0 10px;}
.t10-sub{font-size:15px;color:rgba(255,255,255,.4);margin:0;line-height:1.6;}
.t10-season-bar{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 18px;margin-bottom:14px;}
.t10-season-label{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#F69820;}
.t10-vote-note{font-size:11px;font-weight:700;color:rgba(255,255,255,.3);}
/* Table */
.t10-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;overflow:hidden;margin-bottom:24px;}
.t10-header{display:grid;grid-template-columns:56px 1fr 96px 96px 96px 82px;padding:12px 24px;border-bottom:1px solid rgba(255,255,255,.05);}
.t10-col{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.2);}
.t10-col-right{text-align:right;}
.t10-col-rank{width:56px;}
.t10-row{display:grid;grid-template-columns:56px 1fr 96px 96px 96px 82px;align-items:center;padding:18px 24px;border-bottom:1px solid rgba(255,255,255,.04);text-decoration:none;color:inherit;transition:background .15s;cursor:pointer;}
.t10-row:last-of-type{border-bottom:none;}
.t10-row:hover{background:rgba(255,255,255,.03);}
.t10-row.rank-1{background:rgba(246,152,32,.04);}
.t10-row.rank-2{background:rgba(255,255,255,.025);}
.t10-row.rank-3{background:rgba(255,255,255,.015);}
.t10-rank{font-size:18px;font-weight:900;color:rgba(255,255,255,.2);text-align:center;}
.t10-rank.gold{color:#F69820;}
.t10-rank.silver{color:rgba(255,255,255,.55);}
.t10-rank.bronze{color:rgba(205,127,50,.7);}
.t10-identity{display:flex;align-items:center;gap:14px;}
.t10-avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top;background:rgba(255,255,255,.07);flex-shrink:0;}
.t10-avatar-init{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:rgba(255,255,255,.3);flex-shrink:0;}
.t10-info{display:flex;flex-direction:column;gap:4px;}
.t10-name{font-size:15px;font-weight:800;color:#fff;}
.t10-genre{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3);}
.t10-stat{font-size:14px;font-weight:700;color:rgba(255,255,255,.45);text-align:right;}
.t10-score-cell{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}
.t10-score{font-size:16px;font-weight:900;color:rgba(255,255,255,.8);}
.t10-score.gold{color:#F69820;}
.t10-likers{display:flex;align-items:center;gap:10px;padding-top:12px;margin-top:6px;border-top:1px dashed rgba(255,255,255,.06);}
.t10-likers-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.25);flex-shrink:0;}
.t10-liker-stack{display:flex;align-items:center;}
.t10-liker-avatar{width:26px;height:26px;border-radius:50%;background:#F69820;color:#000;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #171717;margin-left:-8px;cursor:pointer;font-family:inherit;padding:0;transition:transform .12s;}
.t10-liker-avatar:first-child{margin-left:0;}
.t10-liker-avatar:hover{transform:translateY(-3px);z-index:2;position:relative;}
.t10-liker-more{font-size:10px;font-weight:800;color:rgba(255,255,255,.4);}
.t10-trend{display:flex;align-items:center;gap:3px;font-size:11px;font-weight:800;}
.t10-trend-up{color:rgba(0,215,95,.8);}
.t10-trend-down{color:rgba(255,100,100,.7);}
.t10-trend-same{color:rgba(255,255,255,.2);}
.t10-footnote{padding:14px 24px;font-size:10px;font-weight:600;color:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.05);line-height:1.7;}
/* Responsive: hide plays/views on small screens */
@media(max-width:700px){
  /* Plays/Views cells are removed from flow via display:none below, so the grid
     template must only define tracks for what's actually left (rank, artist,
     votes, score) - the old 6-column template with two 0px placeholder tracks
     caused the 4 remaining cells to be auto-placed into the first 4 tracks
     (40px 1fr 0 0), squeezing Votes and Score into 0-width columns and making
     their numbers render stacked on top of each other. */
  .t10-header{grid-template-columns:40px 1fr 80px 70px;}
  .t10-row{grid-template-columns:40px 1fr 80px 70px;}
  .t10-col-plays,.t10-col-views,.t10-plays,.t10-views{display:none;}
  /* Same absolute head/season-bar padding read as much heavier headroom on a
     narrow screen than on desktop - tighten further here. Sean, 2026-07-26. */
  .t10-head{padding:10px 0 10px;margin-bottom:12px;}
  .t10-sub{font-size:13px;}
  .t10-season-bar{padding:10px 14px;margin-bottom:12px;}
  .t10-row{padding:14px 16px;}
}
/* Vote strip */
.t10-vote-strip{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px 26px;}
.t10-vote-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;}
@media(max-width:600px){.t10-vote-inner{flex-direction:column;align-items:flex-start;}}
.t10-vote-title{font-size:16px;font-weight:900;color:#fff;margin-bottom:5px;}
.t10-vote-sub{font-size:13px;font-weight:500;color:rgba(255,255,255,.4);line-height:1.5;margin:0;}
.t10-vote-cta{display:inline-block;flex-shrink:0;padding:12px 26px;border-radius:100px;background:#F69820;color:#000;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;text-decoration:none;transition:background .15s;}
.t10-vote-cta:hover{background:#ffaf30;}
`;
