"use client";
import { useState, useRef, useEffect } from "react";

const ARTISTS = [
  { name: "Roxanne",           slug: "roxanne",            accent: "#E91E8C", genres: ["J-Pop","Pop"] },
  { name: "Lex from Brixton",  slug: "lex-from-brixton",   accent: "#F69820", genres: ["Grime","UK"] },
  { name: "Nilo Wave",         slug: "nilo-wave",          accent: "#00BCD4", genres: ["Reggaeton","Caribbean"] },
  { name: "Shamanic Resin",    slug: "shamanic-resin",     accent: "#9C27B0", genres: ["K-Pop","Electronic"] },
  { name: "Riku Hayasaka",     slug: "riku",               accent: "#2196F3", genres: ["J-Pop","Indie Pop"] },
  { name: "Lickle Bro",        slug: "lickle-bro",         accent: "#4CAF50", genres: ["R&B","Dancehall"] },
  { name: "Lickle Sis",        slug: "lickle-sis",         accent: "#FF5722", genres: ["R&B","Soul"] },
  { name: "Mad Tings",         slug: "mad-tings",          accent: "#E91E63", genres: ["Grime","Dubstep"] },
  { name: "Mr. Russell",       slug: "mr-russell",         accent: "#90A4AE", genres: ["Hip-Hop","Rap"] },
  { name: "Rustblood Prophets",slug: "rustblood-prophets", accent: "#F44336", genres: ["Alternative","Dark"] },
  { name: "Straight and Narrow",slug: "straight-and-narrow",accent: "#A1887F", genres: ["Hip-Hop","Alternative"] },
  { name: "V",                 slug: "v",                  accent: "#7C4DFF", genres: ["Coming Soon"] },
];

const PHONE_VIEWS = [
  {
    key: "music",
    label: "Music",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    key: "chat",
    label: "Chat",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

export default function HomePage() {
  const [phoneView, setPhoneView] = useState<"music" | "chat">("music");
  const [radioPlaying, setRadioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fonIdx, setFonIdx] = useState(0);

  const FON_COLORS = ["#F69820", "#e94f8a", "#7fb069", "#9b6bcc", "#00cfe8", "#e84d1a"];

  useEffect(() => {
    const t = setInterval(() => setFonIdx((i) => (i + 1) % FON_COLORS.length), 3200);
    return () => clearInterval(t);
  }, []);

  function sendToPhone(msg: object) {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, "*");
    }
  }

  function switchView(v: "music" | "chat") {
    setPhoneView(v);
    sendToPhone({ view: v });
  }

  function toggleRadio() {
    const a = audioRef.current;
    if (!a) return;
    if (radioPlaying) {
      a.pause();
      setRadioPlaying(false);
    } else {
      a.play().catch(() => {});
      setRadioPlaying(true);
    }
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Aurora */}
      <div className="aurora" aria-hidden="true">
        <div className="stars" />
        <div className="a a1" />
        <div className="a a2" />
        <div className="a a3" />
        <div className="aurora-ground" />
      </div>

      {/* Nav */}
      <nav className="gfs-nav" aria-label="GeekFon Society navigation">
        <div className="nav-left">
          <a className="nav-pill active" href="/roster">Roster</a>
          <a className="nav-pill" href="/radio.html">Radio</a>
        </div>
        <div className="nav-wordmark" aria-label="GeekFon Society">
          Geek<span style={{ color: FON_COLORS[fonIdx], transition: "color 0.8s ease" }}>Fon</span>
        </div>
        <div className="nav-right">
          <a className="nav-login" href="/login.html">Member Login</a>
          <a className="nav-join" href="/passport.html">Get Passport</a>
        </div>
      </nav>

      <h1 className="sr-only">GeekFon Society - Independent Artist Community</h1>

      <main className="page" id="main-content">
        <div className="layout">

          {/* Phone bezel */}
          <div className="phone-col">
            <div className="phone-bezel">
              <div className="phone-notch" aria-hidden="true" />
              <div className="pb r" aria-hidden="true" />
              <div className="pb l1" aria-hidden="true" />
              <div className="pb l2" aria-hidden="true" />
              <div className="pb l3" aria-hidden="true" />
              <div className="phone-screen">
                <iframe
                  ref={iframeRef}
                  src="/gfs-phone-content.html"
                  title="GeekFon Society - music and chat"
                />
              </div>
              <div className="phone-home" aria-hidden="true" />
            </div>

            <div className="phone-mode-toggle" role="group" aria-label="Phone view">
              {PHONE_VIEWS.map((v) => (
                <button
                  key={v.key}
                  className={"phone-mode-btn" + (phoneView === v.key ? " active" : "")}
                  onClick={() => switchView(v.key as "music" | "chat")}
                  aria-pressed={phoneView === v.key}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hero content */}
          <div className="hero-col">
            <div className="hero-eyebrow">Independent Music</div>
            <div className="hero-wordmark" aria-label="GeekFon Society">
              Geek<em>Fon</em>
            </div>
            <div className="hero-sub">Society</div>

            <div className="hero-divider" aria-hidden="true" />

            <p className="hero-tagline">
              A closed group for <strong>original artists</strong> who build in public.{" "}
              Stream free. Get your Passport. Support artists with points.
            </p>

            <div className="hero-ctas">
              <a className="cta-primary" href="/passport.html">
                Get Your Passport
              </a>
              <a className="cta-secondary" href="/roster">
                Browse Artists
              </a>
            </div>

            {/* Live radio */}
            <button
              className={"live-card" + (radioPlaying ? " playing" : "")}
              onClick={toggleRadio}
              aria-label={"GeekFon Radio - " + (radioPlaying ? "playing, tap to pause" : "tap to stream")}
            >
              <div className="live-card-art">
                <span className="live-card-art-ph" aria-hidden="true">📻</span>
              </div>
              <div className="live-card-info">
                <div className="live-card-title">GeekFon Radio</div>
                <div className="live-card-sub">{radioPlaying ? "Playing now" : "Tap to stream"}</div>
              </div>
              <div className="live-pill">
                <div className="live-dot" aria-hidden="true" />
                <span className="live-text">Live</span>
              </div>
              <svg className="live-play-icon" viewBox="0 0 24 24" aria-hidden="true">
                {radioPlaying
                  ? <><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></>
                  : <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />}
              </svg>
            </button>
            <audio
              ref={audioRef}
              preload="none"
              src="http://2.24.99.251/listen/geekfon_radio/radio.mp3"
              onError={() => setRadioPlaying(false)}
              onEnded={() => setRadioPlaying(false)}
            />

            {/* Membership + Points */}
            <div className="mem-pill" role="group" aria-label="Membership tiers">
              <div className="mem-tier">
                <span className="mem-price">Free</span>
                <span className="mem-label">Stream</span>
              </div>
              <div className="mem-tier">
                <span className="mem-price">$11</span>
                <span className="mem-label">Passport</span>
              </div>
              <div className="mem-tier">
                <span className="mem-price">$11<span className="mem-mo">/mo</span></span>
                <span className="mem-label">All Access</span>
              </div>
            </div>

            {/* Points callout */}
            <div className="points-row">
              <div className="points-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4l3 3"/>
                </svg>
              </div>
              <div className="points-text">
                <strong>Points system launching Season 1.</strong>{" "}
                50 pts = unlock a song. 1,000 pts = all future songs from an artist.
              </div>
              <a className="points-link" href="/roster">Learn more</a>
            </div>

            {/* Artist strip */}
            <div className="roster-strip" aria-label="Featured artists">
              {ARTISTS.slice(0, 8).map((a) => (
                <a
                  key={a.slug}
                  href={"/" + a.slug}
                  className="roster-dot"
                  aria-label={a.name}
                  style={{ "--dot-accent": a.accent } as React.CSSProperties}
                  title={a.name}
                >
                  {a.name.charAt(0)}
                </a>
              ))}
            </div>

          </div>
        </div>
      </main>
    </>
  );
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow-x:hidden;font-family:'Montserrat',sans-serif;background:#020c0a;color:#e8e8e8;}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;}}
:focus-visible{outline:3px solid #F69820;outline-offset:3px;}
a{color:inherit;text-decoration:none;}
button{font-family:'Montserrat',sans-serif;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

/* Aurora */
.aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 9% 6%,rgba(255,255,255,.55) 0%,transparent 100%),radial-gradient(1px 1px at 24% 12%,rgba(255,255,255,.35) 0%,transparent 100%),radial-gradient(1px 1px at 44% 4%,rgba(255,255,255,.48) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 76% 7%,rgba(255,255,255,.52) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 18% 4%,rgba(255,255,255,.65) 0%,transparent 100%);}
.a{position:absolute;border-radius:50%;filter:blur(90px);}
.a1{width:85vw;height:48vh;top:-20vh;left:4vw;background:radial-gradient(ellipse at center,rgba(0,215,95,.22) 0%,transparent 70%);animation:d1 18s ease-in-out infinite alternate;}
.a2{width:62vw;height:40vh;top:-14vh;right:-6vw;background:radial-gradient(ellipse at center,rgba(0,155,255,.16) 0%,transparent 70%);animation:d2 24s ease-in-out infinite alternate;}
.a3{width:52vw;height:34vh;top:0;left:24vw;background:radial-gradient(ellipse at center,rgba(120,0,255,.11) 0%,transparent 70%);animation:d3 20s ease-in-out infinite alternate;}
.aurora-ground{position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(2,12,10,.97) 0%,transparent 100%);}
@keyframes d1{from{transform:translate(0,0)}to{transform:translate(4vw,5vh)}}
@keyframes d2{from{transform:translate(0,0)}to{transform:translate(-5vw,3vh)}}
@keyframes d3{from{transform:translate(0,0)}to{transform:translate(3vw,-4vh) rotate(7deg)}}

/* Nav */
.gfs-nav{position:fixed;top:0;left:0;right:0;z-index:100;height:56px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 28px;background:rgba(2,12,10,.88);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.06);}
.nav-left{display:flex;align-items:center;gap:22px;justify-self:start;}
.nav-pill{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.55);background:none;border:none;cursor:pointer;padding:6px 0;transition:color .15s;text-decoration:none;}
.nav-pill:hover{color:#fff;}
.nav-pill.active{color:#F69820;}
.nav-wordmark{font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#fff;justify-self:center;}
.nav-right{display:flex;align-items:center;gap:10px;justify-self:end;}
.nav-login{background:none;border:1px solid rgba(255,255,255,.18);border-radius:100px;padding:8px 18px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.6);cursor:pointer;transition:border-color .15s,color .15s;text-decoration:none;}
.nav-login:hover{border-color:rgba(255,255,255,.4);color:#fff;}
.nav-join{background:#F69820;color:#020c0a;border:none;border-radius:100px;padding:9px 22px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;transition:background .15s;text-decoration:none;display:inline-flex;align-items:center;}
.nav-join:hover{background:#e08818;}

/* Page */
.page{position:relative;z-index:1;height:100vh;padding-top:68px;display:flex;align-items:center;justify-content:center;}
.layout{display:flex;align-items:center;justify-content:center;gap:clamp(32px,5vw,80px);width:100%;max-width:1280px;padding:0 40px;height:100%;}

/* Phone bezel */
.phone-col{display:flex;flex-direction:column;align-items:center;gap:14px;flex-shrink:0;}
.phone-bezel{--ph:min(88vh,680px);--pw:calc(var(--ph)*0.495);width:var(--pw);height:var(--ph);background:rgba(18,20,20,.92);border-radius:min(46px,calc(var(--pw)*0.14));padding:min(13px,calc(var(--ph)*0.018));box-shadow:0 0 0 1px rgba(255,255,255,.07),0 0 0 3px rgba(0,0,0,.55),0 30px 90px rgba(0,0,0,.85),0 0 60px rgba(0,200,100,.05);position:relative;backdrop-filter:blur(4px);}
.phone-notch{width:min(98px,calc(var(--pw)*0.34));height:min(20px,calc(var(--ph)*0.029));background:#0a0c0b;border-radius:0 0 14px 14px;position:absolute;top:min(13px,calc(var(--ph)*0.018));left:50%;transform:translateX(-50%);z-index:4;}
.phone-screen{width:100%;height:100%;background:#080808;border-radius:min(36px,calc(var(--pw)*0.11));overflow:hidden;position:relative;display:flex;justify-content:center;align-items:flex-start;padding-top:26px;}
.phone-screen iframe{flex-shrink:0;width:375px;height:820px;border:none;display:block;transform-origin:top center;transform:scale(calc((var(--pw) - 26px) / 375));}
.pb{position:absolute;background:rgba(255,255,255,.07);border-radius:2px;}
.pb.r{right:-3px;top:16%;width:3px;height:12%;border-radius:0 2px 2px 0;}
.pb.l1{left:-3px;top:13%;width:3px;height:6%;border-radius:2px 0 0 2px;}
.pb.l2{left:-3px;top:21%;width:3px;height:10%;border-radius:2px 0 0 2px;}
.pb.l3{left:-3px;top:34%;width:3px;height:10%;border-radius:2px 0 0 2px;}
.phone-home{position:absolute;bottom:min(14px,2.5%);left:50%;transform:translateX(-50%);width:30%;height:4px;background:rgba(255,255,255,.12);border-radius:100px;z-index:4;}

/* Phone mode toggle */
.phone-mode-toggle{display:flex;gap:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:100px;padding:4px;align-self:center;}
.phone-mode-btn{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:8px 22px;border-radius:100px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.38);transition:all .18s;}
.phone-mode-btn.active{background:rgba(246,152,32,.14);color:#F69820;}
.phone-mode-btn svg{width:13px;height:13px;flex-shrink:0;}
.phone-mode-btn:focus-visible{outline:3px solid #F69820;outline-offset:3px;}

/* Hero */
.hero-col{display:flex;flex-direction:column;justify-content:center;gap:0;flex-shrink:0;max-width:480px;width:clamp(300px,40vw,480px);}
.hero-eyebrow{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.32em;color:rgba(246,152,32,.7);margin-bottom:16px;}
.hero-wordmark{font-size:clamp(48px,5.5vw,74px);font-weight:900;text-transform:uppercase;letter-spacing:-.025em;color:#fff;line-height:.9;}
.hero-wordmark em{color:#F69820;font-style:normal;}
.hero-sub{font-size:clamp(10px,1vw,13px);font-weight:400;letter-spacing:.5em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:12px;margin-left:.5em;}
.hero-divider{width:36px;height:1px;background:rgba(246,152,32,.4);margin:28px 0;}
.hero-tagline{font-size:15px;font-weight:400;color:rgba(255,255,255,.6);line-height:1.65;margin-bottom:28px;max-width:360px;}
.hero-tagline strong{font-weight:800;color:#fff;}

/* CTAs */
.hero-ctas{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px;}
.cta-primary{background:#F69820;color:#020c0a;border:none;border-radius:100px;padding:14px 36px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.16em;cursor:pointer;transition:background .15s,transform .15s;box-shadow:0 0 28px rgba(246,152,32,.2);text-decoration:none;display:inline-flex;align-items:center;}
.cta-primary:hover{background:#e08818;transform:translateY(-2px);}
.cta-secondary{display:inline-flex;align-items:center;justify-content:center;background:transparent;color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.18);border-radius:100px;padding:14px 28px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;transition:border-color .15s,color .15s,transform .15s;text-decoration:none;}
.cta-secondary:hover{border-color:#F69820;color:#F69820;transform:translateY(-2px);}

/* Live radio card */
.live-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:10px 14px 10px 10px;cursor:pointer;color:inherit;transition:border-color .18s,background .18s;margin-bottom:20px;width:100%;text-align:left;}
.live-card:hover{border-color:rgba(76,175,80,.45);background:rgba(76,175,80,.05);}
.live-card.playing{border-color:rgba(76,175,80,.5);background:rgba(76,175,80,.07);}
.live-card-art{width:44px;height:44px;border-radius:10px;background:#111;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.live-card-art-ph{font-size:20px;}
.live-card-info{flex:1;min-width:0;}
.live-card-title{font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.live-card-sub{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.45);margin-top:2px;}
.live-pill{display:flex;align-items:center;gap:5px;flex-shrink:0;}
.live-dot{width:7px;height:7px;border-radius:50%;background:#4caf50;animation:pulse 2s ease infinite;}
.live-text{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#4caf50;}
.live-play-icon{width:18px;height:18px;flex-shrink:0;color:rgba(255,255,255,.6);transition:color .15s;}
.live-card:hover .live-play-icon{color:#fff;}
.live-card.playing .live-play-icon{color:#4caf50;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}

/* Membership tiers */
.mem-pill{display:inline-flex;align-items:center;gap:0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 18px;margin-bottom:16px;}
.mem-tier{display:flex;flex-direction:column;align-items:center;gap:2px;padding:0 16px;border-right:1px solid rgba(255,255,255,.08);}
.mem-tier:last-child{border-right:none;}
.mem-price{font-size:18px;font-weight:900;color:#fff;letter-spacing:-.01em;}
.mem-mo{font-size:10px;font-weight:400;color:rgba(255,255,255,.6);}
.mem-label{font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.55);}

/* Points row */
.points-row{display:flex;align-items:center;gap:10px;background:rgba(246,152,32,.06);border:1px solid rgba(246,152,32,.12);border-radius:12px;padding:11px 14px;margin-bottom:20px;}
.points-icon{width:20px;height:20px;flex-shrink:0;color:#F69820;}
.points-icon svg{width:100%;height:100%;}
.points-text{flex:1;font-size:11px;color:rgba(255,255,255,.65);line-height:1.5;}
.points-text strong{color:#F69820;font-weight:800;}
.points-link{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#F69820;text-decoration:none;white-space:nowrap;flex-shrink:0;}
.points-link:hover{text-decoration:underline;}

/* Roster strip */
.roster-strip{display:flex;gap:8px;flex-wrap:wrap;}
.roster-dot{width:38px;height:38px;border-radius:50%;background:var(--dot-accent,#E91E8C);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;text-decoration:none;transition:transform .15s,box-shadow .15s;flex-shrink:0;}
.roster-dot:hover{transform:scale(1.12);box-shadow:0 0 18px var(--dot-accent,#E91E8C);}

/* Mobile */
@media(max-width:820px){
  html,body{height:auto;overflow-y:auto;}
  .page{height:auto;min-height:100vh;padding:72px 0 60px;}
  .layout{flex-direction:column;align-items:center;gap:40px;height:auto;padding:0 20px;}
  .hero-col{order:1;max-width:100%;width:100%;text-align:center;align-items:center;}
  .hero-ctas{justify-content:center;}
  .mem-pill{width:100%;justify-content:center;}
  .roster-strip{justify-content:center;}
  .points-row{flex-wrap:wrap;}
  .phone-col{order:2;}
  .phone-bezel{--ph:520px;--pw:calc(var(--ph)*0.495);}
}
`;
