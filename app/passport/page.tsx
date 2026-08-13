"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
    short: "Radio",
    title: "GeekFon Radio",
    desc: "24/7 rotation across every artist, free for anyone to listen - no account needed. Sign up to vote on the leaderboard and unlock full catalogs.",
    accent: "#E91E8C",
  },
  {
    icon: "◈",
    short: "All Access",
    title: "$11/mo All Access",
    desc: "One membership, every artist. $11/month unlocks the full catalog across the whole roster and drops 1,100 points into your wallet every month - no per-artist unlocking.",
    accent: "#AAFF00",
  },
  {
    icon: "⬡",
    short: "Points",
    title: "Points for Downloads",
    desc: "Streaming is always included. Spend points only when you want to take a song with you - download it to keep and use anywhere, off the platform, for a flat 150 points per track.",
    accent: "#00BCD4",
  },
  {
    icon: "★",
    short: "Pro",
    title: "GeekFon Pro",
    desc: "Invite-only. Apply, get full catalog access, and earn commission on every member who joins through your personal link.",
    accent: "#AAFF00",
  },
  {
    icon: "◆",
    short: "Unlock",
    title: "Unlock Any Artist for $11",
    desc: "One price, once, forever. Unlock an artist's full catalog - every song, released or not - no subscription required.",
    accent: "#9C27B0",
  },
  {
    icon: "⚡",
    short: "Early Access",
    title: "Preview Every New Track",
    desc: "Hear a preview of every new song before it drops. Unlock the artist to hear the whole thing before anyone else.",
    accent: "#00BCD4",
  },
  {
    icon: "◈",
    short: "Leaderboard",
    title: "Leaderboard and Artist Top 10",
    desc: "Compete with the community and vote on the Artist Top 10.",
    accent: "#FF5722",
  },
];

// Narration for each of the 3 tour slides (Cillian voice via Higgsfield).
const SLIDE_AUDIO: Record<number, { url: string; label: string }> = {
  0: { url: CDN + "hf_20260714_104500_26568fe7-e9a2-44b2-ae22-6bf2b024d1fd.wav", label: "GeekFon Passport" },
  1: { url: CDN + "hf_20260714_104502_189b2ed3-acce-4f53-9d2d-eb05f59fcc90.wav", label: "Passport Member Perks" },
  2: { url: CDN + "hf_20260714_104504_2df73c70-d7f3-4cc2-9c60-abcab6948afd.wav", label: "Choose Your Path" },
};

const CSS = `
.pp-page { width: 100%; min-height: 100vh; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; position: relative; overflow: hidden; }

/* Fixed background: aurora + stars + city slideshow, persists behind all 3 slides */
.pp-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; }
.pp-stars { position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.6) 0%, transparent 100%), radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,.5) 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,.4) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,.5) 0%, transparent 100%); }
.ppga { position: absolute; border-radius: 50%; filter: blur(80px); animation: ppgaPulse 6s ease-in-out infinite alternate; }
.ppga1 { width: 500px; height: 500px; background: rgba(233,30,140,.18); top: -100px; left: -100px; animation-delay: 0s; }
.ppga2 { width: 400px; height: 400px; background: rgba(246,152,32,.15); bottom: -80px; right: 10%; animation-delay: -2s; }
.ppga3 { width: 350px; height: 350px; background: rgba(170,255,0,.1); top: 20%; right: -80px; animation-delay: -4s; }
.ppga4 { width: 300px; height: 300px; background: rgba(0,188,212,.12); bottom: 10%; left: 20%; animation-delay: -1s; }
@keyframes ppgaPulse { from { opacity: .5; transform: scale(1); } to { opacity: 1; transform: scale(1.12); } }
.pp-city-stage { position: absolute; inset: 0; z-index: 1; }
.pp-city-img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .7s ease; }
.pp-city-img.visible { opacity: .18; }
.pp-ground { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to bottom, transparent, #000); z-index: 2; }

/* Slide shell */
.pp-slide-outer { position: relative; z-index: 10; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 100px 24px 140px; }
.pp-slide-wrap { width: 100%; transition: opacity .3s ease; }
.pp-slide-wrap.hidden { opacity: 0; }

/* Slide 1: landing hero */
.pp-hero-content { text-align: center; max-width: 680px; margin: 0 auto; }
.pp-hero-price { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #E91E8C; border: 1px solid rgba(233,30,140,.4); border-radius: 4px; padding: 6px 16px; margin-bottom: 24px; }
.pp-hero-title { font-size: clamp(42px, 7vw, 80px); font-weight: 900; letter-spacing: -2px; line-height: 1; margin: 0 0 20px; text-transform: uppercase; }
.pp-hero-sub { font-size: 16px; font-weight: 400; color: rgba(255,255,255,.7); line-height: 1.6; margin: 0 0 40px; }
.pp-hero-cta { display: inline-block; background: #C41677; color: #fff; font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 16px 40px; border-radius: 4px; text-decoration: none; transition: background .2s; cursor: pointer; border: none; }
.pp-hero-cta:hover { background: #a01260; }
.pp-hero-cta:focus-visible { outline: 2px solid #E91E8C; outline-offset: 3px; }

/* Slide 2: perks toggle */
.pp-perks-wrap { max-width: 720px; margin: 0 auto; width: 100%; }
.pp-perks-label { font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 20px; text-align: center; }
.pp-perks-heading { font-size: clamp(26px, 4vw, 40px); font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin: 0 0 36px; text-align: center; }
.pp-perk-tabs { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 32px; }
.pp-perk-tab { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.6); font-size: 12px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 10px 18px; border-radius: 100px; cursor: pointer; transition: all .2s ease; font-family: inherit; display: flex; align-items: center; gap: 8px; }
.pp-perk-tab:hover { background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); }
.pp-perk-tab.active { color: #0a0a12; }
.pp-perk-detail { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 48px 40px; min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; animation: ppFadeUp .35s ease; }
@keyframes ppFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.pp-perk-detail-icon { font-size: 40px; margin-bottom: 20px; }
.pp-perk-detail-title { font-size: clamp(20px, 3vw, 30px); font-weight: 900; letter-spacing: -.5px; text-transform: uppercase; margin: 0 0 16px; }
.pp-perk-detail-desc { font-size: 16px; line-height: 1.7; color: rgba(255,255,255,.7); max-width: 520px; margin: 0; }

/* Slide 3: choose your path */
.pp-pricing-wrap { max-width: 1100px; margin: 0 auto; width: 100%; }
.pp-pricing-label { font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 20px; text-align: center; }
.pp-pricing-heading { font-size: clamp(26px, 4vw, 40px); font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin: 0 0 12px; text-align: center; }
.pp-pricing-sub { font-size: 15px; color: rgba(255,255,255,.55); margin: 0 auto 48px; line-height: 1.6; text-align: center; max-width: 620px; }
.pp-pricing-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; }
@media (max-width: 720px) { .pp-pricing-grid { grid-template-columns: 1fr; gap: 2px; } }
.pp-pricing-grid-single { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }

.pp-tier { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); padding: 40px 32px 36px; display: flex; flex-direction: column; position: relative; }
.pp-tier.featured { background: rgba(233,30,140,.08); border-color: rgba(233,30,140,.35); }
.pp-tier-badge { position: absolute; top: -1px; right: 28px; background: #C41677; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 12px; }
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
.pp-tier-btn.primary { background: #C41677; color: #fff; }
.pp-tier-btn.secondary { background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.2); }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Mobile: tighten vertical spacing across all 3 slides so each step fits one screen, no scroll */
@media (max-width: 640px) {
  .pp-page { min-height: calc(100vh - 60px - env(safe-area-inset-top, 0px)); }
  .pp-slide-outer { padding: 44px 20px 84px; min-height: calc(100vh - 60px - env(safe-area-inset-top, 0px)); }
  .pp-hero-price { margin-bottom: 14px; }
  .pp-hero-title { font-size: clamp(34px, 9vw, 56px); margin: 0 0 12px; }
  .pp-hero-sub { font-size: 14px; margin: 0 0 22px; }
  .pp-perks-label { margin-bottom: 10px; }
  .pp-perks-heading { font-size: clamp(22px, 6vw, 30px); margin: 0 0 18px; }
  .pp-perk-tabs { margin-bottom: 16px; gap: 6px; }
  .pp-perk-tab { padding: 8px 14px; font-size: 11px; }
  .pp-perk-detail { padding: 26px 20px; min-height: 160px; }
  .pp-perk-detail-icon { font-size: 30px; margin-bottom: 10px; }
  .pp-perk-detail-title { font-size: clamp(18px, 5vw, 22px); margin: 0 0 8px; }
  .pp-perk-detail-desc { font-size: 14px; line-height: 1.5; }
  .pp-pricing-label { margin-bottom: 10px; }
  .pp-pricing-heading { font-size: clamp(22px, 6vw, 28px); margin: 0 0 8px; }
  .pp-pricing-sub { font-size: 13px; margin: 0 auto 12px; }
  .pp-tier { padding: 18px 18px 14px; }
  .pp-tier-name { margin-bottom: 6px; }
  .pp-tier-price { font-size: clamp(30px, 9vw, 40px); }
  .pp-tier-period { margin-bottom: 10px; }
  .pp-tier-items { gap: 6px; margin: 0 0 12px; }
  .pp-tier-items li { font-size: 12.5px; line-height: 1.4; }
  .pp-tier-btn { padding: 10px; font-size: 12px; }
  .pp-bottom-bar { padding: 14px 16px 18px !important; }
  .pp-nav-btn { padding: 10px 18px !important; font-size: 0.8rem !important; }
}

`;

// ── Narration button (ported from the /welcome tour shell) ───────────────────
function TourNarrationButton({ track, accent }: { track: { url: string; label: string }; accent: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "unavailable">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } }

  function start() {
    const a = new Audio(track.url);
    a.addEventListener("playing", () => { clearTimer(); setState("playing"); });
    a.addEventListener("pause", () => setState((s) => (s === "unavailable" ? s : "idle")));
    a.addEventListener("ended", () => setState("idle"));
    a.addEventListener("error", () => { clearTimer(); setState("unavailable"); });
    audioRef.current = a;
    setState("loading");
    timeoutRef.current = setTimeout(() => setState("unavailable"), 8000);
    a.play().catch(() => { clearTimer(); setState("unavailable"); });
  }

  function toggle() {
    if (state === "loading") return;
    const a = audioRef.current;
    if (!a) { start(); return; }
    if (state === "playing") { a.pause(); return; }
    if (state === "unavailable") { a.pause(); audioRef.current = null; start(); return; }
    setState("loading");
    timeoutRef.current = setTimeout(() => setState("unavailable"), 8000);
    a.play().catch(() => { clearTimer(); setState("unavailable"); });
  }

  useEffect(() => () => { clearTimer(); audioRef.current?.pause(); }, []);

  const isPlaying = state === "playing";
  const isLoading = state === "loading";
  const isUnavailable = state === "unavailable";

  return (
    <button
      onClick={toggle}
      aria-label={isPlaying ? "Pause narration" : isUnavailable ? "Narration unavailable, tap to retry" : "Listen to this page"}
      title={isPlaying ? "Pause narration" : isUnavailable ? "Narration unavailable - tap to retry" : "Listen to this page"}
      style={{ width: "40px", height: "40px", borderRadius: "50%", background: isPlaying ? accent : isUnavailable ? "rgba(255,90,90,0.18)" : "rgba(255,255,255,0.08)", border: `1px solid ${isPlaying ? accent : isUnavailable ? "rgba(255,110,110,0.6)" : "rgba(255,255,255,0.16)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s ease" }}
    >
      {isLoading
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="20" style={{ animation: "spin 0.8s linear infinite" }} /></svg>
        : isPlaying
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : isUnavailable
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff9090" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l16 16M20 4L4 20"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="7 4 20 12 7 20"/></svg>}
    </button>
  );
}

// ── Progress dots (ported from the /welcome tour shell) ──────────────────────
function ProgressDots({ total, current, accent }: { total: number; current: number; accent: string }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? "20px" : "6px", height: "6px", borderRadius: "3px", background: i === current ? accent : "rgba(255,255,255,0.25)", transition: "all 0.3s ease" }} />
      ))}
    </div>
  );
}

const ACCENT = "#E91E8C";
const ACCENT_CTA = "#C41677"; // darker shade of the brand pink specifically for white-text CTAs - #E91E8C at 4.17:1 failed WCAG AA (needs 4.5:1), this hits ~5.6:1. Text/border/decorative uses of the brighter ACCENT are unaffected. Per Sean 2026-07-29.
const TOTAL_SLIDES = 3;

export default function PassportPage() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [activePerk, setActivePerk] = useState(0);
  const [cityIdx, setCityIdx] = useState(0);
  const [cityVisible, setCityVisible] = useState(true);
  const [returnPath, setReturnPath] = useState("/dashboard");
  const [userId, setUserId] = useState<string | null>(null);

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
        setCityIdx((i) => (i + 1) % CITY_IMAGES.length);
        setCityVisible(true);
      }, 700);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const transition = useCallback((fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      setVisible(true);
    }, 320);
  }, []);

  const handleNext = useCallback(() => {
    if (slideIdx < TOTAL_SLIDES - 1) transition(() => setSlideIdx((i) => i + 1));
  }, [slideIdx, transition]);

  const handleBack = useCallback(() => {
    if (slideIdx > 0) transition(() => setSlideIdx((i) => i - 1));
  }, [slideIdx, transition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { if (slideIdx < TOTAL_SLIDES - 1) handleNext(); }
      if (e.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handleBack, slideIdx]);

  // All Access ($11/mo subscription) retired 2026-07-23 along with the Points economy -
  // free signup (registration) is the only path from this page now. Per-artist unlocks
  // happen on the artist's own page (components/ArtistPage.tsx handleUnlockArtist), not here.
  function handleJoin() {
    window.location.href = "/register";
  }

  const perk = PERKS[activePerk];

  return (
    <SiteChrome>
      <style>{CSS}</style>
      <div className="pp-page">

        {/* Fixed background: aurora + stars + city slideshow, behind all 3 slides */}
        <div className="pp-bg" aria-hidden="true">
          <div className="pp-stars" />
          <div className="ppga ppga1" /><div className="ppga ppga2" />
          <div className="ppga ppga3" /><div className="ppga ppga4" />
          <div className="pp-city-stage">
            <img src={CITY_IMAGES[cityIdx]} alt="" aria-hidden="true" className={"pp-city-img" + (cityVisible ? " visible" : "")} />
            <div className="pp-ground" />
          </div>
        </div>

        <div className="pp-slide-outer">
          <div className={"pp-slide-wrap" + (visible ? "" : " hidden")}>

            {/* Slide 1: Landing */}
            {slideIdx === 0 && (
              <div className="pp-hero-content">
                <div className="pp-hero-price">Free to Join</div>
                <h1 className="pp-hero-title">GeekFon Passport</h1>
                <p className="pp-hero-sub">
                  Your membership into the GeekFon universe. Stream every release for free, forever.
                  Go All Access for $11/month to unlock every artist and get 1,100 points a month
                  to download tracks and take them with you.
                </p>
                <button className="pp-hero-cta" onClick={handleNext}>
                  Get Your Passport
                </button>
              </div>
            )}

            {/* Slide 2: Perks (toggle) */}
            {slideIdx === 1 && (
              <div className="pp-perks-wrap">
                <div className="pp-perks-label">What you get</div>
                <h2 className="pp-perks-heading">Passport Member Perks</h2>
                <div className="pp-perk-tabs" role="tablist" aria-label="Passport perks">
                  {PERKS.map((p, i) => (
                    <button
                      key={p.title}
                      role="tab"
                      aria-selected={i === activePerk}
                      className={"pp-perk-tab" + (i === activePerk ? " active" : "")}
                      style={i === activePerk ? { background: p.accent, borderColor: p.accent } : undefined}
                      onClick={() => setActivePerk(i)}
                    >
                      <span aria-hidden="true">{p.icon}</span>
                      {p.short}
                    </button>
                  ))}
                </div>
                <div className="pp-perk-detail" key={activePerk} role="tabpanel">
                  <div className="pp-perk-detail-icon" style={{ color: perk.accent }} aria-hidden="true">{perk.icon}</div>
                  <h3 className="pp-perk-detail-title" style={{ color: perk.accent }}>{perk.title}</h3>
                  <p className="pp-perk-detail-desc">{perk.desc}</p>
                </div>
              </div>
            )}

            {/* Slide 3: Join - single free tier. All Access ($11/mo) and the Points economy
                were retired 2026-07-23; the only paid mechanic now is the one-time $11
                per-artist unlock, sold on each artist's own page. */}
            {slideIdx === 2 && (
              <div className="pp-pricing-wrap">
                <div className="pp-pricing-label">Join GeekFon Society</div>
                <h2 className="pp-pricing-heading">Free to join. Pay only for what you love.</h2>
                <p className="pp-pricing-sub">
                  Membership is free, forever. Stream every released song at no cost. When an artist
                  clicks, unlock their full catalog once for $11 - including anything not out yet.
                </p>

                <div className="pp-pricing-grid pp-pricing-grid-single" role="list">

                  {/* --- FREE --- */}
                  <div className="pp-tier featured" role="listitem">
                    <div className="pp-tier-name">Free Forever</div>
                    <div className="pp-tier-price">Free</div>
                    <div className="pp-tier-period">no card required</div>
                    <ul className="pp-tier-items">
                      <li>Stream every officially released song, always free</li>
                      <li>Preview any track before it drops</li>
                      <li>Full access to GeekFon Radio</li>
                      <li>Vote on the Artist Top 10</li>
                      <li>Unlock any artist&apos;s full catalog once for $11 - yours forever</li>
                    </ul>
                    <button className="pp-tier-btn primary" onClick={handleJoin}>
                      Join Free
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom bar: Back / narration + progress dots / Next - matches the /welcome tour shell */}
        <div className="pp-bottom-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "20px 28px 28px", background: "linear-gradient(to top, rgba(7,7,18,0.95) 0%, transparent 100%)", zIndex: 20 }}>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
            {slideIdx > 0 && (
              <button
                onClick={handleBack}
                className="pp-nav-btn"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "100px", padding: "12px 24px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}
              >
                Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {SLIDE_AUDIO[slideIdx] && <TourNarrationButton key={slideIdx} track={SLIDE_AUDIO[slideIdx]} accent={ACCENT} />}
            <ProgressDots total={TOTAL_SLIDES} current={slideIdx} accent={ACCENT} />
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
            {slideIdx < TOTAL_SLIDES - 1 && (
              <button
                onClick={handleNext}
                className="pp-nav-btn"
                style={{ background: ACCENT_CTA, border: "none", borderRadius: "100px", padding: "12px 32px", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", transition: "transform 0.15s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                Next
              </button>
            )}
          </div>
        </div>

      </div>
    </SiteChrome>
  );
}

