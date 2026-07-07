"use client";

// app/(public)/orientation/page.tsx
// LESARUSS Grand Opening — Orientation / Front Gate content
// Rendered inside app/(public)/layout.tsx — PublicNav + PublicFooter injected automatically.
// No hand-rolled nav or footer here per public page lock (rule 2.7).
//
// Restructured 2026-07-03 (Session I, take 2) into a paginated step deck at
// Sean's request, matching the flow and feel of the Hugh Stewart pitch
// (hq.lesaruss.ai/pitch/hugh-stewart / mock_pages lesaruss/hugh-stewart-pitch):
// sticky progress bar, step counter, one slide visible at a time, fixed
// bottom Back/Next nav, dot jump-nav, keyboard arrow support. Same content
// that lived in the long-scroll version, just paginated instead of stacked.
//
// The interest survey -> matches -> join flow (the real "#begin" step) is
// three of the slides. Those three are gated: the deck's Next button becomes
// that slide's own submit action and only advances on a successful API call,
// everything else pages freely like the reference pitch does.

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXPERIENCES } from "@/lib/experiences";
import { INTEREST_TAGS } from "@/lib/interest-tags";

const HERO = 0;
const WHY = 1;
const PATHS = 2;
const EXPERIENCES_SLIDE = 3;
const PASS_INTRO = 4;
const INTAKE_FORM = 5;
const INTAKE_MATCHES = 6;
const INTAKE_DONE = 7;
const FOUNDING = 8;
const NOTE = 9;
const TOTAL = 10;

interface MatchRow {
  slug: string;
  brand_name: string;
  tagline: string;
}

interface PassInfo {
  pass_number: number;
  points: number;
  is_founding_explorer: boolean;
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const CSS = `
  .or-page { background: #ffffff; color: #1A1A1A; }

  .or-eyebrow { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: rgba(26,26,26,0.4); margin-bottom: 20px; }
  .or-divider { width: 40px; height: 3px; background: #F69820; margin-bottom: 32px; }
  .or-heading { font-size: clamp(22px, 3.5vw, 36px); font-weight: 900; letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 28px; color: #1A1A1A; }
  .or-body { font-size: clamp(15px, 2vw, 17px); font-weight: 300; color: rgba(26,26,26,0.7); line-height: 1.85; margin-bottom: 20px; }

  .or-hero-welcome { font-size: clamp(13px, 2vw, 15px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: #F69820; margin-bottom: 28px; }
  .or-hero-headline { font-size: clamp(24px, 4vw, 42px); font-weight: 300; line-height: 1.45; margin-bottom: 28px; }
  .or-hero-headline strong { font-weight: 900; }
  .or-hero-sub { font-size: clamp(14px, 2vw, 17px); font-weight: 300; color: rgba(26,26,26,0.6); line-height: 1.8; margin-bottom: 40px; }
  .or-hero-invite { font-size: clamp(15px, 2vw, 17px); font-weight: 700; color: #1A1A1A; margin-bottom: 40px; line-height: 1.6; }
  .or-hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
  .or-hint { font-size: 13.5px; color: rgba(26,26,26,0.45); margin-top: 22px; }

  .btn-primary { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; background: #F69820; color: #1A1A1A; padding: 14px 30px; border: none; cursor: pointer; font-family: inherit; text-decoration: none; transition: opacity 0.2s; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-primary:focus-visible { outline: 2px solid #F69820; outline-offset: 3px; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; background: transparent; color: rgba(26,26,26,0.55); padding: 13px 30px; border: 1.5px solid rgba(26,26,26,0.18); cursor: pointer; font-family: inherit; text-decoration: none; transition: border-color 0.2s, color 0.2s; }
  .btn-ghost:hover { border-color: rgba(26,26,26,0.5); color: #1A1A1A; }
  .btn-ghost:focus-visible { outline: 2px solid #F69820; outline-offset: 3px; }

  .or-paths { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 36px 0 0; }
  .or-path-card { padding: 36px 28px; border: 1.5px solid rgba(26,26,26,0.1); background: #ffffff; }
  .or-path-card-primary { border-color: #F69820; }
  .or-path-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.28em; margin-bottom: 14px; }
  .or-path-label-orange { color: #F69820; }
  .or-path-label-muted { color: rgba(26,26,26,0.4); }
  .or-path-title { font-size: 19px; font-weight: 900; margin-bottom: 12px; }
  .or-path-body { font-size: 13px; font-weight: 300; color: rgba(26,26,26,0.6); line-height: 1.75; margin-bottom: 24px; }

  .or-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 36px 0 0; }
  .or-exp-card { padding: 24px 20px; background: #ffffff; border: 1.5px solid rgba(26,26,26,0.08); text-decoration: none; color: #1A1A1A; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.2s, box-shadow 0.2s; }
  .or-exp-card:hover { border-color: rgba(246,152,32,0.4); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  .or-exp-status { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.25em; color: rgba(26,26,26,0.35); }
  .or-exp-name { font-size: 14px; font-weight: 800; line-height: 1.3; }
  .or-exp-desc { font-size: 12px; font-weight: 300; color: rgba(26,26,26,0.55); line-height: 1.65; flex: 1; }
  .or-exp-arrow { color: #F69820; align-self: flex-end; margin-top: 6px; }

  .or-pass { background: #1A1A1A; color: #ffffff; padding: 44px 40px; display: flex; flex-direction: column; gap: 24px; border-radius: 18px; }
  .or-pass-eyebrow { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: #F69820; }
  .or-pass-heading { font-size: clamp(20px, 3.2vw, 30px); font-weight: 900; line-height: 1.2; }
  .or-pass-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .or-pass-item { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; font-weight: 300; color: rgba(255,255,255,0.75); line-height: 1.6; }
  .or-pass-dot { width: 6px; height: 6px; border-radius: 50%; background: #F69820; flex-shrink: 0; margin-top: 7px; }
  .or-pass-sub { font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.7; margin: 0; }

  .or-founding-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; margin-top: 8px; }
  .or-amounts { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
  .or-amount-chip { font-size: 13px; font-weight: 700; padding: 9px 18px; border: 1.5px solid rgba(26,26,26,0.15); color: #1A1A1A; background: transparent; text-decoration: none; display: inline-block; transition: border-color 0.2s, background 0.2s; }
  .or-amount-chip:hover { border-color: #F69820; background: rgba(246,152,32,0.06); }

  .or-note { max-width: 620px; }
  .or-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
  .or-tag { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 5px 12px; border: 1px solid rgba(26,26,26,0.12); color: rgba(26,26,26,0.55); }
  .or-sig-name { font-size: 17px; font-weight: 900; letter-spacing: -0.01em; margin-top: 32px; }
  .or-sig-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; color: rgba(26,26,26,0.4); text-transform: uppercase; margin-top: 4px; }

  /* Orientation intake (inside the deck, dark slides) */
  .or-intake-form { display: flex; flex-direction: column; gap: 20px; }
  .or-intake-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .or-intake-input { flex: 1; min-width: 200px; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.18); color: #ffffff; padding: 12px 14px; font-size: 14px; font-family: inherit; }
  .or-intake-input::placeholder { color: rgba(255,255,255,0.4); }
  .or-intake-input:focus-visible { outline: 2px solid #F69820; outline-offset: 2px; }
  .or-intake-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); margin: 0; }
  .or-intake-tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .or-intake-tag { font-size: 12px; font-weight: 700; padding: 9px 16px; border: 1.5px solid rgba(255,255,255,0.22); color: rgba(255,255,255,0.75); background: transparent; cursor: pointer; font-family: inherit; transition: border-color 0.2s, background 0.2s, color 0.2s; }
  .or-intake-tag:hover { border-color: rgba(255,255,255,0.5); }
  .or-intake-tag:focus-visible { outline: 2px solid #F69820; outline-offset: 2px; }
  .or-intake-tag-active { background: #F69820; border-color: #F69820; color: #1A1A1A; }
  .or-intake-matches { display: flex; flex-direction: column; gap: 10px; }
  .or-intake-match { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1.5px solid rgba(255,255,255,0.18); color: #ffffff; text-decoration: none; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
  .or-intake-match:hover { border-color: rgba(246,152,32,0.5); }
  .or-intake-match input[type="checkbox"] { margin-top: 3px; accent-color: #F69820; }
  .or-intake-match-active { border-color: #F69820; background: rgba(246,152,32,0.08); }
  .or-intake-match span { display: flex; flex-direction: column; gap: 4px; font-size: 14px; font-weight: 700; }
  .or-intake-match-tagline { font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.55); }
  .or-intake-error { font-size: 13px; font-weight: 600; color: #F69820; margin: 0; }

  /* Deck chrome, modeled on the Hugh Stewart pitch pagination pattern */
  .od-topbar { position: sticky; top: 62px; z-index: 50; background: #ffffff; border-bottom: 1px solid rgba(26,26,26,0.08); }
  .od-progress { height: 4px; background: #f5f5f5; }
  .od-progress-fill { height: 100%; background: #F69820; transition: width 0.35s ease; }
  .od-topbar-row { display: flex; align-items: center; justify-content: flex-end; padding: 10px 24px; max-width: 900px; margin: 0 auto; }
  .od-count { font-size: 12px; font-weight: 800; color: rgba(26,26,26,0.4); letter-spacing: 0.08em; }
  .od-stage { max-width: 860px; margin: 0 auto; padding: 56px 24px 140px; min-height: 58vh; }
  .od-slide { animation: odFade 0.4s ease; }
  @keyframes odFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .od-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-top: 1px solid rgba(26,26,26,0.08); }
  .od-nav-row { max-width: 860px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 24px; }
  .od-btn { display: inline-flex; align-items: center; gap: 9px; font-family: inherit; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 22px; border-radius: 999px; border: 1.5px solid rgba(26,26,26,0.15); background: #ffffff; color: #1A1A1A; cursor: pointer; }
  .od-btn:hover { border-color: #1A1A1A; }
  .od-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .od-btn:disabled:hover { border-color: rgba(26,26,26,0.15); }
  .od-btn-primary { background: #1A1A1A; color: #ffffff; border-color: transparent; }
  .od-btn-primary:hover { background: #000000; }
  .od-dots { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
  .od-dots button { width: 9px; height: 9px; border-radius: 50%; border: none; background: #d6d6d6; cursor: pointer; padding: 0; }
  .od-dots button:focus-visible { outline: 2px solid #F69820; outline-offset: 2px; }
  .od-dots button.on { background: #F69820; transform: scale(1.25); }
  .od-guard { font-size: 14px; color: rgba(26,26,26,0.6); }
  .od-guard-dark { font-size: 14px; color: rgba(255,255,255,0.7); }

  @media (max-width: 768px) {
    .od-stage { padding: 40px 20px 150px; }
    .or-paths { grid-template-columns: 1fr; }
    .or-grid { grid-template-columns: 1fr 1fr; }
    .or-founding-grid { grid-template-columns: 1fr; gap: 32px; }
    .or-pass { padding: 32px 24px; }
  }
  @media (max-width: 620px) {
    .od-dots { display: none; }
    .od-nav-row { padding: 12px 18px; }
  }
  @media (max-width: 480px) {
    .or-grid { grid-template-columns: 1fr; }
    .or-hero-actions { flex-direction: column; }
    .btn-primary, .btn-ghost { width: 100%; justify-content: center; }
  }
`;

export default function OrientationPage() {
  const [step, setStep] = useState(0);

  // Intake state, shared across the three gated slides.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pass, setPass] = useState<PassInfo | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function toggleInterest(slug: string) {
    setInterests((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function toggleSelected(slug: string) {
    setSelected((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  async function submitInterests() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email to claim your pass.");
      return;
    }
    if (interests.length === 0) {
      setError("Pick at least one thing you're interested in.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orientation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, interests }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const rankedMatches: MatchRow[] = data.matches || [];
      setMatches(rankedMatches);
      setSelected(rankedMatches.map((m) => m.slug));
      setPass({ pass_number: data.pass_number, points: data.points, is_founding_explorer: data.is_founding_explorer });
      setStep(INTAKE_MATCHES);
    } catch {
      setError("Something went wrong on our end. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmJoin() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orientation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, interests: selected }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPass({ pass_number: data.pass_number, points: data.points, is_founding_explorer: data.is_founding_explorer });
      setJoined(true);
      setStep(INTAKE_DONE);
    } catch {
      setError("Something went wrong on our end. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function go(n: number) {
    setStep(Math.max(0, Math.min(TOTAL - 1, n)));
  }

  function handlePrimaryAction() {
    if (step === INTAKE_FORM) {
      submitInterests();
      return;
    }
    if (step === INTAKE_MATCHES) {
      confirmJoin();
      return;
    }
    if (step === NOTE) {
      go(0);
      return;
    }
    goNext();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") handlePrimaryAction();
      else if (e.key === "ArrowLeft") goBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, email, interests, selected, loading]);

  const primaryLabel =
    step === INTAKE_FORM ? (loading ? "Finding your matches..." : "Claim Your Explorer Pass") :
    step === INTAKE_MATCHES ? (loading ? "Joining..." : "Join Selected & Enter") :
    step === NOTE ? "Start Over" :
    "Next";

  const joinedMatches = matches.filter((m) => selected.includes(m.slug));

  return (
    <div className="or-page">
      <style>{CSS}</style>

      <div className="od-topbar">
        <div className="od-progress">
          <div className="od-progress-fill" style={{ width: `${(step / (TOTAL - 1)) * 100}%` }} />
        </div>
        <div className="od-topbar-row">
          <span className="od-count">{String(step + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="od-stage">
        {step === HERO && (
          <div className="od-slide" aria-labelledby="or-hero-heading">
            <p className="or-hero-welcome">Welcome.</p>
            <h1 id="or-hero-heading" className="or-hero-headline">
              If you&rsquo;ve ever wished there was one place where you could{" "}
              <strong>learn, create, grow, contribute,</strong> and find people who
              genuinely care about making the world a little better&hellip;
            </h1>
            <p className="or-hero-sub">Welcome. You&rsquo;ve just discovered LESARUSS.</p>
            <p className="or-hero-sub">
              This isn&rsquo;t a typical website. It&rsquo;s a collection of
              interconnected experiences built over nearly thirty years, designed to
              help people grow individually while building stronger communities together.
            </p>
            <p className="or-hero-invite">
              Today, I&rsquo;m opening the front gate. I&rsquo;d love to invite you inside.
            </p>
            <div className="or-hero-actions">
              <button className="btn-primary" onClick={goNext}>
                Begin Orientation <ArrowRight />
              </button>
              <button className="btn-ghost" onClick={() => go(NOTE)}>
                Meet Sean
              </button>
            </div>
            <p className="or-hint">A guided walkthrough. Use Next, or your arrow keys, to move through.</p>
          </div>
        )}

        {step === WHY && (
          <div className="od-slide" aria-labelledby="or-why-heading">
            <div className="or-divider" aria-hidden="true" />
            <p className="or-eyebrow">Why This Exists</p>
            <h2 id="or-why-heading" className="or-heading">Thirty years of building. One connected universe.</h2>
            <p className="or-body">
              Over the past three decades I&rsquo;ve had the privilege of building
              communities around education, creativity, veganism, technology, anime,
              entrepreneurship, media, travel, and personal transformation.
            </p>
            <p className="or-body">
              Each project taught me something valuable. Eventually I realized they
              weren&rsquo;t separate projects. They were pieces of the same puzzle.
            </p>
            <p className="or-body">
              LESARUSS brings those pieces together into one connected universe
              where every experience helps people discover something new about
              themselves while contributing to something larger than themselves.
            </p>
          </div>
        )}

        {step === PATHS && (
          <div className="od-slide" aria-labelledby="or-paths-heading">
            <p className="or-eyebrow">Choose Your Own Adventure</p>
            <h2 id="or-paths-heading" className="or-heading">There isn&rsquo;t a wrong path. Only your path.</h2>
            <div className="or-paths">
              <div className="or-path-card or-path-card-primary">
                <p className="or-path-label or-path-label-orange">Guided</p>
                <h3 className="or-path-title">Begin Orientation</h3>
                <p className="or-path-body">
                  Orientation introduces you to the LESARUSS Universe one step at
                  a time. Get your Explorer Pass, discover which experiences match
                  your interests, and join a community building something meaningful.
                </p>
                <button className="btn-primary" onClick={() => go(INTAKE_FORM)}>
                  Start Here <ArrowRight />
                </button>
              </div>
              <div className="or-path-card">
                <p className="or-path-label or-path-label-muted">Explore Freely</p>
                <h3 className="or-path-title">Choose Your First Experience</h3>
                <p className="or-path-body">
                  Others prefer to immediately begin exploring the experiences that
                  interest them most. Browse everything below and start wherever
                  feels right.
                </p>
                <button className="btn-ghost" onClick={() => go(EXPERIENCES_SLIDE)}>
                  Explore the Universe <ArrowRight />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === EXPERIENCES_SLIDE && (
          <div className="od-slide" aria-labelledby="or-exp-heading">
            <p className="or-eyebrow">Choose Your First Experience</p>
            <h2 id="or-exp-heading" className="or-heading">Every experience exists to serve a different community.</h2>
            <p className="or-body">
              Some experiences are fully open. Others are opening over the coming
              days. Every one of them is part of the same journey.
            </p>
            <div className="or-grid" role="list">
              {EXPERIENCES.map((exp) => (
                <Link key={exp.slug} href={exp.href} className="or-exp-card" role="listitem">
                  <span className="or-exp-status">
                    {exp.status === "available" ? "Available Now" : "Opening During Orientation"}
                  </span>
                  <span className="or-exp-name">{exp.name}</span>
                  <span className="or-exp-desc">{exp.description}</span>
                  <span className="or-exp-arrow" aria-hidden="true"><ArrowRight /></span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {step === PASS_INTRO && (
          <div className="od-slide" aria-labelledby="or-pass-heading">
            <div className="or-pass">
              <p className="or-pass-eyebrow">Explorer Pass</p>
              <h2 id="or-pass-heading" className="or-pass-heading">Every Explorer begins with an Explorer Pass.</h2>
              <ul className="or-pass-list">
                {[
                  "Personalized Orientation",
                  "Daily Pulse",
                  "Early access to every experience",
                  "111 LESARUSS Points",
                  "Opportunities to help shape the future of the community",
                ].map((item) => (
                  <li key={item} className="or-pass-item">
                    <span className="or-pass-dot" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="or-pass-sub">The more you participate, the more meaningful your journey becomes.</p>
            </div>
          </div>
        )}

        {step === INTAKE_FORM && (
          <div className="od-slide" aria-labelledby="or-pass-heading">
            <div className="or-pass">
              <p className="or-pass-eyebrow">Claim Your Explorer Pass</p>
              <h2 id="or-pass-heading" className="or-pass-heading">What are you interested in?</h2>
              <div className="or-intake-form">
                <div className="or-intake-row">
                  <input
                    className="or-intake-input"
                    type="text"
                    placeholder="First name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="given-name"
                  />
                  <input
                    className="or-intake-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <p className="or-intake-label">Pick as many as apply.</p>
                <div className="or-intake-tags" role="group" aria-label="Your interests">
                  {INTEREST_TAGS.map((tag) => {
                    const active = interests.includes(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => toggleInterest(tag.slug)}
                        aria-pressed={active}
                        className={"or-intake-tag" + (active ? " or-intake-tag-active" : "")}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
                {error && <p className="or-intake-error" role="alert">{error}</p>}
              </div>
            </div>
          </div>
        )}

        {step === INTAKE_MATCHES && (
          <div className="od-slide" aria-labelledby="or-pass-heading">
            <div className="or-pass">
              <p className="or-pass-eyebrow">Your Matches</p>
              {pass ? (
                <>
                  <h2 id="or-pass-heading" className="or-pass-heading">You&rsquo;re Explorer #{pass.pass_number}.</h2>
                  <p className="or-pass-sub">Here is what matches what you told us. Joining is free, select as many as you like.</p>
                  {matches.length === 0 ? (
                    <p className="or-pass-sub">
                      Nothing matched exactly yet, but your pass is active. Explore everything and come back
                      any time to add interests.
                    </p>
                  ) : (
                    <div className="or-intake-matches">
                      {matches.map((m) => {
                        const active = selected.includes(m.slug);
                        return (
                          <label key={m.slug} className={"or-intake-match" + (active ? " or-intake-match-active" : "")}>
                            <input type="checkbox" checked={active} onChange={() => toggleSelected(m.slug)} />
                            <span>
                              <strong>{m.brand_name}</strong>
                              <span className="or-intake-match-tagline">{m.tagline}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {error && <p className="or-intake-error" role="alert">{error}</p>}
                </>
              ) : (
                <>
                  <h2 id="or-pass-heading" className="or-pass-heading">Complete your interests first.</h2>
                  <p className="od-guard-dark">You have not claimed your Explorer Pass yet.</p>
                  <button className="btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => go(INTAKE_FORM)}>
                    Go Back <ArrowRight />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === INTAKE_DONE && (
          <div className="od-slide" aria-labelledby="or-pass-heading">
            <div className="or-pass">
              <p className="or-pass-eyebrow">Explorer Pass</p>
              {joined && pass ? (
                <>
                  <h2 id="or-pass-heading" className="or-pass-heading">
                    You are Explorer #{pass.pass_number}
                    {pass.is_founding_explorer ? ", a Founding Explorer" : ""}.
                  </h2>
                  <p className="or-pass-sub">{pass.points} LESARUSS Points are on your pass.</p>
                  {joinedMatches.length > 0 && (
                    <div className="or-intake-matches">
                      {joinedMatches.map((m) => (
                        <Link key={m.slug} href={`/c/${m.slug}`} className="or-intake-match">
                          <span>
                            <strong>{m.brand_name}</strong>
                            <span className="or-intake-match-tagline">{m.tagline}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <p className="or-pass-sub">
                    Your Pulse will start routing you updates from everything you joined. Come back any time to add more.
                  </p>
                </>
              ) : (
                <>
                  <h2 id="or-pass-heading" className="or-pass-heading">Select what you want to join first.</h2>
                  <button className="btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => go(INTAKE_MATCHES)}>
                    Go Back <ArrowRight />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === FOUNDING && (
          <div className="od-slide" aria-labelledby="or-founding-heading">
            <div className="or-founding-grid">
              <div>
                <p className="or-eyebrow">Founding Explorers</p>
                <h2 id="or-founding-heading" className="or-heading">
                  This community isn&rsquo;t being built for people. It&rsquo;s being built with people.
                </h2>
                <p className="or-body">
                  If you believe in what we&rsquo;re creating and would like to
                  help bring it to life, I&rsquo;d love to invite you to become a
                  Founding Explorer.
                </p>
                <p className="or-body">
                  Every contribution helps us build new experiences, support
                  community leaders, and continue creating resources that help
                  people learn, connect, and contribute.
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: "rgba(26,26,26,0.45)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  There is no required amount.
                </p>
                <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(26,26,26,0.6)", marginBottom: 20, lineHeight: 1.7 }}>
                  Our suggested founding contribution is $11, but you&rsquo;re
                  welcome to contribute whatever feels meaningful to you.
                </p>
                <div className="or-amounts">
                  {["$11", "$25", "$50", "$111", "$360"].map((amt) => (
                    <Link key={amt} href={`/founding-explorer?amount=${amt.replace("$", "")}`} className="or-amount-chip">
                      {amt}
                    </Link>
                  ))}
                  <Link href="/founding-explorer" className="or-amount-chip">Custom</Link>
                </div>
                <Link href="/founding-explorer" className="btn-primary" style={{ marginTop: 8 }}>
                  Become a Founding Explorer <ArrowRight />
                </Link>
              </div>
            </div>
          </div>
        )}

        {step === NOTE && (
          <div className="od-slide" aria-labelledby="or-note-heading">
            <div className="or-note">
              <div className="or-divider" aria-hidden="true" />
              <p className="or-eyebrow">A Personal Note</p>
              <h2 id="or-note-heading" className="or-heading">
                Whether we&rsquo;ve met before or today is our first conversation&hellip;
              </h2>
              <p className="or-body">Thank you for being here.</p>
              <div className="or-tags">
                {["Anime 3000", "Vegans Explore", "BCPS", "UCF", "Russell's Roving Reporters", "Chester is Cool"].map((c) => (
                  <span key={c} className="or-tag">{c}</span>
                ))}
              </div>
              <p className="or-body">
                You&rsquo;re arriving at the beginning of something I&rsquo;ve
                dreamed about building for a very long time. I&rsquo;m grateful
                you&rsquo;re here. I hope you&rsquo;ll join us as we continue
                building it together.
              </p>
              <p className="or-body" style={{ fontWeight: 600, color: "#1A1A1A" }}>See you inside.</p>
              <p className="or-sig-name">Sean A. Russell</p>
              <p className="or-sig-title">Founder, LESARUSS</p>
            </div>
          </div>
        )}
      </div>

      <nav className="od-nav">
        <div className="od-nav-row">
          <button className="od-btn" onClick={goBack} disabled={step === 0} aria-label="Previous step">
            Back
          </button>
          <div className="od-dots">
            {Array.from({ length: TOTAL }).map((_, idx) => (
              <button
                key={idx}
                className={idx === step ? "on" : ""}
                aria-label={`Go to step ${idx + 1}`}
                onClick={() => go(idx)}
              />
            ))}
          </div>
          <button
            className="od-btn od-btn-primary"
            onClick={handlePrimaryAction}
            disabled={loading}
            aria-label="Next step"
          >
            {primaryLabel}
          </button>
        </div>
      </nav>
    </div>
  );
}
