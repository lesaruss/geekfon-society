"use client";
import { useState, useCallback, useEffect } from "react";
import SiteChrome from "@/components/SiteChrome";

// ── The GeekFon Society Story ──────────────────────────────────────────────
// Case-study format (same beat/pagination pattern as app/welcome/page.tsx),
// built directly into the live dark theme + SiteChrome — not a bolted-on
// look and feel. Content is Sean's verbatim two-part narration (locked in
// the geekfon-society-blueprint canon doc, 2026-09-06), split into beats per
// his brief: why this was created, why he's qualified, what a member can
// expect, and a glimpse of the roster's genre range.

type Beat = {
  id: string;
  eyebrow: string;
  headline: string;
  lede: string;
  body: string;
  accent: string;
};

const BEATS: Beat[] = [
  {
    id: "genesis",
    eyebrow: "Why This Was Created",
    headline: "A universe I've had\nin my head since I was a child.",
    lede: "This is what's in my heart about GeekFon Society.",
    body:
      "Right now, we're entering the age of AI. And as I stepped into this new landscape, I'm now realizing that I can do the thing that I've always wanted to do, and that's build a universe. I've always admired George Lucas and Steven Spielberg and all of these different creators, because they had the ability to build these vast worlds. I just never had the resources to do it the way I've always wanted to do it. I'm taking everything I've learned across my career and putting it into my own universe where I get to create the characters. What you're seeing at GeekFon is the creation of one person, with the assistance of AI — everything from the websites to the characters, to the animation, to the music. GeekFon Society for me is more than just AI music. For me, it is me finally being able to create the universe I've had in my head since I was a child.",
    accent: "#E91E8C",
  },
  {
    id: "qualified",
    eyebrow: "Why I'm Qualified to Build It",
    headline: "Fourteen years in anime.\nTen years in music.",
    lede: "This has been seen throughout my entire life.",
    body:
      "I've built community after community in the anime space — over fourteen years deep in that world, speaking on panels, hosting events, launching podcasts that reach millions of people, speaking to the creators of these popular shows, honing my taste for this craft. And I spent over ten years in the music industry: speaking to hundreds of popular and independent artists, learning their struggles and their process, managing my own artists, becoming my own artist, releasing over sixty songs, hosting my own events and showcases, starting my own record label, touring the country, becoming a producer in this field. A lot of the music you're hearing on GeekFon are songs I've been sitting on for years, now repurposed for the artists I'm creating.",
    accent: "#F69820",
  },
  {
    id: "expect",
    eyebrow: "What You Can Expect",
    headline: "Step into the universe.\nMeet the roster.",
    lede: "So what you're doing now is stepping into this universe.",
    body:
      "You'll get to meet each artist on our roster — not just their music, but their social feed, articles about their backstory, and what's going on in their world. We're building out video series over time: a horror series with Rustblood Prophets, an action-thriller with Lex, slice-of-life anime with Shamanic Resin, romcom with Roxanne. We release new songs weekly, and members get first access — sometimes multiple versions of a song — plus remixes exclusive to Passport members. This is music that's uplifting: something your whole family can listen to, that you can play anywhere, built to help people level up, learn, move, dance, and feel inspired about what's possible — while demonstrating a genuinely positive, constructive use of AI.",
    accent: "#00BCD4",
  },
  {
    id: "genres",
    eyebrow: "A Glimpse Into the Universe",
    headline: "Every genre.\nOne roster.",
    lede: "This is probably the thing least said about GeekFon.",
    body:
      "We do everything from J-Pop and K-Pop to R&B, hip-hop, German death metal, country pop, hip-hop fusion, Amapiano out of South Africa, reggaeton, and dembow out of the Dominican Republic. And it keeps growing — new ideas, new artists, all the time.",
    accent: "#9C27B0",
  },
  {
    id: "join",
    eyebrow: "Meet the Roster",
    headline: "This is\nGeekFon Society.",
    lede: "Come find out what's possible.",
    body:
      "Eleven artists and counting, every genre on the map, new songs every week, and a universe that's only getting bigger. Your Passport gets you in.",
    accent: "#AAFF00",
  },
];

const GENRE_CHIPS: { label: string; accent: string }[] = [
  { label: "J-Pop", accent: "#E91E8C" },
  { label: "K-Pop", accent: "#9C27B0" },
  { label: "R&B", accent: "#F69820" },
  { label: "Hip-Hop", accent: "#2196F3" },
  { label: "German Death Metal", accent: "#F44336" },
  { label: "Country Pop", accent: "#A1887F" },
  { label: "Hip-Hop Fusion", accent: "#4CAF50" },
  { label: "Amapiano", accent: "#FFB300" },
  { label: "Reggaeton", accent: "#00BCD4" },
  { label: "Dembow", accent: "#FF5722" },
];

const ROSTER_TEASER: { name: string; genre: string; accent: string }[] = [
  { name: "Roxanne", genre: "J-Pop · Tokyo", accent: "#E91E8C" },
  { name: "Lex from Brixton", genre: "Hip-Hop · London", accent: "#F69820" },
  { name: "Shamanic Resin", genre: "K-Pop · Seoul", accent: "#9C27B0" },
  { name: "Riku Hayasaka", genre: "J-Pop · Japan", accent: "#2196F3" },
  { name: "Nilo Wave", genre: "Reggaeton · Puerto Rico", accent: "#00BCD4" },
  { name: "Likkle Bro", genre: "Dancehall · London", accent: "#4CAF50" },
  { name: "Likkle Sis", genre: "Dembow · London", accent: "#FF5722" },
  { name: "Mad Tings", genre: "Hip-Hop · London", accent: "#E91E63" },
  { name: "Mr. Russell", genre: "Hip-Hop · NYC", accent: "#90A4AE" },
  { name: "Rustblood Prophets", genre: "Alternative · Berlin", accent: "#F44336" },
  { name: "Straight and Narrow", genre: "Country · Nashville", accent: "#A1887F" },
  { name: "Vuka", genre: "Amapiano · Johannesburg", accent: "#FFB300" },
];

function ProgressDots({ total, current, accent }: { total: number; current: number; accent: string }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? "20px" : "6px", height: "6px", borderRadius: "3px", background: i === current ? accent : "rgba(255,255,255,0.25)", transition: "all 0.3s ease" }} />
      ))}
    </div>
  );
}

function QuoteCard({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.45)",
      border: `1px solid ${accent}40`,
      borderRadius: "16px",
      padding: "32px 28px",
      backdropFilter: "blur(8px)",
      boxShadow: `0 0 40px ${accent}20, inset 0 0 30px rgba(0,0,0,0.3)`,
      position: "relative",
    }}>
      <div style={{ fontSize: "48px", lineHeight: 1, color: accent, opacity: 0.5, marginBottom: "4px", fontFamily: "Georgia, serif" }}>&ldquo;</div>
      <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.85)", margin: 0, fontStyle: "italic" }}>{text}</p>
    </div>
  );
}

function CredentialsList() {
  const rows = [
    { label: "14+ years", sub: "Anime space — panels, events, podcasts reaching millions", color: "#F69820" },
    { label: "10+ years", sub: "Music industry — artists, managers, labels, touring", color: "#E91E8C" },
    { label: "60+ songs", sub: "Released as an artist himself before GeekFon existed", color: "#9C27B0" },
    { label: "1 universe", sub: "Every character, world, and system built by one person, with AI", color: "#AAFF00" },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden" }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: i < rows.length - 1 ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#fff" }}>{r.label}</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{r.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpectList() {
  const items = [
    { label: "Artist Pulse feeds", sub: "Music, photos, video, day-to-day", color: "#E91E8C" },
    { label: "Backstory articles", sub: "The world behind every artist", color: "#F69820" },
    { label: "New songs weekly", sub: "Members get first access", color: "#00BCD4" },
    { label: "Passport exclusives", sub: "Remixes and alternate versions", color: "#AAFF00" },
    { label: "Animated series", sub: "Horror, action, slice-of-life, romcom — coming", color: "#9C27B0" },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden" }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderBottom: i < items.length - 1 ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: it.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{it.label}</div>
            <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GenreChips() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {GENRE_CHIPS.map((g) => (
        <span key={g.label} style={{
          fontSize: "12px", fontWeight: 700, letterSpacing: "0.02em", color: "#fff",
          padding: "8px 14px", borderRadius: "100px",
          background: `${g.accent}22`, border: `1px solid ${g.accent}70`,
        }}>
          {g.label}
        </span>
      ))}
      <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.45)", padding: "8px 4px" }}>
        + new artists added regularly
      </span>
    </div>
  );
}

function RosterTeaser() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {ROSTER_TEASER.map((a) => (
        <div key={a.name} style={{ background: "rgba(255,255,255,0.04)", border: `0.5px solid ${a.accent}50`, borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{a.name}</div>
          <div style={{ fontSize: "10px", fontWeight: 600, color: a.accent, marginTop: "3px", letterSpacing: "0.03em" }}>{a.genre}</div>
        </div>
      ))}
    </div>
  );
}

function BeatVisual({ beat }: { beat: Beat }) {
  switch (beat.id) {
    case "genesis":
      return <QuoteCard text={beat.body} accent={beat.accent} />;
    case "qualified":
      return <CredentialsList />;
    case "expect":
      return <ExpectList />;
    case "genres":
      return <GenreChips />;
    case "join":
      return <RosterTeaser />;
    default:
      return null;
  }
}

export default function StoryPage() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const isLast = step === BEATS.length - 1;
  const beat = BEATS[step];

  const go = useCallback((next: number) => {
    if (next < 0 || next >= BEATS.length) return;
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 280);
  }, []);

  const handleNext = useCallback(() => go(step + 1), [go, step]);
  const handleBack = useCallback(() => go(step - 1), [go, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") handleNext();
      if (e.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handleBack]);

  return (
    <SiteChrome>
      <div style={{ minHeight: "100dvh", background: "#070712", color: "white", fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        <style>{`
          @keyframes gfsStoryFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          .gfs-story-content { animation: gfsStoryFadeUp 0.45s ease forwards; }
          .gfs-story-wrap { display:flex; flex-direction:column; width:100%; align-items:flex-start; }
          .gfs-story-text { width:100%; padding:28px 20px 16px; min-width:0; box-sizing:border-box; }
          .gfs-story-visual { width:100%; padding:0 20px 32px; min-width:0; box-sizing:border-box; }
          @media(min-width:900px){
            .gfs-story-wrap { flex-direction:row; align-items:center; }
            .gfs-story-text { width:52%; flex:0 0 52%; padding:48px 32px 0 56px; }
            .gfs-story-visual { width:48%; flex:0 0 48%; padding:48px 48px 0 16px; }
          }
        `}</style>

        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 0 100px", position: "relative", zIndex: 10, width: "100%" }}>
          <div key={step} className="gfs-story-content" style={{ width: "100%", opacity: visible ? 1 : 0, transition: "opacity 0.28s ease" }}>
            <div className="gfs-story-wrap">
              <div className="gfs-story-text">
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: beat.accent, opacity: 0.85 }}>
                    {beat.eyebrow} — {step + 1} of {BEATS.length}
                  </span>
                </div>
                <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 14px", letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                  {beat.headline}
                </h1>
                <p style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.05rem)", fontWeight: 600, color: beat.accent, margin: "0 0 14px", lineHeight: 1.5 }}>
                  {beat.lede}
                </p>
                {beat.id !== "genesis" && (
                  <p style={{ fontSize: "clamp(0.85rem, 1.5vw, 0.95rem)", fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: "0 0 30px" }}>
                    {beat.body}
                  </p>
                )}
                {isLast && (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <a
                      href="/passport"
                      style={{ display: "inline-block", background: beat.accent, color: "#070712", textDecoration: "none", borderRadius: "100px", padding: "16px 40px", fontSize: "1rem", fontWeight: 800, letterSpacing: "0.04em" }}
                    >
                      Get Your Passport
                    </a>
                    <a
                      href="/roster"
                      style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", color: "white", textDecoration: "none", borderRadius: "100px", padding: "16px 32px", fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.04em", border: "1.5px solid rgba(255,255,255,0.18)" }}
                    >
                      See the Full Roster
                    </a>
                  </div>
                )}
              </div>
              <div className="gfs-story-visual">
                <BeatVisual beat={beat} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar: Back / progress dots / Next — same control pattern as /welcome */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "20px 28px 28px", background: "linear-gradient(to top, rgba(7,7,18,0.95) 0%, transparent 100%)", zIndex: 20 }}>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
            {step > 0 && (
              <button
                onClick={handleBack}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "100px", padding: "12px 24px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}
              >
                Back
              </button>
            )}
          </div>
          <ProgressDots total={BEATS.length} current={step} accent={beat.accent} />
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
            <a href="/passport" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", textDecoration: "none", textTransform: "uppercase" }}>
              Skip
            </a>
            {!isLast && (
              <button
                onClick={handleNext}
                style={{ background: beat.accent, border: "none", borderRadius: "100px", padding: "12px 32px", color: "#070712", fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" }}
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
