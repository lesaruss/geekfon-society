"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import SiteChrome from "@/components/SiteChrome";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";

type Track = { n: string; m: string; v: string; url?: string };
type Stat = { v: string; l: string };
type Pill = { label: string; accent?: boolean };
type Rel = { name: string; desc: string };
type News = { tag?: string; date?: string; title?: string; blurb?: string; href?: string; thumb?: string };
type Audit = { title: string; status?: string; pillar?: string; theme?: string; emotion?: string; scores?: Record<string, number> };
type PulsePost = {
  type: 'voice_message' | 'music_drop' | 'article';
  date?: string;
  caption?: string;
  audioUrl?: string;
  trackName?: string; trackEra?: string; trackUrl?: string; trackVisibility?: string;
  tag?: string; title?: string; blurb?: string; href?: string; thumb?: string;
};
export type ArtistContent = {
  name?: string; accent?: string; accentText?: string; accentTint?: string;
  heroUrl?: string; initial?: string; tagline?: string;
  crumb?: { label: string; href?: string }[]; pills?: Pill[];
  message?: { ja?: string; en?: string; audio?: string; audioEn?: string; audioJa?: string };
  quote?: string; bio?: string[]; stats?: Stat[]; tracks?: Track[]; news?: News[];
  relationships?: Rel[]; identity?: Record<string, string>;
  brief?: Record<string, string>; universe?: Record<string, string>;
  sonic?: { primaryGenre?: string; secondaryGenre?: string; vocalAge?: string; tone?: string; delivery?: string; songPrompt?: string; songPromptNote?: string };
  visual?: { visualIdentity?: string; houseStyle?: string; imagePrompt?: string; imagePromptNote?: string };
  songAudits?: Audit[];
  pulse?: PulsePost[];
};

const TABS: { key: string; label: string; admin?: boolean }[] = [
  { key: "pulse", label: "Pulse" },
  { key: "music", label: "Music" },
  { key: "media", label: "Media" },
  { key: "brief", label: "Brief", admin: true },
];

const PLAY = <svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20 7 4" /></svg>;
const PAUSE = <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>;
const LOCK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;

const PLACEHOLDER_NEWS: News[] = [
  {
    tag: "Feature",
    date: "Season 1 - Coming Jul 2026",
    title: "Roxanne Steps Into the Light",
    blurb: "After years of silence, the voice that once disappeared from the GeekFon universe is ready to tell the full story. We sit down with Roxanne ahead of Season 1.",
    href: "#",
    thumb: undefined,
  },
  {
    tag: "Interview",
    date: "Season 1 - Coming Jul 2026",
    title: "The Lost Song: What Really Happened",
    blurb: "A deep dive into the era that defined Roxanne's sound and the conversation with Riku Hayasaka that changed everything.",
    href: "#",
    thumb: undefined,
  },
  {
    tag: "Press",
    date: "Season 1 - Coming Jul 2026",
    title: "GeekFon Society Announces Season 1 Roster",
    blurb: "The full lineup for the inaugural 111-day season is revealed. Roxanne leads the charge as the universe's first fully documented artist.",
    href: "#",
    thumb: undefined,
  },
];

export default function ArtistPage({ content, cityBg }: { content: ArtistContent; cityBg?: { desktop: string; mobile: string } | null }) {
  const [tab, setTab] = useState("pulse");
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [playing, setPlaying] = useState<string | null>(null);
  const [pulsePage, setPulsePage] = useState(0);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [playingV, setPlayingV] = useState<string | null>(null);
  const [bbSlot, setBbSlot] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const c = content || {};
  const name = c.name || "Artist";
  const vars = {
    ["--rx" as string]: c.accent || "#E91E8C",
    ["--rx-text" as string]: c.accentText || "#9c1458",
    ["--rx-tint" as string]: c.accentTint || "rgba(233,30,140,0.10)",
  } as React.CSSProperties;
  const emph = (t: string) => t.replace(/\{\{(.+?)\}\}/g, '<em style="color:var(--rx-text);font-style:normal;font-weight:800">$1</em>');

  // Fetch current user's membership tier
  useEffect(() => {
    if (!SUPA_ANON) return;
    const sb = createClient(SUPA_URL, SUPA_ANON);
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("gfs_members").select("tier").eq("user_id", user.id).single()
        .then(({ data }) => { if (data?.tier) setUserTier(data.tier); });
    });
  }, []);

  // Reset pulse page when switching tabs
  useEffect(() => { setPulsePage(0); }, [tab]);

  // Billboard auto-rotate every 6s, pause on hover handled via CSS
  useEffect(() => {
    bbTimerRef.current = setInterval(() => setBbSlot(s => (s + 1) % 3), 6000);
    return () => { if (bbTimerRef.current) clearInterval(bbTimerRef.current); };
  }, []);

  // Audio helpers
  function fmtTime(s: number): string {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }
  function onTimeUpdate() {
    const a = audioRef.current;
    if (!a || !playing) return;
    if (playingV === "preview" && a.currentTime >= 20) {
      a.pause(); a.currentTime = 0; setPlaying(null); setPlayingV(null); return;
    }
    setAudioProgress(prev => ({ ...prev, [playing]: a.currentTime }));
  }
  function onLoadedMetadata() {
    const a = audioRef.current;
    if (!a || !playing) return;
    setAudioDuration(prev => ({ ...prev, [playing]: a.duration }));
  }
  function seekTo(e: React.MouseEvent<HTMLDivElement>, url: string) {
    const a = audioRef.current;
    if (!a || playing !== url) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const maxTime = playingV === "preview" ? 20 : (a.duration || 0);
    a.currentTime = pct * maxTime;
  }

  // Visibility helpers
  // public   - free for everyone
  // preview  - 20s clip, playable by everyone (not yet released)
  // passport - full for passport+; locked for visitors
  // members  - full for promoter/pro; locked for passport & visitors
  // locked   - admin only
  const TIER_RANK: Record<string, number> = { passport: 1, promoter: 2, pro: 3 };
  function trackLocked(v: string): boolean {
    if (v === "public" || v === "preview") return false;
    if (v === "passport") return !userTier;
    if (v === "members")  return !userTier || (TIER_RANK[userTier] || 0) < 2;
    return true; // locked / admin
  }
  function trackBadge(v: string): { label: string; cls: string } {
    if (v === "public")   return { label: "Free",     cls: "vb-public" };
    if (v === "preview")  return { label: "Preview",  cls: "vb-preview" };
    if (v === "passport") return { label: "Passport", cls: "vb-passport" };
    if (v === "members")  return { label: "Members",  cls: "vb-members" };
    return                       { label: "Locked",   cls: "vb-locked" };
  }
  function trackPlayLabel(v: string, isPlaying: boolean): string {
    if (isPlaying) return "Pause";
    if (v === "preview") return "Play Preview";
    return "Play";
  }
  function trackLockedLabel(v: string): string {
    if (v === "passport") return "Passport members";
    if (v === "members")  return "Members only";
    return "Locked";
  }

  function copy(e: React.MouseEvent<HTMLButtonElement>, text: string) {
    const b = e.currentTarget; const prev = b.textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    b.textContent = "Copied"; setTimeout(() => { b.textContent = prev; }, 1400);
  }
  function togglePlay(url: string, v?: string) {
    const a = audioRef.current; if (!a) return;
    if (playing === url) { a.pause(); setPlaying(null); setPlayingV(null); return; }
    a.src = url;
    a.play()
      .then(() => { setPlaying(url); setPlayingV(v || null); })
      .catch(() => { setPlaying(null); setPlayingV(null); });
  }
  const crumb = [
    { label: "GeekFon", href: "/" },
    { label: "Roster", href: "/roster" },
    { label: name },
  ];

  // ── Pulse pagination ──────────────────────────────────────────────────────────
  const PULSE_PER_PAGE = 5;
  type PulseItem =
    | { kind: "voice"; key: string }
    | { kind: "bio"; key: string }
    | { kind: "drop"; t: Track; i: number; key: string }
    | { kind: "article"; n: News; i: number; key: string };

  const msg = c.message || {};
  const hasMsg = !!(msg.ja || msg.en);
  const pulseArticles = c.news && c.news.length > 0 ? c.news : PLACEHOLDER_NEWS;
  const allPulseItems: PulseItem[] = [];
  if (hasMsg) allPulseItems.push({ kind: "voice", key: "voice" });
  if (c.bio || c.quote) allPulseItems.push({ kind: "bio", key: "bio" });
  (c.tracks || []).forEach((t, i) => allPulseItems.push({ kind: "drop", t, i, key: `drop-${i}` }));
  pulseArticles.forEach((n, i) => allPulseItems.push({ kind: "article", n, i, key: `article-${i}` }));
  const pulseTotalPages = Math.ceil(allPulseItems.length / PULSE_PER_PAGE);
  const pulseVisible = allPulseItems.slice(pulsePage * PULSE_PER_PAGE, (pulsePage + 1) * PULSE_PER_PAGE);

  return (
    <SiteChrome>
      <div style={vars}>
        <style>{CSS}{cityBg ? CITY_CSS : ""}</style>
        <audio ref={audioRef} onEnded={() => { setPlaying(null); setPlayingV(null); }} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} />
        <div className={"apg" + (cityBg ? " has-city-bg" : "")}>

          {/* Black header - city bg is scoped inside here */}
          <div className="bible-head">

            {/* City background layers - absolute, behind all content */}
            {cityBg && (
              <>
                <div className="apg-aurora" aria-hidden="true">
                  <div className="apg-stars" />
                  <div className="apga apga1" /><div className="apga apga2" /><div className="apga apga3" />
                  <div className="apga apga4" /><div className="apga apga5" />
                  <div className="apg-ground" />
                </div>
                <div className="apg-city-stage" aria-hidden="true">
                  <picture>
                    <source media="(max-width:768px)" srcSet={cityBg.mobile} />
                    <img src={cityBg.desktop} alt="" aria-hidden="true" />
                  </picture>
                </div>
              </>
            )}

            {/* Logo + breadcrumb bar */}
            <div className="head-topbar">
              <nav className="head-crumb" aria-label="Breadcrumb">
                {crumb.map((x, i, a) => (
                  <span key={i} className="head-crumb-item">
                    {x.href
                      ? <a href={x.href}>{x.label}</a>
                      : <span className="cur">{x.label}</span>
                    }
                    {i < a.length - 1 && <span className="sep">/</span>}
                  </span>
                ))}
              </nav>
            </div>

            {/* Artist hero + meta */}
            <div className="head-grid">
              {c.heroUrl ? (
                <img className="head-art" src={c.heroUrl} alt={name + " portrait"} />
              ) : (
                <div className="head-art-fallback">{c.initial || name.charAt(0)}</div>
              )}
              <div className="head-meta">
                <div className="head-name">{name}</div>
                <p className="head-tagline">{c.tagline}</p>
                <div className="pill-row">
                  {(c.pills || []).map((p, i) => (<span key={i} className={"pill" + (p.accent ? " accent" : "")}>{p.label}</span>))}
                </div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="tabbar" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} className="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}{t.admin && <span className="adminbadge">Admin</span>}
              </button>
            ))}
          </div>

          {/* Two-column body: content + billboard */}
          <div className="body-layout">
            <div className="body-main">

              {/* Pulse tab - paginated social feed */}
              {tab === "pulse" && (
                <section className="panel">
                  <div className="pulse-feed">
                    {pulseVisible.map((post) => {
                      if (post.kind === "voice") {
                        const audioUrl = AUDIO + (lang === "ja" ? (msg.audioJa || msg.audioEn) : (msg.audioEn || msg.audioJa));
                        const hasAudio = !!(msg.audioEn || msg.audioJa);
                        const isPlayingVoice = hasAudio && playing === audioUrl;
                        return (
                          <div key={post.key} className="pf-post pf-voice">
                            <div className="pf-meta">
                              <span className="pf-type-badge pf-type-voice">Voice Message</span>
                              <span className="pf-date">Season 1 &middot; Jul 2026</span>
                            </div>
                            {c.heroUrl && <img className="pf-voice-img" src={c.heroUrl} alt="" />}
                            <div className="pf-voice-body">
                              {hasAudio && (
                                <div className="pf-voice-player">
                                  <button
                                    className={"pf-voice-play" + (isPlayingVoice ? " on" : "")}
                                    onClick={() => togglePlay(audioUrl)}
                                    aria-label={isPlayingVoice ? "Pause" : "Play voice message"}
                                  >
                                    {isPlayingVoice ? PAUSE : PLAY}
                                  </button>
                                  <div className="pf-wave">
                                    {Array.from({ length: 30 }).map((_, i) => (
                                      <span key={i} className={isPlayingVoice ? "playing" : ""} style={{ height: 4 + Math.round(Math.abs(Math.sin(i * 0.9 + 1)) * 24) }} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              <p className="pf-caption">{lang === "ja" ? msg.ja : msg.en}</p>
                              {msg.en && msg.ja && (
                                <button className="rxp-lang" onClick={() => {
                                  const next = lang === "ja" ? "en" : "ja";
                                  setLang(next);
                                  // Switch audio track if playing
                                  if (isPlayingVoice) {
                                    const nextUrl = AUDIO + (next === "ja" ? (msg.audioJa || msg.audioEn) : (msg.audioEn || msg.audioJa));
                                    if (nextUrl) togglePlay(nextUrl);
                                  }
                                }}>
                                  {lang === "ja" ? "EN English" : "JA Japanese"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      if (post.kind === "bio") {
                        return (
                          <div key={post.key} className="pf-post pf-bio">
                            <div className="pf-meta">
                              <span className="pf-type-badge pf-type-bio">About</span>
                            </div>
                            {c.quote && <blockquote className="pf-quote">{"“" + c.quote + "”"}</blockquote>}
                            {(c.bio || []).slice(0, 2).map((p, i) => (
                              <p key={i} className="pf-bio-p" dangerouslySetInnerHTML={{ __html: emph(p) }} />
                            ))}
                          </div>
                        );
                      }
                      if (post.kind === "drop") {
                        const { t } = post;
                        const url = t.url ? AUDIO + t.url : null;
                        const locked = trackLocked(t.v);
                        const isPlaying = !!url && playing === url;
                        const badge = trackBadge(t.v);
                        const progress = url ? (audioProgress[url] || 0) : 0;
                        const duration = url ? (audioDuration[url] || 0) : 0;
                        const maxTime = t.v === "preview" ? 20 : duration;
                        const pct = maxTime > 0 ? Math.min(100, (progress / maxTime) * 100) : 0;
                        return (
                          <div key={post.key} className="pf-post pf-drop">
                            <div className="pf-meta">
                              <span className="pf-type-badge pf-type-drop">Music Drop</span>
                              <span className="pf-date">{t.m}</span>
                              <span className={"vis-badge " + badge.cls}>{badge.label}</span>
                            </div>
                            <div className={"pf-drop-card" + (locked ? " locked-card" : "")}>
                              {/* Left: play button or lock */}
                              {locked ? (
                                <a href="/dashboard" className="pf-drop-lock-btn" aria-label="Unlock with Passport">
                                  {LOCK}
                                </a>
                              ) : (
                                <button
                                  className={"pf-drop-play-btn" + (isPlaying ? " on" : "")}
                                  disabled={!url}
                                  onClick={() => url && togglePlay(url, t.v)}
                                  aria-label={isPlaying ? "Pause" : "Play"}
                                >
                                  {isPlaying ? PAUSE : PLAY}
                                </button>
                              )}
                              {/* Right: track info + scrubber */}
                              <div className="pf-drop-info">
                                <div className="pf-drop-name">{t.n}</div>
                                {locked ? (
                                  <a href="/dashboard" className="pf-drop-unlock-cta">
                                    Get Passport to unlock
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                                  </a>
                                ) : (
                                  <>
                                    <div
                                      className="pf-scrubber"
                                      onClick={(e) => url && seekTo(e, url)}
                                      role="slider"
                                      aria-label="Seek"
                                    >
                                      <div className="pf-scrubber-track">
                                        <div className="pf-scrubber-fill" style={{ width: `${pct}%` }} />
                                        <div className="pf-scrubber-thumb" style={{ left: `${pct}%` }} />
                                      </div>
                                    </div>
                                    <div className="pf-scrubber-times">
                                      <span>{fmtTime(progress)}</span>
                                      <span>{t.v === "preview" ? "0:20 Preview" : (maxTime > 0 ? fmtTime(maxTime) : "--:--")}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (post.kind === "article") {
                        const { n, i } = post;
                        return (
                          <div key={post.key} className="pf-post pf-article">
                            <div className="pf-meta">
                              <span className="pf-type-badge pf-type-article">Article</span>
                              {n.date && <span className="pf-date">{n.date}</span>}
                            </div>
                            <div className="pf-article-card">
                              <div className="pf-article-img">
                                {n.thumb
                                  ? <img src={n.thumb} alt={n.title || ""} />
                                  : <div className="pf-article-ph" style={{ background: `hsl(${(i * 47 + 200) % 360}, 60%, 92%)` }} />
                                }
                                {n.tag && <span className="article-tag">{n.tag}</span>}
                              </div>
                              <div className="pf-article-body">
                                {n.title && <div className="pf-article-title">{n.title}</div>}
                                {n.blurb && <p className="pf-article-blurb">{n.blurb}</p>}
                                <a href={n.href || "#"} className="article-cta">
                                  Read more
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {pulseTotalPages > 1 && (
                    <div className="pulse-pagination">
                      <button
                        className="pulse-page-btn"
                        onClick={() => { setPulsePage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={pulsePage === 0}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        Prev
                      </button>
                      <div className="pulse-page-info">
                        <span className="pulse-page-cur">{pulsePage + 1}</span>
                        <span className="pulse-page-sep">/</span>
                        <span className="pulse-page-tot">{pulseTotalPages}</span>
                      </div>
                      <button
                        className="pulse-page-btn"
                        onClick={() => { setPulsePage(p => Math.min(pulseTotalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={pulsePage === pulseTotalPages - 1}
                      >
                        Next
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                  )}
                </section>
              )}

              {tab === "music" && (
                <section className="panel">
                  <div className="panel-intro"><span>Full catalog. What plays adapts to your membership.</span></div>
                  {(c.tracks || []).map((t, i) => {
                    const url = t.url ? AUDIO + t.url : null;
                    const locked = trackLocked(t.v);
                    const isPlaying = !!url && playing === url;
                    const badge = trackBadge(t.v);
                    const progress = url ? (audioProgress[url] || 0) : 0;
                    const duration = url ? (audioDuration[url] || 0) : 0;
                    const maxTime = t.v === "preview" ? 20 : duration;
                    const pct = maxTime > 0 ? Math.min(100, (progress / maxTime) * 100) : 0;
                    return (
                      <div key={i} className={"track" + (locked ? " track-locked" : "")}>
                        {locked ? (
                          <a href="/dashboard" className="tplay locked" aria-label="Unlock with Passport">{LOCK}</a>
                        ) : (
                          <button
                            className={"tplay" + (isPlaying ? " on" : "")}
                            disabled={!url}
                            aria-label={isPlaying ? "Pause" : "Play"}
                            onClick={() => url && togglePlay(url, t.v)}
                          >
                            {isPlaying ? PAUSE : PLAY}
                          </button>
                        )}
                        <div className="ti">
                          <div className="tn">{t.n}</div>
                          {!locked && (
                            <div className="track-scrubber" onClick={(e) => url && seekTo(e, url)}>
                              <div className="ts-track">
                                <div className="ts-fill" style={{ width: `${pct}%` }} />
                                <div className="ts-thumb" style={{ left: `${pct}%` }} />
                              </div>
                              <span className="ts-time">{isPlaying ? fmtTime(progress) : ""}{maxTime > 0 ? ` / ${t.v === "preview" ? "0:20" : fmtTime(maxTime)}` : ""}</span>
                            </div>
                          )}
                          {locked && <div className="track-locked-msg"><a href="/dashboard">Get Passport to unlock</a></div>}
                        </div>
                        <span className={"vis-badge " + badge.cls}>{badge.label}</span>
                      </div>
                    );
                  })}
                </section>
              )}

              {tab === "media" && (<section className="panel"><p className="empty-note">Media gallery renders here (wire to storage on rollout).</p></section>)}

              {tab === "brief" && (
                <section className="panel">
                  <div className="adminbar"><span className="t">Admin only.</span> <span className="s">The Brief tab is the internal World Bible.</span></div>
                  <p className="bsec">Identity &amp; Backstory</p>
                  {c.identity && (<div className="card"><div className="kv">{Object.entries(c.identity).map(([k, v]) => (<div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>))}</div></div>)}
                  {c.brief && (
                    <div className="card">
                      {c.brief.highConcept && (<><p className="mini-h" style={{ marginTop: 0 }}>High Concept</p><p>{c.brief.highConcept}</p></>)}
                      {(c.brief.strength || c.brief.weakness) && (<><p className="mini-h">Strength &amp; Weakness</p><p><strong>Greatest strength:</strong> {c.brief.strength} <strong>Greatest weakness:</strong> {c.brief.weakness}</p></>)}
                      {c.brief.wound && (<><p className="mini-h">Defining Wound</p><p>{c.brief.wound}</p></>)}
                      {c.brief.lostSong && (<><p className="mini-h">The Lost Song Era</p><p>{c.brief.lostSong}</p></>)}
                      {c.brief.rikuConversation && (<><p className="mini-h">The Conversation</p><p>{c.brief.rikuConversation}</p></>)}
                      {c.brief.emotionalJourney && (<><p className="mini-h">Emotional Journey</p><p>{c.brief.emotionalJourney}</p></>)}
                    </div>
                  )}
                  {c.universe && (<><p className="bsec">Universe Placement</p><div className="card"><div className="kv">{Object.entries(c.universe).map(([k, v]) => (<div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>))}</div></div></>)}
                  {!!(c.relationships || []).length && (<div className="card">{(c.relationships || []).map((r, i) => (<div key={i} className="rel-row"><div className="rel-name">{r.name}</div><div className="rel-desc">{r.desc}</div></div>))}</div>)}
                  {c.sonic && (
                    <>
                      <p className="bsec">Sonic DNA &amp; Song Prompt</p>
                      <div className="card">
                        <div className="kv">
                          {c.sonic.primaryGenre && <div><div className="k">Primary Genre</div><div className="v">{c.sonic.primaryGenre}</div></div>}
                          {c.sonic.secondaryGenre && <div><div className="k">Secondary Genre</div><div className="v">{c.sonic.secondaryGenre}</div></div>}
                          {c.sonic.vocalAge && <div><div className="k">Vocal Age</div><div className="v">{c.sonic.vocalAge}</div></div>}
                          {c.sonic.tone && <div><div className="k">Tone / Energy / Texture</div><div className="v">{c.sonic.tone}</div></div>}
                        </div>
                        {c.sonic.delivery && <p style={{ marginTop: 14 }}>{c.sonic.delivery}</p>}
                      </div>
                      {c.sonic.songPrompt && (<div className="copy-block"><div className="copy-bar"><span className="lbl">Song Prompt (paste into Suno)</span><button className="copy-btn" onClick={(e) => copy(e, c.sonic!.songPrompt!)}>Copy</button></div><pre className="copy-body">{c.sonic.songPrompt}</pre></div>)}
                      {c.sonic.songPromptNote && <p className="hint">{c.sonic.songPromptNote}</p>}
                    </>
                  )}
                  {c.visual && (
                    <>
                      <p className="bsec">Visual DNA &amp; Image Prompt</p>
                      <div className="card">
                        {c.visual.visualIdentity && <p><strong>Visual identity.</strong> {c.visual.visualIdentity}</p>}
                        {c.visual.houseStyle && <p style={{ marginTop: 10 }}><strong>House style.</strong> {c.visual.houseStyle}</p>}
                      </div>
                      {c.visual.imagePrompt && (<div className="copy-block"><div className="copy-bar"><span className="lbl">Image Prompt (zero text)</span><button className="copy-btn" onClick={(e) => copy(e, c.visual!.imagePrompt!)}>Copy</button></div><pre className="copy-body">{c.visual.imagePrompt}</pre></div>)}
                      {c.visual.imagePromptNote && <p className="hint">{c.visual.imagePromptNote}</p>}
                    </>
                  )}
                  {!!(c.songAudits || []).length && (
                    <>
                      <p className="bsec">Song Audits</p>
                      {(c.songAudits || []).map((a, i) => (
                        <div key={i} className="audit">
                          <div className="audit-title">{a.title}</div>
                          {(a.status || a.pillar) && <div className="audit-meta">{a.status}{a.status && a.pillar ? " · " : ""}{a.pillar}</div>}
                          {a.theme && <p className="audit-theme">{a.theme}</p>}
                          <div className="scores">
                            {Object.entries(a.scores || {}).map(([k, v]) => (<span key={k} className="score">{k.replace(/_/g, " ")} {v}</span>))}
                            {a.emotion && <span className="score emo">{a.emotion}</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {!!(c.tracks || []).length && (
                    <>
                      <p className="bsec">Catalog &amp; Status</p>
                      <div className="card"><table className="cat"><thead><tr><th>Song</th><th>Era / Tier</th><th>Visibility</th></tr></thead>
                      <tbody>{(c.tracks || []).map((t, i) => { const b = trackBadge(t.v); return (<tr key={i}><td className="song">{t.n}</td><td>{t.m}</td><td><span className={"vis-badge " + b.cls}>{b.label}</span></td></tr>); })}</tbody></table></div>
                    </>
                  )}
                </section>
              )}

            </div>

            {/* Billboard rotator sidebar */}
            <aside className="billboard" onMouseEnter={() => { if (bbTimerRef.current) clearInterval(bbTimerRef.current); }} onMouseLeave={() => { bbTimerRef.current = setInterval(() => setBbSlot(s => (s + 1) % 3), 6000); }}>
              <div className="bb-label">Billboard</div>
              <div className="bb-rotator">
                {[
                  { label: "Primary Ad",  dim: "300 x 250", tall: false },
                  { label: "Feature Ad",  dim: "300 x 250", tall: false },
                  { label: "Skyscraper",  dim: "300 x 600", tall: true  },
                ].map((ad, i) => (
                  <div key={i} className={"bb-slide" + (bbSlot === i ? " active" : "") + (ad.tall ? " tall" : "")}>
                    <div className="bb-placeholder">
                      <div className="bb-ph-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                      <div className="bb-ph-text">{ad.label}</div>
                      <div className="bb-ph-dim">{ad.dim}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bb-dots">
                {[0, 1, 2].map(i => (
                  <button key={i} className={"bb-dot" + (bbSlot === i ? " active" : "")} onClick={() => setBbSlot(i)} aria-label={`Ad ${i + 1}`} />
                ))}
              </div>
              <div className="bb-tag">Powered by LESARUSS Advertising</div>
            </aside>

          </div>

        </div>
      </div>
    </SiteChrome>
  );
}

const CSS = `
.apg{max-width:none;margin:0;padding:0 0 80px}

/* Black header */
.bible-head{background:#111;color:#fff;padding:0 0 28px;border-bottom:4px solid var(--rx)}

.head-topbar{
  display:flex;align-items:center;gap:14px;
  padding:16px 40px 20px;
  border-bottom:1px solid rgba(255,255,255,.07);
  margin-bottom:28px;
}
.head-crumb{display:flex;align-items:center;gap:8px}
.head-crumb-item{display:flex;align-items:center;gap:8px}
.head-crumb a{font-size:13px;font-weight:700;color:rgba(255,255,255,.55);text-decoration:none;letter-spacing:.01em}
.head-crumb a:hover{color:rgba(255,255,255,.9)}
.head-crumb .cur{font-size:13px;font-weight:800;color:var(--rx);letter-spacing:.01em}
.head-crumb .sep{color:rgba(255,255,255,.22);font-size:13px;font-weight:400}

.head-grid{display:flex;gap:32px;align-items:flex-start;padding:0 40px}
.head-art,.head-art-fallback{width:clamp(280px,34vw,460px);aspect-ratio:1;border-radius:20px;border:2px solid var(--rx);object-fit:cover;object-position:top;background:var(--rx);display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:900;color:#fff;flex-shrink:0}
.head-meta{flex:1;min-width:0;padding-top:6px}
.head-name{font-size:clamp(36px,6vw,60px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase;line-height:.98}
.head-tagline{font-size:17px;color:rgba(255,255,255,.85);margin-top:14px;max-width:680px;line-height:1.55}
.pill-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.pill{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;padding:6px 14px;border-radius:20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16)}
.pill.accent{background:var(--rx);border-color:var(--rx)}

.tabbar{position:sticky;top:60px;z-index:6;background:#fff;border-bottom:1px solid var(--lr-border);display:flex;gap:2px;padding:0 40px}
.tab{position:relative;font-family:inherit;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);background:none;border:none;padding:18px 18px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}
.tab[aria-selected="true"]{color:var(--rx-text)}
.tab[aria-selected="true"]::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--rx)}
.adminbadge{font-size:8px;font-weight:900;background:var(--rx-tint);color:var(--rx-text);padding:2px 5px;border-radius:3px}

.body-layout{display:flex;align-items:flex-start;gap:0;padding:0 40px;margin-top:0}
.body-main{flex:1;min-width:0;padding-top:30px;padding-right:28px}
.panel{max-width:none}

.billboard{width:300px;flex-shrink:0;position:sticky;top:120px;padding-top:30px;display:flex;flex-direction:column;gap:16px}
.bb-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;color:var(--lr-text-30);margin-bottom:8px}
/* Rotator */
.bb-rotator{position:relative;width:100%}
.bb-slide{display:none}
.bb-slide.active{display:block}
.bb-placeholder{border:1px dashed var(--lr-border);border-radius:10px;background:var(--lr-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 16px;color:var(--lr-text-30);min-height:250px}
.bb-slide.tall .bb-placeholder{min-height:500px}
.bb-ph-icon svg{width:28px;height:28px;opacity:.4}
.bb-ph-text{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-30)}
.bb-ph-dim{font-size:10px;font-weight:600;color:var(--lr-text-30);opacity:.7}
.bb-dots{display:flex;justify-content:center;gap:7px;padding:12px 0 4px}
.bb-dot{width:7px;height:7px;border-radius:50%;border:1.5px solid var(--lr-text-30);background:transparent;cursor:pointer;padding:0;transition:background .15s,border-color .15s}
.bb-dot.active{background:var(--rx);border-color:var(--rx)}
.bb-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--lr-text-30);text-align:center;padding:4px 0 0}

.rxp-lang{align-self:flex-start;font-family:inherit;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--rx-text);border:1px solid var(--lr-border);background:#fff;border-radius:100px;padding:6px 13px;cursor:pointer}
.rxp-lang:hover{border-color:var(--rx)}
.card{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:22px 24px;margin-bottom:14px}
.card p{font-size:15px;color:var(--lr-text-75);line-height:1.75}
@media(max-width:900px){
  .body-layout{flex-direction:column;padding:0 16px}
  .body-main{padding-right:0}
  .billboard{width:100%;position:static;padding-top:0}
  .bb-slot-tall{display:none}
  .head-grid{flex-direction:column;padding:0 16px}
  .head-topbar{padding:14px 16px 16px}
  .tabbar{padding:0 16px}
}
.article-cta{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--rx-text);text-decoration:none;margin-top:4px}
.article-cta svg{width:14px;height:14px;transition:transform .15s}
.article-cta:hover svg{transform:translateX(3px)}
.article-tag{position:absolute;top:10px;left:10px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:4px 10px;border-radius:20px;background:var(--rx-tint);color:var(--rx-text);backdrop-filter:blur(4px)}
.panel-intro{font-size:13px;color:var(--lr-text-50);margin-bottom:18px}
.track{display:flex;align-items:center;gap:16px;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:10px;padding:13px 18px;margin-bottom:9px}
.tplay{width:42px;height:42px;border-radius:50%;border:none;background:var(--rx);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.tplay svg{width:16px;height:16px;fill:currentColor}
.tplay.on{filter:brightness(.92)}
.tplay.locked{background:var(--lr-bg);color:var(--lr-text-30);border:1px solid var(--lr-border);cursor:not-allowed}
.tplay.locked svg{fill:none;width:15px;height:15px}
.track .ti{flex:1}.track .tn{font-size:15px;font-weight:800}.track .tm{font-size:11px;color:var(--lr-text-50);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.vis-badge{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:3px 9px;border-radius:20px;white-space:nowrap}
.vb-public  {background:rgba(76,175,80,.14);color:#2e7d32}
.vb-preview {background:rgba(246,152,32,.16);color:#b45309}
.vb-passport{background:var(--rx-tint);color:var(--rx-text)}
.vb-members {background:rgba(99,102,241,.13);color:#4338ca}
.vb-locked  {background:rgba(0,0,0,.06);color:var(--lr-text-30)}
.adminbar{display:flex;gap:10px;background:#111;color:#fff;border-radius:10px;padding:12px 16px;margin-bottom:22px;font-size:12px}
.adminbar .t{font-weight:800;text-transform:uppercase;letter-spacing:.08em}.adminbar .s{color:rgba(255,255,255,.7)}
.bsec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:var(--rx-text);margin:26px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--lr-border)}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px 22px}
.kv .k{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--rx-text);margin-bottom:2px}.kv .v{font-size:14px;font-weight:600}
.mini-h{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin:16px 0 6px}.mini-h:first-child{margin-top:0}
.rel-row{display:flex;gap:12px;padding:11px 0;border-top:1px solid var(--lr-border)}.rel-row:first-child{border-top:none}
.rel-name{font-size:12px;font-weight:900;text-transform:uppercase;color:var(--rx-text);min-width:120px}.rel-desc{font-size:13px;color:var(--lr-text-75)}
.copy-block{border:1px solid var(--lr-border);border-radius:10px;overflow:hidden;margin-bottom:8px}
.copy-bar{display:flex;align-items:center;justify-content:space-between;background:var(--rx-tint);padding:9px 14px;border-bottom:1px solid var(--lr-border)}
.copy-bar .lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--rx-text)}
.copy-btn{font-family:inherit;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;background:var(--rx);color:#fff;border:none;border-radius:5px;padding:6px 13px;cursor:pointer}
.copy-body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.65;color:var(--lr-text);background:var(--lr-surface);padding:14px 16px;white-space:pre-wrap;word-break:break-word;margin:0}
.hint{font-size:12px;color:var(--lr-text-50);margin:6px 0 4px;font-style:italic}
.audit{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:16px 18px;margin-bottom:10px}
.audit-title{font-size:15px;font-weight:900}
.audit-meta{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--lr-text-50);margin-top:4px}
.audit-theme{font-size:13.5px;color:var(--lr-text-75);line-height:1.6;margin-top:9px}
.scores{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}
.score{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:3px 9px;border-radius:20px;background:var(--rx-tint);color:var(--rx-text)}
.score.emo{background:var(--lr-bg);color:var(--lr-text-50)}
.empty-note{font-size:13px;color:var(--lr-text-50);font-style:italic}
.cat{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
.cat th{text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);padding:8px 10px;border-bottom:2px solid var(--lr-border)}
.cat td{padding:9px 10px;border-bottom:1px solid var(--lr-border);color:var(--lr-text-75)}
.cat td.song{font-weight:700;color:var(--lr-text)}

/* ---- Pulse Feed ---- */
.pulse-feed{display:flex;flex-direction:column;gap:20px}
.pf-post{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:14px;overflow:hidden;padding:20px 22px}
.pf-meta{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.pf-type-badge{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;padding:3px 9px;border-radius:20px}
.pf-type-voice,.pf-type-drop{background:var(--rx-tint);color:var(--rx-text)}
.pf-type-bio,.pf-type-article{background:rgba(0,0,0,.05);color:var(--lr-text-50)}
.pf-date{font-size:11px;font-weight:700;color:var(--lr-text-30);text-transform:uppercase;letter-spacing:.06em}
/* Voice message */
.pf-voice-img{width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:14px}
.pf-voice-body{display:flex;flex-direction:column;gap:12px}
.pf-voice-player{display:flex;align-items:center;gap:12px;background:var(--lr-bg);border:1px solid var(--lr-border);border-radius:10px;padding:10px 14px}
.pf-voice-play{width:38px;height:38px;border-radius:50%;border:none;background:var(--rx);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.pf-voice-play svg{width:14px;height:14px;fill:currentColor}
.pf-voice-play.on{filter:brightness(.88)}
.pf-wave{display:flex;align-items:center;gap:3px;height:36px;flex:1}
.pf-wave span{width:3px;border-radius:2px;background:rgba(233,30,140,.28);display:block;transition:background .2s}
.pf-wave span.playing{background:var(--rx);animation:pulse-bar .6s ease-in-out infinite alternate}
@keyframes pulse-bar{from{opacity:.5}to{opacity:1}}
.pf-caption{font-size:15px;line-height:1.7;color:var(--lr-text-75);font-style:italic}
/* Bio post */
.pf-quote{font-size:clamp(18px,2.4vw,22px);font-weight:900;color:var(--rx-text);line-height:1.3;margin:0 0 14px;border-left:3px solid var(--rx);padding-left:16px;font-style:italic}
.pf-bio-p{font-size:14px;color:var(--lr-text-75);line-height:1.75;margin-top:10px}
.pf-bio-p:first-of-type{margin-top:0}
/* Music drop */
.pf-drop-card{display:flex;gap:14px;align-items:center;border:1px solid var(--lr-border);border-radius:10px;padding:14px 16px;background:var(--lr-bg)}
.pf-drop-card.locked-card{background:rgba(0,0,0,.02);border-style:dashed}
.pf-drop-play-btn{width:44px;height:44px;border-radius:50%;border:none;background:var(--rx);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;transition:filter .15s}
.pf-drop-play-btn svg{width:16px;height:16px;fill:currentColor}
.pf-drop-play-btn.on{filter:brightness(.88)}
.pf-drop-play-btn:disabled{background:var(--lr-border);cursor:not-allowed}
.pf-drop-lock-btn{width:44px;height:44px;border-radius:50%;border:1.5px dashed var(--lr-text-30);background:transparent;color:var(--lr-text-30);display:flex;align-items:center;justify-content:center;flex-shrink:0;text-decoration:none;transition:border-color .15s,color .15s}
.pf-drop-lock-btn:hover{border-color:var(--rx);color:var(--rx-text)}
.pf-drop-lock-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}
.pf-drop-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.pf-drop-name{font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf-drop-unlock-cta{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--lr-text-30);text-decoration:none;transition:color .15s}
.pf-drop-unlock-cta:hover{color:var(--rx-text)}
.pf-drop-unlock-cta svg{width:12px;height:12px;flex-shrink:0}
/* Scrubber */
.pf-scrubber{cursor:pointer;padding:4px 0}
.pf-scrubber-track{position:relative;height:4px;background:var(--lr-border);border-radius:2px}
.pf-scrubber-fill{position:absolute;left:0;top:0;height:100%;background:var(--rx);border-radius:2px;transition:width .1s linear}
.pf-scrubber-thumb{position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:var(--rx);box-shadow:0 0 0 2px #fff;transition:left .1s linear}
.pf-scrubber-times{display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:var(--lr-text-30);margin-top:3px;letter-spacing:.02em}
/* Music tab scrubber */
.track-scrubber{display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px 0}
.ts-track{flex:1;position:relative;height:3px;background:var(--lr-border);border-radius:2px}
.ts-fill{position:absolute;left:0;top:0;height:100%;background:var(--rx);border-radius:2px;transition:width .1s linear}
.ts-thumb{position:absolute;top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:var(--rx);box-shadow:0 0 0 2px #fff;transition:left .1s linear;opacity:0}
.track:hover .ts-thumb{opacity:1}
.ts-time{font-size:10px;font-weight:700;color:var(--lr-text-30);white-space:nowrap;min-width:60px;text-align:right}
.track-locked .tplay{text-decoration:none}
.track-locked-msg{font-size:11px;color:var(--lr-text-30)}
.track-locked-msg a{color:var(--rx-text);text-decoration:none;font-weight:700}
.track-locked-msg a:hover{text-decoration:underline}
/* Article post */
.pf-article-card{border:1px solid var(--lr-border);border-radius:10px;overflow:hidden;background:var(--lr-bg)}
.pf-article-img{aspect-ratio:16/8;position:relative;overflow:hidden}
.pf-article-img img,.pf-article-ph{width:100%;height:100%;object-fit:cover;display:block}
.pf-article-body{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.pf-article-title{font-size:17px;font-weight:900;line-height:1.25;color:var(--lr-text)}
.pf-article-blurb{font-size:13px;color:var(--lr-text-75);line-height:1.6;margin:0}
/* Pagination controls */
.pulse-pagination{display:flex;align-items:center;justify-content:space-between;margin-top:28px;padding:18px 0;border-top:1px solid var(--lr-border)}
.pulse-page-btn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--rx-text);background:none;border:1.5px solid var(--lr-border);border-radius:100px;padding:10px 20px;cursor:pointer;transition:border-color .15s,background .15s}
.pulse-page-btn:hover:not(:disabled){border-color:var(--rx);background:var(--rx-tint)}
.pulse-page-btn:disabled{opacity:.35;cursor:not-allowed}
.pulse-page-btn svg{width:14px;height:14px}
.pulse-page-info{display:flex;align-items:baseline;gap:4px;font-size:13px;font-weight:700}
.pulse-page-cur{font-size:18px;font-weight:900;color:var(--rx-text)}
.pulse-page-sep{color:var(--lr-text-30)}
.pulse-page-tot{color:var(--lr-text-50)}
`;

const CITY_CSS = `
/* City bg scoped to bible-head only */
.has-city-bg .bible-head {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: #020c0a !important;
}
/* All content inside bible-head sits above the bg layers */
.has-city-bg .head-topbar,
.has-city-bg .head-grid {
  position: relative;
  z-index: 2;
}
/* Aurora layer - absolute, fills bible-head */
.apg-aurora {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.apg-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 9% 6%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 24% 12%, rgba(255,255,255,.35) 0%, transparent 100%),
    radial-gradient(1px 1px at 44% 4%, rgba(255,255,255,.48) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 18% 4%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 66% 2%, rgba(255,255,255,.55) 0%, transparent 100%);
}
.apga { position:absolute; border-radius:50%; filter:blur(90px); }
.apga1 { width:85vw; height:48vh; top:-20vh; left:4vw; background:radial-gradient(ellipse at center,rgba(0,215,95,.24) 0%,transparent 70%); animation:apgd1 18s ease-in-out infinite alternate; }
.apga2 { width:62vw; height:40vh; top:-14vh; right:-6vw; background:radial-gradient(ellipse at center,rgba(0,155,255,.18) 0%,transparent 70%); animation:apgd2 24s ease-in-out infinite alternate; }
.apga3 { width:52vw; height:34vh; top:0; left:24vw; background:radial-gradient(ellipse at center,rgba(120,0,255,.13) 0%,transparent 70%); animation:apgd3 20s ease-in-out infinite alternate; }
.apga4 { width:40vw; height:24vh; top:-8vh; left:46vw; background:radial-gradient(ellipse at center,rgba(0,255,185,.15) 0%,transparent 70%); animation:apgd4 28s ease-in-out infinite alternate; }
.apga5 { width:28vw; height:20vh; top:4vh; left:62vw; background:radial-gradient(ellipse at center,rgba(190,70,255,.09) 0%,transparent 70%); animation:apgd5 22s ease-in-out infinite alternate; }
.apg-ground { position:absolute; bottom:0; left:0; right:0; height:50%; background:linear-gradient(to top,rgba(2,12,10,.85) 0%,transparent 100%); }
@keyframes apgd1 { from{transform:translate(0,0) scaleX(1)} to{transform:translate(4vw,5vh) scaleX(1.1)} }
@keyframes apgd2 { from{transform:translate(0,0) scaleY(1)} to{transform:translate(-5vw,3vh) scaleY(1.18)} }
@keyframes apgd3 { from{transform:translate(0,0) rotate(0)} to{transform:translate(3vw,-4vh) rotate(7deg)} }
@keyframes apgd4 { from{transform:translate(0,0)} to{transform:translate(-4vw,6vh)} }
@keyframes apgd5 { from{transform:translate(0,0) scale(1)} to{transform:translate(5vw,-5vh) scale(1.3)} }
/* City image layer - absolute, fills bible-head */
.apg-city-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.apg-city-stage::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 40%;
  background: linear-gradient(to bottom, rgba(2,12,10,.9) 0%, transparent 100%);
  z-index: 10;
}
.apg-city-stage picture { display: block; width: 100%; height: 100%; }
.apg-city-stage img { width: 100%; height: 100%; object-fit: cover; object-position: center bottom; display: block; }
`;
