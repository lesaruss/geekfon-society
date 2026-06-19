"use client";
import { useState, useEffect, useCallback, type ReactElement } from "react";

type Role = "fan" | "label" | "brand" | "promoter";
type Phase = "welcome" | "picker" | "path";

interface SlideData {
  id: string;
  headline: string;
  body: string;
  accent: string;
  detail?: string;
  cta?: { label: string; href: string };
}

const ROLE_META: Record<Role, { label: string; tagline: string; accent: string; icon: ReactElement }> = {
  fan: {
    label: "Music Fan",
    tagline: "Discover artists, earn points, unlock everything",
    accent: "#E91E8C",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <circle cx="14" cy="26" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <circle cx="30" cy="22" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M19 26V10L35 6V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  label: {
    label: "Record Label",
    tagline: "License original IP built for the real world",
    accent: "#9C27B0",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <circle cx="20" cy="20" r="3" fill="currentColor"/>
        <path d="M20 8 V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  brand: {
    label: "Brand",
    tagline: "Integrate into a culture-forward global community",
    accent: "#F69820",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <path d="M8 20 L20 8 L32 20 L20 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
        <circle cx="20" cy="20" r="4" fill="currentColor"/>
      </svg>
    ),
  },
  promoter: {
    label: "Promoter",
    tagline: "Book live acts that make every show a moment",
    accent: "#00BCD4",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <rect x="6" y="12" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M14 12V8M26 12V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M6 18H34" stroke="currentColor" strokeWidth="2"/>
        <circle cx="20" cy="26" r="3" fill="currentColor"/>
      </svg>
    ),
  },
};

const PATH_SLIDES: Record<Role, SlideData[]> = {
  fan: [
    {
      id: "fan-artists",
      headline: "Meet the Artists",
      body: "Nine original characters. Every genre. Every city.",
      detail: "Roxanne. Shamanic Resin. Riku Hayasaka. Lex from Brixton. Nilo Wave. Lickle Bro and Lickle Sis. Mr. Russell. Straight and Narrow. Each has a full biography, a discography, a Pulse feed, and a world of their own. None of them are real. All of the music is.",
      accent: "#E91E8C",
    },
    {
      id: "fan-pulse",
      headline: "The Pulse",
      body: "Your favorite artist posts every day. You're in the conversation.",
      detail: "Video, photo, text - the Pulse is each artist's personal feed. Comment on a post. React to a drop. The artist responds. This is not a playlist. This is a living relationship with a character who shows up every day.",
      accent: "#F69820",
    },
    {
      id: "fan-tokens",
      headline: "Points Unlock\nEverything",
      body: "Start for about $11. Unlock songs, wallpapers, and more.",
      detail: "About 1,000 points for $11-12. Unlock a single song for 50 points. Full artist access - every track, every drop, every update - for 1,000 points. Collect multiple artists. Bank points. New unlockable content will keep appearing as the Society grows.",
      accent: "#9C27B0",
    },
    {
      id: "fan-voting",
      headline: "Vote. Rank. Impact.",
      body: "Your votes shape what the whole Society hears.",
      detail: "Every point you spend on an artist counts as a vote. Rankings update in real time. The top-ranked artists get featured on GeekFon Radio. Your support is not just appreciation - it moves artists up the board and onto the mic.",
      accent: "#2196F3",
    },
    {
      id: "fan-radio",
      headline: "GeekFon Radio",
      body: "Every week. New songs. Real interviews. The artists you made famous.",
      detail: "GeekFon Radio is the weekly podcast where the Society goes public. New song debuts. Artist interviews. Features from inside the universe. The artists who earned their ranking earned the spotlight. You helped put them there.",
      accent: "#00BCD4",
      cta: { label: "Join the Society", href: "/passport" },
    },
  ],
  label: [
    {
      id: "label-ip",
      headline: "An IP Universe\nReady to License",
      body: "Original fictional artists on every streaming platform.",
      detail: "GeekFon Society is fully distributed via DistroKid - available on Spotify, Apple Music, and every major platform. The roster spans genres: pop, alternative, hip-hop, electronic, and beyond. All original LESARUSS IP. No sample clearances. No competing rights.",
      accent: "#9C27B0",
    },
    {
      id: "label-licensing",
      headline: "Sync. Advertising.\nEvents.",
      body: "License tracks for placements, campaigns, and live use.",
      detail: "DistroKit licensing enables commercial partners to use GeekFon music for sync placements, advertising, and event programming. The music earns streaming royalties as standard. B2B licensing opens a separate, direct revenue channel for both sides.",
      accent: "#E91E8C",
    },
    {
      id: "label-pipeline",
      headline: "The Proof of Concept",
      body: "Every system here is being proven for the real-artist market.",
      detail: "GeekFon Society is the fictional prototype for TalentVangelist, the LESARUSS real-artist development agency. Fan engagement systems, PR pipelines, content production, and the token economy are all being built and tested here first. A label that partners with GeekFon now partners with the infrastructure that will run TalentVangelist at scale.",
      accent: "#F69820",
    },
    {
      id: "label-cta",
      headline: "Let's Talk\nLicensing",
      body: "GeekFon Society is actively expanding its licensing and partnership pipeline.",
      detail: "We are open to sync licensing, master licensing, catalog co-ownership discussions, and distribution partnerships. If you work with original IP and are looking for clean, commercial-ready music built for the modern era, this is the conversation.",
      accent: "#9C27B0",
      cta: { label: "Get In Touch", href: "mailto:contact@lesaruss.com" },
    },
  ],
  brand: [
    {
      id: "brand-audience",
      headline: "Six Cities.\nOne Community.",
      body: "London. Tokyo. Seoul. Fort Lauderdale. Berlin. Johannesburg.",
      detail: "GeekFon Society is a global music community organized around cities and built around daily content, live events, and a points economy. The audience is music-first, culture-forward, and already spending. Six active cities with more launching in Season 2.",
      accent: "#F69820",
    },
    {
      id: "brand-ecosystem",
      headline: "The Points\nEcosystem",
      body: "Your brand is inside the unlock, not on top of it.",
      detail: "Fans buy points to support artists, unlock content, and participate in rankings. Brands can sponsor point packages, fund artist moments, or create exclusive drops. When a fan unlocks something your brand powered, your name belongs in that moment - not over it.",
      accent: "#E91E8C",
    },
    {
      id: "brand-events",
      headline: "Live Activations\nThat Get Filmed",
      body: "Every show is a content shoot. Every activation feeds the archive.",
      detail: "GeekFon Society produces events at anime conventions, after-parties, and city-based activations. Every event produces footage for the Pulse feed, the animated series pipeline, and the archive. A sponsorship here is not a banner at one event. It is content that lives in the universe.",
      accent: "#2196F3",
    },
    {
      id: "brand-cta",
      headline: "Your Brand Inside\nthe Universe",
      body: "Integrations that belong in the world. Not ads. Moments.",
      detail: "We build sponsor relationships that feel native to the GeekFon universe. Your brand does not interrupt the experience. It enhances it. If that is the kind of partnership you are looking for, let's build it.",
      accent: "#F69820",
      cta: { label: "Become a Sponsor", href: "mailto:contact@lesaruss.com" },
    },
  ],
  promoter: [
    {
      id: "promoter-live",
      headline: "GeekFon Society\nGoes Live",
      body: "Full production. Every show. Lord Zorlat on the decks.",
      detail: "GeekFon Society produces live events at anime conventions, club after-parties, theater events, and city activations. The Lord Zorlat DJ set is the flagship live experience: full GeekFon visual production, original music, and the energy of a universe brought into a room.",
      accent: "#00BCD4",
    },
    {
      id: "promoter-production",
      headline: "Every Show Is\na Content Shoot",
      body: "You book the act. We build the moment. The footage lives forever.",
      detail: "Every GeekFon live event feeds three pipelines: the Pulse feed for fans, the animated series archive for Anime 3000, and the long-term content library. Promoters who book GeekFon are not booking a one-night act. They are creating content that extends the brand beyond the venue.",
      accent: "#9C27B0",
    },
    {
      id: "promoter-cities",
      headline: "Season 1 Is Live",
      body: "July 1 through September 19, 2026. Six cities active.",
      detail: "Season 1 runs 111 days and closes with a live event. London, Tokyo, Seoul, Fort Lauderdale, Berlin, and Johannesburg are the active Season 1 markets. If you produce events in any of these markets - anime conventions, music festivals, club nights, theater programming - we should be talking.",
      accent: "#F44336",
    },
    {
      id: "promoter-cta",
      headline: "Book the Act",
      body: "GeekFon Society is available to book for Season 1 shows now.",
      detail: "We handle production design, music programming, and content capture. You handle the room. Together we put on something that neither of us could alone. Season 1 closes September 19. Dates are limited.",
      accent: "#00BCD4",
      cta: { label: "Book an Event", href: "mailto:contact@lesaruss.com" },
    },
  ],
};

const GFS_LOGO = (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="90" height="30">
    <text x="0" y="30" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="28" fill="white" letterSpacing="-1">
      GFS
    </text>
  </svg>
);

function WelcomeIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <circle cx="40" cy="40" r="36" stroke="rgba(233,30,140,0.4)" strokeWidth="1.5"/>
      <circle cx="40" cy="40" r="26" stroke="rgba(233,30,140,0.6)" strokeWidth="1.5"/>
      <circle cx="40" cy="40" r="8" fill="#E91E8C" opacity="0.8"/>
      <path d="M40 4 V12" stroke="#E91E8C" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <path d="M40 68 V76" stroke="#E91E8C" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <path d="M4 40 H12" stroke="#E91E8C" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <path d="M68 40 H76" stroke="#E91E8C" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function ProgressDots({ total, current, accent }: { total: number; current: number; accent: string }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? "20px" : "6px",
            height: "6px",
            borderRadius: "3px",
            background: i === current ? accent : "rgba(255,255,255,0.25)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomePage() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [role, setRole] = useState<Role | null>(null);
  const [pathSlide, setPathSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<Role | null>(null);

  const transition = useCallback((fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      setVisible(true);
    }, 320);
  }, []);

  const handleRoleSelect = (r: Role) => {
    transition(() => {
      setRole(r);
      setPathSlide(0);
      setPhase("path");
    });
  };

  const handleNext = useCallback(() => {
    if (phase === "welcome") {
      transition(() => setPhase("picker"));
    } else if (phase === "path" && role) {
      const slides = PATH_SLIDES[role];
      if (pathSlide < slides.length - 1) {
        transition(() => setPathSlide((p) => p + 1));
      }
    }
  }, [phase, role, pathSlide, transition]);

  const handleBack = useCallback(() => {
    if (phase === "path") {
      if (pathSlide === 0) {
        transition(() => {
          setPhase("picker");
          setRole(null);
        });
      } else {
        transition(() => setPathSlide((p) => p - 1));
      }
    } else if (phase === "picker") {
      transition(() => setPhase("welcome"));
    }
  }, [phase, pathSlide, transition]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") handleNext();
      if (e.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handleBack]);

  const currentSlides = role ? PATH_SLIDES[role] : [];
  const currentSlide = role ? currentSlides[pathSlide] : null;
  const isLastSlide = role ? pathSlide === currentSlides.length - 1 : false;
  const roleAccent = role ? ROLE_META[role].accent : "#E91E8C";

  // Progress: 0 = welcome, 1 = picker, 2+ = path slides
  const totalSteps = 2 + (role ? currentSlides.length : 4);
  const currentStep = phase === "welcome" ? 0 : phase === "picker" ? 1 : 2 + pathSlide;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#070712",
        color: "white",
        fontFamily: "'Montserrat', sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Aurora background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${roleAccent}22 0%, transparent 70%)`,
            top: "-200px",
            left: "-200px",
            transition: "background 0.8s ease",
            animation: "drift1 12s ease-in-out infinite alternate",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${roleAccent}15 0%, transparent 70%)`,
            bottom: "-150px",
            right: "-100px",
            transition: "background 0.8s ease",
            animation: "drift2 15s ease-in-out infinite alternate",
          }}
        />
      </div>

      <style>{`
        @keyframes drift1 {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes drift2 {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(-40px, -60px) scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-content {
          animation: fadeUp 0.45s ease forwards;
        }
        .role-card:hover {
          transform: translateY(-4px);
        }
        .role-card {
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
      `}</style>

      {/* Top bar */}
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 28px",
          zIndex: 10,
        }}
      >
        <a href="/" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: "1.1rem",
              letterSpacing: "0.06em",
              color: "white",
              opacity: 0.9,
            }}
          >
            GeekFon Society
          </span>
        </a>

        <ProgressDots
          total={role ? 2 + currentSlides.length : 3}
          current={currentStep}
          accent={roleAccent}
        />

        <a
          href="/passport"
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.5)",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          Skip
        </a>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px 80px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          key={`${phase}-${pathSlide}`}
          className="slide-content"
          style={{
            maxWidth: "680px",
            width: "100%",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          {/* WELCOME SLIDE */}
          {phase === "welcome" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
                <WelcomeIcon />
              </div>
              <div
                style={{
                  fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#E91E8C",
                  marginBottom: "16px",
                }}
              >
                Take the Tour
              </div>
              <h1
                style={{
                  fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  margin: "0 0 24px",
                  letterSpacing: "-0.02em",
                }}
              >
                GeekFon Society
              </h1>
              <p
                style={{
                  fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.6,
                  margin: "0 auto 48px",
                  maxWidth: "480px",
                }}
              >
                A universe of original fictional artists, built for the real world. Six cities. Nine artists. One sound that crosses every genre.
              </p>
              <button
                onClick={handleNext}
                style={{
                  background: "#E91E8C",
                  color: "white",
                  border: "none",
                  borderRadius: "100px",
                  padding: "16px 48px",
                  fontSize: "1rem",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(233,30,140,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                Start the Tour
              </button>
            </div>
          )}

          {/* PICKER SLIDE */}
          {phase === "picker" && (
            <div>
              <div style={{ marginBottom: "40px" }}>
                <div
                  style={{
                    fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "12px",
                  }}
                >
                  Step 1 of 1
                </div>
                <h2
                  style={{
                    fontSize: "clamp(2rem, 5vw, 3.5rem)",
                    fontWeight: 900,
                    lineHeight: 1.1,
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Who are you?
                </h2>
                <p style={{ color: "rgba(255,255,255,0.55)", margin: "12px 0 0", fontSize: "1rem" }}>
                  We will show you what GeekFon Society means for you specifically.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "14px",
                }}
              >
                {(Object.keys(ROLE_META) as Role[]).map((r) => {
                  const meta = ROLE_META[r];
                  return (
                    <button
                      key={r}
                      className="role-card"
                      onClick={() => handleRoleSelect(r)}
                      onMouseEnter={() => setHovered(r)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        background: hovered === r ? `${meta.accent}18` : "rgba(255,255,255,0.05)",
                        border: `1.5px solid ${hovered === r ? meta.accent : "rgba(255,255,255,0.1)"}`,
                        borderRadius: "16px",
                        padding: "24px 20px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "white",
                        fontFamily: "inherit",
                        boxShadow: hovered === r ? `0 0 32px ${meta.accent}30` : "none",
                      }}
                    >
                      <div style={{ color: hovered === r ? meta.accent : "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                        {meta.icon}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "6px" }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                        {meta.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PATH SLIDES */}
          {phase === "path" && currentSlide && role && (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: currentSlide.accent,
                    opacity: 0.8,
                  }}
                >
                  {ROLE_META[role].label} - {pathSlide + 1} of {currentSlides.length}
                </span>
              </div>

              <h2
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.8rem)",
                  fontWeight: 900,
                  lineHeight: 1.08,
                  margin: "0 0 20px",
                  letterSpacing: "-0.02em",
                  whiteSpace: "pre-line",
                }}
              >
                {currentSlide.headline}
              </h2>

              <p
                style={{
                  fontSize: "clamp(1rem, 2vw, 1.2rem)",
                  fontWeight: 600,
                  color: currentSlide.accent,
                  margin: "0 0 20px",
                  lineHeight: 1.5,
                }}
              >
                {currentSlide.body}
              </p>

              {currentSlide.detail && (
                <p
                  style={{
                    fontSize: "clamp(0.9rem, 1.8vw, 1.05rem)",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.7,
                    margin: "0 0 40px",
                  }}
                >
                  {currentSlide.detail}
                </p>
              )}

              {isLastSlide && currentSlide.cta && (
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <a
                    href={currentSlide.cta.href}
                    style={{
                      display: "inline-block",
                      background: currentSlide.accent,
                      color: "white",
                      textDecoration: "none",
                      borderRadius: "100px",
                      padding: "16px 40px",
                      fontSize: "1rem",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)";
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 32px ${currentSlide.accent}50`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                    }}
                  >
                    {currentSlide.cta.label}
                  </a>
                  <button
                    onClick={() => transition(() => { setPhase("picker"); setRole(null); })}
                    style={{
                      background: "transparent",
                      border: "1.5px solid rgba(255,255,255,0.2)",
                      borderRadius: "100px",
                      padding: "16px 32px",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "0.04em",
                    }}
                  >
                    See other paths
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      {(phase !== "welcome") && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 28px 28px",
            background: "linear-gradient(to top, rgba(7,7,18,0.95) 0%, transparent 100%)",
            zIndex: 20,
          }}
        >
          <button
            onClick={handleBack}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "100px",
              padding: "12px 24px",
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
            }}
          >
            Back
          </button>

          {phase === "path" && !isLastSlide && (
            <button
              onClick={handleNext}
              style={{
                background: roleAccent,
                border: "none",
                borderRadius: "100px",
                padding: "12px 32px",
                color: "white",
                fontSize: "0.9rem",
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
