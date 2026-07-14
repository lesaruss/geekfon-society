"use client";
import { useState, useEffect, useCallback, useRef, type ReactElement } from "react";
import SiteChrome from "@/components/SiteChrome";

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
    genre: "J-Pop / Tokyo, Japan", tagline: "The voice that disappeared - and came back with everything to say.",
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
    genre: "Hip-Hop / London, UK", tagline: "Brixton in the bloodline. Grime in the grammar. No translations needed.",
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
    genre: "Reggaeton / Puerto Rico", tagline: "Caribbean rhythms rebuilt from the ground up. The wave is the message.",
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
    genre: "K-Pop / Seoul, Korea", tagline: "Where K-Pop architecture meets ritual electronics. This is not a performance. It is a ceremony.",
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
    genre: "J-Pop / Japan", tagline: "Indie pop built in two languages. The melody is the translation.",
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
    genre: "Dancehall / London, UK", tagline: "R&B and dancehall raised in the same house. The harmony was inevitable.",
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
    genre: "Dembow / London, UK", tagline: "Soul at full volume. She is not asking for permission.",
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
    genre: "Hip-Hop / London, UK", tagline: "Grime energy. Dubstep weight. The whole thing turned up to a frequency most systems cannot handle.",
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
    genre: "Hip-Hop / NYC", tagline: "Hip-hop that knows where it has been and does not need to prove where it is going.",
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
    genre: "Alternative / Berlin, Germany", tagline: "Alternative and dark and not sorry about either one.",
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
    genre: "Country / Nashville", tagline: "Hip-hop with a double meaning and alternative instincts. The name is the story.",
    heroUrl: SUPA_MEDIA + "straight-and-narrow/hero.png",
    tracks: [
      { title: "Full Song", url: SUPA_AUDIO + "straight-and-narrow/full.mp3", full: true },
      { title: "Preview 1", url: SUPA_AUDIO + "straight-and-narrow/sample-a.mp3" },
      { title: "Preview 2", url: SUPA_AUDIO + "straight-and-narrow/sample-b.mp3" },
      { title: "Preview 3", url: SUPA_AUDIO + "straight-and-narrow/sample-c.mp3" },
    ],
  },
  {
    slug: "vuka", name: "Vuka", initial: "V", accent: "#FFB300",
    genre: "Amapiano / Johannesburg, South Africa", tagline: "Amapiano built for a continent the Society hasn't reached yet.",
    heroUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/hf_20260713_122846_dae7867b-1428-4544-a3f9-5c5455318b69.png",
    tracks: [
      { title: "Fall Into Rhythm", url: SUPA_AUDIO + "vuka/fall-into-rhythm.mp3", full: true },
    ],
  },
];

const ROLE_META: Record<Role, { label: string; tagline: string; accent: string; icon: ReactElement }> = {
  fan: { label: "Music Fan", tagline: "Discover artists, earn points, unlock everything", accent: "#E91E8C", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="14" cy="26" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/><circle cx="30" cy="22" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/><path d="M19 26V10L35 6V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  label: { label: "Producers", tagline: "License original music for sync, film, TV, and campaigns", accent: "#9C27B0", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2.5" fill="none"/><circle cx="20" cy="20" r="3" fill="currentColor"/><path d="M20 8 V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg> },
  brand: { label: "Brand", tagline: "Integrate into a culture-forward global community", accent: "#F69820", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M8 20 L20 8 L32 20 L20 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg> },
  promoter: { label: "Promoter", tagline: "Book live acts that make every show a moment", accent: "#00BCD4", icon: <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="6" y="12" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none"/><path d="M14 12V8M26 12V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 18H34" stroke="currentColor" strokeWidth="2"/><circle cx="20" cy="26" r="3" fill="currentColor"/></svg> },
};

const PATH_SLIDES: Record<Role, SlideData[]> = {
  fan: [
    { id: "fan-artists", headline: "Meet the Roster", body: "More than music. A world for every artist, and it's growing.", detail: "This is the GeekFon artist roster. Each one has music, a biography, and a Pulse feed today, with interviews, video, and an animated series on the way.", accent: "#E91E8C", isArtistSlide: true },
    { id: "fan-pulse", headline: "The Pulse", body: "Your favorite artist posts every day. You're in the conversation.", detail: "The Pulse is your doorway into each artist's life: video, photos, and text. News, social media, and a group chat are all coming soon to GeekFon Society.", accent: "#F69820" },
    { id: "fan-tokens", headline: "Points Unlock\nEverything", body: "Start free with 111 Points. Unlock songs across the whole universe.", detail: "Your free membership starts you with 111 Points. Unlock a single song for 25 Points, or go All Access for access to every song in the catalog. Points aren't limited to GeekFon: spend and redeem them across LESARUSS brands, throughout the LESARUSS universe.", accent: "#9C27B0" },
    { id: "fan-voting", headline: "Vote. Rank. Impact.", body: "Your votes shape what the whole Society hears.", detail: "Every Point you spend on an artist toward a track lets us know. It helps set the rankings, both on GeekFon Radio and across the site itself.", accent: "#2196F3" },
    { id: "fan-radio", headline: "GeekFon Radio", body: "Old-school radio, reinvented. New songs weekly, 24/7.", detail: "GeekFon Radio is your constant feed, just like traditional radio: no on-demand, no saving, just every artist playing in the background while you live your day. Hear songs not released to the public - an exclusive perk of being a registered member.", accent: "#00BCD4", cta: { label: "Join the Society", href: "/passport" } },
  ],
  label: [
    { id: "label-ip", headline: "An IP Catalog\nReady to License", body: "Original music on every major platform, ready for sync.", detail: "GeekFon Society is fully distributed and available on Spotify, Apple Music, and every major platform. The roster spans genres: pop, alternative, hip-hop, electronic, and beyond, with new artists announced monthly. All original LESARUSS IP. No sample clearances. No competing rights.", accent: "#9C27B0" },
    { id: "label-licensing", headline: "Sync. Film. TV.\nCampaigns.", body: "License tracks for placements, campaigns, and live use.", detail: "Licensing enables commercial partners, production companies, and ad teams to use GeekFon music for sync placements, film and TV, advertising, and event programming. The music earns streaming royalties as standard. B2B licensing opens a separate, direct revenue channel for both sides.", accent: "#E91E8C" },
    { id: "label-pipeline", headline: "The Proof of Concept", body: "Every system here is being proven for the real-artist market.", detail: "GeekFon Society is the fictional prototype for TalentVangelist, the LESARUSS real-artist development agency. Fan engagement systems, PR pipelines, content production, and the token economy are all being built and tested here first. A label that partners with GeekFon now partners with the infrastructure that will run TalentVangelist at scale.", accent: "#F69820" },
    { id: "label-cta", headline: "Let's Talk\nLicensing", body: "GeekFon Society is actively expanding its licensing and partnership pipeline.", detail: "We are open to sync licensing, master licensing, catalog co-ownership discussions, and distribution partnerships. If you work with original IP and are looking for clean, commercial-ready music built for the modern era, this is the conversation.", accent: "#9C27B0", cta: { label: "Get In Touch", href: "mailto:contact@lesaruss.com" } },
  ],
  brand: [
    { id: "brand-audience", headline: "Multiple Cities.\nOne Community.", body: "Tokyo. Seoul. Fort Lauderdale. Berlin.", detail: "GeekFon Society is a global music community organized around cities and built around daily content, live events, and a Points economy. The audience is music-first, culture-forward, and already spending. Active cities include Tokyo, Seoul, Fort Lauderdale, and Berlin, with more launching as the Society grows.", accent: "#F69820" },
    { id: "brand-ecosystem", headline: "The Points\nEcosystem", body: "Your brand is inside the unlock, not on top of it.", detail: "Fans spend Points to support artists, unlock content, and participate in rankings. Brands can sponsor Points packages, fund artist moments, donate products for sampling and giveaways, or create exclusive drops. When a fan unlocks something your brand powered, your name belongs in that moment - not over it.", accent: "#E91E8C" },
    { id: "brand-events", headline: "Live Activations\nThat Get Filmed", body: "Every show is a content shoot. Every activation feeds the archive.", detail: "GeekFon Society produces events at anime conventions, after-parties, and city-based activations. Every event produces footage for the Pulse feed, the animated series pipeline, and the archive. A sponsorship here is not a banner at one event. It is content that lives in the universe.", accent: "#2196F3" },
    { id: "brand-cta", headline: "Your Brand Inside\nthe Universe", body: "Integrations that belong in the world. Not ads. Moments.", detail: "We build sponsor relationships that feel native to the GeekFon universe. Your brand does not interrupt the experience. It enhances it. If that is the kind of partnership you are looking for, let's build it.", accent: "#F69820", cta: { label: "Become a Sponsor", href: "mailto:contact@lesaruss.com" } },
  ],
  promoter: [
    { id: "promoter-live", headline: "GeekFon Society\nGoes Live", body: "Full production. Every show. Lord Zorlot on the decks.", detail: "GeekFon Society produces live events at anime conventions, club after-parties, theater events, and city activations. The Lord Zorlot DJ set is the flagship live experience: full GeekFon visual production, original music, and the energy of a universe brought into a room.", accent: "#00BCD4" },
    { id: "promoter-production", headline: "Every Show Is\na Content Shoot", body: "You book the act. We build the moment. The footage lives forever.", detail: "Every GeekFon live event feeds three pipelines: the Pulse feed for fans, the animated series archive for Anime 3000, and the long-term content library. Promoters who book GeekFon are not booking a one-night act. They are creating content that extends the brand beyond the venue.", accent: "#9C27B0" },
    { id: "promoter-cities", headline: "Season 1 Is Live", body: "July 13 through November 1, 2026.", detail: "Season 1 runs 111 days, opening July 13 and closing November 1, 2026 with a live event. Active markets include Tokyo, Seoul, Fort Lauderdale, and Berlin. If you produce events in any of these markets - anime conventions, music festivals, club nights, theater programming - we should be talking.", accent: "#F44336" },
    { id: "promoter-cta", headline: "Book the Act", body: "GeekFon Society is available to book for Season 1 shows now.", detail: "We handle production design, music programming, and content capture. You handle the room. Together we put on something that neither of us could alone. Season 1 closes November 1. Dates are limited.", accent: "#00BCD4", cta: { label: "Book an Event", href: "mailto:contact@lesaruss.com" } },
  ],
};

// ── Slide audio map (artist tracks; swap for narration URLs when ready) ────────
const HF_CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
const SLIDE_AUDIO: Record<string, { url: string; label: string }> = {
  // Narration by Cillian (ElevenLabs via Higgsfield) — generated 2026-07-04
  "label-ip":            { url: HF_CDN + "hf_20260704_093438_ffebfbb8-3df6-425a-abce-62a3c4b010b1.mp3", label: "An IP Catalog Ready to License" },
  "label-licensing":     { url: HF_CDN + "hf_20260704_093447_900dd9a2-0ad3-49c9-afac-5cf84d0ccb20.mp3", label: "Sync. Film. TV. Campaigns." },
  "label-pipeline":      { url: HF_CDN + "hf_20260704_093453_b35a943f-f135-4b80-8ebd-073bd42e6c92.mp3", label: "The Proof of Concept" },
  "label-cta":           { url: HF_CDN + "hf_20260704_093459_7f1079bd-9d62-4b48-bda4-c9704ce842fb.mp3", label: "Let's Talk Licensing" },
  "fan-artists":         { url: "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/hf_20260714_075712_9e686e71-c000-4d26-a2b6-6729fbec0eec.wav", label: "Meet the Roster" },
  "fan-pulse":           { url: HF_CDN + "hf_20260714_095820_96c4ad1a-91d5-44f4-8fa8-868180c0b8e4.wav", label: "The Pulse" },
  "fan-tokens":          { url: HF_CDN + "hf_20260714_104150_cb4ef4a4-eda6-4de6-b291-76ae4abedd92.wav", label: "Points Unlock Everything" },
  "fan-voting":          { url: HF_CDN + "hf_20260714_095823_365554cb-7bc9-43d5-b7b3-1d5190590bca.wav", label: "Vote. Rank. Impact." },
  "fan-radio":           { url: HF_CDN + "hf_20260714_095825_23118177-924b-4a25-97dd-47f54b262581.wav", label: "GeekFon Radio" },
  "brand-audience":      { url: HF_CDN + "hf_20260704_093539_5e20b015-f780-4f78-82e1-768a6ee38daa.mp3", label: "Multiple Cities. One Community." },
  "brand-ecosystem":     { url: HF_CDN + "hf_20260704_093546_5640c321-c4d7-402a-95d3-20858f57e6a8.mp3", label: "The Points Ecosystem" },
  "brand-events":        { url: HF_CDN + "hf_20260704_093551_3014e676-c597-423b-b6be-bc69455ea302.mp3", label: "Live Activations That Get Filmed" },
  "brand-cta":           { url: HF_CDN + "hf_20260704_093559_6513f683-9b9f-42b2-8728-f9d51894e8c1.mp3", label: "Your Brand Inside the Universe" },
  "promoter-live":       { url: HF_CDN + "hf_20260704_093604_9d24c5bd-8ed0-475d-8874-b22c4fc60805.mp3", label: "GeekFon Society Goes Live" },
  "promoter-production": { url: HF_CDN + "hf_20260704_093609_9b1762a1-6330-43bb-8a24-ee28db8df4df.mp3", label: "Every Show Is a Content Shoot" },
  "promoter-cities":     { url: HF_CDN + "hf_20260704_093615_04b37f9e-e6d6-42be-bc3b-d59a1ff655c3.mp3", label: "Season 1 Is Live" },
  "promoter-cta":        { url: HF_CDN + "hf_20260704_093622_b5032f34-4217-416b-bb30-f7a85dc52261.mp3", label: "Book the Act" },
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

// ── Featured launch artists (See the Artist popup) ────────────────────────────
// One preview song each, real files mapped from public.radio_tracks.
const PREVIEW: Record<string, { title: string; path: string }> = {
  "roxanne":            { title: "Life's Tough",         path: "roxanne/lifes-tough.mp3" },
  "lex-from-brixton":   { title: "Brixton Baby",          path: "lex-from-brixton/brixton-baby.mp3" },
  "shamanic-resin":     { title: "Real Dream",            path: "shamanic-resin/f420ce12-f399-4a1b-a9ed-b9b3cd012ecb.mp3" },
  "riku":               { title: "Lottery of Love",       path: "riku-hayasaka/lottery-of-love.mp3" },
  "straight-and-narrow":{ title: "Dead Broke",            path: "straight-and-narrow/dead-broke.mp3" },
  "nilo-wave":          { title: "De Borinquen Pa Jamaica (feat. Lickle Bro)", path: "nilo-wave/de-borinquen-pa-jamaica-feat-lickle-bro.mp3" },
  "rustblood-prophets": { title: "Beyond Space and Time", path: "rustblood-prophets/beyond-space-and-time.mp3" },
  "mad-tings":          { title: "Never Broke Us",        path: "mad-tings/never-broke-us.mp3" },
  "vuka":               { title: "Fall Into Rhythm",      path: "vuka/fall-into-rhythm.mp3" },
  "lickle-bro":         { title: "Let Em",                 path: "lickle-bro/let-em.mp3" },
  "lickle-sis":         { title: "No Te Me Montes",       path: "lickle-sis/no-te-me-montes.mp3" },
  "mr-russell":         { title: "Super Nintendo Sega Genesis Solo Mix", path: "mr-russell/super-nintendo-sega-genesis-solo-mix.mp3" },
};
// Same order as the live /roster page (ARTIST_ORDER), so this dropdown always matches
// whoever is actually promoted to the roster.
const TOUR_ARTIST_ORDER = [
  "roxanne", "lex-from-brixton", "shamanic-resin", "riku",
  "straight-and-narrow", "nilo-wave", "rustblood-prophets", "mad-tings",
  "vuka", "lickle-bro", "lickle-sis", "mr-russell",
];
const FEATURED: ArtistCard[] = TOUR_ARTIST_ORDER.map((s) => {
  const base = ARTISTS.find((a) => a.slug === s)!;
  const pv = PREVIEW[s];
  return { ...base, tracks: [{ title: pv.title, url: SUPA_AUDIO + pv.path }] };
});

// ── Flat SVG icons for slide previews ────────────────────────────────────────
const SLIDE_ICONS: Record<string, (color: string) => ReactElement> = {
  "fan-artists":        (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="18" cy="30" r="6" stroke={c} strokeWidth="2.5"/><circle cx="36" cy="26" r="6" stroke={c} strokeWidth="2.5"/><path d="M24 30V12L42 7V26" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "fan-pulse":          (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="10" width="32" height="28" rx="4" stroke={c} strokeWidth="2.5"/><path d="M16 22h4l4-6 4 12 4-6h4" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "fan-tokens":         (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke={c} strokeWidth="2.5"/><path d="M24 16v16M20 20h6a4 4 0 010 8h-6" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  "fan-voting":         (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 10l3.5 10.5H38L29 27l3.5 10.5L24 31l-8.5 6.5L19 27 10 20.5h10.5z" stroke={c} strokeWidth="2.5" strokeLinejoin="round"/></svg>,
  "fan-radio":          (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="20" rx="4" stroke={c} strokeWidth="2.5"/><circle cx="18" cy="30" r="4" stroke={c} strokeWidth="2.5"/><path d="M28 27h6M28 33h6M12 20l12-10 12 10" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  "label-ip":           (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M16 8h16l8 8v24H8V8z" stroke={c} strokeWidth="2.5" strokeLinejoin="round"/><path d="M32 8v8h8M18 22h12M18 28h12M18 34h8" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  "label-licensing":    (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M10 24h28M24 10v28" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="24" r="14" stroke={c} strokeWidth="2.5"/></svg>,
  "label-pipeline":     (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M8 16h10v16H8zM30 16h10v16H30z" stroke={c} strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 24h12" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="24" r="3" fill={c}/></svg>,
  "label-cta":          (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M8 14h32v24H8z" stroke={c} strokeWidth="2.5" strokeLinejoin="round"/><path d="M8 14l16 14L40 14" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "brand-audience":     (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke={c} strokeWidth="2.5"/><path d="M10 24h28M24 10c-4 4-6 9-6 14s2 10 6 14M24 10c4 4 6 9 6 14s-2 10-6 14" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  "brand-ecosystem":    (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="6" stroke={c} strokeWidth="2.5"/><circle cx="24" cy="10" r="4" stroke={c} strokeWidth="2.5"/><circle cx="36" cy="32" r="4" stroke={c} strokeWidth="2.5"/><circle cx="12" cy="32" r="4" stroke={c} strokeWidth="2.5"/><path d="M24 16v2M31 29l-1.5-1.5M17 29l1.5-1.5" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  "brand-events":       (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="16" width="32" height="24" rx="3" stroke={c} strokeWidth="2.5"/><path d="M16 16V10M32 16V10M8 24h32" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="32" r="3" fill={c}/></svg>,
  "brand-cta":          (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M10 24L24 10l14 14-14 14z" stroke={c} strokeWidth="2.5" strokeLinejoin="round"/><circle cx="24" cy="24" r="4" fill={c}/></svg>,
  "promoter-live":      (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M16 38V18l20-8v20" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="38" r="5" stroke={c} strokeWidth="2.5"/><circle cx="33" cy="30" r="5" stroke={c} strokeWidth="2.5"/></svg>,
  "promoter-production":(c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="12" width="32" height="20" rx="3" stroke={c} strokeWidth="2.5"/><path d="M20 38h8M24 32v6" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><polygon points="18,16 34,22 18,28" fill={c}/></svg>,
  "promoter-cities":    (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 10c-6 0-10 5-10 11 0 8 10 17 10 17s10-9 10-17c0-6-4-11-10-11z" stroke={c} strokeWidth="2.5"/><circle cx="24" cy="21" r="4" stroke={c} strokeWidth="2.5"/></svg>,
  "promoter-cta":       (c) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M10 24h28M28 14l10 10-10 10" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function SlidePreview({ slideId, accent }: { slideId: string; accent: string }) {
  const label = {
    "fan-artists": "Artist Profiles", "fan-pulse": "The Pulse", "fan-tokens": "Points",
    "fan-voting": "Rankings", "fan-radio": "GeekFon Radio", "label-ip": "IP Catalog",
    "label-licensing": "Sync Licensing", "label-pipeline": "TalentVangelist", "label-cta": "Contact",
    "brand-audience": "Global Cities", "brand-ecosystem": "Points Economy", "brand-events": "Live Events",
    "brand-cta": "Sponsorships", "promoter-live": "Live Shows", "promoter-production": "Content Pipeline",
    "promoter-cities": "Season 1", "promoter-cta": "Book the Act",
  }[slideId] || "GeekFon";
  const desc = {
    "fan-artists": "Full bio, music, Pulse feed", "fan-pulse": "Daily posts from every artist",
    "fan-tokens": "111 free points to start", "fan-voting": "Vote daily. Shape the charts.",
    "fan-radio": "24/7 live station", "label-ip": "Original music, all genres",
    "label-licensing": "Film, TV, campaigns", "label-pipeline": "Real-artist pipeline",
    "label-cta": "Licensing inquiries open", "brand-audience": "Tokyo · Seoul · Berlin",
    "brand-ecosystem": "Built-in brand moments", "brand-events": "Every show is content",
    "brand-cta": "Native to the universe", "promoter-live": "Lord Zorlot on the decks",
    "promoter-production": "3 archive streams per show", "promoter-cities": "Jul 13 - Nov 1, 2026",
    "promoter-cta": "Dates are limited",
  }[slideId] || "Explore the universe";
  const iconFn = SLIDE_ICONS[slideId] || ((c: string) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><polygon points="24 8 44 40 4 40" stroke={c} strokeWidth="2.5" strokeLinejoin="round"/></svg>);
  return (
    <div style={{
      aspectRatio: "16 / 9",
      background: "rgba(0,0,0,0.45)",
      border: `1px solid ${accent}40`,
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "14px",
      padding: "24px",
      backdropFilter: "blur(8px)",
      boxShadow: `0 0 40px ${accent}20, inset 0 0 30px rgba(0,0,0,0.3)`,
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${accent}15 1px, transparent 1px), linear-gradient(90deg, ${accent}15 1px, transparent 1px)`, backgroundSize: "24px 24px", opacity: 0.5 }} />
      <div style={{ position: "absolute", width: "120px", height: "120px", borderRadius: "50%", background: `${accent}20`, filter: "blur(40px)", top: "20%", left: "30%" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: accent }}>{iconFn(accent)}</div>
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontSize: "16px", fontWeight: 900, color: "#fff", letterSpacing: "0.04em", marginBottom: "6px" }}>{label}</div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Artist Portrait Gallery (label-cta) ───────────────────────────────────────
const GALLERY_ORDER = [
  "roxanne", "lex-from-brixton", "shamanic-resin",
  "riku", "nilo-wave", "lickle-bro",
  "lickle-sis", "mad-tings", "mr-russell",
  "rustblood-prophets", "straight-and-narrow",
];
const GALLERY_ARTISTS = GALLERY_ORDER
  .map((s) => ARTISTS.find((a) => a.slug === s))
  .filter(Boolean) as ArtistCard[];

function ArtistPortraitGallery({ accent }: { accent: string }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 2;
  const totalPages = Math.ceil(GALLERY_ARTISTS.length / PAGE_SIZE);
  const visible = GALLERY_ARTISTS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return (
    <div>
      <div style={{ display: "flex", gap: "8px" }}>
        {visible.map((a) => (
          <div key={a.slug} style={{ flex: 1, borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <div style={{ paddingBottom: "150%", position: "relative" }}>
              <img
                src={a.heroUrl}
                alt={a.name}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)" }} />
              <div style={{ position: "absolute", bottom: "10px", left: "8px", right: "8px" }}>
                <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: a.accent, textTransform: "uppercase", marginBottom: "2px" }}>{a.genre}</div>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{a.name}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "7px", marginTop: "12px" }}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            aria-label={`Show artists page ${i + 1} of ${totalPages}`}
            aria-current={i === page}
            style={{ width: "7px", height: "7px", borderRadius: "50%", border: "none", background: i === page ? accent : "rgba(255,255,255,0.22)", cursor: "pointer", padding: 0, transition: "background 0.2s", flexShrink: 0 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── City Slideshow ────────────────────────────────────────────────────────────
const CITY_DATA = [
  { name: "Tokyo",           ...CITY_IMAGES[0] },
  { name: "Seoul",           ...CITY_IMAGES[1] },
  { name: "Fort Lauderdale", ...CITY_IMAGES[2] },
  { name: "Berlin",          ...CITY_IMAGES[3] },
  { name: "Los Angeles",     ...CITY_IMAGES[4] },
  { name: "Osaka",           ...CITY_IMAGES[5] },
];

function CitySlideshow({ accent = "#9C27B0" }: { accent?: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % CITY_DATA.length), 3500);
    return () => clearInterval(id);
  }, []);
  const city = CITY_DATA[current];
  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative" }}>
      <img
        key={city.name}
        src={city.desktop}
        alt={city.name}
        style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,15,0.82) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", bottom: "14px", left: "16px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: accent, marginBottom: "3px" }}>ACTIVE MARKET</div>
        <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>{city.name}</div>
      </div>
      <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "5px" }}>
        {CITY_DATA.map((c, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Show ${c.name}`}
            aria-current={i === current}
            style={{ width: "5px", height: "5px", borderRadius: "50%", border: "none", background: i === current ? "#fff" : "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, transition: "background 0.2s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Inline artist browser (fan-artists slide, right column) ──────────────────
// Was a full-screen overlay panel (ArtistPanel) that Sean flagged as a mechanic
// switch mid-tour - everything else in the tour is inline slide content, this
// used to pop a separate drawer/modal. Now it's just the right-column content
// for the fan-artists slide, same pattern as SlidePreview/CitySlideshow/etc.
function InlineArtistBrowser({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  const artist = FEATURED[selected];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden" }}>
      {/* Artist selector dropdown (4 launch artists) */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <label htmlFor="gfs-artist-select" style={{ display: "block", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
          Choose an artist
        </label>
        <div style={{ position: "relative" }}>
          <select
            id="gfs-artist-select"
            value={selected}
            onChange={(e) => onSelect(Number(e.target.value))}
            style={{
              width: "100%",
              appearance: "none",
              WebkitAppearance: "none",
              background: "rgba(255,255,255,0.07)",
              border: `1px solid ${artist.accent}`,
              borderRadius: "10px",
              padding: "12px 40px 12px 14px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {FEATURED.map((a, i) => (
              <option key={a.slug} value={i} style={{ background: "#0c0c1a", color: "#fff" }}>
                {a.name}
              </option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)", pointerEvents: "none" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Identity row (square image + text) and free song sit below the selector.
          Dropped the old full-width 16:9 hero to a compact square so the card
          reads faster and does not eat the whole panel. No link out to the full
          artist profile here on purpose - this keeps the fan inside the tour. */}
      <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Row 1: square image left, text right */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          {artist.heroUrl ? (
            <div style={{ position: "relative", width: "84px", height: "84px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", border: `2px solid ${artist.accent}` }}>
              <img
                src={artist.heroUrl}
                alt={artist.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
              />
            </div>
          ) : (
            <div style={{ width: "84px", height: "84px", borderRadius: "12px", background: artist.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900, color: "#fff", flexShrink: 0 }}>
              {artist.initial}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "17px", fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.15 }}>{artist.name}</div>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: artist.accent, margin: "4px 0 8px" }}>{artist.genre}</div>
            <p style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(255,255,255,0.7)", margin: 0 }}>{artist.tagline}</p>
          </div>
        </div>

        {/* Row 2: the one free song live on this artist's own page */}
        <div>
          <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
            Free Song
          </div>
          {artist.tracks[0] && <TrackPlayer key={artist.slug} track={artist.tracks[0]} accent={artist.accent} />}
        </div>
      </div>
    </div>
  );
}
// ── Tour audio: bottom-bar narration toggle (sits between Back and Next) ─────
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
    // If actual playback hasn't started within 8s (stalled stream, bad CDN response,
    // etc.) stop spinning forever and surface it instead of hanging silently.
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

// ── Tour audio: standalone player (slide 1, no cover art) ────────────────────
function TourSoloPlayer({ track, accent }: { track: { url: string; label: string }; accent: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "unavailable">("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } }

  function start() {
    const a = new Audio(track.url);
    a.addEventListener("playing", () => { clearTimer(); setState("playing"); });
    a.addEventListener("pause", () => setState((s) => (s === "unavailable" ? s : "idle")));
    a.addEventListener("timeupdate", () => { setProgress(a.currentTime / (a.duration || 1)); });
    a.addEventListener("ended", () => { setState("idle"); setProgress(0); });
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
  const wvH = [5,8,13,17,23,27,30,25,19,27,30,22,15,23,30,23,17,25,27,19,13,17,23,30,25,21,17,13,9,7,5,9,13,18,24,30,24,19,14,10];

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `0.5px solid ${accent}50`, borderRadius: "14px", padding: "22px 20px", width: "100%" }}>
      {/* Waveform */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "32px", marginBottom: "18px" }}>
        {wvH.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: "2px", background: progress > i / wvH.length ? accent : `${accent}30` }} />
        ))}
      </div>
      {/* Play + info */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <button onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"}
          style={{ width: "46px", height: "46px", borderRadius: "50%", background: isUnavailable ? "rgba(255,90,90,0.6)" : accent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isLoading
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="20" style={{ animation: "spin 0.8s linear infinite" }} /></svg>
            : isPlaying
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : isUnavailable
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l16 16M20 4L4 20"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="7 4 20 12 7 20"/></svg>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.label}</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{isLoading ? "Loading..." : isPlaying ? "Playing" : isUnavailable ? "Unavailable - tap to retry" : "Tap to listen"}</div>
        </div>
      </div>
      {/* Progress */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: accent, borderRadius: "2px", transition: "width 0.1s linear" }} />
      </div>
    </div>
  );
}
// ── Tour audio: compact module strip (slides 2+, sits below visual) ───────────
function TourAudioModule({ track, accent, label }: { track: { url: string }; accent: string; label: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "unavailable">("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 20;

  function clearTimer() { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } }

  function start() {
    const a = new Audio(track.url);
    a.addEventListener("playing", () => { clearTimer(); setState("playing"); });
    a.addEventListener("pause", () => setState((s) => (s === "unavailable" ? s : "idle")));
    a.addEventListener("timeupdate", () => {
      if (a.currentTime >= LIMIT) { a.pause(); a.currentTime = 0; setState("idle"); setProgress(0); return; }
      setProgress(a.currentTime / LIMIT);
    });
    a.addEventListener("ended", () => { setState("idle"); setProgress(0); });
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
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px" }}>
      <button onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"}
        style={{ width: "32px", height: "32px", borderRadius: "50%", background: isUnavailable ? "rgba(255,90,90,0.6)" : accent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isLoading
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="20" style={{ animation: "spin 0.8s linear infinite" }} /></svg>
          : isPlaying
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : isUnavailable
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l16 16M20 4L4 20"/></svg>
              : <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="7 4 20 12 7 20"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isUnavailable ? "Unavailable - tap to retry" : label}</div>
        <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: accent, borderRadius: "2px", transition: "width 0.1s linear" }} />
        </div>
      </div>
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
  const [fanArtistIndex, setFanArtistIndex] = useState(0);
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
    <SiteChrome>
    <div className="gfs-main" style={{ minHeight: "100dvh", background: "#070712", color: "white", fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

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
        @media(max-width:899px){
          .gfs-main{overflow-y:auto !important}
          .gfs-outer-content--path{padding-left:0 !important;padding-right:0 !important;padding-top:0 !important}
        }
        @media(max-width:640px){
          .gfs-outer-content:not(.gfs-outer-content--path){padding-left:24px !important;padding-right:24px !important}
        }
        .tour-slide-wrap{display:flex;flex-direction:column;width:100%;align-items:flex-start}
        .tour-text-col{width:100%;padding:28px 20px 16px;min-width:0;box-sizing:border-box}
        .tour-right-col{width:100%;padding:0 20px 32px;min-width:0;box-sizing:border-box}
        @media(min-width:900px){
          .tour-slide-wrap{flex-direction:row;align-items:center}
          .tour-text-col{width:52%;flex:0 0 52%;padding:40px 32px 0 56px}
          .tour-right-col{width:48%;flex:0 0 48%;padding:40px 48px 0 16px}
        }
        .picker-right-col{display:none}
        @media(min-width:900px){.picker-right-col{display:block;flex:0 0 44%;min-width:0}}
        @media(max-width:899px){
          .tour-detail-tight{margin-bottom:14px !important}
          .tour-pipeline-row{padding:6px 14px !important}
          .tour-pipeline-arrow{padding:2px 0 !important}
          .tour-pipeline-sub{margin-top:0 !important}
          .tour-cta-gallery-wrap{display:none !important}
          .tour-right-col-cta{padding-bottom:0 !important}
        }
      `}</style>

      {/* Top bar removed: SiteChrome provides the single nav (hamburger + Get Passport).
          Pagination + Skip now live in the bottom bar below. */}

      {/* Main content */}
      <div className={`gfs-outer-content${phase === "path" ? " gfs-outer-content--path" : ""}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", padding: phase === "path" ? "0 0 100px" : "48px 80px 100px", position: "relative", zIndex: 10, width: "100%" }}>
        <div
          key={`${phase}-${pathSlide}`}
          className="slide-content"
          style={{ width: "100%", opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
        >

          {/* PICKER */}
          {phase === "picker" && (
            <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "32px" }}>
              {/* Left: heading + role cards */}
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
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

              {/* Right: 16:9 city slideshow — desktop only */}
              <div className="picker-right-col">
                <CitySlideshow accent="#9C27B0" />
              </div>
            </div>
          )}

          {/* PATH SLIDES */}
          {phase === "path" && currentSlide && role && (
            <div className="tour-slide-wrap">

              {/* Left: text */}
              <div className="tour-text-col">
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: currentSlide.accent, opacity: 0.85 }}>
                    {ROLE_META[role].label} - {pathSlide + 1} of {currentSlides.length}
                  </span>
                </div>

                <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                  {currentSlide.headline}
                </h2>

                <p style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", fontWeight: 600, color: currentSlide.accent, margin: "0 0 14px", lineHeight: 1.5 }}>
                  {currentSlide.body}
                </p>

                {currentSlide.detail && (
                  <p className={currentSlide.id === "label-pipeline" || currentSlide.id === "label-cta" ? "tour-detail-tight" : undefined} style={{ fontSize: "clamp(0.85rem, 1.5vw, 0.95rem)", fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: "0 0 30px" }}>
                    {currentSlide.detail}
                  </p>
                )}

                {isLastSlide && currentSlide.cta && !currentSlide.isArtistSlide && (
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
                    {role !== "fan" && (
                      <button
                        onClick={() => transition(() => { setPhase("picker"); setRole(null); })}
                        style={{ background: "none", border: "none", padding: "0", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", textDecoration: "underline", textUnderlineOffset: "3px" }}
                      >
                        See other paths
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: dynamic panel — desktop only via CSS class */}
              <div className={currentSlide.id === "label-cta" ? "tour-right-col tour-right-col-cta" : "tour-right-col"}>
                {currentSlide.id === "label-ip" ? (
                  /* Slide 1: solo player, no cover art */
                  <TourSoloPlayer track={SLIDE_AUDIO["label-ip"]} accent={currentSlide.accent} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* label-licensing: platform distribution list */}
                    {currentSlide.id === "label-licensing" && (
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                        {[
                          { name: "Spotify",          color: "#1DB954", badge: "Live" },
                          { name: "Apple Music",      color: "#FA586A", badge: "Live" },
                          { name: "Amazon Music",     color: "#FF9900", badge: "Live" },
                          { name: "Sync / Film / TV", color: currentSlide.accent, badge: "License open" },
                          { name: "Advertising",      color: "#F69820", badge: "License open" },
                        ].map((p, i, arr) => (
                          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", borderBottom: i < arr.length - 1 ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "inherit" }}>{p.name}</span>
                            <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px", background: `${p.color}22`, color: p.color }}>{p.badge}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* label-pipeline: GeekFon → systems → TalentVangelist */}
                    {currentSlide.id === "label-pipeline" && (
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                        {([
                          { label: "GeekFon Society",      sub: "Fictional IP catalog — 11 artists, live now",       color: "#9C27B0" },
                          null,
                          { label: "Fan + Token Systems",  sub: "Engagement, rankings, radio — proven live",         color: "#E91E8C" },
                          null,
                          { label: "TalentVangelist",       sub: "Real-artist agency — scales from this system",      color: "#F69820" },
                        ] as ({ label: string; sub: string; color: string } | null)[]).map((n, i) => n === null ? (
                          <div key={i} className="tour-pipeline-arrow" style={{ display: "flex", justifyContent: "center", padding: "4px 0", borderBottom: "0.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>↓</div>
                        ) : (
                          <div key={n.label} className="tour-pipeline-row" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", borderBottom: i < 4 ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: n.color, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "inherit" }}>{n.label}</div>
                              <div className="tour-pipeline-sub" style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>{n.sub}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* label-cta: paginated artist portrait gallery (desktop only - hidden on mobile per Sean, also fixes mobile scroll) */}
                    {currentSlide.id === "label-cta" && (
                      <div className="tour-cta-gallery-wrap">
                        <ArtistPortraitGallery accent={currentSlide.accent} />
                      </div>
                    )}

                    {/* brand-audience: city slideshow */}
                    {role !== "label" && currentSlide.id === "brand-audience" && (
                      <CitySlideshow accent={currentSlide.accent} />
                    )}

                    {/* fan-artists: inline artist browser (was a separate overlay panel) */}
                    {currentSlide.isArtistSlide && (
                      <InlineArtistBrowser selected={fanArtistIndex} onSelect={setFanArtistIndex} />
                    )}

                    {/* All other roles: SlidePreview */}
                    {role !== "label" && currentSlide.id !== "brand-audience" && !currentSlide.isArtistSlide && (
                      <SlidePreview slideId={currentSlide.id} accent={currentSlide.accent} />
                    )}

                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: single set of controls. Pagination centered, Skip at right, Back/Next on path. */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "20px 28px 28px", background: "linear-gradient(to top, rgba(7,7,18,0.95) 0%, transparent 100%)", zIndex: 20 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
          {phase === "path" && (
            <button
              onClick={handleBack}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "100px", padding: "12px 24px", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}
            >
              Back
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {phase === "path" && currentSlide && SLIDE_AUDIO[currentSlide.id] && (
            <TourNarrationButton key={currentSlide.id} track={SLIDE_AUDIO[currentSlide.id]} accent={roleAccent} />
          )}
          <ProgressDots total={totalSteps} current={currentStep} accent={roleAccent} />
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
          <a href="/passport" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", textDecoration: "none", textTransform: "uppercase" }}>
            Skip
          </a>
          {phase === "path" && !isLastSlide && (
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
      </div>

    </div>
    </SiteChrome>
  );
}
