"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import type { SyntheticEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { isNative, purchaseArtistUnlock } from "@/lib/revenuecat";
import { PostCard } from "@/components/SocialFeed";
import "./ArtistPage.css";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

const AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";
const MEDIA = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/";

type Track = { n: string; m: string; v: string; url?: string; scheduledFor?: string; hasRemix?: boolean; isRemix?: boolean; isFinale?: boolean; isPremiere?: boolean; lyricsOriginal?: string; lyricsOriginalLang?: string; lyricsEn?: string };
type Stat = { v: string; l: string };
type Pill = { label: string; accent?: boolean };
type Rel = { name: string; desc: string };
type News = { slug?: string; tag?: string; date?: string; title?: string; blurb?: string; href?: string; thumb?: string; content?: string; draft?: boolean; videoUrl?: string };
type Audit = { title: string; status?: string; pillar?: string; theme?: string; emotion?: string; scores?: Record<string, number> };
type PulsePost = {
  id?: string;
  type?: string;
  text?: string;
  caption?: string;
  date?: string;
  timestamp?: string;
  media?: string;
  duration?: string;
  memberOnly?: boolean;
  engagement?: { likes?: number; comments?: number; shares?: number };
  audioUrl?: string;
  trackName?: string; trackEra?: string; trackUrl?: string; trackVisibility?: string;
  tag?: string; title?: string; blurb?: string; href?: string; thumb?: string;
  likes?: number; comments?: number; shares?: number; videoUrl?: string;
  pinned?: boolean;
  featured?: boolean;
};

type BibleModule = {
  id: string;
  artist_slug: string;
  module: string;
  module_label: string | null;
  data: Record<string, unknown>;
  confidence: Record<string, string>;
  canon_status: string;
  status: string;
  version: number;
  updated_at: string;
};

// One row per song from public.song_release_briefs (see app/api/admin/release-briefs/route.ts).
// Read-only in the Brief tab for now - editing happens directly in Supabase until a producer
// UI is built (see task tracker, 2026-07-23).
type ReleaseBrief = {
  id: string;
  track_name: string;
  album_title: string | null;
  track_number: number | null;
  season: string | null;
  producer: string | null;
  label_name: string | null;
  copyright_line: string | null;
  songwriter_name: string | null;
  songwriter_pro: string | null;
  songwriter_ipi: string | null;
  ai_vocals: boolean;
  ai_lyrics: boolean;
  ai_production: boolean;
  ai_tool_used: string | null;
  ai_rights_confirmed: boolean;
  ai_disclosure_notes: string | null;
  cover_art_status: string;
  music_video_status: string;
  promo_video_status: string;
  master_audio_status: string;
  distrokid_status: string;
  distrokid_release_id: string | null;
  brief_status: string;
  updated_at: string;
};

export type ArtistContent = {
  name?: string; genre?: string; accent?: string; accentText?: string; accentTint?: string;
  heroUrl?: string; profileUrl?: string; initial?: string; tagline?: string;
  crumb?: { label: string; href?: string }[]; pills?: Pill[];
  message?: { ja?: string; en?: string; audio?: string; audioEn?: string; audioJa?: string };
  quote?: string; bio?: string[]; stats?: Stat[]; tracks?: Track[]; news?: News[];
  relationships?: Rel[]; identity?: Record<string, string>;
  brief?: Record<string, string>; universe?: Record<string, string>;
  sonic?: { primaryGenre?: string; secondaryGenre?: string; vocalAge?: string; tone?: string; delivery?: string; songPrompt?: string; songPromptNote?: string };
  visual?: { visualIdentity?: string; houseStyle?: string; imagePrompt?: string; imagePromptNote?: string };
  songAudits?: Audit[];
  pulse?: PulsePost[];
  introVideoUrl?: string;
  videoThumbUrl?: string;
  skyscraperUrl?: string; skyscraperLink?: string; skyscraperPlacementId?: string; skyscraperCampaignId?: string;
  primaryAdUrl?: string; primaryAdLink?: string; primaryAdPlacementId?: string; primaryAdCampaignId?: string;
  featureAdUrl?: string; featureAdLink?: string; featureAdPlacementId?: string; featureAdCampaignId?: string;
  members?: { name: string; initial?: string; color?: string; img?: string; role?: string; position?: string; hook?: string; traits?: string[]; quote?: string; detail?: string }[];
};

// 2026-07-27 per Sean/V: Brief removed from the profile nav entirely (moving
// to a new home elsewhere - not this component's concern). The underlying
// `tab === "brief"` render block further down is left in place, unreachable,
// until V decides where it relocates to - deleting the whole read-only
// release-brief admin view outright felt premature for a nav-only ask.
// Group renamed to Chat per the same conversation.
const TABS: { key: string; label: string; admin?: boolean; needsMembers?: boolean }[] = [
  { key: "music",    label: "Music" },
  { key: "pulse",    label: "Pulse" },
  { key: "social",   label: "Social" },
  { key: "chat",     label: "Chat" },
  { key: "members",  label: "Members", needsMembers: true },
];

// Artists with real, artist-voiced Pulse/News content built out. Everyone else's
// Pulse/Social/Group tabs show a "Coming Soon" placeholder instead of content
// (see the `!POPULATED_PULSE_ARTISTS.includes` branches below) - but per Sean,
// 2026-07-26 (second pass), the TABS THEMSELVES are no longer hidden for
// non-populated artists. Previously this list also drove visibleTabs, which
// meant every artist except these four only showed a bare "Music" tab - it
// looked like a different, unfinished product next to Lex's page instead of
// the same site with content still being written. Tab bar is now identical
// across every artist; only the in-tab content differs.
const POPULATED_PULSE_ARTISTS = ["roxanne", "lex-from-brixton", "shamanic-resin", "riku"];

// Social moved out to its own top-level tab 2026-07-26 (see TABS above + the
// `tab === "social"` section below) and is no longer a Pulse channel. Group
// Chat pulled out the same way 2026-07-26 per Sean, into its own top-level
// "Group" tab (label shortened from "Group Chat" - too long for the tab bar).
// Pulse is now just the News feed directly, no channel-pill sub-nav since
// there's only one channel left in it. Group gates the same way Social does -
// free registration (isRegistered()), NOT the $11 artist unlock - the chat
// feature itself isn't built yet, so registered visitors see a "coming soon"
// panel there for now (see the `tab === "group"` section below).

const PLAY = <svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20 7 4" /></svg>;
const PAUSE = <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>;
const LOCK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>;

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


// ââ Module-level constants + helpers (hoisted for BiblePanel access) âââââââââ
const PHASES = [
  { label: "Identity Layer", modules: ["identity","psychology","personality"] },
  { label: "Character",      modules: ["backstory","voice","emotional_performance","visual_identity"] },
  { label: "Music",          modules: ["musical_dna","lyrical_dna"] },
  { label: "World",          modules: ["relationships","lore","timeline"] },
  { label: "Creative",       modules: ["creative_direction","prompt_library","canon_rules"] },
  { label: "Admin",          modules: ["assets","version_history","creative_producer_notes"] },
];

function isPopulated(data: Record<string, unknown>): boolean {
  return Object.values(data || {}).some(v =>
    v !== null && v !== undefined && v !== "" &&
    !(Array.isArray(v) && v.length === 0) &&
    !(typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)
  );
}

function getDisplayStatus(mod: { status: string; data: Record<string, unknown> }): { label: string; color: string; bg: string; weight: number } {
  if (mod.status === "complete")  return { label: "Complete",    color: "#16a34a", bg: "#dcfce7", weight: 1.00 };
  if (mod.status === "approved")  return { label: "Approved",    color: "#7c3aed", bg: "#ede9fe", weight: 0.85 };
  if (mod.status === "review")    return { label: "Review",      color: "#d97706", bg: "#fef3c7", weight: 0.60 };
  if (isPopulated(mod.data))      return { label: "In Progress", color: "#2563eb", bg: "#dbeafe", weight: 0.30 };
  return                                 { label: "Not Started", color: "#9ca3af", bg: "#f3f4f6", weight: 0.00 };
}

// ââ BiblePanel âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Standalone component so it can be extracted to its own file as usage grows.
// Scalable for hundreds of artists: search, status filter, versioning, progress.
function BiblePanel({
  bibleModules, bibleLoading, bibleOpenModule, setBibleOpenModule,
  MODULE_ORDER, isPopulated, statusColor, renderBibleValue,
  slug, sonic, visual, songAudits, copy,
  releaseBriefs, releaseBriefsLoading, releaseBriefOpen, setReleaseBriefOpen,
}: {
  bibleModules: BibleModule[];
  bibleLoading: boolean;
  bibleOpenModule: string | null;
  setBibleOpenModule: (m: string | null) => void;
  MODULE_ORDER: string[];
  isPopulated: (data: Record<string, unknown>) => boolean;
  statusColor: (s: string) => string;
  renderBibleValue: (val: unknown, depth?: number) => React.ReactNode;
  slug?: string;
  artistSlug: string;
  sonic?: ArtistContent["sonic"];
  visual?: ArtistContent["visual"];
  songAudits?: ArtistContent["songAudits"];
  copy: (e: React.MouseEvent<HTMLButtonElement>, text: string) => void;
  releaseBriefs: ReleaseBrief[];
  releaseBriefsLoading: boolean;
  releaseBriefOpen: string | null;
  setReleaseBriefOpen: (id: string | null) => void;
}) {
  const [bibleSearch, setBibleSearch] = useState("");
  const [bibleStatusFilter, setBibleStatusFilter] = useState<"all"|"draft"|"review"|"complete">("all");

  const sorted = [...bibleModules].sort((a,b) => {
    const ai = MODULE_ORDER.indexOf(a.module);
    const bi = MODULE_ORDER.indexOf(b.module);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const populated = sorted.filter(m => isPopulated(m.data));
  const pct = sorted.length > 0 ? Math.round((populated.length / sorted.length) * 100) : 0; // legacy, used in module count only

  const filtered = sorted.filter(m => {
    const label = (m.module_label || m.module.replace(/_/g," ")).toLowerCase();
    const matchSearch = !bibleSearch || label.includes(bibleSearch.toLowerCase()) ||
      JSON.stringify(m.data).toLowerCase().includes(bibleSearch.toLowerCase());
    const displayLabel = getDisplayStatus(m).label.toLowerCase().replace(" ","_");
    const matchStatus = bibleStatusFilter === "all" || displayLabel === bibleStatusFilter || m.status === bibleStatusFilter;
    return matchSearch && matchStatus;
  });

  // Release Tracker status colors - separate small vocabulary from the Bible's
  // draft/review/approved/complete scale, since these track distribution readiness
  // (needed/in_progress/ready, not_submitted/submitted/live/rejected) not narrative completeness.
  function releaseStatusColor(s: string): { color: string; bg: string } {
    if (s === "ready" || s === "approved" || s === "submitted" || s === "live") return { color: "#16a34a", bg: "#dcfce7" };
    if (s === "in_progress" || s === "ready_for_review") return { color: "#2563eb", bg: "#dbeafe" };
    if (s === "rejected") return { color: "#dc2626", bg: "#fee2e2" };
    if (s === "not_planned") return { color: "#9ca3af", bg: "#f3f4f6" };
    return { color: "#9ca3af", bg: "#f3f4f6" }; // needed / draft / not_submitted
  }

  const briefsByAlbum = releaseBriefs.reduce((acc, b) => {
    const key = b.album_title || "Unassigned";
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {} as Record<string, ReleaseBrief[]>);

  return (
    <section className="panel">
      {/* Header */}
      <div className="adminbar" style={{marginBottom:12}}>
        <span className="t">Artist Bible</span>
        <span className="s">{slug || "unknown"} &nbsp;|&nbsp; super admin only</span>
      </div>

      {/* Release Tracker - per-song brief pulled from song_release_briefs. Answers the
          questions each song needs before it can go out (DistroKid or otherwise):
          songwriter/PRO credit, AI disclosure, and the cover art / video / master-audio
          asset slots a producer owns. Read-only here; edit in Supabase until a full
          producer UI exists. */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:.5,color:"#6b7280"}}>RELEASE TRACKER</span>
          {releaseBriefs.length > 0 && (
            <span style={{fontSize:11,fontWeight:700,color:"#9ca3af"}}>{releaseBriefs.length} song{releaseBriefs.length === 1 ? "" : "s"}</span>
          )}
        </div>

        {releaseBriefsLoading && <p className="hint" style={{paddingLeft:4}}>Loading release briefs...</p>}
        {!releaseBriefsLoading && releaseBriefs.length === 0 && (
          <div className="card" style={{color:"var(--rx-text)",fontSize:13}}>
            No release briefs yet for <strong>{slug}</strong>. Add rows to song_release_briefs to start tracking.
          </div>
        )}

        {!releaseBriefsLoading && Object.entries(briefsByAlbum).map(([album, tracks]) => (
          <div key={album} style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:.6,color:"#9ca3af",textTransform:"uppercase",marginBottom:6}}>
              {album}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {tracks.map(b => {
                const isOpen = releaseBriefOpen === b.id;
                const bs = releaseStatusColor(b.brief_status);
                return (
                  <div key={b.id} style={{borderRadius:10,border:"1px solid",borderColor:isOpen?"var(--rx)":"rgba(0,0,0,0.08)",overflow:"hidden",background:"#fff",transition:"border-color .15s"}}>
                    <button
                      onClick={() => setReleaseBriefOpen(isOpen ? null : b.id)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}
                    >
                      <span style={{flex:1,fontSize:13,fontWeight:600,color:"#111"}}>
                        {b.track_number ? `${b.track_number}. ` : ""}{b.track_name}
                      </span>
                      {b.producer && <span style={{fontSize:11,color:"#9ca3af"}}>{b.producer}</span>}
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:.5,padding:"2px 8px",borderRadius:20,background:bs.bg,color:bs.color}}>
                        {b.brief_status.replace(/_/g," ").toUpperCase()}
                      </span>
                      <span style={{fontSize:16,color:"#9ca3af",transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>&#8964;</span>
                    </button>
                    {isOpen && (
                      <div style={{padding:"0 14px 14px",borderTop:"1px solid rgba(0,0,0,0.05)",display:"flex",flexDirection:"column",gap:10,marginTop:10}}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
                          <div>
                            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.4}}>Label</div>
                            <div style={{fontSize:13}}>{b.label_name || "â"}</div>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.4}}>Copyright</div>
                            <div style={{fontSize:13}}>{b.copyright_line || "â"}</div>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.4}}>Songwriter</div>
                            <div style={{fontSize:13}}>{b.songwriter_name || "â"}{b.songwriter_pro ? ` (${b.songwriter_pro})` : ""}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>AI Disclosure</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {(["ai_vocals","ai_lyrics","ai_production"] as const).map(k => (
                              <span key={k} style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,
                                background: b[k] ? "#fef3c7" : "#f3f4f6", color: b[k] ? "#92400e" : "#9ca3af"}}>
                                {k.replace("ai_","").toUpperCase()}: {b[k] ? "AI" : "None"}
                              </span>
                            ))}
                            {b.ai_tool_used && <span style={{fontSize:11,color:"#6b7280"}}>Tool: {b.ai_tool_used}</span>}
                            <span style={{fontSize:11,fontWeight:700,color: b.ai_rights_confirmed ? "#16a34a" : "#dc2626"}}>
                              Rights {b.ai_rights_confirmed ? "confirmed" : "NOT confirmed"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>Assets</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {([
                              ["Cover Art", b.cover_art_status],
                              ["Music Video", b.music_video_status],
                              ["Promo Video", b.promo_video_status],
                              ["Master Audio", b.master_audio_status],
                            ] as const).map(([label, val]) => {
                              const sc = releaseStatusColor(val);
                              return (
                                <span key={label} style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>
                                  {label}: {val.replace(/_/g," ")}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.4}}>DistroKid</div>
                          {(() => { const sc = releaseStatusColor(b.distrokid_status); return (
                            <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>
                              {b.distrokid_status.replace(/_/g," ")}
                            </span>
                          ); })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{height:1,background:"rgba(0,0,0,0.07)",margin:"14px 0 0"}} />
      </div>

      {/* Phase Progress Tracker */}
      {sorted.length > 0 && (() => {
        const totalWeight = sorted.reduce((sum, m) => sum + getDisplayStatus(m).weight, 0);
        const completionPct = Math.round((totalWeight / sorted.length) * 100);
        const moduleMap = Object.fromEntries(sorted.map(m => [m.module, m]));
        const statusCounts = { "Not Started": 0, "In Progress": 0, "Review": 0, "Approved": 0, "Complete": 0 } as Record<string,number>;
        sorted.forEach(m => { const s = getDisplayStatus(m).label; statusCounts[s] = (statusCounts[s] || 0) + 1; });

        return (
          <div style={{marginBottom:16}}>
            {/* Overall bar */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:.5,color:"#6b7280"}}>BIBLE PROGRESS</span>
              <span style={{fontSize:13,fontWeight:800,color:"var(--rx)"}}>{completionPct}%</span>
            </div>
            <div style={{height:6,background:"#e5e7eb",borderRadius:99,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${completionPct}%`,background:"var(--rx)",borderRadius:99,transition:"width .5s ease"}} />
            </div>
            {/* Status legend */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
              {Object.entries(statusCounts).filter(([,n])=>n>0).map(([label,count])=>{
                const colorMap: Record<string,string> = {"Not Started":"#9ca3af","In Progress":"#2563eb","Review":"#d97706","Approved":"#7c3aed","Complete":"#16a34a"};
                return <span key={label} style={{fontSize:10,fontWeight:700,color:colorMap[label]}}>{count} {label}</span>;
              })}
            </div>
            {/* Phase groups */}
            {PHASES.map(phase => (
              <div key={phase.label} style={{marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:.6,color:"#9ca3af",textTransform:"uppercase",marginBottom:6}}>
                  {phase.label}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {phase.modules.map(slug => {
                    const mod = moduleMap[slug];
                    const ds = mod ? getDisplayStatus(mod) : { label:"Not Started", color:"#9ca3af", bg:"#f3f4f6", weight:0 };
                    const label = mod?.module_label || slug.replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase());
                    return (
                      <button
                        key={slug}
                        onClick={() => mod && setBibleOpenModule(bibleOpenModule === slug ? null : slug)}
                        style={{
                          display:"flex",alignItems:"center",gap:5,
                          padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",
                          background:ds.bg,color:ds.color,
                          fontSize:11,fontWeight:600,
                          opacity: mod ? 1 : 0.5,
                          transition:"opacity .15s"
                        }}
                        title={`${label}: ${ds.label}`}
                      >
                        <span style={{width:5,height:5,borderRadius:"50%",background:ds.color,flexShrink:0}} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{height:1,background:"rgba(0,0,0,0.07)",margin:"4px 0 14px"}} />
          </div>
        );
      })()}

      {/* Search + Filter */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input
          type="text"
          placeholder="Search modules..."
          value={bibleSearch}
          onChange={e => setBibleSearch(e.target.value)}
          style={{flex:1,fontSize:12,padding:"7px 10px",border:"1px solid #e5e7eb",borderRadius:8,outline:"none",background:"#fafafa"}}
        />
        <select
          value={bibleStatusFilter}
          onChange={e => setBibleStatusFilter(e.target.value as typeof bibleStatusFilter)}
          style={{fontSize:12,padding:"7px 10px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fafafa",outline:"none",cursor:"pointer"}}
        >
          <option value="all">All</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {bibleLoading && <p className="hint" style={{paddingLeft:4}}>Loading modules...</p>}
      {!bibleLoading && bibleModules.length === 0 && (
        <div className="card" style={{color:"var(--rx-text)",fontSize:13}}>
          No bible data found for <strong>{slug}</strong>. Seed modules via Supabase.
        </div>
      )}
      {!bibleLoading && bibleModules.length > 0 && filtered.length === 0 && (
        <p className="hint" style={{paddingLeft:4}}>No modules match your search.</p>
      )}

      {/* Module accordion */}
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        {filtered.map(mod => {
          const isOpen = bibleOpenModule === mod.module;
          const pop = isPopulated(mod.data);
          const label = mod.module_label || mod.module.replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase());
          const versionStr = `v${(mod as BibleModule & {version?:number}).version ?? 1}`;
          return (
            <div key={mod.module} style={{borderRadius:10,border:"1px solid",borderColor:isOpen?"var(--rx)":"rgba(0,0,0,0.08)",overflow:"hidden",background:"#fff",transition:"border-color .15s"}}>
              <button
                onClick={() => setBibleOpenModule(isOpen ? null : mod.module)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}
              >
                <span style={{width:7,height:7,borderRadius:"50%",background:pop?"#22c55e":"#d1d5db",flexShrink:0}} />
                <span style={{flex:1,fontSize:13,fontWeight:600,color:"#111"}}>{label}</span>
                <span style={{fontSize:10,fontFamily:"monospace",color:"#9ca3af",marginRight:4}}>{versionStr}</span>
                {mod.canon_status && mod.canon_status !== "proposed_canon" && (
                  <span style={{fontSize:9,fontWeight:700,letterSpacing:.4,padding:"2px 7px",borderRadius:20,
                    background: mod.canon_status === "official_canon" ? "#dcfce7" : mod.canon_status === "deprecated_canon" ? "#fef9c3" : "#f3f4f6",
                    color: mod.canon_status === "official_canon" ? "#15803d" : mod.canon_status === "deprecated_canon" ? "#92400e" : "#6b7280",
                    marginRight:2
                  }}>
                    {mod.canon_status === "official_canon" ? "CANON" : mod.canon_status === "deprecated_canon" ? "DEPRECATED" : "NON-CANON"}
                  </span>
                )}
                <span style={{fontSize:10,fontWeight:700,letterSpacing:.5,padding:"2px 8px",borderRadius:20,background:statusColor(mod.status)+"20",color:statusColor(mod.status)}}>
                  {mod.status.toUpperCase()}
                </span>
                <span style={{fontSize:16,color:"#9ca3af",transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>&#8964;</span>
              </button>
              {isOpen && (
                <div style={{padding:"0 14px 14px",borderTop:"1px solid rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"8px 0 10px"}}>
                    <span style={{fontSize:10,color:"#9ca3af",fontFamily:"monospace"}}>
                      {mod.module} &nbsp;|&nbsp; v{mod.version ?? 1} &nbsp;|&nbsp; updated: {mod.updated_at?.slice(0,10)}
                    </span>
                    <button
                      onClick={(e) => copy(e, JSON.stringify(mod.data, null, 2))}
                      style={{fontSize:10,padding:"2px 8px",border:"1px solid #e5e7eb",borderRadius:6,background:"#f9fafb",cursor:"pointer",color:"#6b7280"}}
                    >
                      Copy JSON
                    </button>
                  </div>
                  {renderBibleValue(mod.data)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legacy prompts - preserved for backward compat */}
      {(sonic?.songPrompt || visual?.imagePrompt) && (
        <>
          <p className="bsec" style={{marginTop:24}}>Legacy Prompts</p>
          {sonic?.songPrompt && (<div className="copy-block"><div className="copy-bar"><span className="lbl">Song Prompt</span><button className="copy-btn" onClick={(e) => copy(e, sonic!.songPrompt!)}>Copy</button></div><pre className="copy-body">{sonic.songPrompt}</pre></div>)}
          {visual?.imagePrompt && (<div className="copy-block"><div className="copy-bar"><span className="lbl">Image Prompt</span><button className="copy-btn" onClick={(e) => copy(e, visual!.imagePrompt!)}>Copy</button></div><pre className="copy-body">{visual.imagePrompt}</pre></div>)}
        </>
      )}
      {!!(songAudits || []).length && (
        <>
          <p className="bsec" style={{marginTop:24}}>Song Audits</p>
          {(songAudits || []).map((a, i) => (
            <div key={i} className="audit">
              <div className="audit-title">{a.title}</div>
              {(a.status || a.pillar) && <div className="audit-meta">{a.status}{a.status && a.pillar ? " Â· " : ""}{a.pillar}</div>}
              {a.theme && <p className="audit-theme">{a.theme}</p>}
              <div className="scores">
                {Object.entries(a.scores || {}).map(([k, v]) => (<span key={k} className="score">{k.replace(/_/g, " ")} {v}</span>))}
                {a.emotion && <span className="score emo">{a.emotion}</span>}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

// GeekFon Society is currently in its first content season for every
// artist. Season pass pricing/entitlement is scoped to a season string
// (see gfs_artist_unlocks.season); update this when Season 2 launches.
const CURRENT_SEASON = "Season 1";

export default function ArtistPage({ content, cityBg, activeArticle, slug }: { content: ArtistContent; cityBg?: { desktop: string; mobile: string; position?: string } | null; activeArticle?: News; slug?: string }) {
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      // "news" used to be its own top-level tab; it now lives inside Pulse as a channel.
      if (p === "news") return "pulse";
      if (p) return p;
    }
    return "music";
  });
  // 2026-07-31 per Sean: match the Vegans Explore SoFlo community-hub pattern
  // exactly - a dark persistent bar (toggle + breadcrumb) that stays put while
  // just the decorative hero above it collapses/expands. On an article
  // drill-down page it starts collapsed (no room to read past a big header);
  // otherwise it starts expanded (default landing tab is Music). The toggle
  // itself is a real click handler in both cases, same as SoFlo's
  // Collapse/Expand pill.
  const [heroCollapsed, setHeroCollapsed] = useState<boolean>(!!activeArticle);
  // 2026-07-31 (2nd pass) per Sean: the ONLY automatic collapse trigger is
  // landing on/switching to the Pulse tab (it's content-dense, same reason
  // an article drill-down starts collapsed). Moving to any other tab after
  // that must NOT auto re-expand it - once collapsed, it stays collapsed
  // until the user clicks Expand themselves or does a full page refresh
  // (which remounts the component and re-runs this effect from scratch).
  useEffect(() => {
    if (tab === "pulse") setHeroCollapsed(true);
  }, [tab]);
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [playing, setPlaying] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [seasonPriceCents, setSeasonPriceCents] = useState<number | null>(null);
  const [seasonDiscountPct, setSeasonDiscountPct] = useState<number>(0);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [playingV, setPlayingV] = useState<string | null>(null);
  const [bbSlot, setBbSlot] = useState(0);
  const [flippedMembers, setFlippedMembers] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [tabDropOpen, setTabDropOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewAs, setViewAs] = useState<string>("real");
  const [viewDropOpen, setViewDropOpen] = useState(false);
  // Replaced 2026-07-23: per-track Points purchase + Points top-up modal
  // retired in favor of a single one-time $11 per-artist unlock.
  const [unlockedArtist, setUnlockedArtist] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  // Added 2026-08-14: per-song LESARs unlock (111 LESARs/song), replacing the
  // flat $11 per-artist Season Pass as the only paid mechanic. ownedTracks
  // holds track names (t.n) this user already owns for this artist, fetched
  // from gfs_track_purchases on mount.
  const [ownedTracks, setOwnedTracks] = useState<Set<string>>(new Set());
  const [trackUnlockLoading, setTrackUnlockLoading] = useState<string | null>(null);
  const [playlistAdding, setPlaylistAdding] = useState<string | null>(null);
  const [playlistAdded, setPlaylistAdded] = useState<Set<string>>(new Set());
  // 2026-07-27 per Sean/V: Instagram-style Social grid, piloted on Roxanne only
  // (real c.pulse content already exists for her). Index into the filtered,
  // thumbnail-resolved post list below, or null when the lightbox is closed.
  const [socialLightboxIdx, setSocialLightboxIdx] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [socialPage, setSocialPage] = useState(0);
  const [socialFeatureBusyId, setSocialFeatureBusyId] = useState<string | null>(null);
  const [currTrackIdx, setCurrTrackIdx] = useState(0);
  const [lyricsDrawerOpen, setLyricsDrawerOpen] = useState(false);
  const [lyricsLang, setLyricsLang] = useState<"original" | "en">("en");
  // 2026-07-24: per-row lyrics toggle for the leaner music-tab layout (Lex from
  // Brixton pilot only, see useRowLyrics below). Only one row's lyrics show at
  // a time, matching the existing single-drawer behavior of the hero player.
  const [rowLyricsOpenIdx, setRowLyricsOpenIdx] = useState<number | null>(null);
  const [bibleModules, setBibleModules] = useState<BibleModule[]>([]);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleOpenModule, setBibleOpenModule] = useState<string | null>(null);
  // Release Tracker - per-song release brief (songwriter/PRO/AI disclosure/asset status),
  // fetched from song_release_briefs via the authenticated admin route, not the anon key
  // (this data is business-sensitive - see app/api/admin/release-briefs/route.ts).
  const [releaseBriefs, setReleaseBriefs] = useState<ReleaseBrief[]>([]);
  const [releaseBriefsLoading, setReleaseBriefsLoading] = useState(false);
  const [releaseBriefOpen, setReleaseBriefOpen] = useState<string | null>(null);
  // 2026-07-26 (5th pass) per Sean: hearts are now independent per-song likes,
  // not one artist-wide vote/day - confirmed after the 4th-pass fix (which
  // only made the correct heart fill in, but still let one like lock every
  // other song for the day) turned out not to match what he wanted. Added a
  // nullable track_name column to gfs_artist_votes (was artist_slug/user_id/
  // day only), so each song can be liked once per day independently. This
  // Set holds the track names (t.n) the user has already liked today for
  // THIS artist - membership drives both the filled look and the disabled
  // state per-row, nothing else locks.
  const [votedTracksToday, setVotedTracksToday] = useState<Set<string>>(new Set());
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  // 2026-07-27 per Sean: added "plus" alongside the existing "non-member"
  // (Passport benefits) and "preview" (register-to-preview) modal states -
  // same overlay/card, a third content branch, opened from the renamed
  // "Plus - $11" bottom CTA instead of jumping straight to Stripe checkout.
  const [showVoteModal, setShowVoteModal] = useState<"non-member" | "preview" | "plus" | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Fixed 2026-07-26: onTimeUpdate/onLoadedMetadata used to gate on the
  // `playing` React state, but `loadedmetadata` (and often the first
  // `timeupdate`) fires before the setPlaying(url) triggered by togglePlay
  // has actually re-rendered, so duration was silently never recorded and
  // the scrub bar's fill stayed pinned at 0% forever (Sean: "the bar doesn't
  // move, it's just frozen"). currentUrlRef is set synchronously the moment
  // playback starts, so these handlers never race React's render cycle.
  const currentUrlRef = useRef<string | null>(null);

  function handleAdClick(placementId?: string, campaignId?: string) {
    if (!placementId || !campaignId) return;
    try {
      const payload = JSON.stringify({ placement_id: placementId, campaign_id: campaignId });
      navigator.sendBeacon(SUPA_URL + '/functions/v1/ad-click', new Blob([payload], { type: 'text/plain' }));
    } catch (e) { /* click still resolves to the advertiser even if the beacon fails */ }
  }
  const c = content || {};
  const name = c.name || "Artist";
  const vars = {
    ["--rx" as string]: c.accent || "#E91E8C",
    ["--rx-text" as string]: c.accentText || "#9c1458",
    ["--rx-tint" as string]: c.accentTint || "rgba(233,30,140,0.10)",
  } as React.CSSProperties;
  const emph = (t: string) => t.replace(/\{\{(.+?)\}\}/g, '<em style="color:var(--rx-text);font-style:normal;font-weight:800">$1</em>');

  // Sync viewAs from SiteChrome's localStorage + custom event (same-window)
  useEffect(() => {
    const saved = localStorage.getItem("gfs-view-as");
    if (saved) setViewAs(saved);
    const onViewAs = (e: Event) => {
      const tier = (e as CustomEvent<string | null>).detail;
      setViewAs(tier ?? "real");
    };
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);

  // Super admin view-as override: maps SiteChrome tier selection to effectiveTier
  // SiteChrome tier values: "public" | "passport" | "plus" | "pro" | null (= real)
  const effectiveTier: string | null = isSuperAdmin && viewAs !== "real"
    ? viewAs === "public" ? null       // visitor: no tier access
    : viewAs === "visitor" ? null      // legacy
    : viewAs === "passport" ? "passport"
    : viewAs === "plus" ? "promoter"   // SiteChrome "plus" â TIER_RANK "promoter"
    : viewAs === "pro" ? "pro"
    : null
    : userTier;

  // Fetch current user's membership tier + super admin check
  useEffect(() => {
    if (!SUPA_ANON) return;
    const sb = createClient(SUPA_URL, SUPA_ANON);
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      if (user.email === "contact@lesaruss.com") setIsSuperAdmin(true);
      Promise.all([
        sb.from("gfs_members").select("tier").eq("user_id", user.id).single(),
        sb.from("member_points").select("available_points").eq("user_id", user.id).maybeSingle(),
        slug
          ? sb.from("gfs_artist_unlocks").select("id").eq("user_id", user.id).eq("artist_slug", slug).maybeSingle()
          : Promise.resolve({ data: null }),
      ]).then(([{ data: member }, { data: pts }, { data: unlock }]) => {
        if (member?.tier) setUserTier(member.tier);
        if (pts?.available_points != null) setUserBalance(pts.available_points);
        if (unlock) setUnlockedArtist(true);
      });
    });
  }, []);

  // Added 2026-08-14: fetch which tracks this user already owns for this
  // artist (gfs_track_purchases), so the per-song unlock pill can flip to
  // Owned + download/playlist actions without waiting on a full re-fetch
  // after every purchase (unlockTrack below updates this set locally too).
  useEffect(() => {
    if (!userId || !slug || !SUPA_ANON) return;
    const sb = createClient(SUPA_URL, SUPA_ANON);
    sb.from("gfs_track_purchases")
      .select("track_name")
      .eq("user_id", userId)
      .eq("artist_slug", slug)
      .then(({ data }) => {
        if (data) setOwnedTracks(new Set(data.map((r: { track_name: string }) => r.track_name)));
      });
  }, [userId, slug]);

  // Track mobile breakpoint for billboard slots
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reflect a completed $11 artist-unlock Checkout immediately, even for a
  // guest with no account: the Stripe webhook durably grants the unlock
  // server-side by email (see handleUnlockArtist), and this local marker
  // gives instant visual feedback on return without forcing a login. Added
  // 2026-07-26 as part of the same fix as handleUnlockArtist above.
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" && params.get("plan") === "artist-unlock") {
      setUnlockedArtist(true);
      setUnlockSuccess(true);
      setTimeout(() => setUnlockSuccess(false), 4000);
      try { localStorage.setItem(`gfs-unlocked-${slug}`, "1"); } catch { /* ignore */ }
      params.delete("checkout");
      params.delete("plan");
      const q = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    } else {
      try { if (localStorage.getItem(`gfs-unlocked-${slug}`) === "1") setUnlockedArtist(true); } catch { /* ignore */ }
    }
  }, [slug]);

  // 2026-07-27 per Sean: the new "plus" benefits modal's confirm button calls
  // handleUnlockArtist directly (see mp-catalog-unlock-bottom below) instead
  // of linking out like the Passport modal does. On web that redirects the
  // whole page to Stripe, so the modal moots itself - but on native,
  // purchaseArtistUnlock completes in-app and just flips unlockSuccess, which
  // would otherwise leave this modal sitting open on top of the success
  // toast. Closing it here on any unlockSuccess covers both paths safely.
  useEffect(() => {
    if (unlockSuccess) setShowVoteModal(null);
  }, [unlockSuccess]);

  // 2026-07-26 (5th pass): fetch every track this user has already liked today
  // for this artist (not just whether any vote exists) - each song's heart
  // needs to know its OWN already-liked state independently.
  useEffect(() => {
    if (!userId || !slug || !SUPA_ANON) return;
    const sb = createClient(SUPA_URL, SUPA_ANON);
    const today = new Date().toISOString().slice(0, 10);
    sb.from("gfs_artist_votes")
      .select("track_name")
      .eq("artist_slug", slug)
      .eq("user_id", userId)
      .gte("voted_at", today + "T00:00:00Z")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVotedTracksToday(new Set(data.map((r: { track_name: string | null }) => r.track_name).filter((n): n is string => !!n)));
        }
      });
  }, [userId, slug]);

  // Fetch gfs_artist_bible when Brief tab opens
  useEffect(() => {
    if (tab !== "brief" || !slug || !SUPA_ANON) return;
    if (bibleModules.length > 0) return; // already loaded
    setBibleLoading(true);
    const sb = createClient(SUPA_URL, SUPA_ANON);
    sb.from("gfs_artist_bible")
      .select("id,artist_slug,module,module_label,data,confidence,canon_status,status,version,updated_at")
      .eq("artist_slug", slug)
      .order("module")
      .then(({ data }) => {
        if (data) setBibleModules(data as BibleModule[]);
        setBibleLoading(false);
      });
  }, [tab, slug]);

  // Fetch song_release_briefs (Release Tracker) when Brief tab opens - goes through the
  // authenticated admin route, not a direct anon-key table read, since this carries real
  // songwriter/PRO/distribution-status data.
  useEffect(() => {
    if (tab !== "brief" || !slug || !SUPA_ANON) return;
    if (releaseBriefs.length > 0) return; // already loaded
    setReleaseBriefsLoading(true);
    const sb = createClient(SUPA_URL, SUPA_ANON);
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) { setReleaseBriefsLoading(false); return; }
      fetch(`/api/admin/release-briefs?artist=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(({ briefs }) => { if (briefs) setReleaseBriefs(briefs as ReleaseBrief[]); })
        .finally(() => setReleaseBriefsLoading(false));
    });
  }, [tab, slug]);

  // Billboard auto-rotate every 6s
  useEffect(() => {
    const slots = isMobile ? 3 : 2;
    bbTimerRef.current = setInterval(() => setBbSlot(s => (s + 1) % slots), 6000);
    return () => { if (bbTimerRef.current) clearInterval(bbTimerRef.current); };
  }, [isMobile]);

  // Audio helpers
  function fmtTime(s: number): string {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }
  // Split text into caption chunks (karaoke-style)
  function splitCaption(text: string): string[] {
    const isCJK = /[ã-é¿¿ä¸-é¾¯]/.test(text);
    if (isCJK) {
      const segs = text.split(/([ããï¼ï¼â¦])/).filter(Boolean);
      const chunks: string[] = []; let cur = "";
      segs.forEach(s => { cur += s; if (cur.length >= 5 || /[ãï¼ï¼]/.test(s)) { chunks.push(cur.trim()); cur = ""; } });
      if (cur.trim()) chunks.push(cur.trim());
      return chunks;
    }
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3).join(" "));
    return chunks;
  }
  function seekVoice(e: React.MouseEvent<HTMLDivElement>, url: string) {
    const a = audioRef.current; if (!a) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (playing !== url) {
      // Not playing yet â start from this position
      a.src = url;
      a.addEventListener("canplay", () => { a.currentTime = pct * (a.duration || 0); a.play().then(() => { setPlaying(url); setPlayingV("voice"); }).catch(() => {}); }, { once: true });
    } else {
      a.currentTime = pct * (a.duration || 0);
    }
  }
  function onTimeUpdate() {
    const a = audioRef.current;
    const key = currentUrlRef.current;
    if (!a || !key) return;
    // Tier enforcement: trackLocked already prevents fully-locked tracks from playing.
    // One-tier-up preview tracks are allowed to play but get capped at PREVIEW_CAP_SECONDS.
    if (playingV === "capped" && a.currentTime >= PREVIEW_CAP_SECONDS) {
      a.pause();
      a.currentTime = 0;
      setAudioProgress(prev => ({ ...prev, [key]: 0 })); // reset visible scrub position, not just the audio element
      setPlaying(null);
      setPlayingV(null);
      currentUrlRef.current = null;
      return;
    }
    setAudioProgress(prev => ({ ...prev, [key]: a.currentTime }));
  }
  function onLoadedMetadata() {
    const a = audioRef.current;
    const key = currentUrlRef.current;
    if (!a || !key) return;
    setAudioDuration(prev => ({ ...prev, [key]: a.duration }));
  }
  // 2026-07-26: added an optional maxOverride so preview-capped tracks scrub
  // relative to the visible 30s bar instead of the real full-song duration -
  // without this, dragging to what looks like the end of the (now correctly
  // shortened) bar would actually seek deep into the real track, which would
  // then immediately snap back to 0 via the onTimeUpdate cap check. See the
  // matching display fix on `duration` in the row-lyrics track list below.
  function seekTo(e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>, url: string, maxOverride?: number) {
    const a = audioRef.current;
    if (!a || currentUrlRef.current !== url) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const maxTime = maxOverride != null ? maxOverride : (a.duration || 0);
    a.currentTime = pct * maxTime;
  }
  // 2026-07-26 per Sean: "I should be able to move it back and forth" - the
  // bar only supported a single tap-to-jump via onClick. Adding real
  // pointer-drag scrubbing (Pointer Events, not native HTML5 drag - drag
  // events don't fire reliably on touch, see feedback_native_dnd_fails_touch).
  // pointerdown seeks immediately and captures the pointer; pointermove
  // keeps seeking as long as the pointer is still down, covering both mouse
  // drag and touch drag with one code path.
  function handleScrubPointerDown(e: React.PointerEvent<HTMLDivElement>, url: string, maxOverride?: number) {
    if (currentUrlRef.current !== url) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e, url, maxOverride);
  }
  function handleScrubPointerMove(e: React.PointerEvent<HTMLDivElement>, url: string, maxOverride?: number) {
    if (e.buttons !== 1) return;
    seekTo(e, url, maxOverride);
  }

  // Visibility helpers - rebuilt 2026-07-23 per Sean's pricing simplification.
  // Old model: 4-tier subscription ladder (public/preview/members/pro) plus a
  // 25-Point per-track micro-purchase. New model: every song is visible and
  // previewable; once a song's real release date passes it's free for
  // everyone; paying $11 once per artist unlocks that artist's entire
  // catalog immediately, released or not. TIER_RANK/effectiveTier are left
  // in place - still used for the sign-in check, the Brief tab, and the
  // super-admin view-as simulator - just no longer used to gate playback.
  const TIER_RANK: Record<string, number> = { passport: 1, promoter: 2, pro: 3 };
  // Preview window for a not-yet-released, not-yet-unlocked track, in seconds.
  const PREVIEW_CAP_SECONDS = 30;

  function isScheduledFuture(t: Track): boolean {
    if (!t.scheduledFor) return false;
    const rel = new Date(t.scheduledFor.split("T")[0]);
    rel.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return rel > now;
  }

  // A track is preview-capped only if it hasn't hit its release date yet
  // and the viewer hasn't paid to unlock this artist. Tracks with no
  // scheduledFor at all are treated as already released (most catalog
  // tracks predate this field being populated).
  // 2026-07-26 per Sean: split the old single "unlockedArtist" gate into two
  // tiers. Free registration (any gfs_members row - the same "member" concept
  // submitVote already required to like a song) now unlocks liking songs,
  // previewing unreleased tracks, and the Social + Chat tabs (Chat
  // itself still isn't built - the tab shows a "coming soon" panel once
  // registered - but the tab is reachable and gates the same way). The $11
  // per-artist unlock is reserved for hearing FULL unreleased songs past the
  // preview cap - it no longer gates Social/Group.
  function isRegistered(): boolean {
    if (isSuperAdmin && viewAs === "real") return true;
    return !!effectiveTier;
  }

  // 2026-07-26 per Sean, clarifying the real tier model (he said we'd gotten
  // our wires crossed on this): Public < Passport < Plus < Pro. Passport is
  // free registration - it gets a preview of things one tier above you, not
  // full access. Plus is the $11 per-artist unlock - full access to THAT
  // artist's entire catalog, no caps. Pro is invite-only (industry contacts,
  // team, investors) and, per Sean, "not that big a difference between plus
  // and pro" - for gating purposes Pro means the same full access as Plus.
  // Before this fix, simulating Plus or Pro via View As Membership computed
  // identically to Passport, because isPreviewCappedTrack/isRegisterLockedTrack
  // only ever checked the boolean isRegistered() (true for all three tiers),
  // never the actual simulated rank - so "viewing as Plus" never actually
  // unlocked anything. This makes Plus/Pro simulation behave exactly like a
  // real $11 unlock for the artist currently being viewed.
  const simulatingFullAccess = isSuperAdmin && (viewAs === "plus" || viewAs === "pro");

  // 2026-08-13: the $11/mo All Access subscription (gfs_members.tier = "all-access",
  // set by the Stripe/RevenueCat webhooks on purchase) grants full catalog access
  // across every artist, the same as a per-artist unlock but universe-wide. Before
  // this, userTier was fetched but never checked here - only the per-artist
  // unlockedArtist row and the superadmin simulator bypassed gating, so a real
  // paying all-access subscriber saw the exact same preview caps as a free member.
  // "lifetime" (STRIPE_PRICE_LIFETIME, $111 one-time) gets the same bypass.
  const hasAllAccessTier = userTier === "all-access" || userTier === "lifetime";

  // 2026-07-26 per Sean: a track's Song Manager Tier (public/preview="Passport"/
  // members="Plus"/pro="Pro") now also gates playback AFTER release, not just
  // before it. Pre-release, the gate stays exactly what it was (registered vs
  // not). Once released, the track's tier rank is compared against the
  // viewer's real tier rank for THIS artist (Public=0, registered/"Passport"=1,
  // $11-unlocked/"Plus"=2 - unlockedArtist already bypasses everything below,
  // separately, so it never reaches this math): exactly one rank below the
  // track = 30s preview, two or more ranks below = fully locked, same as
  // Sean's "one tier above gets a preview, two+ gets locked down" rule from
  // the platform-logic pass earlier today. Confirmed against real data: e.g.
  // Roxanne "Being You, Being Me" and Lex "The Flex" are both released tracks
  // tagged "preview" (Passport) - a Public visitor should now see a preview,
  // not a full free play.
  function trackTierRank(v: string): number {
    if (v === "pro") return 3;
    if (v === "members") return 2;
    if (v === "preview") return 1;
    return 0; // "public" (or unset/unknown) - always free once released
  }

  function isPreviewCappedTrack(t: Track): boolean {
    if (isSuperAdmin && viewAs === "real") return false;
    if (unlockedArtist || simulatingFullAccess || hasAllAccessTier) return false;
    if (isScheduledFuture(t)) return isRegistered();
    const diff = trackTierRank(t.v) - (isRegistered() ? 1 : 0);
    return diff === 1;
  }

  // Before release: an unreleased track a NOT-registered visitor can't even
  // preview - they have to create a free account first. After release: the
  // track's tier is 2+ ranks above the viewer's (e.g. a "Pro" track and the
  // viewer is only Passport-registered, or anyone not registered at all) - no
  // preview at all until they close that gap. Either way, the $11 unlock
  // (unlockedArtist, checked above) always bypasses this - "unlock the full
  // catalog forever" means forever, no tier is held back from a paying fan.
  function isRegisterLockedTrack(t: Track): boolean {
    if (isSuperAdmin && viewAs === "real") return false;
    if (unlockedArtist || simulatingFullAccess || hasAllAccessTier) return false;
    if (isScheduledFuture(t)) return !isRegistered();
    const diff = trackTierRank(t.v) - (isRegistered() ? 1 : 0);
    return diff >= 2;
  }

  // Nothing is ever hidden anymore - every song a fan can see builds the
  // case for registering/unlocking. "Locked" now means either "register to
  // preview" or "preview only, not full song".
  function trackLocked(t: Track): boolean {
    return isPreviewCappedTrack(t) || isRegisterLockedTrack(t);
  }

  function trackBadge(t: Track): { label: string; cls: string } {
    if (isRegisterLockedTrack(t)) return { label: "Register", cls: "vb-locked" };
    if (!isPreviewCappedTrack(t)) return { label: "Free", cls: "vb-public" };
    return { label: "Preview", cls: "vb-passport" };
  }

  // Route straight to the artist-level unlock instead of a per-track modal.
  function handleBadgeClick(t: Track) {
    unlockTrack(t);
  }

  // Added 2026-08-14: per-song LESARs unlock (111 LESARs/song), replacing the
  // flat $11 per-artist Season Pass as GeekFon's only paid mechanic (Sean,
  // 2026-08-14 pricing spec). Calls app/api/tracks/unlock, which calls the
  // existing debit_lesars() Postgres function (balance check + ledger row +
  // gfs_track_purchases insert, idempotent). On insufficient balance, opens
  // the LESARs-pack purchase modal (openLesarsPackModal) instead of failing
  // silently.
  async function unlockTrack(t: Track) {
    if (!t?.n || trackUnlockLoading || ownedTracks.has(t.n)) return;
    if (!userId || !SUPA_ANON) {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
      window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
      return;
    }
    setUnlockError(null);
    setTrackUnlockLoading(t.n);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON);
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) {
        setUnlockError("Please sign in again to unlock songs.");
        setTrackUnlockLoading(null);
        return;
      }
      const res = await fetch("/api/tracks/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ artistSlug: slug, trackName: t.n, trackUrl: t.url || null }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOwnedTracks(prev => new Set(prev).add(t.n));
        if (typeof data.balance_after === "number") setUserBalance(data.balance_after);
        setUnlockSuccess(true);
        setTimeout(() => setUnlockSuccess(false), 4000);
      } else if (data.error === "insufficient_balance") {
        if (typeof data.balance_after === "number") setUserBalance(data.balance_after);
        openLesarsPackModal();
      } else {
        setUnlockError(data.error || "Unlock failed. Please try again.");
      }
    } catch {
      setUnlockError("Unlock failed. Please try again.");
    } finally {
      setTrackUnlockLoading(null);
    }
  }

  // Adds an already-unlocked track to the fan's GeekFon Playlist
  // (gfs_playlist_tracks). Resolves radio_tracks.id by artist_slug+title,
  // since ownership (gfs_track_purchases) is keyed by track_name/artist_slug
  // text, not the track's uuid.
  async function addToPlaylist(t: Track) {
    if (!t?.n || !userId || !SUPA_ANON || playlistAdding) return;
    setPlaylistAdding(t.n);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON);
      const { data: rt } = await sb
        .from("radio_tracks")
        .select("id")
        .eq("artist_slug", slug)
        .eq("title", t.n)
        .maybeSingle();
      if (!rt?.id) {
        setPlaylistAdding(null);
        return;
      }
      const { error } = await sb
        .from("gfs_playlist_tracks")
        .upsert({ user_id: userId, track_id: rt.id }, { onConflict: "user_id,track_id", ignoreDuplicates: true });
      if (!error) setPlaylistAdded(prev => new Set(prev).add(t.n));
    } catch { /* silent */ }
    setPlaylistAdding(null);
  }

  async function handleUnlockArtist() {
    if (unlockedArtist || simulatingFullAccess || unlockLoading) return;
    setUnlockError(null);
    setUnlockLoading(true);
    try {
      if (isNative()) {
        // Native purchases go through RevenueCat, which is tied to a signed-in
        // account, so the native app still requires sign-in first.
        if (!userId) {
          const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
          window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
          setUnlockLoading(false);
          return;
        }
        const result = await purchaseArtistUnlock(slug || "");
        if (result.success) {
          setUnlockedArtist(true);
          setUnlockSuccess(true);
          setTimeout(() => setUnlockSuccess(false), 4000);
        } else if (result.error !== "cancelled") {
          setUnlockError(typeof result.error === "string" ? result.error : "Purchase failed. Please try again.");
        }
        setUnlockLoading(false);
        return;
      }
      // Fixed 2026-07-26 per Sean (found live in incognito): clicking Unlock
      // used to force a sign-in to membership before you could even pay,
      // which made no sense - unlocking should go straight to the $11
      // transaction. Stripe Checkout collects the buyer's email itself, so
      // no account is required up front. The webhook
      // (app/api/webhooks/stripe/route.ts) grants the unlock server-side by
      // finding-or-creating a Supabase account for that email, so if the fan
      // later logs in with the same email their unlock is already there.
      // Retired 2026-08-14 per Sean: the flat $11 per-artist Season Pass (and
      // the artist-unlock plan before it) is no longer offered from any live
      // UI - per-song 111 LESARs unlocks (unlockTrack above) are the only
      // paid mechanic now. This web branch, and every existing onClick that
      // still points at handleUnlockArtist (the generic catalog-header/plus
      // vote-modal buttons, which have no single song to unlock), now opens
      // the LESARs-pack purchase modal instead of the retired Season Pass
      // modal, so none of those old buttons can resurrect that flow.
      setShowVoteModal(null); // in case this click came from inside that modal
      openLesarsPackModal();
      setUnlockLoading(false);
      return;
      } catch {
      setUnlockError("Checkout failed. Please try again.");
      setUnlockLoading(false);
    }
  }
  // Renamed/repurposed 2026-08-14 (was openSeasonModal): sells a fixed
  // $11 -> 1,110 LESARs pack (buyLesarsPack below) instead of a per-artist
  // Season Pass, so no gfs_calc_season_price lookup is needed - the price is
  // fixed, not a per-user loyalty rate.
  function openLesarsPackModal() {
    setRedeemError(null);
    setSeasonModalOpen(true);
  }

  // Renamed/repurposed 2026-08-14 (was checkoutSeasonPass).
  async function buyLesarsPack() {
    setRedeemError(null);
    setRedeemLoading(true);
    const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "lesars-pack",
          userId: userId || null,
          returnUrl: returnPath,
        }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setRedeemError(error || "Checkout failed. Please try again.");
        setRedeemLoading(false);
      }
    } catch {
      setRedeemError("Checkout failed. Please try again.");
      setRedeemLoading(false);
    }
  }

  async function redeemSeasonWithPoints() {
    if (!userId || !SUPA_ANON) return;
    setRedeemError(null);
    setRedeemLoading(true);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON);
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) {
        setRedeemError("Please sign in again to use points.");
        setRedeemLoading(false);
        return;
      }
      const res = await fetch("/api/points/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ kind: "season_pass", artistSlug: slug, season: CURRENT_SEASON }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUnlockedArtist(true);
        setUnlockSuccess(true);
        setUserBalance(data.newBalance);
        setSeasonModalOpen(false);
        setTimeout(() => setUnlockSuccess(false), 4000);
      } else {
        setRedeemError(data.error || "Unable to redeem points.");
      }
    } catch {
      setRedeemError("Unable to redeem points. Please try again.");
    } finally {
      setRedeemLoading(false);
    }
  }

  function trackPlayLabel(isPlaying: boolean, t?: Track | null): string {
    if (isPlaying) return "Pause";
    if (t && isRegisterLockedTrack(t)) return "Register";
    return t && isPreviewCappedTrack(t) ? "Preview" : "Play";
  }
  // Added 2026-07-27 per Sean's Fieldy note: a bare date with no context read as
  // meaningless when it was the whole label on the locked-track CTA pill. Shared
  // by trackLockedLabel below and the Vuka-only lock+date pill in the
  // registerLocked/not-yet-registered row (mp-row-locked-cta).
  function formatShortDate(dateStr: string): string {
    const d = dateStr.split("T")[0];
    const [, m, day] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[+m - 1]} ${+day}`;
  }
  function trackLockedLabel(t: Track): string {
    if (isRegisterLockedTrack(t)) return "Register to preview";
    if (isScheduledFuture(t)) {
      return `Full song ${formatShortDate(t.scheduledFor!)}`;
    }
    return "Preview";
  }
  // Schedule tab: maps visibility to user-facing tier label + style
  function scheduleTier(isAvailable: boolean): { label: string; cls: string } {
    return isAvailable ? { label: "Free", cls: "st-free" } : { label: "Unlock", cls: "st-preview" };
  }
  // Show all tracks in schedule so users can see what's coming + upgrade CTAs
  function scheduleVisible(_v: string): boolean {
    return true;
  }

  function copy(e: React.MouseEvent<HTMLButtonElement>, text: string) {
    const b = e.currentTarget; const prev = b.textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    b.textContent = "Copied"; setTimeout(() => { b.textContent = prev; }, 1400);
  }
  function togglePlay(url: string, v?: string, trackName?: string) {
    const a = audioRef.current; if (!a) return;
    // Fixed 2026-07-26 per Sean: "when I pause, it's just pause where the
    // song is - it should work like an actual player." Pausing used to also
    // clear currentUrlRef, so pressing Play again fell into the "load a new
    // track" branch below, which reassigns a.src and resets currentTime to
    // 0 - the track always restarted instead of resuming. Now a pause only
    // pauses; currentUrlRef (and the audio element's position) stay intact.
    if (playing === url) { a.pause(); setPlaying(null); setPlayingV(null); return; }
    if (currentUrlRef.current === url) {
      // Resuming the same track after a pause - don't touch a.src, that
      // would reload the media and reset currentTime to 0.
      setPlaying(url);
      setPlayingV(v || null);
      a.play()
        .then(() => { if (trackName) logPlay(trackName); })
        .catch(() => { setPlaying(null); setPlayingV(null); });
      return;
    }
    // Switching to a different track (or starting fresh) - load its source.
    currentUrlRef.current = url;
    a.src = url;
    setPlaying(url);
    setPlayingV(v || null);
    a.play()
      .then(() => { if (trackName) logPlay(trackName); })
      .catch(() => { setPlaying(null); setPlayingV(null); currentUrlRef.current = null; });
  }

  async function logPlay(trackName: string) {
    if (!SUPA_ANON) return;
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON);
      await sb.from("gfs_track_plays").insert({ artist_slug: slug, track_name: trackName, user_id: userId || null });
    } catch { /* silent */ }
  }

  // 2026-07-26 (5th pass) per Sean: each song's heart is its own like now, not
  // a single artist-wide daily vote - trackKey is required (a vote with no
  // song attribution no longer makes sense). Still contributes to the same
  // gfs_artist_rankings score (a plain SUM(vote_count) grouped by artist_slug,
  // agnostic to track_name), so liking more songs in a day now genuinely adds
  // more to the artist's total instead of being capped at one.
  async function submitVote(trackKey: string) {
    if (!effectiveTier) { setShowVoteModal("non-member"); return; }
    if (!trackKey || votedTracksToday.has(trackKey) || voteLoading) return;
    setVoteLoading(true);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON!);
      const { error } = await sb.from("gfs_artist_votes").insert({ artist_slug: slug, user_id: userId, vote_count: 1, lesars_spent: 0, track_name: trackKey });
      if (!error) {
        setVotedTracksToday(prev => new Set(prev).add(trackKey));
        setVoteSuccess(true);
        setTimeout(() => setVoteSuccess(false), 3000);
      }
    } catch { /* silent */ }
    setVoteLoading(false);
  }

  // 2026-07-27 per Sean: hearts used to be one-way (disabled once voted, no
  // way to undo a mistaken like) - this is the other half of the toggle,
  // wired from the same heart button below. Deletes today's vote row for
  // this specific track/artist/user rather than touching any other day's
  // history. Required a new DELETE RLS policy on gfs_artist_votes ("Members
  // can remove own vote", auth.uid() = user_id) - only INSERT/SELECT existed
  // before this, so an unvote would have silently failed under RLS.
  async function removeVote(trackKey: string) {
    if (!userId || !trackKey || voteLoading) return;
    setVoteLoading(true);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON!);
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await sb.from("gfs_artist_votes")
        .delete()
        .eq("artist_slug", slug)
        .eq("user_id", userId)
        .eq("track_name", trackKey)
        .gte("voted_at", today + "T00:00:00Z");
      if (!error) {
        setVotedTracksToday(prev => { const next = new Set(prev); next.delete(trackKey); return next; });
      }
    } catch { /* silent */ }
    setVoteLoading(false);
  }

  // 2026-07-26 per Sean: the heart-click/preview-lock register prompt used to
  // render inline (a plain block between the catalog note and the track rows),
  // which pushed the whole song list down and left a gap - not a real lightbox.
  // Now a fixed-position overlay (see the "vote-modal-overlay" render below),
  // so Escape and a backdrop click both close it same as any other modal.
  useEffect(() => {
    if (!showVoteModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowVoteModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showVoteModal]);

  // Note: the old `crumb` array (GeekFon/Roster/name) that fed the
  // dark-theme .head-crumb nav is gone as of 2026-07-31 - the persistent
  // .crumb-bar below is built inline instead so it can also append the
  // article title when activeArticle is set.

  // ââ Pulse feed ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const msg = c.message || {};
  const hasMsg = !!(msg.ja || msg.en);
  // 2026-07-26 (3rd pass) per Sean's report: hoisted to a single top-level const
  // instead of being recomputed inline at six separate call sites (tab bar
  // filter + the pulse/social/group content gates). The duplicated inline
  // copies all read bare `isSuperAdmin`, ignoring the admin view-as simulator -
  // only the tab-bar copy had been fixed to respect `viewAs`, so switching to
  // "View as: Visitor" still showed the real-admin content path everywhere
  // else. One shared value means there's only one place left to get this right.
  const canSeePulse = (isSuperAdmin && viewAs === "real") || (Array.isArray(c.pulse) && c.pulse.length > 0);
  const publishedNews = (c.news || []).filter((n: News) => !n.draft);
  // 2026-07-26 (3rd pass) per Sean: this used to fall back to PLACEHOLDER_NEWS
  // (hardcoded, Roxanne-branded sample copy) whenever an artist had no real
  // news - meant as filler for early dev screenshots, but it meant any admin
  // bypass or edge case with empty news showed Roxanne's actual article titles
  // on someone else's page. The canSeePulse gate above already routes
  // no-real-content artists to a proper "Coming Soon" section instead, so
  // there's no longer a legitimate reason for this branch to ever need
  // placeholder copy - an empty array here just renders nothing, never
  // someone else's content.
  const pulseArticles = publishedNews;

  return (

      <div style={vars}>
        <audio ref={audioRef} onEnded={() => { setPlaying(null); setPlayingV(null); currentUrlRef.current = null; }} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} />
        <div className={"apg" + (cityBg ? " has-city-bg" : "")}>

          {/* 2026-07-31 per Sean (4th pass): the dark bar's ORDER was wrong -
              it was rendering above the decorative hero, but on the SoFlo
              reference the hero comes first (when expanded) and the dark
              bar sits BELOW it, directly above the tab bar. Corrected so the
              hero (if expanded) renders first, then the persistent crumb-bar,
              then the tab bar - when collapsed, the hero is gone and the
              crumb-bar is simply the first thing under the global nav,
              exactly like SoFlo's collapsed state. */}

          {/* Decorative hero - collapses/expands via the toggle in the bar
              below it (starts collapsed on an article drill-down page,
              expanded otherwise) */}
          {!heroCollapsed && (
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
                    {/* 2026-07-31 per Sean: per-artist crop override - some
                        source images (Nilo Wave's) have solid black margin
                        baked into an edge, so the default "center bottom"
                        CSS anchor isn't always right. */}
                    <img src={cityBg.desktop} alt="" aria-hidden="true" style={cityBg.position ? { objectPosition: cityBg.position } : undefined} />
                  </picture>
                </div>
              </>
            )}

            {/* Artist hero + meta */}
            <div className="head-grid">
              {c.heroUrl ? (
                <img className="head-art" src={c.heroUrl} alt={name + " portrait"} decoding="async" />
              ) : (
                <div className="head-art-fallback">{c.initial || name.charAt(0)}</div>
              )}
              <div className="head-meta">
                <div className="head-name">{name}</div>
                <p className="head-tagline">{c.tagline}</p>
                {(() => {
                  // Exactly 3 pills, fixed order: Vote, Genre, Season.
                  const rawPills = (c.pills || []).filter(p => p.label !== "Original");
                  const seasonPill = rawPills.find(p => /season/i.test(p.label));
                  const genrePill = rawPills.find(p => p !== seasonPill && !/^original(\s+artist)?$/i.test(p.label));
                  const genreLabel = genrePill?.label || c.sonic?.primaryGenre || c.genre;
                  const seasonLabel = seasonPill?.label || c.tracks?.[0]?.m || "Season 1";
                  return (
                    // 2026-07-26 per Sean: the old "Vote" pill (membership-gated,
                    // artist-level) is replaced by a heart button on each song row
                    // in the Music tab below - liking a song IS the vote now.
                    <div className="pill-row">
                      {genreLabel && <span className={"pill" + (genrePill?.accent ? " accent" : "")}>{genreLabel}</span>}
                      <span className="pill">{seasonLabel}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          )}

          {/* 2026-08-14 fix: .crumb-bar and .tabbar below used to each be
              independently position:sticky with hardcoded pixel offsets
              (crumb-bar @60px, tabbar @102px assuming crumb-bar renders at
              exactly 42px tall - never actually true on every viewport/font),
              which desynced them during scroll. Wrapped together in a single
              .nav-stack sticky container (top:60px, matching .gtop's fixed
              height) instead - see components/ArtistPage.css. */}
          <div className="nav-stack">

          {/* Persistent dark bar (Collapse/Expand pill + breadcrumb) - stays
              in the same spot in both states, directly above the tab bar,
              matching the Vegans Explore SoFlo community-hub pattern
              exactly. No "Get Passport"-style CTA on the right - GFS
              doesn't have a direct equivalent to that action, so that slot
              just keeps the existing superadmin viewAs indicator when
              present. */}
          <div className="crumb-bar">
            <button
              type="button"
              className="crumb-toggle"
              onClick={() => setHeroCollapsed(v => !v)}
              aria-expanded={!heroCollapsed}
            >
              {/* Matches SoFlo exactly: chevron-up next to "Collapse" (expanded
                  state, click to collapse), chevron-down next to "Expand"
                  (collapsed state, click to expand). */}
              <svg viewBox="0 0 12 12" fill="none" style={{ transform: heroCollapsed ? "none" : "rotate(180deg)" }}>
                <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {heroCollapsed ? "Expand" : "Collapse"}
            </button>
            <nav className="art-crumb" aria-label="Breadcrumb">
              {/* 2026-07-31 per Sean: "GeekFon Society" was wrapping the
                  crumb-bar to two rows once the Collapse/Expand pill sat
                  next to it, especially on longer artist names (Shamanic
                  Resin). Shortened to just "GeekFon" to buy back the space. */}
              <a href="/" className="art-crumb-link">GeekFon</a>
              <span className="art-crumb-sep">&rsaquo;</span>
              <a href="/roster" className="art-crumb-link">Roster</a>
              <span className="art-crumb-sep">&rsaquo;</span>
              {activeArticle ? (
                <a href={`/${slug || (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "")}`} className="art-crumb-link">{c.name || name}</a>
              ) : (
                <span className="art-crumb-cur">{name}</span>
              )}
              {activeArticle && (
                <>
                  <span className="art-crumb-sep">&rsaquo;</span>
                  <span className="art-crumb-cur">{activeArticle.title}</span>
                </>
              )}
            </nav>
            {isSuperAdmin && viewAs !== "real" && (
              <span className="va-indicator">
                Viewing as: <strong>{viewAs === "public" ? "Visitor" : viewAs.charAt(0).toUpperCase() + viewAs.slice(1)}</strong>
              </span>
            )}
          </div>

          {/* Tab bar - always rendered (not just on the non-article view), since
              it sits directly below the persistent crumb-bar in both states. */}
          {(() => {
            // Fixed 2026-07-26 per Sean: this bare `isSuperAdmin ||` bypassed the
            // view-as simulator entirely - switching to "view as: public" still
            // showed the Brief tab because Sean IS a super admin regardless of the
            // simulated tier. Same class of bug as the Social-tab fix earlier today
            // (commit 27e1b12) - the admin bypass must only apply in the real,
            // non-simulated view.
            const canSeeBrief = (isSuperAdmin && viewAs === "real") || (!!effectiveTier && (TIER_RANK[effectiveTier] || 0) >= 3);
            // canSeePulse is now a single hoisted const above (top of component) instead
            // of a locally re-declared one here - see that declaration for the full
            // history. 2026-07-26 (2nd pass) per Sean: the tab bar itself must be
            // identical on every artist page, same as Lex's - canSeePulse still gates
            // the CONTENT inside Pulse/Social/Group (real posts vs. "Coming Soon"), it
            // just no longer removes the tab buttons themselves.
            const visibleTabs = TABS.filter(t =>
              (!t.admin || canSeeBrief) &&
              (!t.needsMembers || (c.members && c.members.length > 0))
            );
            return (
              <div className="tabbar" role="tablist">
                {visibleTabs.map(t => (
                  <button key={t.key} className="tab" role="tab" aria-selected={tab === t.key} onClick={() => {
                    if (activeArticle) {
                      const artistSlug = slug || (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "");
                      window.location.href = `/${artistSlug}?tab=${t.key}`;
                    } else {
                      setTab(t.key);
                    }
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            );
          })()}

          </div>

          {/* Two-column body: content + billboard */}
          <div className="body-layout">
            <div className="body-main">

              {/* Article detail view â rendered when activeArticle is passed */}
              {activeArticle ? (
                <div className="art-view">
                  {/* Breadcrumb moved up to .art-topbar, above the (now-hidden)
                      big header, per Sean 2026-07-31 - not duplicated here. */}
                  {activeArticle.videoUrl ? (
                    <div className="art-hero"><video src={activeArticle.videoUrl} poster={activeArticle.thumb || undefined} controls playsInline className="art-hero-video" /></div>
                  ) : activeArticle.thumb ? (
                    <div className="art-hero"><img src={activeArticle.thumb} alt={activeArticle.title || ""} /></div>
                  ) : null}
                  <div className="art-meta">
                    {activeArticle.tag  && <span className="art-tag">{activeArticle.tag}</span>}
                    {activeArticle.date && <span className="art-date">{activeArticle.date}</span>}
                  </div>
                  {activeArticle.title && <h1 className="art-title">{activeArticle.title}</h1>}
                  <div className="art-body">
                    {(activeArticle.content || "").split(/\n\n+/).filter(Boolean).map((block: string, i: number) => {
                      const t = block.trim();
                      if (t === '---') return <hr key={i} className="art-hr" />;
                      if (t.startsWith('#')) return <p key={i} className="art-section-head">{t.slice(1).trim()}</p>;
                      if (t.startsWith('Q:')) return <p key={i} className="art-q">{t.slice(2).trim()}</p>;
                      if (t.startsWith('A:')) return <p key={i} className="art-a">{t.slice(2).trim()}</p>;
                      if (t.startsWith('"') && t.endsWith('"')) return <p key={i} className="art-quote">{t}</p>;
                      const lines = t.split("\n").filter(Boolean);
                      return <p key={i}>{lines.map((line: string, j: number) => <span key={j}>{line}{j < lines.length - 1 ? <br /> : null}</span>)}</p>;
                    })}
                  </div>
                  <a href={`/${slug || (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "")}`} className="art-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
                    Back to {c.name || "Artist"}
                  </a>
                </div>
              ) : (
              <>{/* Pulse tab - News feed only now that Social and Group each have
                  their own top-level tab (2026-07-26 per Sean). No channel-pill
                  sub-nav needed for a single channel - this is just the content
                  that used to sit under the "News" pill, moved up a level. */}
              {/* Defense in depth: also gate the actual content, not just the tab button,
                  since ?tab=pulse can set tab state directly from a deep link. */}
              {tab === "pulse" && !canSeePulse && (
                <section className="pulse-section">
                  <div className="pulse-empty"><p className="pulse-empty-title">Coming Soon</p><p>Pulse content for {c.name || "this artist"} is on the way. Check back soon.</p></div>
                </section>
              )}
              {tab === "pulse" && canSeePulse && (
                <section className="pulse-section">
                  <div className="pulse-articles-grid">
                    {pulseArticles.map((n, i) => (
                      <div key={i} className="pulse-article-card">
                        <a href={n.href || "#"} className="pf-article-img">
                          {n.thumb
                            ? <img src={n.thumb} alt={n.title || ""} />
                            : <div className="pf-article-ph" style={{ background: `hsl(${(i * 47 + 200) % 360}, 60%, 92%)` }} />
                          }
                          {n.videoUrl && (
                            <span className="article-play-badge" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </span>
                          )}
                          {n.tag && <span className="article-tag">{n.tag}</span>}
                        </a>
                        <div className="pf-article-body">
                          {n.date && <div className="pf-article-date">{n.date}</div>}
                          {n.title && <a href={n.href || "#"} className="pf-article-title pf-article-title-link">{n.title}</a>}
                          {n.blurb && <p className="pf-article-blurb">{n.blurb}</p>}
                          <a href={n.href || "#"} className="article-cta">
                            Read more
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2026-07-26 per Sean: Social pulled out of Pulse into its own top-level
                  tab, gated on free registration (isRegistered()) instead of the $11
                  artist unlock - liking posts and reading them is a free-member
                  benefit now, the $11 unlock is reserved for full unreleased songs.
                  Same population gate as Pulse (canSeePulse) since it's the same
                  c.pulse content, just relocated. */}
              {tab === "social" && !canSeePulse && (
                <section className="pulse-section">
                  <div className="pulse-empty"><p className="pulse-empty-title">Coming Soon</p><p>Social for {c.name || "this artist"} is on the way. Check back soon.</p></div>
                </section>
              )}
              {tab === "social" && canSeePulse && (
                <section className="pulse-section">
                  {/* isRegistered() already bypasses for a REAL super admin (viewAs
                      "real"); deliberately NOT also checking bare isSuperAdmin here so
                      the admin view-as simulator (viewAs="public") can actually preview
                      what an unregistered visitor sees on this tab, same as everywhere
                      else that respects viewAs. */}
                  {!isRegistered() && (
                    <div className="locked-panel">
                      {/* Heart icon removed 2026-07-26 per Sean - title + copy + CTA is enough. */}
                      <div className="lp-title">Social is a free member benefit</div>
                      <p className="lp-sub">Create a free account to see {name}&apos;s posts and join the conversation.</p>
                      <a
                        className="mp-btn-buy"
                        href={`/register?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                      >
                        Sign Up Free
                      </a>
                    </div>
                  )}
                  {/* 2026-07-27 per Sean/V: Instagram-style grid, piloted on
                      Roxanne only since she already has real c.pulse content
                      with resolvable thumbnails. Every card needs a thumbnail
                      image to fill the frame, even when the underlying post
                      is a video - a legacy text-only post with no media/thumb
                      simply can't render here yet (see pulse-001/003/004,
                      flagged to V rather than silently dropped). Other
                      artists keep the original card-list layout below until
                      this is confirmed and content exists for them too.
                      2026-07-28 correction per V: the grid is the main view,
                      unchanged - clicking a cell opens the real interactive
                      PostCard (avatar+name header, caption, liked-by stack,
                      Like/Comment row, typed-or-voice comment composer,
                      backed by gfs_pulse_likes / gfs_pulse_comments) inside
                      this same lightbox instead of the old bare video/photo
                      + plain caption. See components/SocialFeed.tsx. */}
                  {isRegistered() && (
                    !c.pulse || c.pulse.length === 0 ? (
                      <div className="pulse-empty"><p>Posts coming soon.</p></div>
                    ) : (() => {
                      const gridPosts = (c.pulse || [])
                        .map((post, i) => {
                          const rawThumb = post.thumb || (post.type === "photo" ? post.media : null);
                          const thumbUrl = rawThumb ? (rawThumb.startsWith("http") ? rawThumb : MEDIA + rawThumb) : null;
                          return { post, i, thumbUrl };
                        })
                        .filter((p): p is { post: PulsePost; i: number; thumbUrl: string } => !!p.thumbUrl)
                        .sort((a, b) => {
                          const pinDiff = ((b.post.pinned || b.post.featured) ? 1 : 0) - ((a.post.pinned || a.post.featured) ? 1 : 0);
                          if (pinDiff !== 0) return pinDiff;
                          const at = a.post.timestamp ? new Date(a.post.timestamp).getTime() : 0;
                          const bt = b.post.timestamp ? new Date(b.post.timestamp).getTime() : 0;
                          return bt - at;
                        });
                      const activePost = socialLightboxIdx !== null ? (c.pulse || [])[socialLightboxIdx] : null;
                      // 9-per-page (3x3), matching the Instagram-style grid V described.
                      const PAGE_SIZE = 9;
                      const pageCount = Math.max(1, Math.ceil(gridPosts.length / PAGE_SIZE));
                      const clampedPage = Math.min(socialPage, pageCount - 1);
                      const pagePosts = gridPosts.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);
                      const toggleFeatured = async (postId: string | undefined, next: boolean) => {
                        if (!postId || !slug || !SUPA_ANON) return;
                        setSocialFeatureBusyId(postId);
                        try {
                          const sbLocal = createClient(SUPA_URL, SUPA_ANON);
                          const { data: { session } } = await sbLocal.auth.getSession();
                          if (!session) return;
                          await fetch("/api/admin/pulse-feature", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                            body: JSON.stringify({ slug, postId, featured: next }),
                          });
                        } finally {
                          setSocialFeatureBusyId(null);
                        }
                      };
                      return (
                        <>
                          {gridPosts.length === 0 ? (
                            <div className="pulse-empty"><p>Posts coming soon.</p></div>
                          ) : (
                            <>
                              <div className="sg-grid">
                                {pagePosts.map(({ post, i, thumbUrl }) => {
                                  const isVideo = post.type === "video";
                                  const caption = (post.text || post.caption || "").split("\n")[0].slice(0, 60);
                                  return (
                                    <div key={post.id || i} className="sg-cell">
                                      <button type="button" className="sg-cell-btn" onClick={() => setSocialLightboxIdx(i)} aria-label={caption || "View post"}>
                                        <img src={thumbUrl} alt="" loading="lazy" decoding="async" />
                                        {post.pinned && (
                                          <span className="sg-pin"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2l-1 1v6l3 3v2h-6v7l-1 2-1-2v-7H2v-2l3-3V3l-1-1h10z" /></svg></span>
                                        )}
                                        {isVideo && (
                                          <span className="sg-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
                                        )}
                                        {caption && <span className="sg-caption">{caption}</span>}
                                      </button>
                                      {isSuperAdmin && (
                                        <button
                                          type="button"
                                          className={`sg-feature-star${post.featured ? " sg-feature-star-active" : ""}`}
                                          onClick={() => toggleFeatured(post.id, !post.featured)}
                                          disabled={socialFeatureBusyId === post.id}
                                          aria-label={post.featured ? "Remove from featured" : "Mark as featured"}
                                          aria-pressed={!!post.featured}
                                        >
                                          <svg viewBox="0 0 24 24" fill={post.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"><path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2-4.7-4.3 6.3-.7z" /></svg>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {pageCount > 1 && (
                                <div className="sg-pagination">
                                  {Array.from({ length: pageCount }).map((_, p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      className={`sg-page-btn${p === clampedPage ? " sg-page-btn-active" : ""}`}
                                      onClick={() => setSocialPage(p)}
                                      aria-label={`Page ${p + 1}`}
                                      aria-current={p === clampedPage}
                                    >
                                      {p + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          {activePost && (() => {
                            const isVideo = activePost.type === "video";
                            const rawMedia = isVideo ? (activePost.videoUrl || activePost.thumb) : (activePost.thumb || activePost.media);
                            const mediaUrl = rawMedia ? (rawMedia.startsWith("http") ? rawMedia : MEDIA + rawMedia) : null;
                            const rawThumb = activePost.thumb;
                            const thumbUrl = rawThumb ? (rawThumb.startsWith("http") ? rawThumb : MEDIA + rawThumb) : undefined;
                            const curGridPos = gridPosts.findIndex((p) => p.i === socialLightboxIdx);
                            const prevLightboxIdx = curGridPos > 0 ? gridPosts[curGridPos - 1].i : null;
                            const nextLightboxIdx = curGridPos >= 0 && curGridPos < gridPosts.length - 1 ? gridPosts[curGridPos + 1].i : null;
                            const handleLightboxTouchStart = (e: React.TouchEvent) => { touchStartXRef.current = e.touches[0].clientX; };
                            const handleLightboxTouchEnd = (e: React.TouchEvent) => {
                              const startX = touchStartXRef.current;
                              touchStartXRef.current = null;
                              if (startX === null) return;
                              const deltaX = e.changedTouches[0].clientX - startX;
                              if (Math.abs(deltaX) < 50) return;
                              if (deltaX < 0 && nextLightboxIdx !== null) setSocialLightboxIdx(nextLightboxIdx);
                              else if (deltaX > 0 && prevLightboxIdx !== null) setSocialLightboxIdx(prevLightboxIdx);
                            };
                            return (
                              <div className="sg-lightbox" onClick={() => setSocialLightboxIdx(null)}>
                                <div
                                  className="sg-lightbox-inner sg-lightbox-card"
                                  onClick={(e) => e.stopPropagation()}
                                  onTouchStart={handleLightboxTouchStart}
                                  onTouchEnd={handleLightboxTouchEnd}
                                >
                                  <button type="button" className="sg-lightbox-close" onClick={() => setSocialLightboxIdx(null)} aria-label="Close">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                                  </button>
                                  {prevLightboxIdx !== null && (
                                    <button type="button" className="sg-lightbox-nav sg-lightbox-prev" onClick={() => setSocialLightboxIdx(prevLightboxIdx)} aria-label="Previous post">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                  )}
                                  {nextLightboxIdx !== null && (
                                    <button type="button" className="sg-lightbox-nav sg-lightbox-next" onClick={() => setSocialLightboxIdx(nextLightboxIdx)} aria-label="Next post">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                  )}
                                  <PostCard
                                    post={{
                                      id: activePost.id || "",
                                      text: activePost.text || activePost.caption,
                                      type: activePost.type,
                                      mediaUrl,
                                      thumb: thumbUrl,
                                      pinned: activePost.pinned,
                                      timestamp: activePost.timestamp,
                                      audioUrl: activePost.audioUrl ? (activePost.audioUrl.startsWith("http") ? activePost.audioUrl : AUDIO + activePost.audioUrl) : undefined,
                                    }}
                                    artistSlug={slug ?? ""}
                                    name={c.name || name || "This artist"}
                                    avatarUrl={c.profileUrl || c.heroUrl || null}
                                    tierRank={isSuperAdmin ? 3 : (effectiveTier ? (TIER_RANK[effectiveTier] || 1) : 0)}
                                    isAdmin={isSuperAdmin}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()
                  )}
                </section>
              )}

              {/* 2026-07-26 per Sean: Chat pulled out of the Pulse channel-pill
                  (where it was unreachable - `locked` disabled the pill entirely) into
                  its own top-level tab. Renamed from "Group"/"Group Chat" to "Chat"
                  2026-07-27 per Sean/V. Gates identically to Social - free registration
                  (isRegistered()), not the $11 artist unlock. The chat feature itself
                  isn't built yet, so a registered visitor sees the same "coming soon"
                  message that used to live in the disabled Pulse pill; an unregistered
                  visitor sees the same register-gate pattern as Social (no icon, per
                  the same 2026-07-26 cleanup). */}
              {tab === "chat" && !canSeePulse && (
                <section className="pulse-section">
                  <div className="pulse-empty"><p className="pulse-empty-title">Coming Soon</p><p>Chat for {c.name || "this artist"} is on the way. Check back soon.</p></div>
                </section>
              )}
              {tab === "chat" && canSeePulse && (
                <section className="pulse-section">
                  {!isRegistered() && (
                    <div className="locked-panel">
                      <div className="lp-title">Chat is a free member benefit</div>
                      <p className="lp-sub">Create a free account to join the conversation with {name} and other members.</p>
                      <a
                        className="mp-btn-buy"
                        href={`/register?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                      >
                        Sign Up Free
                      </a>
                    </div>
                  )}
                  {isRegistered() && (
                    <div className="locked-panel">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                      <div className="lp-title">Chat is coming soon</div>
                      <p className="lp-sub">Live chat with {name} and other members lands here once Chat ships across GeekFon Society - free to join, no unlock required.</p>
                    </div>
                  )}
                </section>
              )}

              {tab === "members" && (
                <section className="members-section">
                  <div className="bsec">The Band</div>
                  <div className="member-grid">
                    {(c.members || []).map((m, i) => {
                      const color = m.color || c.accent || "var(--rx)";
                      const isFlipped = flippedMembers.has(i);
                      return (
                        <button
                          type="button"
                          key={m.name || i}
                          className={"member-card" + (isFlipped ? " is-flipped" : "")}
                          aria-pressed={isFlipped}
                          onClick={() => setFlippedMembers(prev => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          })}
                        >
                          <div className="member-card-inner">
                            <div className="member-card-face member-card-front">
                              {m.img ? (
                                <img src={m.img.startsWith('http') ? m.img : MEDIA + m.img} alt={m.name} className="member-thumb-img" />
                              ) : (
                                <div className="member-thumb" style={{ background: color }}>{m.initial || m.name?.charAt(0)}</div>
                              )}
                              <div className="member-info">
                                <p className="member-name">{m.name}</p>
                                {m.role && <p className="member-role">{m.role}</p>}
                                {m.hook && <p className="member-hook">{m.hook}</p>}
                                <p className="member-tapcue">Tap to flip &rarr;</p>
                              </div>
                            </div>
                            <div className="member-card-face member-card-back" style={{ background: color }}>
                              <div className="mcb-name">{m.name}</div>
                              {m.role && <div className="mcb-role">{m.role}</div>}
                              {m.position && <div className="mcb-position">{m.position}</div>}
                              {m.traits && m.traits.length > 0 && (
                                <div className="mcb-traits">
                                  {m.traits.map(t => <span key={t} className="mcb-trait">{t}</span>)}
                                </div>
                              )}
                              {m.quote && <p className="mcb-quote">&quot;{m.quote}&quot;</p>}
                              {m.detail && <p className="mcb-detail">{m.detail}</p>}
                              <p className="mcb-tapcue">&larr; Tap to flip back</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {tab === "music" && (() => {
                const tracks = c.tracks || [];
                const safeIdx = Math.min(currTrackIdx, tracks.length - 1);
                const npTrack = tracks[safeIdx];
                const npUrl = npTrack?.url ? AUDIO + npTrack.url : null;
                const npPlaying = !!npUrl && playing === npUrl;
                const npProgress = npUrl ? (audioProgress[npUrl] || 0) : 0;
                const npDuration = npUrl ? (audioDuration[npUrl] || 0) : 0;
                const npPreviewCapped = !!npTrack && isPreviewCappedTrack(npTrack);
                // Preview tracks show/animate a PREVIEW_CAP_SECONDS bar, not the real full-track duration,
                // so it visibly reads as a short preview instead of looking like stalled full playback
                const npMax = npPreviewCapped ? (npDuration > 0 ? Math.min(npDuration, PREVIEW_CAP_SECONDS) : PREVIEW_CAP_SECONDS) : npDuration;
                const npPct = npMax > 0 ? Math.min(100, (npProgress / npMax) * 100) : 0;
                const npBadge = npTrack ? trackBadge(npTrack) : { label: "", cls: "" };

                function selectTrack(i: number) {
                  setCurrTrackIdx(i);
                  if (playing) { const a = audioRef.current; if (a) { a.pause(); setPlaying(null); setPlayingV(null); } }
                }
                const lyricsButton = (
                  <button className={"mp-chip" + (lyricsDrawerOpen ? " active" : "")} onClick={() => setLyricsDrawerOpen(o => !o)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Lyrics
                  </button>
                );

                const scrubBar = (
                  <div className="mp-scrub">
                    <span className="mp-time">{fmtTime(npProgress)}</span>
                    <div
                      className="mp-bar"
                      onPointerDown={(e) => npUrl && handleScrubPointerDown(e, npUrl)}
                      onPointerMove={(e) => npUrl && handleScrubPointerMove(e, npUrl)}
                    >
                      <div className="mp-bar-fill" style={{ width: `${npPct}%` }} />
                      <div className="mp-bar-knob" style={{ left: `${npPct}%` }} />
                    </div>
                    <span className="mp-time">{npMax > 0 ? fmtTime(npMax) : "--:--"}</span>
                  </div>
                );

                const npHasTranslation = !!(npTrack?.lyricsEn && npTrack?.lyricsOriginalLang && npTrack.lyricsOriginalLang !== "en");
                const npLyricsText = npTrack
                  ? (lyricsLang === "original" || !npHasTranslation ? npTrack.lyricsOriginal : npTrack.lyricsEn)
                  : undefined;

                const lyricsAccordion = lyricsDrawerOpen && npTrack && (
                  <div className="mp-lyrics-inline">
                    <div className="mp-lyrics-head">
                      <span className="mp-lyrics-label">Lyrics</span>
                      <span className="mp-lyrics-track">{npTrack.n}</span>
                      {npHasTranslation && (
                        <div className="mp-lyrics-lang" role="group" aria-label="Lyrics language">
                          <button
                            className={"mp-lyrics-lang-btn" + (lyricsLang === "original" ? " active" : "")}
                            aria-pressed={lyricsLang === "original"}
                            onClick={() => setLyricsLang("original")}
                          >
                            {(npTrack.lyricsOriginalLang || "ja").toUpperCase()}
                          </button>
                          <button
                            className={"mp-lyrics-lang-btn" + (lyricsLang === "en" ? " active" : "")}
                            aria-pressed={lyricsLang === "en"}
                            onClick={() => setLyricsLang("en")}
                          >
                            EN
                          </button>
                        </div>
                      )}
                      <button className="mp-lyrics-close" onClick={() => setLyricsDrawerOpen(false)}>&#x2715;</button>
                    </div>
                    <div className="mp-lyrics-body">
                      {npLyricsText ? (
                        <p className="mp-lyrics-text">{npLyricsText}</p>
                      ) : (
                        <p style={{ color: "var(--lr-text-50)", fontSize: 13 }}>Lyrics sync coming soon.</p>
                      )}
                    </div>
                  </div>
                );

                const npPlayLabel = npTrack ? trackPlayLabel(npPlaying, npTrack) : "Play";

                // 2026-07-24: Sean's direction - the hero "now playing" card was too
                // big and duplicated the play control (orb up top + a second Play
                // button in the action row). Piloted on Lex from Brixton only: no
                // hero section at all, play + lyrics controls live directly on each
                // song row, and the currently-playing/selected song is communicated
                // purely via the row highlight (.mp-row.current, which already
                // existed). 2026-07-26 (2nd pass) per Sean: the pilot read well,
                // activated for every artist - this is now the standard Music-tab
                // layout, not a Lex-only exception.
                const useRowLyrics = true;

                // 2026-07-24 round 3: super-admins viewing "as real" already bypass every
                // preview cap (see isPreviewCappedTrack above), so the "Unlock Full
                // Experience" upsell was still showing to Sean even though he already has
                // full access. hasFullAccess folds that bypass into the same check as an
                // actual paid unlock, so the CTA only shows to people who'd actually benefit
                // from clicking it.
                const hasFullAccess = unlockedArtist || hasAllAccessTier || simulatingFullAccess || (isSuperAdmin && viewAs === "real");

                function rowLyricsFor(t: Track) {
                  const hasTranslation = !!(t.lyricsEn && t.lyricsOriginalLang && t.lyricsOriginalLang !== "en");
                  const text = lyricsLang === "original" || !hasTranslation ? t.lyricsOriginal : t.lyricsEn;
                  return { hasTranslation, text };
                }

                return (
                  <section className="mp-root">
                    {!useRowLyrics && (
                      <>
                      {/* Now-playing card - single unified layout, mobile + desktop */}
                      <div className="mp-player">
                        <div className="mp-np">
                          <button
                            className="mp-orb"
                            aria-label={npPlaying ? "Pause" : "Play"}
                            disabled={!npUrl}
                            onClick={() => {
                              if (!npUrl) return;
                              if (npTrack && isRegisterLockedTrack(npTrack)) { setShowVoteModal("preview"); return; }
                              togglePlay(npUrl, npTrack && isPreviewCappedTrack(npTrack) ? "capped" : undefined, npTrack?.n);
                            }}
                          >
                            {npPlaying ? PAUSE : PLAY}
                          </button>
                          <div className="mp-npmeta">
                            <div className="mp-nptitle">{npTrack?.n || "Select a track"}</div>
                            <div className="mp-npartist">{name}</div>
                            <span className={"mp-nptag " + npBadge.cls}>{npBadge.label}</span>
                          </div>
                          {scrubBar}
                        </div>

                        <div className="mp-barrow">
                          <div className="mp-vol">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            <div className="mp-voltrack"><div className="mp-volfill" style={{ width: "70%" }} /></div>
                          </div>
                          <div className="mp-barrow-actions">
                            {lyricsButton}
                            <button
                              className={"mp-btn-pre" + (!npUrl ? " disabled" : "")}
                              disabled={!npUrl}
                              title={!npUrl ? "Audio coming soon" : undefined}
                              onClick={() => {
                                if (!npUrl) return;
                                if (npTrack && isRegisterLockedTrack(npTrack)) { setShowVoteModal("preview"); return; }
                                togglePlay(npUrl, npTrack && isPreviewCappedTrack(npTrack) ? "capped" : undefined, npTrack?.n);
                              }}
                              aria-label={npPlayLabel}
                            >
                              {!npUrl ? "Soon" : npPlayLabel}
                            </button>
                            {npTrack && npPreviewCapped && (
                              <button
                                className="mp-btn-buy"
                                onClick={() => unlockTrack(npTrack)}
                                disabled={trackUnlockLoading === npTrack.n}
                                aria-label={`Unlock ${npTrack.n} for 111 LESARs`}
                              >
                                {trackUnlockLoading === npTrack.n ? "..." : "Unlock - 111 LESARs"}
                              </button>
                            )}
                          </div>
                        </div>

                        {lyricsAccordion}
                      </div>
                      </>
                    )}

                    {/* Catalog */}
                    <div className="mp-catalog-head">
                      <h2 className="mp-catalog-title">{name} - Full Catalog</h2>
                      {!hasFullAccess && !useRowLyrics && (
                        <button
                          className="mp-btn-buy"
                          onClick={handleUnlockArtist}
                          disabled={unlockLoading}
                        >
                          {unlockLoading ? "Redirecting..." : "Unlock Full Experience - $11"}
                        </button>
                      )}
                    </div>
                    <p className="mp-catalog-note">
                      {hasFullAccess
                        ? "You've unlocked every song by " + name + ", released or not."
                        : "Every song plays free once it's officially released. Unlock the Full Experience once for $11 to hear everything by " + name + " right now, including tracks that haven't dropped yet. Be sure to like your favorite songs to help " + name + " rise on the leaderboard."}
                    </p>
                    {/* 2026-07-26 round 2 removed the CTA here entirely per Sean (it was
                        a stale "Get Passport - Free" link tied to the old subscription
                        model). Round 3, same day: Sean's now formalized a free-registration
                        tier that gates liking songs AND previewing unreleased tracks, and
                        explicitly asked for this popup to let people register - so the CTA
                        is back, now pointed at the real /register flow instead of the old
                        Passport page. Copy differs by trigger: liking a song vs. trying to
                        preview a locked track.
                        2026-07-26 later same day, per Sean: this was still rendering inline
                        (pushed the track list down, left a gap) instead of a real lightbox,
                        and the "like a song" copy was a bare gate instead of a benefits pitch
                        for free Passport membership. Now a fixed overlay + card, and the
                        non-member case leads with what free registration actually unlocks. */}
                    {showVoteModal && (
                      <div
                        className="vote-modal-overlay"
                        onClick={() => setShowVoteModal(null)}
                      >
                        <div
                          className="vote-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="vote-modal-title"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="vote-modal-close"
                            onClick={() => setShowVoteModal(null)}
                            aria-label="Close"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </button>
                          {showVoteModal === "preview" ? (
                            <>
                              <div id="vote-modal-title" className="vote-modal-title-text">Create a free account</div>
                              <p>Sign up free to preview {name}&apos;s unreleased songs before they officially drop.</p>
                            </>
                          ) : showVoteModal === "plus" ? (
                            // 2026-07-27 round 2 per Sean: mirrors the Passport benefits
                            // card below, but for the $11 paid tier - opened from the
                            // renamed "Plus - $11" bottom CTA instead of the old
                            // straight-to-Stripe click. Benefits list confirmed with
                            // Sean: full catalog incl. unreleased, Playlist access
                            // (added 2026-07-27 earlier today), one-time payment.
                            <>
                              <div id="vote-modal-title" className="vote-modal-title-text">Unlock Plus</div>
                              <p className="vote-modal-lead">$11 once, {name}&apos;s full experience, forever:</p>
                              <ul className="vote-modal-benefits">
                                <li>{CHECK}<span>Every {name} song, released or not - no preview cap</span></li>
                                <li>{CHECK}<span>Add every {name} track to your Playlist</span></li>
                                <li>{CHECK}<span>One-time payment - $11 once, yours forever, no subscription</span></li>
                              </ul>
                            </>
                          ) : (
                            <>
                              <div id="vote-modal-title" className="vote-modal-title-text">Become a free Passport member</div>
                              <p className="vote-modal-lead">Create a free account and unlock:</p>
                              <ul className="vote-modal-benefits">
                                <li>{CHECK}<span>Access to {name}&apos;s Social feed</span></li>
                                <li>{CHECK}<span>Access to the Group conversation</span></li>
                                <li>{CHECK}<span>Like songs to help {name} climb the leaderboard</span></li>
                              </ul>
                            </>
                          )}
                          <div className="vote-modal-actions">
                            {showVoteModal === "plus" ? (
                              <button
                                className="vote-modal-cta"
                                onClick={handleUnlockArtist}
                                disabled={unlockLoading}
                              >
                                {unlockLoading ? "Redirecting..." : "Yes, Unlock for $11"}
                              </button>
                            ) : (
                              <a
                                className="vote-modal-cta"
                                href={`/register?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                              >
                                Sign Up Free
                              </a>
                            )}
                            <button className="vote-modal-dismiss" onClick={() => setShowVoteModal(null)}>Dismiss</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {seasonModalOpen && (
                      <div
                        className="vote-modal-overlay"
                        onClick={() => { if (!redeemLoading) setSeasonModalOpen(false); }}
                      >
                        <div
                          className="vote-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="season-modal-title"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div id="season-modal-title" className="vote-modal-title-text">
                            Get More LESARs
                          </div>
                          <p className="vote-modal-lead">
                            You have {userBalance} LESARs. 111 LESARs unlocks any song, released or
                            not - forever, yours to download. $11 gets you 1,110 LESARs, about 10 songs.
                          </p>
                          <ul className="vote-modal-benefits">
                            <li>{CHECK}<span>1,110 LESARs, no expiration</span></li>
                            <li>{CHECK}<span>111 LESARs unlocks any song, released or not</span></li>
                            <li>{CHECK}<span>Download unlocked songs and add them to your GeekFon Playlist</span></li>
                          </ul>
                          {redeemError && <p className="pur-error">{redeemError}</p>}
                          <div className="vote-modal-actions">
                            <button
                              className="mp-btn-buy"
                              disabled={redeemLoading}
                              onClick={buyLesarsPack}
                            >
                              {redeemLoading ? "Please wait..." : "Buy 1,110 LESARs - $11"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {unlockError && <p className="pur-error">{unlockError}</p>}

                    <div className={"mp-rows" + (useRowLyrics ? " mp-rows-row-lyrics" : "")}>
                      {tracks.map((t, i) => {
                        const url = t.url ? AUDIO + t.url : null;
                        const locked = trackLocked(t);
                        const isCurr = i === safeIdx;

                        // 2026-07-24 round 2, Lex from Brixton pilot only: Sean wants each
                        // row broken into exactly three zones - the thumbnail IS the
                        // play/pause button, a real scrub bar sits in the middle instead of
                        // just title text, and Lyrics is the only button on the right (no
                        // more separate Play button in that corner).
                        // 2026-07-26 per Sean: unreleased tracks a NOT-registered visitor
                        // can't preview at all still get this grayed no-playback row, but
                        // the CTA is now "Register" (free), not "Unlock" ($11) - previewing
                        // is a free-registration benefit, the $11 unlock is only for full
                        // songs. Once registered, the track falls through to the normal
                        // playable row below with a capped 30s preview instead.
                        if (useRowLyrics && isRegisterLockedTrack(t)) {
                          // 2026-07-26 per Sean: dropped the artist name / "Register to
                          // preview" subtitle line entirely - just the song title, matching
                          // the playable row below it. Also added the same (inert) scrub bar
                          // for visual consistency, since there's no audio loaded yet to show
                          // real progress on - it's decorative here, not interactive.
                          return (
                            <div key={i} className="mp-row mp-row-locked-cta">
                              <div className="mp-row-thumb mp-row-thumb-locked" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                              </div>
                              <div className="mp-row-mid">
                                <div className="mp-row-title-line">
                                  <span className="mp-row-title">{t.n}</span>
                                </div>
                                <div className="mp-row-scrub" aria-hidden="true">
                                  <span className="mp-time">--:--</span>
                                  <div className="mp-bar mp-bar-inert">
                                    <div className="mp-bar-fill" style={{ width: "0%" }} />
                                    <div className="mp-bar-knob" style={{ left: "0%" }} />
                                  </div>
                                  <span className="mp-time">--:--</span>
                                </div>
                              </div>
                              {/* 2026-07-26 per Sean: "Register, register, register, register"
                                  repeated down the list was redundant - show the release date
                                  instead (still the same green pill, still takes them to
                                  /register on click). Falls back to "Register" only if a track
                                  has no scheduledFor date. A REGISTERED viewer can still land
                                  here now (e.g. a "Pro"-tagged released track, 2+ tiers above a
                                  Passport member) - registering again would do nothing, so that
                                  case gets an unlock button instead of a register link. */}
                              {isRegistered() ? (
                                <button
                                  className="mp-btn-buy mp-row-unlock"
                                  onClick={handleUnlockArtist}
                                  disabled={unlockLoading}
                                  aria-label={`Unlock ${name}'s full catalog for $11 to hear ${t.n}`}
                                >
                                  {unlockLoading ? "..." : "Unlock - $11"}
                                </button>
                              ) : t.scheduledFor ? (
                                // 2026-07-27 per Sean's Fieldy note: the raw scheduled date
                                // ("2026-08-15") rendered as the whole label on a bold green
                                // CTA pill read as meaningless - just a date, no signal of why
                                // it's locked. His own fix: deprioritize the date and pair it
                                // with a lock symbol so it reads as "this is premium, unlocks
                                // on this date" instead of a bare timestamp. Piloted on Vuka
                                // only 2026-07-27, confirmed good, rolled out to the full
                                // roster same day.
                                //
                                // Fixed same day per Sean's follow-up: this used to be a plain
                                // <a href="/register..."> that navigated straight to the
                                // register page. Sean caught that on a second look at Vuka -
                                // it should open the Passport-Free benefits dialog first (same
                                // "non-member" vote modal every other lock icon on this page
                                // already opens), not jump the visitor straight to a form.
                                <button
                                  type="button"
                                  className="mp-row-unlock-quiet"
                                  onClick={() => setShowVoteModal("non-member")}
                                  aria-label={`${formatShortDate(t.scheduledFor)} - see Passport benefits to preview ${t.n}, releases ${t.scheduledFor.split("T")[0]}`}
                                >
                                  <span className="mp-row-unlock-date">{formatShortDate(t.scheduledFor)}</span>
                                  {LOCK}
                                </button>
                              ) : (
                                <a
                                  className="mp-btn-buy mp-row-unlock"
                                  href={`/register?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                                  aria-label={`Create a free account to preview ${t.n}${t.scheduledFor ? ", releases " + t.scheduledFor.split("T")[0] : ""}`}
                                >
                                  {t.scheduledFor ? t.scheduledFor.split("T")[0] : "Register"}
                                </a>
                              )}
                            </div>
                          );
                        }

                        if (useRowLyrics) {
                          const rowLyricsOpen = rowLyricsOpenIdx === i;
                          const { hasTranslation: rowHasTranslation, text: rowLyricsText } = rowLyricsFor(t);
                          const isPlayingThis = !!url && playing === url;
                          const progress = url ? (audioProgress[url] || 0) : 0;
                          const rawDuration = url ? (audioDuration[url] || 0) : 0;
                          // 2026-07-26 per Sean: preview-capped tracks were showing the
                          // real full-song duration (e.g. "3:42") and a progress bar
                          // scaled to it, so the bar looked barely-started and the time
                          // display looked normal right up to the moment playback cut
                          // off at 30s - reads as a bug/broken player instead of an
                          // intentional preview. Mirrors the same npMax capping already
                          // used by the (currently inactive) hero player above.
                          const rowPreviewCapped = isPreviewCappedTrack(t);
                          const duration = rowPreviewCapped
                            ? (rawDuration > 0 ? Math.min(rawDuration, PREVIEW_CAP_SECONDS) : PREVIEW_CAP_SECONDS)
                            : rawDuration;
                          const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
                          return (
                            <Fragment key={i}>
                            <div className={"mp-row mp-row-play" + (isCurr ? " current" : "")}>
                              <button
                                className="mp-row-thumb mp-row-playbtn"
                                disabled={!url}
                                title={!url ? "Audio coming soon" : (isPreviewCappedTrack(t) ? "30-second preview - unlock for the full song" : undefined)}
                                aria-label={isPlayingThis ? `Pause ${t.n}` : `Play ${t.n}`}
                                onClick={() => { if (url) { setCurrTrackIdx(i); togglePlay(url, isPreviewCappedTrack(t) ? "capped" : undefined, t.n); } }}
                              >
                                {isPlayingThis ? PAUSE : PLAY}
                              </button>
                              <div className="mp-row-mid">
                                <div className="mp-row-title-line">
                                  <span className="mp-row-title">{t.n}</span>
                                  {isPreviewCappedTrack(t) && <span className="mp-row-preview-tag">PREVIEW</span>}
                                </div>
                                <div className="mp-row-scrub">
                                  <span className="mp-time">{fmtTime(progress)}</span>
                                  <div
                                    className="mp-bar"
                                    onPointerDown={(e) => url && handleScrubPointerDown(e, url, duration)}
                                    onPointerMove={(e) => url && handleScrubPointerMove(e, url, duration)}
                                  >
                                    <div className="mp-bar-fill" style={{ width: `${pct}%` }} />
                                    <div className="mp-bar-knob" style={{ left: `${pct}%` }} />
                                  </div>
                                  <span className="mp-time">{duration > 0 ? fmtTime(duration) : "--:--"}</span>
                                </div>
                              </div>
                              {/* 2026-07-26 per Sean: heart button - liking a song IS a vote
                                  for the artist (feeds gfs_artist_rankings). Went through two
                                  fixes same day: (4th pass) stopped every heart filling in
                                  together when only one was clicked; (5th pass, this one) Sean
                                  confirmed he wants genuinely independent per-song likes, not
                                  one shared artist-wide vote/day - so each row now only cares
                                  whether ITS OWN track is in votedTracksToday, completely
                                  independent of every other row. */}
                              {/* 2026-07-27 per Sean: hearts on a preview no longer make sense
                                  as "real" engagement, and the old disabled-once-voted heart had
                                  no way to undo a mistaken like. So previews/locked tracks get a
                                  lock icon instead of a heart - clicking it opens whichever popup
                                  is actually next for this viewer (Passport if not registered yet,
                                  Plus if registered but this song needs the paid unlock). Only
                                  full-access tracks (!rowPreviewCapped - registerLocked tracks never
                                  reach this row at all, they're the locked-cta branch above) keep a
                                  real heart, and that heart now toggles vote/unvote instead of
                                  locking after one click. Piloted on Vuka only, confirmed good,
                                  rolled out to the full roster same day. */}
                              {rowPreviewCapped ? (
                                <button
                                  className="mp-row-lock"
                                  onClick={() => isRegistered() ? unlockTrack(t) : setShowVoteModal("non-member")}
                                  aria-label={isRegistered() ? `Unlock ${t.n} for 111 LESARs` : `Sign up free to preview ${t.n}`}
                                  title={isRegistered() ? "111 LESARs to unlock this song" : "Sign up free to preview this song"}
                                  disabled={trackUnlockLoading === t.n}
                                >
                                  {trackUnlockLoading === t.n ? "..." : LOCK}
                                </button>
                              ) : (
                                <button
                                  className={"mp-row-heart" + (votedTracksToday.has(t.n) ? " voted" : "") + (voteLoading ? " loading" : "")}
                                  onClick={() => votedTracksToday.has(t.n) ? removeVote(t.n) : submitVote(t.n)}
                                  disabled={voteLoading}
                                  aria-label={votedTracksToday.has(t.n) ? `Remove your like from ${t.n}` : `Like ${t.n} and vote for ${name}`}
                                  title={votedTracksToday.has(t.n) ? "Liked - click to remove" : "Like this song - votes for " + name}
                                >
                                  <svg viewBox="0 0 24 24" fill={votedTracksToday.has(t.n) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                                </button>
                              )}
                              {/* Added 2026-08-14: per-song LESARs unlock/ownership affordance, shown
                                  on every row regardless of preview-cap state - 111 LESARs unlocks a
                                  song whether it is already free to preview or not (Sean's locked
                                  pricing spec). Owned tracks show download + add-to-playlist instead
                                  of the buy pill. */}
                              {ownedTracks.has(t.n) ? (
                                <>
                                  {url && (
                                    <a
                                      className="mp-row-owned-action"
                                      href={url}
                                      download
                                      aria-label={`Download ${t.n}`}
                                      title="Download"
                                    >
                                      Download
                                    </a>
                                  )}
                                  <button
                                    className="mp-row-owned-action"
                                    onClick={() => addToPlaylist(t)}
                                    disabled={playlistAdding === t.n || playlistAdded.has(t.n)}
                                    aria-label={`Add ${t.n} to your GeekFon Playlist`}
                                    title="Add to GeekFon Playlist"
                                  >
                                    {playlistAdded.has(t.n) ? "Added" : playlistAdding === t.n ? "..." : "+ Playlist"}
                                  </button>
                                </>
                              ) : !rowPreviewCapped && (
                                <button
                                  className="mp-row-lesars-buy"
                                  onClick={() => unlockTrack(t)}
                                  disabled={trackUnlockLoading === t.n}
                                  aria-label={`Unlock ${t.n} for 111 LESARs`}
                                  title="111 LESARs to unlock"
                                >
                                  {trackUnlockLoading === t.n ? "..." : "111 LESARs"}
                                </button>
                              )}
                              {/* 2026-07-26 per Sean: swapped the text "Lyrics" pill for a
                                  circular icon button matching the heart, for a more
                                  streamlined row. Icon is a sheet-of-paper/document mark
                                  standing in for lyrics text; same toggle behavior. */}
                              <button
                                className={"mp-row-lyrics-btn" + (rowLyricsOpen ? " active" : "")}
                                onClick={() => setRowLyricsOpenIdx(prev => prev === i ? null : i)}
                                aria-label={rowLyricsOpen ? `Hide lyrics for ${t.n}` : `Show lyrics for ${t.n}`}
                                title={rowLyricsOpen ? "Hide lyrics" : "Show lyrics"}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                              </button>
                            </div>
                            {rowLyricsOpen && (
                              <div className="mp-lyrics-inline mp-lyrics-inline-row">
                                <div className="mp-lyrics-head">
                                  <span className="mp-lyrics-label">Lyrics</span>
                                  <span className="mp-lyrics-track">{t.n}</span>
                                  {rowHasTranslation && (
                                    <div className="mp-lyrics-lang" role="group" aria-label="Lyrics language">
                                      <button
                                        className={"mp-lyrics-lang-btn" + (lyricsLang === "original" ? " active" : "")}
                                        aria-pressed={lyricsLang === "original"}
                                        onClick={() => setLyricsLang("original")}
                                      >
                                        {(t.lyricsOriginalLang || "ja").toUpperCase()}
                                      </button>
                                      <button
                                        className={"mp-lyrics-lang-btn" + (lyricsLang === "en" ? " active" : "")}
                                        aria-pressed={lyricsLang === "en"}
                                        onClick={() => setLyricsLang("en")}
                                      >
                                        EN
                                      </button>
                                    </div>
                                  )}
                                  <button className="mp-lyrics-close" onClick={() => setRowLyricsOpenIdx(null)}>&#x2715;</button>
                                </div>
                                <div className="mp-lyrics-body">
                                  {rowLyricsText ? (
                                    <p className="mp-lyrics-text">{rowLyricsText}</p>
                                  ) : (
                                    <p style={{ color: "var(--lr-text-50)", fontSize: 13 }}>Lyrics sync coming soon.</p>
                                  )}
                                </div>
                              </div>
                            )}
                            </Fragment>
                          );
                        }

                        // Legacy row (every other artist, unchanged from before the pilot)
                        const registerLocked = isRegisterLockedTrack(t);
                        return (
                          <div
                            key={i}
                            className={"mp-row" + (isCurr ? " current" : "") + (locked ? " locked" : "")}
                            onClick={() => {
                              if (!url) return;
                              setCurrTrackIdx(i);
                              if (registerLocked) { setShowVoteModal("preview"); return; }
                              togglePlay(url, isPreviewCappedTrack(t) ? "capped" : undefined, t.n);
                            }}
                          >
                            <div className="mp-row-art">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            </div>
                            <div className="mp-row-meta">
                              <div className="mp-row-title">{t.n}</div>
                              <div className="mp-row-sub">{name}{t.m ? ` - ${t.m}` : ""}</div>
                              {locked && <div className="mp-row-date">{trackLockedLabel(t)}</div>}
                            </div>
                            <div className="mp-row-state">
                              {locked && <span className="mp-badge-lk">{registerLocked ? "REGISTER" : "PREVIEW"}</span>}
                              <button
                                className={"mp-btn-pre" + (!url ? " disabled" : "")}
                                disabled={!url}
                                title={!url ? "Audio coming soon" : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!url) return;
                                  setCurrTrackIdx(i);
                                  if (registerLocked) { setShowVoteModal("preview"); return; }
                                  togglePlay(url, isPreviewCappedTrack(t) ? "capped" : undefined, t.n);
                                }}
                                aria-label={trackPlayLabel(playing === url, t)}
                              >
                                {!url ? "Soon" : trackPlayLabel(playing === url, t)}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* 2026-07-27 per Sean's Fieldy note (Refining VUCA Plus UX and
                        Passport Benefits - "VUCA" transcribed his pronunciation of
                        "Vuka"): two paths should sit next to each other above the fold
                        of the catalog - free Passport signup and the $11 paid unlock -
                        instead of only ever showing the paid CTA. Piloted on Vuka only
                        first, confirmed good, rolled out to the full roster same day.
                        Only shown to a visitor who hasn't registered yet - a Passport
                        member already has the free tier, so only Plus applies to them.
                        Reuses the existing benefits modal (setShowVoteModal
                        ("non-member")) instead of building new copy or linking out to
                        the separate /passport tour page, whose Plus-tier slide is
                        stale post the 2026-07-23 pricing simplification. */}
                    {useRowLyrics && !hasFullAccess && !isRegistered() && (
                      <button
                        className="mp-btn-buy mp-btn-buy-passport mp-catalog-unlock-bottom"
                        onClick={() => setShowVoteModal("non-member")}
                      >
                        Passport - Free
                      </button>
                    )}
                    {/* 2026-07-27 round 2 per Sean: renamed to "Plus - $11" to match
                        "Passport - Free" - the tier is called Plus everywhere in the
                        code (Passport < Plus < Pro) but was never actually said to a
                        visitor. Clicking used to jump straight to Stripe, now opens a
                        benefits pitch first (mirrors the Passport modal) with a real
                        confirm step before checkout. Per Sean's explicit scoping
                        answer, the small per-track "Unlock - $11" row buttons
                        elsewhere are UNCHANGED - still instant checkout, no popup -
                        this only touches the main bottom CTA. Piloted on Vuka only
                        first, confirmed good, rolled out to the full roster same day. */}
                    {useRowLyrics && !hasFullAccess && (
                      <button
                        className="mp-btn-buy mp-catalog-unlock-bottom"
                        onClick={() => setShowVoteModal("plus")}
                      >
                        Plus - $11
                      </button>
                    )}
                  </section>
                );
              })()}

              {tab === "media" && (<section className="panel"><p className="empty-note">Media gallery renders here (wire to storage on rollout).</p></section>)}

              {tab === "schedule" && (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const sorted = [...(c.tracks || [])]
                  .filter(t => scheduleVisible(t.v))
                  .sort((a, b) => {
                    const toMs = (s?: string) => s ? new Date(s).getTime() : Infinity;
                    return toMs(a.scheduledFor) - toMs(b.scheduledFor);
                  });
                const seasons = Array.from(new Set(sorted.map(t => t.m || "Season 1")));
                function renderRow(t: Track, i: number) {
                  const isAvailable = unlockedArtist || simulatingFullAccess || !isScheduledFuture(t);
                  const tier = scheduleTier(isAvailable);
                  const releasedLabel = t.scheduledFor ? `Released ${t.scheduledFor.split("T")[0]}` : "Available now";
                  const statusLabel = isAvailable ? releasedLabel : (t.scheduledFor ? t.scheduledFor.split("T")[0] : "Coming soon");
                  return (
                    <div key={i} className={"sch-row" + (isAvailable ? " sch-live" : "")}>
                      <div className="sch-dot-wrap" aria-hidden="true">
                        <div className={"sch-dot" + (isAvailable ? " on" : "")} />
                      </div>
                      <div className="sch-body">
                        <div className="sch-track-name">
                          {t.n}
                          {t.isRemix && <span className="sch-remix-badge">Remix</span>}
                          {t.isFinale && <span className="sch-remix-badge sch-finale-badge">Season Finale</span>}
                          {t.isPremiere && <span className="sch-remix-badge sch-premiere-badge">Season Premiere</span>}
                        </div>
                        <div className="sch-track-meta">
                          <span className={"sch-status" + (isAvailable ? " sch-status-live" : "")}>{statusLabel}</span>
                        </div>
                      </div>
                      <button
                        className={"sch-tier-pill sch-tier-pill-btn " + tier.cls}
                        onClick={() => handleBadgeClick(t)}
                        aria-label={isAvailable ? `${t.n} is free to play` : `Unlock the full GeekFon Society experience for ${name}`}
                      >
                        {tier.label}
                      </button>
                    </div>
                  );
                }
                return (
                  <section className="panel">
                    {seasons.map((season, si) => {
                      const rows = sorted.filter(t => (t.m || "Season 1") === season);
                      return (
                        <div key={si} className="sch-season-block">
                          <div className="sch-season-heading">{season}</div>
                          <div className="sch-timeline">
                            {rows.map((t, i) => renderRow(t, i))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="sch-footnote">Release windows update as the season progresses. Unlock the Full Experience to hear everything early.</p>
                  </section>
                );
              })()}

              {tab === "brief" && (() => {
                // ââ Artist Bible Admin UI ââââââââââââââââââââââââââââââââââââââââââââââ
                // Scalable for hundreds of artists: searchable, filtered, versioned.
                const MODULE_ORDER = [
                  // Identity Layer
                  "identity","psychology","personality",
                  // Character
                  "backstory","voice","emotional_performance","visual_identity",
                  // Music
                  "musical_dna","lyrical_dna",
                  // World
                  "relationships","lore","timeline",
                  // Creative
                  "creative_direction","prompt_library","canon_rules",
                  // Admin
                  "assets","version_history","creative_producer_notes"
                ];

                const PHASES = [
                  { label: "Identity Layer", modules: ["identity","psychology","personality"] },
                  { label: "Character", modules: ["backstory","voice","emotional_performance","visual_identity"] },
                  { label: "Music", modules: ["musical_dna","lyrical_dna"] },
                  { label: "World", modules: ["relationships","lore","timeline"] },
                  { label: "Creative", modules: ["creative_direction","prompt_library","canon_rules"] },
                  { label: "Admin", modules: ["assets","version_history","creative_producer_notes"] },
                ];

                function isPopulated(data: Record<string, unknown>): boolean {
                  return Object.values(data).some(v =>
                    v !== null && v !== undefined && v !== "" &&
                    !(Array.isArray(v) && v.length === 0) &&
                    !(typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)
                  );
                }

                function getDisplayStatus(mod: BibleModule): { label: string; color: string; bg: string; weight: number } {
                  if (mod.status === "complete")  return { label: "Complete",    color: "#16a34a", bg: "#dcfce7", weight: 1.00 };
                  if (mod.status === "approved")  return { label: "Approved",    color: "#7c3aed", bg: "#ede9fe", weight: 0.85 };
                  if (mod.status === "review")    return { label: "Review",      color: "#d97706", bg: "#fef3c7", weight: 0.60 };
                  if (isPopulated(mod.data))      return { label: "In Progress", color: "#2563eb", bg: "#dbeafe", weight: 0.30 };
                  return                                 { label: "Not Started", color: "#9ca3af", bg: "#f3f4f6", weight: 0.00 };
                }

                function statusColor(s: string) {
                  if (s === "complete") return "#22c55e";
                  if (s === "approved") return "#7c3aed";
                  if (s === "review")   return "#f59e0b";
                  return "#9ca3af";
                }

                function renderBibleValue(val: unknown, depth = 0): React.ReactNode {
                  if (val === null || val === undefined || val === "")
                    return <span style={{color:"#9ca3af",fontStyle:"italic",fontSize:12}}>empty</span>;
                  if (typeof val === "string")
                    return <p style={{margin:0,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{val}</p>;
                  if (typeof val === "number" || typeof val === "boolean")
                    return <span style={{fontSize:13,fontFamily:"monospace"}}>{String(val)}</span>;
                  if (Array.isArray(val)) {
                    if (val.length === 0) return <span style={{color:"#9ca3af",fontStyle:"italic",fontSize:12}}>empty</span>;
                    if (val.every(v => typeof v === "string" || typeof v === "number")) return (
                      <ul style={{margin:"4px 0 0",paddingLeft:18,fontSize:13,lineHeight:1.7}}>
                        {val.map((item,i) => <li key={i}>{String(item)}</li>)}
                      </ul>
                    );
                    return (
                      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                        {val.map((item,i) => (
                          <div key={i} style={{background:"rgba(0,0,0,0.04)",borderRadius:6,padding:"8px 10px"}}>
                            {renderBibleValue(item, depth+1)}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (typeof val === "object") {
                    const entries = Object.entries(val as Record<string,unknown>).filter(([,v]) => v !== null && v !== undefined && v !== "");
                    if (entries.length === 0) return <span style={{color:"#9ca3af",fontStyle:"italic",fontSize:12}}>empty</span>;
                    if (depth > 0) return (
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:2}}>
                        {entries.map(([k,v]) => (
                          <span key={k} style={{background:"rgba(0,0,0,0.07)",borderRadius:4,padding:"2px 7px",fontSize:11}}>
                            <strong style={{textTransform:"capitalize"}}>{k.replace(/_/g," ")}:</strong> {typeof v === "string" ? v : JSON.stringify(v)}
                          </span>
                        ))}
                      </div>
                    );
                    return (
                      <div className="kv" style={{marginTop:6}}>
                        {entries.map(([k,v]) => (
                          <div key={k}>
                            <div className="k" style={{textTransform:"none",fontSize:11,letterSpacing:.3}}>{k.replace(/_/g," ")}</div>
                            <div className="v" style={{fontSize:13}}>{renderBibleValue(v, depth+1)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return <span style={{fontSize:13}}>{String(val)}</span>;
                }

                return (
                  <BiblePanel
                    bibleModules={bibleModules}
                    bibleLoading={bibleLoading}
                    bibleOpenModule={bibleOpenModule}
                    setBibleOpenModule={setBibleOpenModule}
                    MODULE_ORDER={MODULE_ORDER}
                    isPopulated={isPopulated}
                    statusColor={statusColor}
                    renderBibleValue={renderBibleValue}
                    slug={slug}
                    artistSlug={c.name || ""}
                    sonic={c.sonic}
                    visual={c.visual}
                    songAudits={c.songAudits}
                    copy={copy}
                    releaseBriefs={releaseBriefs}
                    releaseBriefsLoading={releaseBriefsLoading}
                    releaseBriefOpen={releaseBriefOpen}
                    setReleaseBriefOpen={setReleaseBriefOpen}
                  />
                );
              })()}

            </> )}

            </div>

            {/* Billboard rotator sidebar â 2 slots */}
            <aside className="billboard"
              onMouseEnter={() => { if (bbTimerRef.current) clearInterval(bbTimerRef.current); }}
              onMouseLeave={() => { const slots = isMobile ? 3 : 2; bbTimerRef.current = setInterval(() => setBbSlot(s => (s + 1) % slots), 6000); }}
            >
              <div className="bb-label">Billboard</div>
              <div className="bb-rotator">
                {/* Slide 0: Skyscraper 300x600 */}
                <div className={"bb-slide" + (bbSlot === 0 ? " active" : "")}>
                  {c.skyscraperUrl ? (
                    <a href={c.skyscraperLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link" onClick={() => handleAdClick(c.skyscraperPlacementId, c.skyscraperCampaignId)}>
                      <img src={c.skyscraperUrl} alt="Advertisement" className="bb-ad-img" />
                    </a>
                  ) : (
                    <div className="bb-placeholder bb-tall">
                      <div className="bb-ph-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                      <div className="bb-ph-text">Skyscraper</div>
                      <div className="bb-ph-dim">300 x 600</div>
                    </div>
                  )}
                </div>
                {/* Slide 1: Desktop=both stacked / Mobile=primary ad only */}
                <div className={"bb-slide" + (bbSlot === 1 ? " active" : "")}>
                  {isMobile ? (
                    c.primaryAdUrl ? (
                      <a href={c.primaryAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link" onClick={() => handleAdClick(c.primaryAdPlacementId, c.primaryAdCampaignId)}>
                        <img src={c.primaryAdUrl} alt="Advertisement" className="bb-ad-img-sm" />
                      </a>
                    ) : (
                      <div className="bb-placeholder">
                        <div className="bb-ph-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                        <div className="bb-ph-text">Primary Ad</div>
                        <div className="bb-ph-dim">300 x 250</div>
                      </div>
                    )
                  ) : (
                    <div className="bb-stacked">
                      {c.primaryAdUrl ? (
                        <a href={c.primaryAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link" onClick={() => handleAdClick(c.primaryAdPlacementId, c.primaryAdCampaignId)}>
                          <img src={c.primaryAdUrl} alt="Advertisement" className="bb-ad-img-sm" />
                        </a>
                      ) : (
                        <div className="bb-placeholder">
                          <div className="bb-ph-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                          <div className="bb-ph-text">Primary Ad</div>
                          <div className="bb-ph-dim">300 x 250</div>
                        </div>
                      )}
                      {c.featureAdUrl ? (
                        <a href={c.featureAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link" onClick={() => handleAdClick(c.featureAdPlacementId, c.featureAdCampaignId)}>
                          <img src={c.featureAdUrl} alt="Advertisement" className="bb-ad-img-sm" />
                        </a>
                      ) : (
                        <div className="bb-placeholder">
                          <div className="bb-ph-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                          <div className="bb-ph-text">Feature Ad</div>
                          <div className="bb-ph-dim">300 x 250</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Slide 2: Mobile only â feature ad */}
                {isMobile && (
                  <div className={"bb-slide" + (bbSlot === 2 ? " active" : "")}>
                    {c.featureAdUrl ? (
                      <a href={c.featureAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link" onClick={() => handleAdClick(c.featureAdPlacementId, c.featureAdCampaignId)}>
                        <img src={c.featureAdUrl} alt="Advertisement" className="bb-ad-img-sm" />
                      </a>
                    ) : (
                      <div className="bb-placeholder">
                        <div className="bb-ph-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                        <div className="bb-ph-text">Feature Ad</div>
                        <div className="bb-ph-dim">300 x 250</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="bb-dots">
                {Array.from({ length: isMobile ? 3 : 2 }, (_, i) => (
                  <button key={i} className={"bb-dot" + (bbSlot === i ? " active" : "")} onClick={() => setBbSlot(i)} aria-label={`Ad ${i + 1}`} />
                ))}
              </div>
              <div className="bb-tag">Powered by LESARUSS Advertising</div>
            </aside>

          </div>

      </div>

      {/* Unlock success toast - replaces the old per-track purchase modal +
          Points top-up modal, both retired 2026-07-23 in favor of the single
          one-time $11 per-artist unlock (handleUnlockArtist above). On web,
          handleUnlockArtist redirects straight to Stripe Checkout, so there's
          nothing to confirm in-page; this toast only fires on the native
          RevenueCat purchase path, which resolves without leaving the app. */}
      {unlockSuccess && (
        <div className="pur-toast" role="status" aria-live="polite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span><strong>{name}</strong> unlocked. Enjoy the Full Experience.</span>
        </div>
      )}

    </div>
  );
}





