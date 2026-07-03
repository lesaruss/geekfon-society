"use client";
import { useState, useEffect, useRef, useCallback } from "react";
// roster page - 4-col desktop (8 artists: 4 live + 4 ghost), 2-col mobile

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";

const CITIES = [
  {
    name: "London, UK",
    accent: "#F69820",
    desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png",
    mobile:  CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png",
  },
  {
    name: "Fort Lauderdale, FL",
    accent: "#00BCD4",
    desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png",
    mobile:  CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png",
  },
  {
    name: "Seoul, South Korea",
    accent: "#9C27B0",
    desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png",
    mobile:  CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png",
  },
  {
    name: "Tokyo, Japan",
    accent: "#E91E8C",
    desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png",
    mobile:  CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png",
  },
  {
    name: "Berlin, Germany",
    accent: "#2196F3",
    desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png",
    mobile:  CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png",
  },
  {
    name: "Johannesburg, SA",
    accent: "#F44336",
    desktop: CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png",
    mobile:  CDN + "hf_20260619_064547_2906c350-a205-4c96-9bb1-114dc53fc237.png",
  },
  {
    name: "Orlando, FL",
    accent: "#FF9800",
    desktop: CDN + "hf_20260619_125302_4c4f6747-3bcb-45b2-a743-610912078942.png",
    mobile:  CDN + "hf_20260619_125452_ad933e6f-0b03-43a4-b111-341e76b9efd9.jpeg",
  },
];

const SUPA = "https://fwbhwfxpncrsfhttimna.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

// Live artists
const ARTIST_ORDER = ["roxanne", "lex-from-brixton", "shamanic-resin", "riku"];

// Ghost artists — grayed out, non-clickable, "COMING SOON"
const GHOST_ORDER = ["straight-and-narrow", "nilo-wave", "rustblood-prophets", "mad-tings"];
const GHOST_NAMES: Record<string, string> = {
  "straight-and-narrow": "Straight and Narrow",
  "nilo-wave":           "Nilo Wave",
  "rustblood-prophets":  "Rustblood Prophets",
  "mad-tings":           "Mad Tings",
};

type Artist = {
  slug: string;
  name: string;
  profile: {
    heroUrl?: string;
    initial?: string;
    accent?: string;
    tagline?: string;
  };
};

export default function RosterPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [ghostArtists, setGhostArtists] = useState<Artist[]>([]);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const cityPanelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(
      `${SUPA}/rest/v1/gfs_artists?select=slug,name,profile&slug=in.("roxanne","lex-from-brixton","shamanic-resin","riku")`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    )
      .then((r) => r.json())
      .then((data: Artist[]) => {
        if (!Array.isArray(data)) return;
        const ordered = ARTIST_ORDER.map(s => data.find(a => a.slug === s)).filter(Boolean) as Artist[];
        setArtists(ordered);
      })
      .catch(() => {});
  }, []);

  // Fetch ghost artists from DB (may have hero images already)
  useEffect(() => {
    const slugList = GHOST_ORDER.map(s => `"${s}"`).join(",");
    fetch(
      `${SUPA}/rest/v1/gfs_artists?select=slug,name,profile&slug=in.(${slugList})`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    )
      .then((r) => r.json())
      .then((data: Artist[]) => {
        if (!Array.isArray(data)) {
          // No DB rows yet — build stubs from GHOST_NAMES
          setGhostArtists(GHOST_ORDER.map(s => ({ slug: s, name: GHOST_NAMES[s], profile: {} })));
          return;
        }
        // Merge DB data with name fallback; preserve GHOST_ORDER
        const ordered = GHOST_ORDER.map(s => {
          const found = data.find(a => a.slug === s);
          return found || { slug: s, name: GHOST_NAMES[s], profile: {} };
        });
        setGhostArtists(ordered);
      })
      .catch(() => {
        setGhostArtists(GHOST_ORDER.map(s => ({ slug: s, name: GHOST_NAMES[s], profile: {} })));
      });
  }, []);

  const goTo = useCallback((next: number) => {
    const prev = currentRef.current;
    if (next === prev) return;
    const prevP = cityPanelRefs.current[prev];
    const nextP = cityPanelRefs.current[next];
    if (!prevP || !nextP) return;
    nextP.style.transition = "none";
    nextP.style.transform = "translateX(100%)";
    void nextP.offsetHeight;
    const ease = "cubic-bezier(0.25,0.46,0.45,0.94)";
    nextP.style.transition = `transform 0.95s ${ease}`;
    prevP.style.transition = `transform 0.95s ${ease}`;
    nextP.style.transform = "translateX(0)";
    prevP.style.transform = "translateX(-105%)";
    setTimeout(() => {
      if (prevP) { prevP.style.transition = "none"; prevP.style.transform = "translateX(100%)"; }
    }, 980);
    currentRef.current = next;
    setCurrent(next);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(
      () => goTo((currentRef.current + 1) % CITIES.length),
      5200
    );
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [goTo]);

  useEffect(() => {
    cityPanelRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.transition = "none";
      p.style.transform = i === 0 ? "translateX(0)" : "translateX(100%)";
    });
  }, []);

  const city = CITIES[current];

  function ArtistCard({ a }: { a: Artist }) {
    const accent = a.profile?.accent || "#E91E8C";
    return (
      <a
        href={`/${a.slug}`}
        className="r-card"
        style={{ "--r-accent": accent } as React.CSSProperties}
      >
        <div className="r-card-img">
          {a.profile?.heroUrl ? (
            <img src={a.profile.heroUrl} alt={a.name} />
          ) : (
            <div className="r-card-fallback" style={{ backgroundColor: accent + "33" }}>
              {a.profile?.initial || a.name.charAt(0)}
            </div>
          )}
          <div className="r-card-grad" />
        </div>
        <div className="r-now-live-badge">NOW LIVE</div>
        <div className="r-card-info">
          <span className="r-card-name">{a.name}</span>
          {a.profile?.tagline && (
            <span className="r-card-tag">{a.profile.tagline}</span>
          )}
        </div>
      </a>
    );
  }

  function GhostCard({ a }: { a: Artist }) {
    const accent = a.profile?.accent || "#888";
    return (
      <div className="r-card r-card-ghost" aria-label={`${a.name} — coming soon`}>
        <div className="r-card-img">
          {a.profile?.heroUrl ? (
            <img src={a.profile.heroUrl} alt="" aria-hidden="true" />
          ) : (
            <div className="r-card-fallback" style={{ backgroundColor: accent + "22" }}>
              {a.profile?.initial || a.name.charAt(0)}
            </div>
          )}
          <div className="r-card-grad" />
        </div>
        <div className="r-coming-soon-badge">COMING SOON</div>
        <div className="r-card-info">
          <span className="r-card-name">{a.name}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="r-aurora" aria-hidden="true">
        <div className="r-stars" />
        <div className="ra ra1" /><div className="ra ra2" /><div className="ra ra3" />
        <div className="ra ra4" /><div className="ra ra5" />
        <div className="r-ground" />
      </div>

      <div className="r-city-stage" aria-hidden="true">
        {CITIES.map((c, i) => (
          <div key={c.name} className="r-city-panel" ref={(el) => { cityPanelRefs.current[i] = el; }}>
            <picture>
              <source media="(max-width:768px)" srcSet={c.mobile} />
              <img src={c.desktop} alt="" aria-hidden="true" />
            </picture>
          </div>
        ))}
      </div>

      <div className="r-city-label" aria-live="polite">
        <span className="r-city-dot" style={{ backgroundColor: city.accent }} />
        <span className="r-city-name">{city.name}</span>
      </div>

        <nav className="r-crumb" aria-label="Breadcrumb">
          <a href="/">GeekFon</a>
          <span className="r-crumb-sep">/</span>
          <span className="r-crumb-cur">Roster</span>
        </nav>

        <div className="r-page">
          <div className="r-header">
            <p className="r-eyebrow">
              <span className="r-live-dot" aria-hidden="true" />
              Season 1 - Now Live
            </p>
            <h1 className="r-title">The Roster</h1>
            <p className="r-sub">Check back for new artist announcements</p>
          </div>

          {artists.length === 0 ? (
            <div className="r-loading">
              <div className="r-spinner" />
              <span>Loading artists...</span>
            </div>
          ) : (
            <>
              {/* DESKTOP: 4-col grid — 4 live + 4 ghost */}
              <div className="r-desktop-roster">
                <div className="r-grid">
                  {artists.map(a => <ArtistCard key={a.slug} a={a} />)}
                  {ghostArtists.map(a => <GhostCard key={a.slug} a={a} />)}
                </div>
              </div>

              {/* MOBILE: 2-col grid — all 8 */}
              <div className="r-mobile-roster">
                <div className="r-grid-mobile">
                  {artists.map(a => <ArtistCard key={a.slug} a={a} />)}
                  {ghostArtists.map(a => <GhostCard key={a.slug} a={a} />)}
                </div>
              </div>
            </>
          )}
        </div>
    </>
  );
}

const CSS = `
html, body { background: #020c0a !important; color: #e8e8e8; overflow-x: hidden; }
.gtop { background: rgba(2,12,10,0.85) !important; border-bottom-color: rgba(255,255,255,0.08) !important; backdrop-filter: blur(12px); }
.gham { color: #fff !important; }
.gham:hover { background: rgba(255,255,255,0.08) !important; }
.gfs-geek { color: #fff !important; }
.gcta { background: #F69820 !important; color: #1a1a1a !important; border-radius: 100px; padding: 8px 18px; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.gcrumb a { color: rgba(255,255,255,0.55) !important; }
.gcrumb-cur { color: rgba(255,255,255,0.9) !important; }
.gcrumb-sep { color: rgba(255,255,255,0.3) !important; }
.gbody { background: transparent !important; min-height: 100vh; }

.r-crumb{display:flex;align-items:center;gap:9px;padding:11px 40px;border-bottom:1px solid rgba(255,255,255,.07);font-family:'Montserrat',sans-serif;position:relative;z-index:2}
.r-crumb a{font-size:13px;font-weight:700;color:rgba(255,255,255,.5);text-decoration:none;letter-spacing:.01em}
.r-crumb a:hover{color:rgba(255,255,255,.9)}
.r-crumb-cur{font-size:13px;font-weight:800;color:rgba(255,255,255,.9);letter-spacing:.01em}
.r-crumb-sep{color:rgba(255,255,255,.22);font-size:13px;font-weight:400}
@media(max-width:600px){.r-crumb{padding:10px 16px}}

.r-aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.r-stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 9% 6%,rgba(255,255,255,.55) 0%,transparent 100%),radial-gradient(1px 1px at 24% 12%,rgba(255,255,255,.35) 0%,transparent 100%),radial-gradient(1px 1px at 44% 4%,rgba(255,255,255,.48) 0%,transparent 100%),radial-gradient(1px 1px at 60% 10%,rgba(255,255,255,.30) 0%,transparent 100%),radial-gradient(1px 1px at 76% 7%,rgba(255,255,255,.52) 0%,transparent 100%),radial-gradient(1px 1px at 90% 3%,rgba(255,255,255,.42) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 18% 4%,rgba(255,255,255,.65) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 66% 2%,rgba(255,255,255,.55) 0%,transparent 100%)}
.ra{position:absolute;border-radius:50%;filter:blur(90px)}
.ra1{width:85vw;height:48vh;top:-20vh;left:4vw;background:radial-gradient(ellipse at center,rgba(0,215,95,.24) 0%,transparent 70%);animation:rd1 18s ease-in-out infinite alternate}
.ra2{width:62vw;height:40vh;top:-14vh;right:-6vw;background:radial-gradient(ellipse at center,rgba(0,155,255,.18) 0%,transparent 70%);animation:rd2 24s ease-in-out infinite alternate}
.ra3{width:52vw;height:34vh;top:0;left:24vw;background:radial-gradient(ellipse at center,rgba(120,0,255,.13) 0%,transparent 70%);animation:rd3 20s ease-in-out infinite alternate}
.ra4{width:40vw;height:24vh;top:-8vh;left:46vw;background:radial-gradient(ellipse at center,rgba(0,255,185,.15) 0%,transparent 70%);animation:rd4 28s ease-in-out infinite alternate}
.ra5{width:28vw;height:20vh;top:4vh;left:62vw;background:radial-gradient(ellipse at center,rgba(190,70,255,.09) 0%,transparent 70%);animation:rd5 22s ease-in-out infinite alternate}
.r-ground{position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(2,12,10,.97) 0%,transparent 100%)}
@keyframes rd1{from{transform:translate(0,0) scaleX(1)}to{transform:translate(4vw,5vh) scaleX(1.1)}}
@keyframes rd2{from{transform:translate(0,0) scaleY(1)}to{transform:translate(-5vw,3vh) scaleY(1.18)}}
@keyframes rd3{from{transform:translate(0,0) rotate(0)}to{transform:translate(3vw,-4vh) rotate(7deg)}}
@keyframes rd4{from{transform:translate(0,0)}to{transform:translate(-4vw,6vh)}}
@keyframes rd5{from{transform:translate(0,0) scale(1)}to{transform:translate(5vw,-5vh) scale(1.3)}}

.r-city-stage{position:fixed;bottom:0;left:0;right:0;height:56vh;overflow:hidden;z-index:2;pointer-events:none}
.r-city-stage::before{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(to bottom,rgba(2,12,10,1) 0%,transparent 100%);z-index:10}
.r-city-panel{position:absolute;top:0;left:0;width:100%;height:100%;will-change:transform}
.r-city-panel picture{display:block;width:100%;height:100%}
.r-city-panel img{width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block}
.r-city-label{position:fixed;bottom:20px;right:24px;z-index:20;display:flex;align-items:center;gap:8px;pointer-events:none}
.r-city-dot{width:5px;height:5px;border-radius:50%;transition:background-color 1s ease}
.r-city-name{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55)}

.r-page{position:relative;z-index:10;padding:48px 32px 100px;max-width:1080px;margin:0 auto;min-height:calc(100vh - 60px)}
.r-header{text-align:center;margin-bottom:52px}
.r-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);margin:0 0 14px}
.r-live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#00e676;box-shadow:0 0 8px rgba(0,230,118,.7);animation:rpulse 2s ease-in-out infinite;flex-shrink:0}
@keyframes rpulse{0%,100%{box-shadow:0 0 6px rgba(0,230,118,.6)}50%{box-shadow:0 0 14px rgba(0,230,118,.9)}}
.r-title{font-size:clamp(40px,7vw,72px);font-weight:900;color:#fff;letter-spacing:-.03em;line-height:.95;margin:0 0 14px;text-shadow:0 0 40px rgba(0,0,0,.8)}
.r-sub{font-size:12px;color:rgba(255,255,255,.4);letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin:0}

/* Desktop roster - shown on large screens */
.r-desktop-roster { display:block; }
.r-mobile-roster  { display:none; }

/* Slide viewport */
.r-slide-viewport { position:relative; overflow:hidden; }
.r-slide {
  display:block;
  transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94),
              opacity 0.5s ease;
}
.r-slide.active { transform:translateX(0); opacity:1; position:relative; }
.r-slide.prev   { transform:translateX(-105%); opacity:0; position:absolute; top:0; left:0; width:100%; pointer-events:none; }
.r-slide.next   { transform:translateX(105%); opacity:0; position:absolute; top:0; left:0; width:100%; pointer-events:none; }

.r-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}

/* Dot nav */
.r-dot-nav{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:28px}
.r-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.2);border:none;cursor:pointer;padding:0;transition:all .3s ease}
.r-dot.on{width:22px;border-radius:4px;background:rgba(255,255,255,.55)}
.r-dot:focus-visible{outline:2px solid #F69820;outline-offset:2px}

/* Artist card */
.r-card{display:block;text-decoration:none;border-radius:10px;overflow:hidden;position:relative;aspect-ratio:3/4;background:#0d1a14;transition:transform .22s ease,box-shadow .22s ease;cursor:pointer}
.r-card:hover{transform:translateY(-5px) scale(1.01);box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 0 1.5px var(--r-accent,#E91E8C)}
.r-card:focus-visible{outline:3px solid #F69820;outline-offset:3px}
.r-card-img{position:absolute;inset:0}
.r-card-img img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;transition:transform .4s ease}
.r-card:hover .r-card-img img{transform:scale(1.04)}
.r-card-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:clamp(52px,9vw,88px);font-weight:900;color:#fff;letter-spacing:-.04em}
.r-card-grad{position:absolute;bottom:0;left:0;right:0;height:70%;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.5) 40%,transparent 100%)}
.r-card-info{position:absolute;bottom:0;left:0;right:0;padding:16px 14px 14px;z-index:2}
.r-card-name{display:block;font-size:clamp(12px,1.3vw,16px);font-weight:800;color:#fff;letter-spacing:.01em;line-height:1.2;text-transform:uppercase}
.r-card-tag{display:block;font-size:10px;color:rgba(255,255,255,.5);letter-spacing:.06em;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r-now-live-badge{position:absolute;top:12px;left:12px;z-index:3;background:rgba(0,230,118,.15);border:1px solid rgba(0,230,118,.4);color:#00e676;font-size:8px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;padding:4px 8px;border-radius:4px;backdrop-filter:blur(8px)}

/* Ghost cards — coming soon */
.r-card-ghost{filter:grayscale(1) brightness(0.38);pointer-events:none;cursor:default;user-select:none}
.r-card-ghost:hover{transform:none!important;box-shadow:none!important}
.r-coming-soon-badge{position:absolute;top:12px;left:12px;z-index:3;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.55);font-size:8px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;padding:4px 8px;border-radius:4px;backdrop-filter:blur(8px)}

/* Loading */
.r-loading{display:flex;flex-direction:column;align-items:center;gap:16px;padding:80px 0;color:rgba(255,255,255,.4);font-size:14px;letter-spacing:.08em}
.r-spinner{width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.1);border-top-color:rgba(255,255,255,.5);animation:rspin .8s linear infinite}
@keyframes rspin{to{transform:rotate(360deg)}}

/* Mobile */
@media(max-width:768px){
  .r-desktop-roster { display:none; }
  .r-mobile-roster  { display:block; }
  .r-grid-mobile { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  .r-page { padding:32px 16px 80px; }
  .r-city-stage { height:100vh; }
  .r-city-stage::before { height:30%; }
  .r-city-panel img { object-position:center center; }
  .r-header { margin-bottom:36px; }
}
`;
