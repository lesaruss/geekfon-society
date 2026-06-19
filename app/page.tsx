"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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

const FON_COLORS = [
  "#e84d1a","#ff6eb4","#e94f8a","#00cfe8",
  "#2ec4b6","#ff9f1c","#7fb069","#8e44ad","#c8922a",
];

// "Society" in 5 languages: English, Japanese, Korean, German, Zulu
const SOCIETY_LANGS = [
  "Society",
  "社会",
  "사회",
  "Gesellschaft",
  "Umphakathi",
];

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [fonIdx, setFonIdx] = useState(0);
  const [societyIdx, setSocietyIdx] = useState(0);
  const [societyVisible, setSocietyVisible] = useState(true);
  const currentRef = useRef(0);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FON color cycle
  useEffect(() => {
    const t = setInterval(() => setFonIdx((i) => (i + 1) % FON_COLORS.length), 1800);
    return () => clearInterval(t);
  }, []);

  // Society language cycle with fade
  useEffect(() => {
    const t = setInterval(() => {
      setSocietyVisible(false);
      setTimeout(() => {
        setSocietyIdx((i) => (i + 1) % SOCIETY_LANGS.length);
        setSocietyVisible(true);
      }, 350);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const goTo = useCallback((next: number) => {
    const prev = currentRef.current;
    if (next === prev) return;

    const prevPanel = panelRefs.current[prev];
    const nextPanel = panelRefs.current[next];
    if (!prevPanel || !nextPanel) return;

    nextPanel.style.transition = "none";
    nextPanel.style.transform = "translateX(100%)";
    void nextPanel.offsetHeight;

    const ease = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    nextPanel.style.transition = `transform 0.95s ${ease}`;
    prevPanel.style.transition = `transform 0.95s ${ease}`;
    nextPanel.style.transform = "translateX(0)";
    prevPanel.style.transform = "translateX(-105%)";

    setTimeout(() => {
      if (prevPanel) {
        prevPanel.style.transition = "none";
        prevPanel.style.transform = "translateX(100%)";
      }
    }, 980);

    currentRef.current = next;
    setCurrent(next);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(
      () => goTo((currentRef.current + 1) % CITIES.length),
      5200
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goTo]);

  function handleDotClick(i: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    goTo(i);
    timerRef.current = setInterval(
      () => goTo((currentRef.current + 1) % CITIES.length),
      5200
    );
  }

  useEffect(() => {
    panelRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.transition = "none";
      p.style.transform = i === 0 ? "translateX(0)" : "translateX(100%)";
    });
  }, []);

  const city = CITIES[current];

  return (
    <>
      <style>{CSS}</style>

      {/* Aurora */}
      <div className="aurora" aria-hidden="true">
        <div className="stars" />
        <div className="a a1" />
        <div className="a a2" />
        <div className="a a3" />
        <div className="a a4" />
        <div className="a a5" />
        <div className="aurora-ground" />
      </div>

      {/* City stage */}
      <div className="city-stage" aria-hidden="true">
        {CITIES.map((c, i) => (
          <div
            key={c.name}
            className="city-panel"
            ref={(el) => { panelRefs.current[i] = el; }}
          >
            <picture>
              <source media="(max-width: 768px)" srcSet={c.mobile} />
              <img src={c.desktop} alt="" aria-hidden="true" />
            </picture>
          </div>
        ))}
      </div>

      {/* City label */}
      <div className="city-label" aria-live="polite">
        <span className="city-dot" style={{ backgroundColor: city.accent }} />
        <span className="city-name-text">{city.name}</span>
      </div>

      {/* Progress dots */}
      <div className="progress-dots" role="tablist">
        {CITIES.map((c, i) => (
          <button
            key={c.name}
            className={"pdot" + (i === current ? " on" : "")}
            role="tab"
            aria-selected={i === current}
            aria-label={c.name}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>

      {/* Main overlay */}
      <div className="page">
        <div className="eyebrow">
          <span className="live-dot" aria-hidden="true" />
          LESARUSS Universe
        </div>

        <div className="hero-circle-wrap">
          <div className="hero-circle">
            <img
              className="hero-logo-img"
              src="https://geekfon.ai/geekfon-logo.png"
              alt=""
              aria-hidden="true"
            />
            <div className="hero-overlay" aria-hidden="true" />
          </div>
          <div className="hero-text" aria-hidden="true">
            <div className="hero-title">
              Geek
              <span
                className="hero-fon"
                style={{ color: FON_COLORS[fonIdx], transition: "color 0.7s ease" }}
              >
                Fon
              </span>
            </div>
            <div
              className="hero-tagline-inner"
              style={{
                opacity: societyVisible ? 1 : 0,
                transition: "opacity 0.35s ease",
              }}
            >
              {SOCIETY_LANGS[societyIdx]}
            </div>
          </div>
          <h1 className="sr-only">GeekFon Society</h1>
        </div>

        <div className="cta-row">
          <a href="/welcome" className="btn-p">Take the Tour</a>
          <a href="/roster" className="btn-s">Meet the Artists</a>
        </div>
      </div>
    </>
  );
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;font-family:'Montserrat',sans-serif;background:#020c0a;color:#e8e8e8;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

/* Aurora */
.aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 9% 6%,rgba(255,255,255,.55) 0%,transparent 100%),radial-gradient(1px 1px at 24% 12%,rgba(255,255,255,.35) 0%,transparent 100%),radial-gradient(1px 1px at 44% 4%,rgba(255,255,255,.48) 0%,transparent 100%),radial-gradient(1px 1px at 60% 10%,rgba(255,255,255,.30) 0%,transparent 100%),radial-gradient(1px 1px at 76% 7%,rgba(255,255,255,.52) 0%,transparent 100%),radial-gradient(1px 1px at 90% 3%,rgba(255,255,255,.42) 0%,transparent 100%),radial-gradient(1px 1px at 15% 20%,rgba(255,255,255,.28) 0%,transparent 100%),radial-gradient(1px 1px at 38% 17%,rgba(255,255,255,.22) 0%,transparent 100%),radial-gradient(1px 1px at 56% 22%,rgba(255,255,255,.32) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 18% 4%,rgba(255,255,255,.65) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 66% 2%,rgba(255,255,255,.55) 0%,transparent 100%),radial-gradient(1px 1px at 83% 15%,rgba(200,220,255,.38) 0%,transparent 100%);}
.a{position:absolute;border-radius:50%;filter:blur(90px);}
.a1{width:85vw;height:48vh;top:-20vh;left:4vw;background:radial-gradient(ellipse at center,rgba(0,215,95,.24) 0%,transparent 70%);animation:d1 18s ease-in-out infinite alternate;}
.a2{width:62vw;height:40vh;top:-14vh;right:-6vw;background:radial-gradient(ellipse at center,rgba(0,155,255,.18) 0%,transparent 70%);animation:d2 24s ease-in-out infinite alternate;}
.a3{width:52vw;height:34vh;top:0;left:24vw;background:radial-gradient(ellipse at center,rgba(120,0,255,.13) 0%,transparent 70%);animation:d3 20s ease-in-out infinite alternate;}
.a4{width:40vw;height:24vh;top:-8vh;left:46vw;background:radial-gradient(ellipse at center,rgba(0,255,185,.15) 0%,transparent 70%);animation:d4 28s ease-in-out infinite alternate;}
.a5{width:28vw;height:20vh;top:4vh;left:62vw;background:radial-gradient(ellipse at center,rgba(190,70,255,.09) 0%,transparent 70%);animation:d5 22s ease-in-out infinite alternate;}
.aurora-ground{position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(2,12,10,.97) 0%,transparent 100%);}
@keyframes d1{from{transform:translate(0,0) scaleX(1)}to{transform:translate(4vw,5vh) scaleX(1.1)}}
@keyframes d2{from{transform:translate(0,0) scaleY(1)}to{transform:translate(-5vw,3vh) scaleY(1.18)}}
@keyframes d3{from{transform:translate(0,0) rotate(0)}to{transform:translate(3vw,-4vh) rotate(7deg)}}
@keyframes d4{from{transform:translate(0,0)}to{transform:translate(-4vw,6vh)}}
@keyframes d5{from{transform:translate(0,0) scale(1)}to{transform:translate(5vw,-5vh) scale(1.3)}}

/* City stage */
.city-stage{position:fixed;bottom:0;left:0;right:0;height:56vh;overflow:hidden;z-index:2;}
.city-stage::before{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(to bottom,rgba(2,12,10,1) 0%,transparent 100%);z-index:10;pointer-events:none;}
.city-panel{position:absolute;top:0;left:0;width:100%;height:100%;will-change:transform;}
.city-panel picture{display:block;width:100%;height:100%;}
.city-panel img{width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block;}

/* Page overlay */
.page{position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;pointer-events:none;}

/* ADA fix: eyebrow bumped to rgba(255,255,255,.65) - approx 9:1 on dark bg */
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);}
.live-dot{width:6px;height:6px;background:#4caf50;border-radius:50%;animation:pdot 1.6s ease-in-out infinite;}
@keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.65)}}

/* Hero circle */
.hero-circle-wrap{position:relative;width:min(400px,min(44vw,72vh));height:min(400px,min(44vw,72vh));}
.hero-circle-wrap::before{content:'';position:absolute;inset:-10px;border-radius:50%;box-shadow:0 0 55px rgba(246,152,32,.25),0 0 110px rgba(0,155,255,.1);pointer-events:none;}
.hero-circle{width:100%;height:100%;border-radius:50%;overflow:hidden;position:relative;}
.hero-logo-img{width:100%;height:100%;object-fit:contain;object-position:center;display:block;}
.hero-overlay{position:absolute;inset:0;background:rgba(2,12,10,.45);border-radius:50%;}
.hero-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:15%;}
.hero-title{font-size:clamp(34px,9vw,56px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;line-height:1;text-align:center;white-space:nowrap;text-shadow:0 0 30px rgba(0,0,0,1),0 0 70px rgba(0,0,0,.9),0 2px 14px rgba(0,0,0,1);}

/* Society text: fixed size, overflow ellipsis so long words (Gesellschaft) don't break layout */
.hero-tagline-inner{
  font-size:clamp(8px,1.2vw,11px);
  font-weight:200;
  letter-spacing:.28em;
  text-transform:uppercase;
  color:rgba(255,255,255,.6);
  text-align:center;
  text-shadow:0 1px 8px rgba(0,0,0,1);
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

/* CTAs - ADA fix: use dark text on orange for AA compliance */
.cta-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;pointer-events:all;}
.btn-p{background:#F69820;color:#1a1a1a;border:none;border-radius:100px;padding:13px 30px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:background .15s,transform .1s;}
.btn-p:hover{background:#e08818;transform:translateY(-1px);}
.btn-p:focus-visible{outline:3px solid #F69820;outline-offset:3px;}
.btn-s{background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.14);border-radius:100px;padding:13px 30px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:border-color .15s,color .15s;}
.btn-s:hover{border-color:rgba(255,255,255,.3);color:#fff;}
.btn-s:focus-visible{outline:3px solid #F69820;outline-offset:3px;}

/* City label - ADA fix: bumped to rgba(255,255,255,.55) */
.city-label{position:fixed;bottom:4.5vh;right:5vw;z-index:20;display:flex;align-items:center;gap:8px;}
.city-dot{width:5px;height:5px;border-radius:50%;transition:background-color 1s ease;}
.city-name-text{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);}

/* Progress dots */
.progress-dots{position:fixed;bottom:5.2vh;left:50%;transform:translateX(-50%);z-index:20;display:flex;gap:6px;align-items:center;}
.pdot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.18);border:none;cursor:pointer;padding:0;transition:all .4s ease;}
.pdot.on{width:18px;border-radius:2px;background:rgba(255,255,255,.5);}
.pdot:focus-visible{outline:2px solid #F69820;outline-offset:2px;}

/* Mobile */
@media(max-width:768px){
  .city-stage{height:100vh;}
  .city-stage::before{height:30%;}
  .city-panel img{object-position:center center;}
  .hero-circle-wrap{width:min(280px,70vw);height:min(280px,70vw);}
}
`;
