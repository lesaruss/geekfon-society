"use client";
import { useState, useEffect, useCallback, useRef, type ReactElement } from "react";

type Role = "fan" | "label" | "brand" | "promoter";
type Phase = "picker" | "path" | "artists";

interface SlideData {
  id: string;
  headline: string;
  body: string;
  accent: string;
  detail?: string;
  cta?: { label: string; href: string };
  isArtistSlide?: boolean;
}

// ── CDN / storage bases ───────────────────────────────────────────────────────
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
const SUPA_AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";
const SUPA_MEDIA = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/artists/";

const CITY_IMAGES = [
  { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  { desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  { desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  { desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  { desktop: CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png", mobile: CDN + "hf_20260619_064547_2906c350-a205-4c96-9bb1-114dc53fc237.png" },
];

// ── Artist roster ─────────────────────────────────────────────────────────────
type ArtistCard = {
  slug: string; name: string; initial: string; accent: string;
  tagline: string; genre: string; heroUrl?: string;
  tracks: { title: string; url: string; full?: boolean }[];
};

const ARTISTS: ArtistCard[] = [
  {
    slug: "roxanne", name: "Roxanne", initial: "R", accent: "#E91E8C",
    genre: "J-Pop / Pop", tagline: "The voice that disappeared — and came back with everything to say.",
    heroUrl: SUPA_MEDIA + "roxanne/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "roxanne/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "roxanne/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "roxanne/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "roxanne/sample-c.mp3" },
    ],
  },
  {
    slug: "lex-from-brixton", name: "Lex from Brixton", initial: "L", accent: "#F69820",
    genre: "Grime / Hip-Hop", tagline: "Brixton in the bloodline. Grime in the grammar. No translations needed.",
    heroUrl: SUPA_MEDIA + "lex-from-brixton/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "lex-from-brixton/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "lex-from-brixton/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "lex-from-brixton/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "lex-from-brixton/sample-c.mp3" },
    ],
  },
  {
    slug: "nilo-wave", name: "Nilo Wave", initial: "N", accent: "#00BCD4",
    genre: "Caribbean / Electronic", tagline: "Caribbean rhythms rebuilt from the ground up. The wave is the message.",
    heroUrl: SUPA_MEDIA + "nilo-wave/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "nilo-wave/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "nilo-wave/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "nilo-wave/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "nilo-wave/sample-c.mp3" },
    ],
  },
  {
    slug: "shamanic-resin", name: "Shamanic Resin", initial: "S", accent: "#9C27B0",
    genre: "K-Pop / Electronics", tagline: "Where K-Pop architecture meets ritual electronics. This is not a performance. It is a ceremony.",
    heroUrl: SUPA_MEDIA + "shamanic-resin/hero.png",
    tracks: [
      { title: "All I Do Is Eat", url: SUPA_AUDIO + "shamanic-resin/all-i-do-is-eat.mp3", full: true },
      { title: "Real Dream", url: SUPA_AUDIO + "shamanic-resin/real-dream.mp3" },
      { title: "It's Okay", url: SUPA_AUDIO + "shamanic-resin/its-okay.mp3" },
      { title: "Cat Dance", url: SUPA_AUDIO + "shamanic-resin/cat-dance.mp3" },
    ],
  },
  {
    slug: "riku", name: "Riku Hayasaka", initial: "RH", accent: "#2196F3",
    genre: "Indie Pop / Bilingual", tagline: "Indie pop built in two languages. The melody is the translation.",
    heroUrl: SUPA_MEDIA + "riku/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "riku/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "riku/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "riku/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "riku/sample-c.mp3" },
    ],
  },
  {
    slug: "lickle-bro", name: "Lickle Bro", initial: "LB", accent: "#4CAF50",
    genre: "R&B / Dancehall", tagline: "R&B and dancehall raised in the same house. The harmony was inevitable.",
    heroUrl: SUPA_MEDIA + "lickle-bro/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "lickle-bro/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "lickle-bro/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "lickle-bro/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "lickle-bro/sample-c.mp3" },
    ],
  },
  {
    slug: "lickle-sis", name: "Lickle Sis", initial: "LS", accent: "#FF5722",
    genre: "Soul / R&B", tagline: "Soul at full volume. She is not asking for permission.",
    heroUrl: SUPA_MEDIA + "lickle-sis/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "lickle-sis/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "lickle-sis/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "lickle-sis/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "lickle-sis/sample-c.mp3" },
    ],
  },
  {
    slug: "mad-tings", name: "Mad Tings", initial: "MT", accent: "#E91E63",
    genre: "Grime / Dubstep", tagline: "Grime energy. Dubstep weight. The whole thing turned up to a frequency most systems cannot handle.",
    heroUrl: SUPA_MEDIA + "mad-tings/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "mad-tings/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "mad-tings/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "mad-tings/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "mad-tings/sample-c.mp3" },
    ],
  },
  {
    slug: "mr-russell", name: "Mr. Russell", initial: "MR", accent: "#90A4AE",
    genre: "Hip-Hop", tagline: "Hip-hop that knows where it has been and does not need to prove where it is going.",
    heroUrl: SUPA_MEDIA + "mr-russell/hero.jpg",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "mr-russell/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "mr-russell/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "mr-russell/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "mr-russell/sample-c.mp3" },
    ],
  },
  {
    slug: "rustblood-prophets", name: "Rustblood Prophets", initial: "RP", accent: "#F44336",
    genre: "Alternative / Dark", tagline: "Alternative and dark and not sorry about either one.",
    heroUrl: SUPA_MEDIA + "rustblood-prophets/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "rustblood-prophets/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "rustblood-prophets/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "rustblood-prophets/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "rustblood-prophets/sample-c.mp3" },
    ],
  },
  {
    slug: "straight-and-narrow", name: "Straight and Narrow", initial: "SN", accent: "#A1887F",
    genre: "Hip-Hop / Alternative", tagline: "Hip-hop with a double meaning and alternative instincts. The name is the story.",
    heroUrl: SUPA_MEDIA + "straight-and-narrow/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "straight-and-narrow/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "straight-and-narrow/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "straight-and-narrow/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "straight-and-narrow/sample-c.mp3" },
    ],
  },
];

const ROLE_META: Record<Role, { label: string; tagline: string; accent: string; icon: ReactElement }> = {
  fan: { label: "Music Fan", tagline: "Discover artists, earn points, unlock everything", accent: "#E91E8C", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="14" cy="26" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/><circle cx="30" cy="22" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/><path d="M19 26V10L35 6V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  label: { label: "Record Label", tagline: "License original IP built for the real world", accent: "#9C27B0", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2.5" fill="none"/><circle cx="20" cy="20" r="3" fill="currentColor"/><path d="M20 8 V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg> },
  brand: { label: "Brand", tagline: "Integrate into a culture-forward global community", accent: "#F69820", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M8 20 L20 8 L32 20 L20 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg> },
  promoter: { label: "Promoter", tagline: "Book live acts that make every show a moment", accent: "#00BCD4", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="6" y="12" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none"/><path d="M14 12V8M26 12V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 18H34" stroke="currentColor" strokeWidth="2"/><circle cx="20" cy="26" r="3" fill="currentColor"/></svg> },
};

const PATH_SLIDES: Record<Role, SlideData[]> = {
  fan: [
    { id: "fan-artists", headline: "Meet the Artists", body: "Nine original characters. Every genre. Every city.", detail: "Roxanne. Shamanic Resin. Riku Hayasaka. Lex from Brixton. Nilo Wave. Lickle Bro and Lickle Sis. Mr. Russell. Straight and Narrow. Each has a full biography, a discography, a Pulse feed, and a world of their own. None of them are real. All of the music is.", accent: "#E91E8C", isArtistSlide: true },
    { id: "fan-pulse", headline: "The Pulse", body: "Your favorite artist posts every day. You're in the conversation.", detail: "Video, photo, text — the Pulse is each artist's personal feed. Comment on a post. React to a drop. The artist responds. This is not a playlist. This is a living relationship with a character who shows up every day.", accent: "#F69820" },
    { id: "fan-tokens", headline: "Points Unlock\nEverything", body: "Start for about $11. Unlock songs, wallpapers, and more.", detail: "About 1,000 points for $11-12. Unlock a single song for 50 points. Full artist access — every track, every drop, every update — for 1,000 points. Collect multiple artists. Bank points. New unlockable content will keep appearing as the Society grows.", accent: "#9C27B0" },
    { id: "fan-voting", headline: "Vote. Rank. Impact.", body: "Your votes shape what the whole Society hears.", detail: "Every point you spend on an artist counts as a vote. Rankings update in real time. The top-ranked artists get featured on GeekFon Radio. Your support is not just appreciation — it moves artists up the board and onto the mic.", accent: "#2196F3" },
    { id: "fan-radio", headline: "GeekFon Radio", body: "Every week. New songs. Real interviews. The artists you made famous.", detail: "GeekFon Radio is the weekly podcast where the Society goes public. New song debuts. Artist interviews. Features from inside the universe. The artists who earned their ranking earned the spotlight. You helped put them there.", accent: "#00BCD4", cta: { label: "Join the Society", href: "/passport" } },
  ],
  label: [
    { id: "label-ip", headline: "An IP Universe\nReady to License", body: "Original fictional artists on every streaming platform.", detail: "GeekFon Society is fully distributed via DistroKid — available on Spotify, Apple Music, and every major platform. The roster spans genres: pop, alternative, hip-hop, electronic, and beyond. All original LESARUSS IP. No sample clearances. No competing rights.", accent: "#9C27B0" },
    { id: "label-licensing", headline: "Sync. Advertising.\nEvents.", body: "License tracks for placements, campaigns, and live use.", detail: "DistroKit licensing enables commercial partners to use GeekFon music for sync placements, advertising, and event programming. The music earns streaming royalties as standard. B2B licensing opens a separate, direct revenue channel for both sides.", accent: "#E91E8C" },
    { id: "label-pipeline", headline: "The Proof of Concept", body: "Every system here is being proven for the real-artist market.", detail: "GeekFon Society is the fictional prototype for TalentVangelist, the LESARUSS real-artist development agency. Fan engagement systems, PR pipelines, content production, and the token economy are all being built and tested here first. A label that partners with GeekFon now partners with the infrastructure that will run TalentVangelist at scale.", accent: "#F69820" },
    { id: "label-cta", headline: "Let's Talk\nLicensing", body: "GeekFon Society is actively expanding its licensing and partnership pipeline.", detail: "We are open to sync licensing, master licensing, catalog co-ownership discussions, and distribution partnerships. If you work with original IP and are looking for clean, commercial-ready music built for the modern era, this is the conversation.", accent: "#9C27B0", cta: { label: "Get In Touch", href: "mailto:contact@lesaruss.com" } },
  ],
  brand: [
    { id: "brand-audience", headline: "Six Cities.\nOne Community.", body: "London. Tokyo. Seoul. Fort Lauderdale. Berlin. Johannesburg.", detail: "GeekFon Society is a global music community organized around cities and built around daily content, live events, and a points economy. The audience is music-first, culture-forward, and already spending. Six active cities with more launching in Season 2.", accent: "#F69820" },
    { id: "brand-ecosystem", headline: "The Points\nEcosystem", body: "Your brand is inside the unlock, not on top of it.", detail: "Fans buy points to support artists, unlock content, and participate in rankings. Brands can sponsor point packages, fund artist moments, or create exclusive drops. When a fan unlocks something your brand powered, your name belongs in that moment — not over it.", accent: "#E91E8C" },
    { id: "brand-events", headline: "Live Activations\nThat Get Filmed", body: "Every show is a content shoot. Every activation feeds the archive.", detail: "GeekFon Society produces events at anime conventions, after-parties, and city-based activations. Every event produces footage for the Pulse feed, the animated series pipeline, and the archive. A sponsorship here is not a banner at one event. It is content that lives in the universe.", accent: "#2196F3" },
    { id: "brand-cta", headline: "Your Brand Inside\nthe Universe", body: "Integrations that belong in the world. Not ads. Moments.", detail: "We build sponsor relationships that feel native to the GeekFon universe. Your brand does not interrupt the experience. It enhances it. If that is the kind of partnership you are looking for, let's build it.", accent: "#F69820", cta: { label: "Become a Sponsor", href: "mailto:contact@lesaruss.com" } },
  ],
  promoter: [
    { id: "promoter-live", headline: "GeekFon Society\nGoes Live", body: "Full production. Every show. Lord Zorlat on the decks.", detail: "GeekFon Society produces live events at anime conventions, club after-parties, theater events, and city activations. The Lord Zorlat DJ set is the flagship live experience: full GeekFon visual production, original music, and the energy of a universe brought into a room.", accent: "#00BCD4" },
    { id: "promoter-production", headline: "Every Show Is\na Content Shoot", body: "You book the act. We build the moment. The footage lives forever.", detail: "Every GeekFon live event feeds three pipelines: the Pulse feed for fans, the animated series archive for Anime 3000, and the long-term content library. Promoters who book GeekFon are not booking a one-night act. They are creating content that extends the brand beyond the venue.", accent: "#9C27B0" },
    { id: "promoter-cities", headline: "Season 1 Is Live", body: "July 1 through September 19, 2026. Six cities active.", detail: "Season 1 runs 111 days and closes with a live event. London, Tokyo, Seoul, Fort Lauderdale, Berlin, and Johannesburg are the active Season 1 markets. If you produce events in any of these markets — anime conventions, music festivals, club nights, theater programming — we should be talking.", accent: "#F44336" },
    { id: "promoter-cta", headline: "Book the Act", body: "GeekFon Society is available to book for Season 1 shows now.", detail: "We handle production design, music programming, and content capture. You handle the room. Together we put on something that neither of us could alone. Season 1 closes September 19. Dates are limited.", accent: "#00BCD4", cta: { label: "Book an Event", href: "mailto:contact@lesaruss.com" } },
  ],
};

function useRandomCity() {
  const [city, setCity] = useState(CITY_IMAGES[0]);
  useEffect(() => {
    setCity(CITY_IMAGES[Math.floor(Math.random() * CITY_IMAGES.length)]);
  }, []);
  return city;
}

// ── Audio player component ────────────────────────────────────────────────────
function TrackPlayer({ track, accent }: { track: ArtistCard["tracks"][number]; accent: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "unavailable">("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const SAMPLE_LIMIT = track.full ? 0 : 20;

  function toggle() {
    if (state === "unavailable") return;
    if (!audioRef.current) {
      const a = new Audio(track.url);
      a.addEventListener("error", () => { setState("unavailable"); });
      a.addEventListener("loadedmetadata", () => { setState("playing"); a.play(); });
      a.addEventListener("timeupdate", () => {
        if (SAMPLE_LIMIT > 0 && a.currentTime >= SAMPLE_LIMIT) { a.pause(); a.currentTime = 0; setState("idle"); setProgress(0); return; }
        const dur = SAMPLE_LIMIT > 0 ? SAMPLE_LIMIT : (a.duration || 1);
        setProgress(a.currentTime / dur);
      });
      a.addEventListener("ended", () => { setState("idle"); setProgress(0); });
      audioRef.current = a;
      setState("loading");
      a.load();
      return;
    }
    const a = audioRef.current;
    if (state === "playing") { a.pause(); setState("idle"); }
    else { a.play().then(() => setState("playing")).catch(() => setState("unavailable")); }
  }

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const isPlaying = state === "playing";
  const isLoading = state === "loading";
  const unavailable = state === "unavailable";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: track.full ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)", borderRadius: "10px", border: `1px solid ${track.full ? "rgba(255,255,255,0.22)" : (unavailable ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)")}` }}>
      <button
        onClick={toggle}
        disabled={unavailable}
        style={{ width: "32px", height: "32px", borderRadius: "50%", background: unavailable ? "rgba(255,255,255,0.1)" : accent, border: "none", cursor: unavailable ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: unavailable ? 0.4 : 1 }}
      >
        {isLoading ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="20" style={{ animation: "spin 0.8s linear infinite" }} /></svg>
        ) : isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="7 4 20 12 7 20"/></svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
          <span style={{ fontSize: "11px", fontWeight: track.full ? 900 : 700, color: unavailable ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.9)", letterSpacing: "0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {track.title}
          </span>
          <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: unavailable ? "rgba(255,255,255,0.2)" : accent, flexShrink: 0, marginLeft: "8px" }}>
            {unavailable ? "COMING" : track.full ? "FULL" : "20s"}
          </span>
        </div>
        <div style={{ height: "3px", background: "rgba(255,255,255,0.12)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: accent, borderRadius: "2px", transition: "width 0.1s linear" }} />
        </div>
      </div>
    </div>
  );
}

// ── Artist panel ──────────────────────────────────────────────────────────────
function ArtistPanel({ onClose, accent }: { onClose: () => void; accent: string }) {
  const [selected, setSelected] = useState(0);
  const artist = ARTISTS[selected];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "stretch" }}>
      {/* Scrim */}
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)", cursor: "pointer" }} onClick={onClose} />
      {/* Panel */}
      <div style={{ width: "min(520px, 100vw)", background: "#0c0c1a", borderLeft: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            THE ROSTER
          </span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", padding: "8px 14px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
            CLOSE
          </button>
        </div>

        {/* Artist selector pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {ARTISTS.map((a, i) => (
            <button
              key={a.slug}
              onClick={() => setSelected(i)}
              style={{
                background: selected === i ? a.accent : "rgba(255,255,255,0.07)",
                border: `1px solid ${selected === i ? a.accent : "rgba(255,255,255,0.1)"}`,
                borderRadius: "20px",
                padding: "7px 14px",
                color: selected === i ? "#fff" : "rgba(255,255,255,0.6)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {a.name}
            </button>
          ))}
        </div>

        {/* Artist detail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Hero image - full width */}
          {artist.heroUrl ? (
            <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", flexShrink: 0, borderBottom: `3px solid ${artist.accent}` }}>
              <img
                src={artist.heroUrl}
                alt={artist.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
              />
            </div>
          ) : null}

          <div style={{ flex: 1, padding: "24px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Identity */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {!artist.heroUrl && (
                <div style={{ width: "64px", height: "64px", borderRadius: "12px", background: artist.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                  {artist.initial}
                </div>
              )}
              <div>
                <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{artist.name}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: artist.accent, marginTop: "4px" }}>{artist.genre}</div>
              </div>
            </div>

            {/* Tagline */}
            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              {artist.tagline}
            </p>

            {/* Tracks */}
            <div>
              <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>
                1 FULL TRACK + 3 PREVIEWS (20s)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {artist.tracks.map((t) => (
                  <TrackPlayer key={t.title} track={t} accent={artist.accent} />
                ))}
              </div>
            </div>

            {/* CTA */}
            <a
              href={`/${artist.slug}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: artist.accent, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", marginTop: "4px" }}
            >
              Full Artist Profile
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ total, current, accent }: { total: number; current: number; accent: string }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? "20px" : "6px", height: "6px", borderRadius: "3px", background: i === current ? accent : "rgba(255,255,255,0.25)", transition: "all 0.3s ease" }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const [phase, setPhase] = useState<Phase>("picker");
  const [role, setRole] = useState<Role | null>(null);
  const [pathSlide, setPathSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<Role | null>(null);
  const [artistPanelOpen, setArtistPanelOpen] = useState(false);
  const [slideCity, setSlideCity] = useState(CITY_IMAGES[0]);
  const cityBg = useRandomCity();

  const transition = useCallback((fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      setSlideCity(CITY_IMAGES[Math.floor(Math.random() * CITY_IMAGES.length)]);
      setVisible(true);
    }, 320);
  }, []);

  const handleRoleSelect = (r: Role) => {
    transition(() => { setRole(r); setPathSlide(0); setPhase("path"); });
  };

  const handleNext = useCallback(() => {
    if (phase === "path" && role) {
      const slides = PATH_SLIDES[role];
      if (pathSlide < slides.length - 1) transition(() => setPathSlide((p) => p + 1));
    }
  }, [phase, role, pathSlide, transition]);

  const handleBack = useCallback(() => {
    if (phase === "path") {
      if (pathSlide === 0) transition(() => { setPhase("picker"); setRole(null); });
      else transition(() => setPathSlide((p) => p - 1));
    }
  }, [phase, pathSlide, transition]);

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
  const totalSteps = 1 + (role ? currentSlides.length : 4);
  const currentStep = phase === "picker" ? 0 : 1 + pathSlide;
  const activeBg = phase === "path" ? slideCity : cityBg;

  return (
    <div style={{ minHeight: "100dvh", background: "#070712", color: "white", fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

      {/* City background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <picture>
          <source media="(max-width:768px)" srcSet={activeBg.mobile} />
          <img src={activeBg.desktop} alt="" aria-hidden="true" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom", opacity: 0.88, transition: "opacity 0.6s ease" }} />
        </picture>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(7,7,18,0.95) 0%, rgba(7,7,18,0.92) 28%, rgba(7,7,18,0.55) 55%, rgba(7,7,18,0.08) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,7,18,0.7) 0%, transparent 20%)" }} />
        <style>{`@media(max-width:768px){.city-left-overlay{background:linear-gradient(to bottom,rgba(7,7,18,0.92) 0%,rgba(7,7,18,0.75) 50%,rgba(7,7,18,0.2) 100%) !important}}`}</style>
        <div className="city-left-overlay" style={{ position: "absolute", inset: 0 }} />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fonHue {
          0%   { color: #E91E8C; }
          25%  { color: #00B4FF; }
          50%  { color: #AAFF00; }
          75%  { color: #F69820; }
          100% { color: #E91E8C; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-content { animation: fadeUp 0.45s ease forwards; }
        .role-card { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .role-card:hover { transform: translateY(-4px); }
        .gfs-fon-hue { animation: fonHue 6s ease-in-out infinite; }
      `}</style>

      {/* Top bar */}
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,7,18,0.6)", backdropFilter: "blur(12px)" }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/geekfon-logo.png" alt="" style={{ height: "28px", width: "28px", objectFit: "contain" }} aria-hidden="true" />
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "18px", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1, userSelect: "none" }}>
            <span style={{ color: "#ffffff" }}>GEEK</span>
            <span className="gfs-fon-hue">FON</span>
            <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: "6px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em" }}>SOCIETY</span>
          </span>
        </a>
        <ProgressDots total={totalSteps} current={currentStep} accent={roleAccent} />
        <a href="/passport" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", textDecoration: "none", textTransform: "uppercase" }}>
          Skip
        </a>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "40px 60px 100px", position: "relative", zIndex: 10, maxWidth: "900px" }}>
        <div
          key={`${phase}-${pathSlide}`}
          className="slide-content"
          style={{ width: "100%", opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
        >

          {/* PICKER */}
          {phase === "picker" && (
            <div>
              <div style={{ marginBottom: "36px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "12px" }}>
                  GEEKFON SOCIETY
                </div>
                <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                  Who are you?
                </h1>
                <p style={{ color: "rgba(255,255,255,0.55)", margin: 0, fontSize: "1rem" }}>
                  We will show you what GeekFon Society means for you specifically.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 280px))", gap: "14px" }}>
                {(Object.keys(ROLE_META) as Role[]).map((r) => {
                  const meta = ROLE_META[r];
                  return (
                    <button
                      key={r}
                      className="role-card"
                      onClick={() => handleRoleSelect(r)}
                      onMouseEnter={() => setHovered(r)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ background: hovered === r ? `${meta.accent}18` : "rgba(255,255,255,0.06)", border: `1.5px solid ${hovered === r ? meta.accent : "rgba(255,255,255,0.1)"}`, borderRadius: "16px", padding: "24px 20px", textAlign: "left", cursor: "pointer", color: "white", fontFamily: "inherit", boxShadow: hovered === r ? `0 0 32px ${meta.accent}30` : "none" }}
                    >
                      <div style={{ color: hovered === r ? meta.accent : "rgba(255,255,255,0.6)", marginBottom: "12px" }}>{meta.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "6px" }}>{meta.label}</div>
                      <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{meta.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PATH SLIDES */}
          {phase === "path" && currentSlide && role && (
            <div style={{ maxWidth: "620px" }}>
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: currentSlide.accent, opacity: 0.85 }}>
                  {ROLE_META[role].label} — {pathSlide + 1} of {currentSlides.length}
                </span>
              </div>

              <h2 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                {currentSlide.headline}
              </h2>

              <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", fontWeight: 600, color: currentSlide.accent, margin: "0 0 18px", lineHeight: 1.5 }}>
                {currentSlide.body}
              </p>

              {currentSlide.detail && (
                <p style={{ fontSize: "clamp(0.9rem, 1.8vw, 1rem)", fontWeight: 400, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, margin: "0 0 36px" }}>
                  {currentSlide.detail}
                </p>
              )}

              {currentSlide.isArtistSlide && (
                <button
                  onClick={() => setArtistPanelOpen(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: currentSlide.accent, color: "#fff", border: "none", borderRadius: "100px", padding: "14px 32px", fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "inherit", marginBottom: "12px", transition: "transform 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                  See the Artists
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              )}

              {isLastSlide && currentSlide.cta && !currentSlide.isArtistSlide && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <a
                      href={currentSlide.cta.href}
                      style={{ display: "inline-block", background: currentSlide.accent, color: "white", textDecoration: "none", borderRadius: "100px", padding: "16px 40px", fontSize: "1rem", fontWeight: 800, letterSpacing: "0.04em", transition: "transform 0.15s ease" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
                    >
                      {currentSlide.cta.label}
                    </a>
                    {currentSlide.cta.href !== "/passport" && (
                      <a
                        href="/passport"
                        style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", color: "white", textDecoration: "none", borderRadius: "100px", padding: "16px 32px", fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.04em", border: "1.5px solid rgba(255,255,255,0.18)", transition: "transform 0.15s ease, background 0.15s ease" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.14)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; }}
                      >
                        Become a Member
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => transition(() => { setPhase("picker"); setRole(null); })}
                    style={{ background: "none", border: "none", padding: "4px 0", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", textDecoration: "underline", textUnderlineOffset: "3px" }}
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
      {phase === "path" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px 28px", background: "linear-gradient(to top, rgba(7,7,18,0.95) 0%, transparent 100%)", zIndex: 20 }}>
          <button
            onClick={handleBack}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "100px", padding: "12px 24px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}
          >
            Back
          </button>
          {!isLastSlide && (
            <button
              onClick={handleNext}
              style={{ background: roleAccent, border: "none", borderRadius: "100px", padding: "12px 32px", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", transition: "transform 0.15s ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Artist panel overlay */}
      {artistPanelOpen && (
        <ArtistPanel accent={roleAccent} onClose={() => setArtistPanelOpen(false)} />
      )}
    </div>
  );
}
