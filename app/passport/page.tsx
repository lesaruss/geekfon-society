"use client";
import { useState, useEffect } from "react";
import SiteChrome from "@/components/SiteChrome";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";

const CITY_IMAGES = [
  CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png",
  CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png",
  CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png",
  CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png",
  CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png",
  CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png",
  CDN + "hf_20260620_234313_10dea700-d199-4e4a-bc73-0b276a46d266.png",
];

const PERKS = [
  {
    icon: "◉",
    title: "GeekFon Radio",
    desc: "Members-only live radio stream. Exclusive mixes, DJ sessions, and artist drops before anyone else hears them.",
    accent: "#E91E8C",
  },
  {
    icon: "♬",
    title: "Jukebox",
    desc: "Full access to the GeekFon track library. Stream every song from every artist, any time.",
    accent: "#F69820",
  },
  {
    icon: "★",
    title: "GeekFon Plus Eligibility",
    desc: "Passport members can apply to become a Plus rep - our street team. Early access earns your invitation.",
    accent: "#AAFF00",
  },
  {
    icon: "◆",
    title: "1,000 LESARs / Month",
    desc: "Your monthly allocation of LESARs. Use them to unlock tracks, tip artists, and climb the leaderboard.",
    accent: "#9C27B0",
  },
  {
    icon: "⚡",
    title: "Early Track Access",
    desc: "Get every new song before it hits Spotify and the public. Passport is the first door in.",
    accent: "#00BCD4",
  },
  {
    icon: "◈",
    title: "Leaderboard & Artist Top 10",
    desc: "Compete with the community. Vote on the Artist Top 10. Your LESARs, your influence.",
    accent: "#FF5722",
  },
];

const CSS = `
.pp-page { width: 100%; min-height: 100vh; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; }

/* Hero */
.pp-hero { position: relative; width: 100%; min-height: 60vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.pp-aurora { position: absolute; inset: 0; z-index: 0; }
.pp-stars { position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.6) 0%, transparent 100%), radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,.5) 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,.4) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,.5) 0%, transparent 100%); }
.ppga { position: absolute; border-radius: 50%; filter: blur(80px); animation: ppgaPulse 6s ease-in-out infinite alternate; }
.ppga1 { width: 500px; height: 500px; background: rgba(233,30,140,.18); top: -100px; left: -100px; animation-delay: 0s; }
.ppga2 { width: 400px; height: 400px; background: rgba(246,152,32,.15); bottom: -80px; right: 10%; animation-delay: -2s; }
.ppga3 { width: 350px; height: 350px; background: rgba(170,255,0,.1); top: 20%; right: -80px; animation-delay: -4s; }
.ppga4 { width: 300px; height: 300px; background: rgba(0,188,212,.12); bottom: 10%; left: 20%; animation-delay: -1s; }
@keyframes ppgaPulse { from { opacity: .5; transform: scale(1); } to { opacity: 1; transform: scale(1.12); } }
.pp-city-stage { position: absolute; inset: 0; z-index: 1; }
.pp-city-img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .7s ease; }
.pp-city-img.visible { opacity: .22; }
.pp-ground { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to bottom, transparent, #000); z-index: 2; }
.pp-hero-content { position: relative; z-index: 10; text-align: center; padding: 80px 24px 60px; max-width: 680px; }
.pp-hero-price { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #E91E8C; border: 1px solid rgba(233,30,140,.4); border-radius: 4px; padding: 6px 16px; margin-bottom: 24px; }
.pp-hero-title { font-size: clamp(42px, 7vw, 80px); font-weight: 900; letter-spacing: -2px; line-height: 1; margin: 0 0 20px; text-transform: uppercase; }
.pp-hero-sub { font-size: 16px; font-weight: 400; color: rgba(255,255,255,.7); line-height: 1.6; margin: 0 0 40px; }
.pp-hero-cta { display: inline-block; background: #E91E8C; color: #fff; font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 16px 40px; border-radius: 4px; text-decoration: none; transition: background .2s; cursor: pointer; border: none; }
.pp-hero-cta:hover { background: #c41677; }
.pp-hero-cta:focus-visible { outline: 2px solid #E91E8C; outline-offset: 3px; }

/* Perks grid */
.pp-perks-section { padding: 80px 24px; max-width: 1100px; margin: 0 auto; }
.pp-perks-label { font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 20px; }
.pp-perks-heading { font-size: clamp(26px, 4vw, 40px); font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin: 0 0 48px; }
.pp-perks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
@media (max-width: 900px) { .pp-perks-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .pp-perks-grid { grid-template-columns: 1fr; } }
.pp-perk-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); padding: 32px 28px; transition: background .2s; }
.pp-perk-card:hover { background: rgba(255,255,255,.07); }
.pp-perk-icon { font-size: 22px; margin-bottom: 16px; display: block; }
.pp-perk-title { font-size: 15px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 10px; }
.pp-perk-desc { font-size: 13px; font-weight: 400; color: rgba(255,255,255,.6); line-height: 1.65; }

/* Bottom CTA */
.pp-bottom { background: rgba(233,30,140,.07); border-top: 1px solid rgba(233,30,140,.15); padding: 80px 24px; text-align: center; }
.pp-bottom-heading { font-size: clamp(24px, 4vw, 40px); font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin: 0 0 16px; }
.pp-bottom-sub { font-size: 15px; color: rgba(255,255,255,.6); margin: 0 0 40px; }
.pp-bottom-price { font-size: 48px; font-weight: 900; color: #E91E8C; letter-spacing: -2px; margin: 0 0 8px; }
.pp-bottom-per { font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.4); margin: 0 0 40px; }
`;

export default function PassportPage() {
  const [cityIdx, setCityIdx] = useState(0);
  const [cityVisible, setCityVisible] = useState(true);

  // Get return path from query string
  const [returnPath, setReturnPath] = useState("/dashboard");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ret = params.get("return");
    if (ret) setReturnPath(ret);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCityVisible(false);
      setTimeout(() => {
        setCityIdx(i => (i + 1) % CITY_IMAGES.length);
        setCityVisible(true);
      }, 700);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function handleJoin() {
    // Routes to welcome onboarding wizard which handles sign-up + plan selection
    window.location.href = `/welcome?return=${encodeURIComponent(returnPath)}`;
  }

  return (
    <SiteChrome>
      <style>{CSS}</style>
      <div className="pp-page">

        {/* Hero */}
        <div className="pp-hero">
          <div className="pp-aurora" aria-hidden="true">
            <div className="pp-stars" />
            <div className="ppga ppga1" /><div className="ppga ppga2" />
            <div className="ppga ppga3" /><div className="ppga ppga4" />
          </div>
          <div className="pp-city-stage" aria-hidden="true">
            <img
              src={CITY_IMAGES[cityIdx]}
              alt=""
              aria-hidden="true"
              className={"pp-city-img" + (cityVisible ? " visible" : "")}
            />
            <div className="pp-ground" />
          </div>
          <div className="pp-hero-content">
            <div className="pp-hero-price">$11 / Month</div>
            <h1 className="pp-hero-title">GeekFon Passport</h1>
            <p className="pp-hero-sub">
              Your membership into the GeekFon universe. Radio, Jukebox, early access, LESARs, and the door to GeekFon Plus.
              Everything for eleven dollars a month.
            </p>
            <button className="pp-hero-cta" onClick={handleJoin} aria-label="Join GeekFon Passport">
              Get Your Passport
            </button>
          </div>
        </div>

        {/* Perks */}
        <section className="pp-perks-section" aria-labelledby="pp-perks-heading">
          <div className="pp-perks-label">What you get</div>
          <h2 id="pp-perks-heading" className="pp-perks-heading">Passport Member Perks</h2>
          <div className="pp-perks-grid" role="list">
            {PERKS.map(p => (
              <div key={p.title} className="pp-perk-card" role="listitem">
                <span className="pp-perk-icon" style={{ color: p.accent }} aria-hidden="true">{p.icon}</span>
                <div className="pp-perk-title" style={{ color: p.accent }}>{p.title}</div>
                <p className="pp-perk-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="pp-bottom">
          <p className="pp-bottom-price">$11</p>
          <p className="pp-bottom-per">per month</p>
          <h2 className="pp-bottom-heading">No brainer.</h2>
          <p className="pp-bottom-sub">
            Six perks. One price. Cancel any time.
          </p>
          <button className="pp-hero-cta" onClick={handleJoin} aria-label="Join GeekFon Passport">
            Get Your Passport
          </button>
        </div>

      </div>
    </SiteChrome>
  );
}
