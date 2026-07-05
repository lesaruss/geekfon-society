"use client";
import { useState, useEffect } from "react";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";

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
    desc: "24/7 members-only radio across every artist. Your Passport is the only ticket in.",
    accent: "#E91E8C",
  },
  {
    icon: "★",
    title: "GeekFon Plus",
    desc: "Invite-only, earned through member support. Plus unlocks street-team access and affiliate revenue opportunities.",
    accent: "#AAFF00",
  },
  {
    icon: "◆",
    title: "Earn LESARs Every Day",
    desc: "Get points for listening, sharing, and bringing people in. Your activity is your currency.",
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
    title: "Leaderboard and Artist Top 10",
    desc: "Compete with the community. Vote on the Artist Top 10. Your LESARs, your influence.",
    accent: "#FF5722",
  },
];

const POINT_PACKS = [
  { lesars: 500,   price: 5,  label: "Starter",  note: "~5 tracks" },
  { lesars: 1000,  price: 11, label: "Standard", note: "~10 tracks", popular: true },
  { lesars: 5000,  price: 33, label: "Power",    note: "~50 tracks" },
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

/* ---- Pricing section ---- */
.pp-pricing { padding: 80px 24px 100px; max-width: 1100px; margin: 0 auto; }
.pp-pricing-label { font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 20px; }
.pp-pricing-heading { font-size: clamp(26px, 4vw, 40px); font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin: 0 0 12px; }
.pp-pricing-sub { font-size: 15px; color: rgba(255,255,255,.55); margin: 0 0 56px; line-height: 1.6; }
.pp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
@media (max-width: 860px) { .pp-pricing-grid { grid-template-columns: 1fr; gap: 2px; } }

/* Tier cards */
.pp-tier { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); padding: 40px 32px 36px; display: flex; flex-direction: column; position: relative; }
.pp-tier.featured { background: rgba(233,30,140,.08); border-color: rgba(233,30,140,.35); }
.pp-tier-badge { position: absolute; top: -1px; right: 28px; background: #E91E8C; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 12px; }
.pp-tier-name { font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,.5); margin-bottom: 20px; }
.pp-tier-price { font-size: clamp(38px, 5vw, 54px); font-weight: 900; letter-spacing: -2px; line-height: 1; margin-bottom: 4px; }
.pp-tier-price span { font-size: 18px; font-weight: 700; vertical-align: top; margin-top: 10px; display: inline-block; }
.pp-tier-period { font-size: 13px; color: rgba(255,255,255,.4); font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; }
.pp-tier-highlight { font-size: 20px; font-weight: 900; color: #E91E8C; letter-spacing: -0.5px; margin-bottom: 6px; }
.pp-tier-highlight-sub { font-size: 12px; color: rgba(255,255,255,.45); font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; }
.pp-tier-items { list-style: none; padding: 0; margin: 0 0 32px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.pp-tier-items li { font-size: 13px; color: rgba(255,255,255,.7); line-height: 1.5; padding-left: 20px; position: relative; }
.pp-tier-items li::before { content: ""; position: absolute; left: 0; top: 7px; width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.3); }
.pp-tier.featured .pp-tier-items li::before { background: #E91E8C; }
.pp-tier-btn { width: 100%; padding: 15px; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; border: none; border-radius: 2px; cursor: pointer; transition: opacity .15s; font-family: inherit; }
.pp-tier-btn:hover { opacity: .88; }
.pp-tier-btn.primary { background: #E91E8C; color: #fff; }
.pp-tier-btn.secondary { background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.2); }

/* Point packs sub-grid */
.pp-packs { margin: 12px 0 24px; display: flex; flex-direction: column; gap: 8px; }
.pp-pack-row { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); padding: 12px 16px; border-radius: 2px; cursor: pointer; transition: background .15s; position: relative; }
.pp-pack-row:hover { background: rgba(233,30,140,.1); border-color: rgba(233,30,140,.3); }
.pp-pack-row.pack-selected { background: rgba(233,30,140,.12); border-color: #E91E8C; box-shadow: 0 0 0 1px rgba(233,30,140,.4); }
.pp-pack-row.pack-popular { border-color: rgba(233,30,140,.4); background: rgba(233,30,140,.07); }
.pp-pack-badge { position: absolute; top: -8px; right: 10px; background: #E91E8C; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 2px 8px; border-radius: 2px; }
.pp-pack-lesars { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
.pp-pack-note { font-size: 11px; color: rgba(255,255,255,.4); font-weight: 600; }
.pp-pack-price { font-size: 16px; font-weight: 900; color: #E91E8C; }

/* Divider */
.pp-pricing-divider { border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 0 0 80px; }
`;

export default function PassportPage() {
  const [cityIdx, setCityIdx] = useState(0);
  const [cityVisible, setCityVisible] = useState(true);
  const [returnPath, setReturnPath] = useState("/dashboard");
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  // Page-native 2-step flow: landing ("Free to Join") advances to the What You Get + plan choice step.
  // Previously the hero CTA skipped straight to registration without showing perks or plans at all.
  const [step, setStep] = useState<"landing" | "plans">("landing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ret = params.get("return");
    if (ret) setReturnPath(ret);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
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

  async function handleJoin(plan?: string) {
    // Free signup goes straight to the registration form (magic-link sign-up).
    if (!plan || plan === "free") {
      window.location.href = "/register.html";
      return;
    }
    // Paid plans require an authenticated member. Send guests to log in,
    // then bring them back to the passport page to complete the purchase.
    if (!userId) {
      window.location.href = "/login.html?redirect=/passport";
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId, returnUrl: returnPath }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        console.error("[checkout]", error);
        setCheckingOut(false);
      }
    } catch (err) {
      console.error("[checkout]", err);
      setCheckingOut(false);
    }
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
            <div className="pp-hero-price">Free to Join</div>
            <h1 className="pp-hero-title">GeekFon Passport</h1>
            <p className="pp-hero-sub">
              Your membership into the GeekFon universe. Listen, earn LESARs, unlock tracks,
              and build your place in the community. Free to start. Power up when you&apos;re ready.
            </p>
            <button className="pp-hero-cta" onClick={() => setStep("plans")} aria-label="See GeekFon Passport plans">
              Get Your Passport
            </button>
          </div>
        </div>

        {step === "plans" && <>
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

        <hr className="pp-pricing-divider" />

        {/* Pricing */}
        <section className="pp-pricing" aria-labelledby="pp-plans-heading">
          <div className="pp-pricing-label">Choose your path</div>
          <h2 id="pp-plans-heading" className="pp-pricing-heading">Start free. Go deeper when you&apos;re ready.</h2>
          <p className="pp-pricing-sub">
            Every Passport is free. LESARs are how you move inside the ecosystem - earn them by
            participating, or get more to unlock tracks faster. The $11 membership puts everything on autopilot.
          </p>

          <div className="pp-pricing-grid" role="list">

            {/* --- FREE --- */}
            <div className="pp-tier" role="listitem">
              <div className="pp-tier-name">Free Forever</div>
              <div className="pp-tier-price">Free</div>
              <div className="pp-tier-period">no card required</div>
              <div className="pp-tier-highlight">111 LESARs</div>
              <div className="pp-tier-highlight-sub">to get you started</div>
              <ul className="pp-tier-items">
                <li>111 LESARs loaded on signup - enough to unlock your first track</li>
                <li>Earn LESARs by listening, sharing, and referring friends</li>
                <li>Full access to GeekFon Radio</li>
                <li>Vote on the Artist Top 10</li>
                <li>Your activity builds your rank in the community</li>
              </ul>
              <button className="pp-tier-btn secondary" onClick={() => handleJoin("free")}>
                Join Free
              </button>
            </div>

            {/* --- $11/MONTH (best value, center) --- */}
            <div className="pp-tier featured" role="listitem">
              <div className="pp-tier-badge">Best Value</div>
              <div className="pp-tier-name">All Access</div>
              <div className="pp-tier-price"><span>$</span>11</div>
              <div className="pp-tier-period">per month, cancel any time</div>
              <div className="pp-tier-highlight">1,500 LESARs</div>
              <div className="pp-tier-highlight-sub">every month, automatically</div>
              <ul className="pp-tier-items">
                <li>1,500 LESARs per month - enough for 15 tracks</li>
                <li>Early access to every new track before public release</li>
                <li>24/7 GeekFon Radio, including unreleased songs</li>
                <li>Eligible for the GeekFon Plus street team</li>
                <li>Leaderboard ranking and Artist Top 10 voting power</li>
                <li>Priority access to exclusive artist drops and events</li>
              </ul>
              <button className="pp-tier-btn primary" onClick={() => !checkingOut && handleJoin("all-access")} disabled={checkingOut}>
                {checkingOut ? "Redirecting..." : "Get All Access"}
              </button>
            </div>

          </div>
        </section>
        </>}

      </div>

    </SiteChrome>
  );
}
