"use client";
import { useState, useEffect, useRef } from "react";
import type { SyntheticEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import "./ArtistPage.css";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

const AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";
const MEDIA = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/";

const LESAR_PACKS: { id: string; lesars: number; price: number; label: string; popular?: boolean }[] = [
  { id: "pack-starter",  lesars: 500,  price: 5,  label: "Starter" },
  { id: "pack-standard", lesars: 1000, price: 11, label: "Standard", popular: true },
  { id: "pack-power",    lesars: 5000, price: 33, label: "Power" },
];

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
  introVideoUrl?: string;
  videoThumbUrl?: string;
  skyscraperUrl?: string; skyscraperLink?: string;
  primaryAdUrl?: string; primaryAdLink?: string;
  featureAdUrl?: string; featureAdLink?: string;
  members?: { name: string; initial?: string; color?: string; img?: string; role?: string; position?: string; hook?: string; traits?: string[]; quote?: string; detail?: string }[];
};

const TABS: { key: string; label: string; admin?: boolean; needsMembers?: boolean }[] = [
  { key: "music",    label: "Music" },
  { key: "pulse",    label: "Pulse" },
  { key: "members",  label: "Members", needsMembers: true },
  { key: "brief",    label: "Brief", admin: true },
];

const PULSE_CHANNELS: { key: "news" | "social" | "groupchat"; label: string; locked?: boolean }[] = [
  { key: "news",      label: "News" },
  { key: "social",    label: "Social" },
  { key: "groupchat", label: "Group Chat", locked: true },
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


// ── Module-level constants + helpers (hoisted for BiblePanel access) ─────────
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

// ── BiblePanel ─────────────────────────────────────────────────────────────
// Standalone component so it can be extracted to its own file as usage grows.
// Scalable for hundreds of artists: search, status filter, versioning, progress.
function BiblePanel({
  bibleModules, bibleLoading, bibleOpenModule, setBibleOpenModule,
  MODULE_ORDER, isPopulated, statusColor, renderBibleValue,
  slug, sonic, visual, songAudits, copy,
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

  return (
    <section className="panel">
      {/* Header */}
      <div className="adminbar" style={{marginBottom:12}}>
        <span className="t">Artist Bible</span>
        <span className="s">{slug || "unknown"} &nbsp;|&nbsp; super admin only</span>
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
    </section>
  );
}

export default function ArtistPage({ content, cityBg, activeArticle, slug }: { content: ArtistContent; cityBg?: { desktop: string; mobile: string } | null; activeArticle?: News; slug?: string }) {
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      // "news" used to be its own top-level tab; it now lives inside Pulse as a channel.
      if (p === "news") return "pulse";
      if (p) return p;
    }
    return "music";
  });
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [playing, setPlaying] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [playingV, setPlayingV] = useState<string | null>(null);
  const [bbSlot, setBbSlot] = useState(0);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [tabDropOpen, setTabDropOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewAs, setViewAs] = useState<string>("real");
  const [viewDropOpen, setViewDropOpen] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ trackName: string; price: number } | null>(null);
  const [ownedTracks, setOwnedTracks] = useState<Set<string>>(new Set());
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [pulseShown, setPulseShown] = useState(3);
  const [pulseChannel, setPulseChannel] = useState<"news" | "social" | "groupchat">("news");
  const [currTrackIdx, setCurrTrackIdx] = useState(0);
  const [lyricsDrawerOpen, setLyricsDrawerOpen] = useState(false);
  const [lyricsLang, setLyricsLang] = useState<"original" | "en">("en");
  const [bibleModules, setBibleModules] = useState<BibleModule[]>([]);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleOpenModule, setBibleOpenModule] = useState<string | null>(null);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState<"non-member" | null>(null);
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
    : viewAs === "plus" ? "promoter"   // SiteChrome "plus" → TIER_RANK "promoter"
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
          ? sb.from("gfs_track_purchases").select("track_name").eq("user_id", user.id).eq("artist_slug", slug)
          : Promise.resolve({ data: [] as { track_name: string }[] }),
      ]).then(([{ data: member }, { data: pts }, { data: owned }]) => {
        if (member?.tier) setUserTier(member.tier);
        if (pts?.available_points != null) setUserBalance(pts.available_points);
        if (owned) setOwnedTracks(new Set(owned.map((o: { track_name: string }) => o.track_name)));
      });
    });
  }, []);

  // Track mobile breakpoint for billboard slots
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Check if user has voted for this artist today
  useEffect(() => {
    if (!userId || !slug || !SUPA_ANON) return;
    const sb = createClient(SUPA_URL, SUPA_ANON);
    const today = new Date().toISOString().slice(0, 10);
    sb.from("gfs_artist_votes")
      .select("id")
      .eq("artist_slug", slug)
      .eq("user_id", userId)
      .gte("voted_at", today + "T00:00:00Z")
      .maybeSingle()
      .then(({ data }) => { if (data) setHasVotedToday(true); });
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
    const isCJK = /[　-鿿一-龯]/.test(text);
    if (isCJK) {
      const segs = text.split(/([。、！？…])/).filter(Boolean);
      const chunks: string[] = []; let cur = "";
      segs.forEach(s => { cur += s; if (cur.length >= 5 || /[。！？]/.test(s)) { chunks.push(cur.trim()); cur = ""; } });
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
      // Not playing yet — start from this position
      a.src = url;
      a.addEventListener("canplay", () => { a.currentTime = pct * (a.duration || 0); a.play().then(() => { setPlaying(url); setPlayingV("voice"); }).catch(() => {}); }, { once: true });
    } else {
      a.currentTime = pct * (a.duration || 0);
    }
  }
  function onTimeUpdate() {
    const a = audioRef.current;
    if (!a || !playing) return;
    // Tier enforcement: trackLocked already prevents fully-locked tracks from playing.
    // One-tier-up preview tracks are allowed to play but get capped at PREVIEW_CAP_SECONDS.
    if (isPreviewCappedV(playingV) && a.currentTime >= PREVIEW_CAP_SECONDS) {
      a.pause();
      a.currentTime = 0;
      setAudioProgress(prev => ({ ...prev, [playing]: 0 })); // reset visible scrub position, not just the audio element
      setPlaying(null);
      setPlayingV(null);
      return;
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
    const maxTime = a.duration || 0;
    a.currentTime = pct * maxTime;
  }

  // Visibility helpers
  // Tier hierarchy (track v field → who can play):
  //   public  = everyone, no account needed
  //   preview = Passport+  (locked for public/anonymous)
  //   members = Plus+      (locked for public + Passport)
  //   pro     = Pro only   (locked for everyone below Pro)
  // scheduledFor: if in the future → always locked regardless of tier
  const TIER_RANK: Record<string, number> = { passport: 1, promoter: 2, pro: 3 };
  // One-tier-up preview window, in seconds (locked-out-tier tracks stop here — see onTimeUpdate)
  const PREVIEW_CAP_SECONDS = 20;

  function isScheduledFuture(t: Track): boolean {
    if (!t.scheduledFor) return false;
    const rel = new Date(t.scheduledFor.split("T")[0]);
    rel.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return rel > now;
  }

  // Rank a track's required visibility tier: public=0, preview(Passport)=1, members(Plus)=2, pro=3
  function visibilityRank(v?: string | null): number {
    if (v === "preview") return 1;
    if (v === "members") return 2;
    if (v === "pro")     return 3;
    return 0;
  }
  function userTierRank(): number {
    return effectiveTier ? (TIER_RANK[effectiveTier] || 0) : 0;
  }
  // Cascading preview rule: whatever tier you have, you can preview (capped) the tier exactly one above.
  // Passport previews Plus, Plus previews Pro, public previews Passport-tier. Two+ tiers up stays fully locked.
  function isPreviewCappedV(v?: string | null): boolean {
    if (isSuperAdmin && viewAs === "real") return false;
    if (!v || v === "public") return false;
    return visibilityRank(v) - userTierRank() === 1;
  }
  function isPreviewCappedTrack(t: Track): boolean {
    return isPreviewCappedV(t.v);
  }

  function trackLocked(t: Track): boolean {
    // Super admin in real mode: bypass all locks (see + play everything)
    if (isSuperAdmin && viewAs === "real") return false;
    if (t.v === "public") return false;
    // Tier is the only gate now (release-date scheduling no longer locks/hides a track - Sean, 2026-07-06)
    // Unlocked at your own tier or below, or previewable (capped) exactly one tier up
    return visibilityRank(t.v) - userTierRank() > 1;
  }

  function trackBadge(t: Track): { label: string; cls: string } {
    const v = t.v;
    if (v === "public")  return { label: "Free",    cls: "vb-public" };
    if (v === "preview") return { label: "Passport", cls: "vb-passport" };
    if (v === "members") return { label: "Plus",     cls: "vb-members" };
    if (v === "pro")     return { label: "Pro",      cls: "vb-pro" };
    return                     { label: "Locked",   cls: "vb-locked" };
  }

  // Purchase routing: always open the modal — modal handles non-member/low-balance states
  function handleBadgeClick(t: Track) {
    setPurchaseModal({ trackName: t.n, price: 25 });
  }

  async function handlePurchaseConfirm() {
    if (!purchaseModal) return;
    if (!effectiveTier || !userId) {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
      window.location.href = `/passport?return=${encodeURIComponent(returnPath)}`;
      return;
    }
    const cost = purchaseModal.price;
    if (userBalance < cost) {
      setPurchaseError(`You need ${cost} LESARs but only have ${userBalance.toLocaleString()}. Get more on the Passport page.`);
      return;
    }
    setPurchaseError(null);
    const sb = createClient(SUPA_URL, SUPA_ANON!);
    const { data, error } = await sb.rpc("debit_lesars", {
      p_user_id: userId,
      p_artist_slug: slug,
      p_track_name: purchaseModal.trackName,
      p_amount: cost,
    });
    if (error || !data?.ok) {
      setPurchaseError(data?.error === "insufficient_balance"
        ? `Not enough LESARs. You have ${(data?.balance || 0).toLocaleString()}, need ${cost}.`
        : "Purchase failed. Please try again.");
      return;
    }
    setUserBalance(data.balance);
    setOwnedTracks(prev => new Set(prev).add(purchaseModal.trackName));
    setPurchaseSuccess(purchaseModal.trackName);
    setPurchaseModal(null);
    setTimeout(() => setPurchaseSuccess(null), 4000);
  }

  async function handleTopUpCheckout() {
    if (!selectedPack) return;
    if (!userId) {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
      window.location.href = `/passport?return=${encodeURIComponent(returnPath)}`;
      return;
    }
    setTopUpError(null);
    setTopUpLoading(true);
    try {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPack, userId, returnUrl: returnPath }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setTopUpError(error || "Checkout failed. Please try again.");
        setTopUpLoading(false);
      }
    } catch {
      setTopUpError("Checkout failed. Please try again.");
      setTopUpLoading(false);
    }
  }
  function trackPlayLabel(isPlaying: boolean, isPreviewCapped = false): string {
    if (isPlaying) return "Pause";
    return isPreviewCapped ? "Preview" : "Play";
  }
  function trackLockedLabel(t: Track): string {
    if (isScheduledFuture(t)) {
      const d = t.scheduledFor!.split("T")[0];
      const [, m, day] = d.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `Available ${months[+m - 1]} ${+day}`;
    }
    if (t.v === "preview") return "Passport required";
    if (t.v === "members") return "Plus required";
    if (t.v === "pro")     return "Pro required";
    return "Locked";
  }
  // Schedule tab: maps visibility to user-facing tier label + style
  function scheduleTier(v: string): { label: string; cls: string } {
    if (v === "public")  return { label: "Public",   cls: "st-free" };
    if (v === "preview") return { label: "Passport", cls: "st-preview" };
    if (v === "members") return { label: "Plus",     cls: "st-plus" };
    if (v === "pro")     return { label: "Pro",      cls: "st-pro" };
    return                     { label: "Passport",  cls: "st-passport" };
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
    if (playing === url) { a.pause(); setPlaying(null); setPlayingV(null); return; }
    a.src = url;
    a.play()
      .then(() => { setPlaying(url); setPlayingV(v || null); if (trackName) logPlay(trackName); })
      .catch(() => { setPlaying(null); setPlayingV(null); });
  }

  async function logPlay(trackName: string) {
    if (!SUPA_ANON) return;
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON);
      await sb.from("gfs_track_plays").insert({ artist_slug: slug, track_name: trackName, user_id: userId || null });
    } catch { /* silent */ }
  }

  async function submitVote() {
    if (!effectiveTier) { setShowVoteModal("non-member"); return; }
    if (hasVotedToday || voteLoading) return;
    setVoteLoading(true);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON!);
      const { error } = await sb.from("gfs_artist_votes").insert({ artist_slug: slug, user_id: userId, vote_count: 1, lesars_spent: 0 });
      if (!error) { setHasVotedToday(true); setVoteSuccess(true); setTimeout(() => setVoteSuccess(false), 3000); }
    } catch { /* silent */ }
    setVoteLoading(false);
  }

  const crumb = [
    { label: "GeekFon", href: "/" },
    { label: "Roster", href: "/roster" },
    { label: name },
  ];

  // ── Pulse feed ────────────────────────────────────────────────────────────────
  const msg = c.message || {};
  const hasMsg = !!(msg.ja || msg.en);
  const publishedNews = (c.news || []).filter((n: News) => !n.draft);
  const pulseArticles = publishedNews.length > 0 ? publishedNews : PLACEHOLDER_NEWS;

  return (

      <div style={vars}>
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
              {isSuperAdmin && viewAs !== "real" && (
                <span className="va-indicator">
                  Viewing as: <strong>{viewAs === "public" ? "Visitor" : viewAs.charAt(0).toUpperCase() + viewAs.slice(1)}</strong>
                </span>
              )}
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
                {(() => {
                  // Exactly 3 pills, fixed order: Vote, Genre, Season.
                  const rawPills = (c.pills || []).filter(p => p.label !== "Original");
                  const seasonPill = rawPills.find(p => /season/i.test(p.label));
                  const genrePill = rawPills.find(p => p !== seasonPill && !/^original(\s+artist)?$/i.test(p.label));
                  const genreLabel = genrePill?.label || c.sonic?.primaryGenre;
                  const seasonLabel = seasonPill?.label || c.tracks?.[0]?.m || "Season 1";
                  return (
                    <div className="pill-row">
                      <button
                        className={"pill-vote" + (hasVotedToday ? " voted" : "") + (voteLoading ? " loading" : "") + (voteSuccess ? " success" : "")}
                        onClick={submitVote}
                        disabled={voteLoading}
                        aria-label={hasVotedToday ? "Already voted today" : "Vote for this artist"}
                      >
                        {voteSuccess ? "Voted!" : hasVotedToday ? "Voted" : "Vote"}
                      </button>
                      {genreLabel && <span className={"pill" + (genrePill?.accent ? " accent" : "")}>{genreLabel}</span>}
                      <span className="pill">{seasonLabel}</span>
                    </div>
                  );
                })()}
                {showVoteModal === "non-member" && (
                  <div className="vote-modal">
                    <p>You need to be a member in order to vote. Membership is free. Register today.</p>
                    <div className="vote-modal-actions">
                      <a href="/passport" className="vote-modal-cta">Get Passport - Free</a>
                      <button className="vote-modal-dismiss" onClick={() => setShowVoteModal(null)}>Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          {(() => {
            const canSeeBrief = isSuperAdmin || (!!effectiveTier && (TIER_RANK[effectiveTier] || 0) >= 3);
            const visibleTabs = TABS.filter(t => (!t.admin || canSeeBrief) && (!t.needsMembers || (c.members && c.members.length > 0)));
            return (
              <div className="tabbar" role="tablist">
                {visibleTabs.map(t => (
                  <button key={t.key} className="tab" aria-selected={tab === t.key} onClick={() => {
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

          {/* Two-column body: content + billboard */}
          <div className="body-layout">
            <div className="body-main">

              {/* Article detail view — rendered when activeArticle is passed */}
              {activeArticle ? (
                <div className="art-view">
                  <nav className="art-crumb">
                    <a href="/" className="art-crumb-link">GeekFon Society</a>
                    <span className="art-crumb-sep">›</span>
                    <a href={`/${slug || (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "")}`} className="art-crumb-link">{c.name || ""}</a>
                    <span className="art-crumb-sep">›</span>
                    <span className="art-crumb-cur">{activeArticle.title}</span>
                  </nav>
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
              <>{/* Pulse tab - merged News + Social + Group Chat channels */}
              {tab === "pulse" && (
                <section className="pulse-section">
                  <div className="channel-row" role="tablist" aria-label="Pulse channel">
                    {PULSE_CHANNELS.map(ch => (
                      <button
                        key={ch.key}
                        className="channel-btn"
                        aria-selected={pulseChannel === ch.key}
                        disabled={ch.locked}
                        title={ch.locked ? "Ships when Group Chat launches" : undefined}
                        onClick={() => !ch.locked && setPulseChannel(ch.key)}
                      >
                        {ch.label}
                        {ch.locked && <span className="channel-soon">Coming Soon</span>}
                      </button>
                    ))}
                  </div>

                  {pulseChannel === "news" && (
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
                  )}

                  {pulseChannel === "social" && (
                    !c.pulse || c.pulse.length === 0 ? (
                      <div className="pulse-empty"><p>Posts coming soon.</p></div>
                    ) : (
                      <div className="pulse-container">
                        {((c.pulse || []).slice(0, pulseShown)).map((post, i) => {
                          const rawMedia = post.media || post.videoUrl || post.thumb;
                          const mediaUrl = rawMedia ? (rawMedia.startsWith('http') ? rawMedia : MEDIA + rawMedia) : null;
                          const eng = post.engagement || {};
                          const likes = eng.likes ?? post.likes ?? 0;
                          const comments = eng.comments ?? post.comments ?? 0;
                          const shares = eng.shares ?? post.shares ?? 0;
                          const dateStr = post.timestamp
                            ? new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : (post.date || 'Recent');
                          const body = post.text || post.caption;
                          const hideMedia = (e: SyntheticEvent<HTMLElement>) => {
                            const box = e.currentTarget.closest('.pulse-media, .pulse-voice') as HTMLElement | null;
                            if (box) box.style.display = 'none';
                          };
                          return (
                          <div key={post.id || i} className="pulse-card">
                            <div className="pulse-card-header">
                              <div className="pulse-card-meta">
                                {c.heroUrl ? <img src={c.heroUrl} alt={name} className="pulse-avatar" /> : <div className="pulse-avatar-init">{name.charAt(0)}</div>}
                                <div><h4>{name}</h4><p className="pulse-date">{dateStr}</p></div>
                              </div>
                              {post.type && <span className="pulse-badge">{post.type}{post.memberOnly ? ' · members' : ''}</span>}
                            </div>
                            <div className="pulse-card-body">
                              {body && <p className="pulse-text">{body}</p>}
                              {mediaUrl && post.type === 'video' && (
                                <div className="pulse-media pulse-media-video"><video src={mediaUrl} poster={post.thumb || undefined} controls playsInline preload="metadata" onError={hideMedia} /></div>
                              )}
                              {mediaUrl && post.type === 'photo' && (
                                <div className="pulse-media"><img src={mediaUrl} alt="" onError={hideMedia} /></div>
                              )}
                              {mediaUrl && post.type === 'voice' && (
                                <div className="pulse-voice"><audio src={mediaUrl} controls preload="metadata" onError={hideMedia} />{post.duration && <span className="pulse-voice-dur">{post.duration}</span>}</div>
                              )}
                            </div>
                            <div className="pulse-stats">
                              <span className="pulse-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>{likes.toLocaleString()}</span>
                              <span className="pulse-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>{comments.toLocaleString()}</span>
                              <span className="pulse-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>{shares.toLocaleString()}</span>
                            </div>
                          </div>
                          );
                        })}
                        {c.pulse && c.pulse.length > pulseShown && (
                          <div className="pulse-load-container">
                            <button className="pulse-load-btn" onClick={() => setPulseShown(n => n + 3)}>Load more</button>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {pulseChannel === "groupchat" && (
                    <div className="locked-panel">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                      <div className="lp-title">Group Chat is coming soon</div>
                      <p className="lp-sub">Live chat with {name} and other members lands here once Group Chat ships across GeekFon Society.</p>
                    </div>
                  )}
                </section>
              )}

              {tab === "members" && (
                <section className="members-section">
                  <div className="bsec">The Band</div>
                  <div className="member-grid">
                    {(c.members || []).map((m, i) => (
                      <button
                        type="button"
                        key={m.name || i}
                        className="member-card"
                        onClick={() => setSelectedMember(i)}
                      >
                        {m.img ? (
                          <img src={m.img.startsWith('http') ? m.img : MEDIA + m.img} alt={m.name} className="member-thumb-img" />
                        ) : (
                          <div className="member-thumb" style={{ background: m.color || c.accent || "var(--rx)" }}>{m.initial || m.name?.charAt(0)}</div>
                        )}
                        <div className="member-info">
                          <p className="member-name">{m.name}</p>
                          {m.role && <p className="member-role">{m.role}</p>}
                          {m.hook && <p className="member-hook">{m.hook}</p>}
                          <p className="member-tapcue">Tap to flip &rarr;</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {tab === "music" && (() => {
                const tracks = c.tracks || [];
                const safeIdx = Math.min(currTrackIdx, tracks.length - 1);
                const npTrack = tracks[safeIdx];
                const npUrl = npTrack?.url ? AUDIO + npTrack.url : null;
                const npLocked = npTrack ? trackLocked(npTrack) : true;
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
                    <div className="mp-bar" onClick={(e) => npUrl && seekTo(e, npUrl)}>
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

                const npOwned = !!npTrack && ownedTracks.has(npTrack.n);
                const npPlayLabel = npTrack ? trackPlayLabel(npPlaying, npPreviewCapped) : "Play";

                return (
                  <section className="mp-root">
                    {/* Now-playing card - single unified layout, mobile + desktop */}
                    <div className="mp-player">
                      <div className="mp-np">
                        <button
                          className="mp-orb"
                          aria-label={npPlaying ? "Pause" : "Play"}
                          disabled={npLocked || !npUrl}
                          onClick={() => { if (npUrl) togglePlay(npUrl, npTrack?.v, npTrack?.n); }}
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
                            disabled={!npUrl || npLocked}
                            title={!npUrl ? "Audio coming soon" : undefined}
                            onClick={() => { if (npUrl) togglePlay(npUrl, npTrack?.v, npTrack?.n); }}
                            aria-label={npPlayLabel}
                          >
                            {!npUrl ? "Soon" : npPlayLabel}
                          </button>
                          {npTrack && !npLocked && (
                            npOwned ? (
                              <span className="mp-btn-owned" aria-label={`${npTrack.n} owned`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}><polyline points="20 6 9 17 4 12"/></svg>
                                Owned
                              </span>
                            ) : (
                              <button
                                className="mp-btn-buy"
                                onClick={() => setPurchaseModal({ trackName: npTrack.n, price: 25 })}
                                aria-label={`Buy ${npTrack.n}`}
                              >
                                Buy
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {lyricsAccordion}
                    </div>

                    {/* Catalog */}
                    <div className="mp-catalog-head">
                      <h2 className="mp-catalog-title">{name} - Full Catalog</h2>
                    </div>
                    <p className="mp-catalog-note">Each track is <strong>25 LESARs.</strong> Clicking Buy deducts from your LESARUSS balance instantly - no checkout required.</p>

                    <div className="mp-rows">
                      {tracks.map((t, i) => {
                        const url = t.url ? AUDIO + t.url : null;
                        const locked = trackLocked(t);
                        // Two-or-more tiers above the viewer: fully hidden, not shown as a locked row
                        if (locked) return null;
                        const isCurr = i === safeIdx;
                        return (
                          <div
                            key={i}
                            className={"mp-row" + (isCurr ? " current" : "") + (locked ? " locked" : "")}
                            onClick={() => { if (!locked) { setCurrTrackIdx(i); if (url) togglePlay(url, t.v, t.n); } }}
                          >
                            <div className="mp-row-art">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            </div>
                            <div className="mp-row-meta">
                              <div className="mp-row-title">{t.n}</div>
                              <div className="mp-row-sub">{name}{t.m ? ` - ${t.m}` : ""}</div>
                            </div>
                            <div className="mp-row-state">
                              {locked ? (
                                <>
                                  <span className="mp-badge-lk">{isScheduledFuture(t) ? "SOON" : "LOCKED"}</span>
                                  <span className="mp-row-date">{trackLockedLabel(t)}</span>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={"mp-btn-pre" + (!url ? " disabled" : "")}
                                    disabled={!url}
                                    title={!url ? "Audio coming soon" : undefined}
                                    onClick={(e) => { e.stopPropagation(); if (url) { setCurrTrackIdx(i); togglePlay(url, t.v, t.n); } }}
                                    aria-label={trackPlayLabel(playing === url, isPreviewCappedTrack(t))}
                                  >
                                    {!url ? "Soon" : trackPlayLabel(playing === url, isPreviewCappedTrack(t))}
                                  </button>
                                  {ownedTracks.has(t.n) ? (
                                    <span className="mp-btn-owned" aria-label={`${t.n} owned`}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}><polyline points="20 6 9 17 4 12"/></svg>
                                      Owned
                                    </span>
                                  ) : (
                                    <button
                                      className="mp-btn-buy"
                                      onClick={(e) => { e.stopPropagation(); setPurchaseModal({ trackName: t.n, price: 25 }); }}
                                      aria-label={`Buy ${t.n}`}
                                    >
                                      Buy
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                  const tier = scheduleTier(t.v);
                  const releaseDate = t.scheduledFor ? new Date(t.scheduledFor) : null;
                  const isReleased = releaseDate ? releaseDate <= today : false;
                  const userCanAccess = t.v === "public"
                    || (t.v === "preview" && !!effectiveTier)
                    || (t.v === "members" && !!effectiveTier && (TIER_RANK[effectiveTier] || 0) >= 2)
                    || (t.v === "pro"     && !!effectiveTier && (TIER_RANK[effectiveTier] || 0) >= 3);
                  const isAvailable = isReleased && userCanAccess;
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
                        aria-label={`${tier.label} - click to purchase ${t.n}`}
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
                    <p className="sch-footnote">Release windows update as the season progresses. Upgrade your membership to unlock early access.</p>
                  </section>
                );
              })()}

              {tab === "brief" && (() => {
                // ── Artist Bible Admin UI ──────────────────────────────────────────────
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
                  />
                );
              })()}

            </> )}

            </div>

            {/* Billboard rotator sidebar — 2 slots */}
            <aside className="billboard"
              onMouseEnter={() => { if (bbTimerRef.current) clearInterval(bbTimerRef.current); }}
              onMouseLeave={() => { const slots = isMobile ? 3 : 2; bbTimerRef.current = setInterval(() => setBbSlot(s => (s + 1) % slots), 6000); }}
            >
              <div className="bb-label">Billboard</div>
              <div className="bb-rotator">
                {/* Slide 0: Skyscraper 300x600 */}
                <div className={"bb-slide" + (bbSlot === 0 ? " active" : "")}>
                  {c.skyscraperUrl ? (
                    <a href={c.skyscraperLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link">
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
                      <a href={c.primaryAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link">
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
                        <a href={c.primaryAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link">
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
                        <a href={c.featureAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link">
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
                {/* Slide 2: Mobile only — feature ad */}
                {isMobile && (
                  <div className={"bb-slide" + (bbSlot === 2 ? " active" : "")}>
                    {c.featureAdUrl ? (
                      <a href={c.featureAdLink || '#'} target="_blank" rel="noopener noreferrer" className="bb-ad-link">
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

      {/* Purchase confirmation modal */}
      {purchaseModal && (
        <div className="pur-overlay" role="dialog" aria-modal="true" aria-labelledby="pur-title" onClick={() => setPurchaseModal(null)}>
          <div className="pur-modal" onClick={e => e.stopPropagation()}>
            <button className="pur-close" onClick={() => setPurchaseModal(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="pur-song-label">Purchase</div>
            <h2 id="pur-title" className="pur-song-name">{purchaseModal.trackName}</h2>
            <div className="pur-price-row">
              <span className="pur-price">{purchaseModal.price}</span>
              <span className="pur-currency">LESARs</span>
            </div>
            {!userId ? (
              /* Non-member state — stay in modal, no redirect */
              <>
                <p className="pur-desc">Create a free Passport account to purchase tracks and support the artists you love.</p>
                <div className="pur-actions">
                  <a href="/passport" className="pur-confirm">Register — It&apos;s Free</a>
                  <button className="pur-cancel" onClick={() => { setPurchaseModal(null); setPurchaseError(null); }}>Not now</button>
                </div>
                <p className="pur-guest-note">Already a member? <a href="/passport" className="pur-guest-link">Sign in</a></p>
              </>
            ) : (
              /* Member state */
              <>
                <div className="pur-balance-row">
                  <span className="pur-balance-label">Your balance:</span>
                  <span className={"pur-balance-val" + (userBalance < purchaseModal.price ? " pur-balance-low" : "")}>{userBalance.toLocaleString()} LESARs</span>
                </div>
                {userBalance < purchaseModal.price && (
                  <div className="pur-topup-block">
                    <p className="pur-low-msg">You need <strong>{(purchaseModal.price - userBalance).toLocaleString()}</strong> more LESARs to unlock this track.</p>
                    <button
                      type="button"
                      className="pur-topup-btn"
                      onClick={() => { setPurchaseModal(null); setPurchaseError(null); setSelectedPack(null); setTopUpError(null); setTopUpOpen(true); }}
                    >
                      Top Up LESARs
                    </button>
                  </div>
                )}
                <p className="pur-desc">You&apos;ll receive lifetime access to this track. Purchase is tied to your account.</p>
                {purchaseError && <p className="pur-error">{purchaseError}</p>}
                <div className="pur-actions">
                  {userBalance < purchaseModal.price ? (
                    <button className="pur-confirm pur-disabled" disabled>Insufficient Balance</button>
                  ) : (
                    <button className="pur-confirm" onClick={handlePurchaseConfirm}>Confirm Purchase</button>
                  )}
                  <button className="pur-cancel" onClick={() => { setPurchaseModal(null); setPurchaseError(null); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LESAR top-up modal: Buy a pack, then Continue to Payment. This is the
          single path used everywhere a member needs more LESARs, including the
          insufficient-balance case above. Nothing is pre-selected. */}
      {topUpOpen && (
        <div className="pur-overlay" role="dialog" aria-modal="true" aria-labelledby="tu-title" onClick={() => { if (!topUpLoading) setTopUpOpen(false); }}>
          <div className="pur-modal" onClick={e => e.stopPropagation()}>
            <button className="pur-close" onClick={() => setTopUpOpen(false)} aria-label="Close" disabled={topUpLoading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="pur-song-label">Top Up</div>
            <h2 id="tu-title" className="pur-song-name">Choose a LESARs Pack</h2>
            <p className="pur-desc" style={{ marginBottom: 16 }}>Pick a pack, then continue to payment. LESARs land in your balance the moment checkout completes.</p>
            <div className="tu-pack-list">
              {LESAR_PACKS.map(p => (
                <button
                  type="button"
                  key={p.id}
                  className={"tu-pack-row" + (selectedPack === p.id ? " tu-selected" : "")}
                  onClick={() => setSelectedPack(p.id)}
                  aria-pressed={selectedPack === p.id}
                >
                  {p.popular && <span className="tu-pack-badge">Popular</span>}
                  <div>
                    <div className="tu-pack-lesars">{p.lesars.toLocaleString()} LESARs</div>
                    <div className="tu-pack-note">{p.label}</div>
                  </div>
                  <div className="tu-pack-price">${p.price}</div>
                </button>
              ))}
            </div>
            {topUpError && <p className="pur-error">{topUpError}</p>}
            <div className="pur-actions">
              <button
                className={"pur-confirm" + (!selectedPack || topUpLoading ? " pur-disabled" : "")}
                disabled={!selectedPack || topUpLoading}
                onClick={handleTopUpCheckout}
              >
                {topUpLoading ? "Redirecting..." : "Continue to Payment"}
              </button>
              <button className="pur-cancel" onClick={() => setTopUpOpen(false)} disabled={topUpLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase success toast */}
      {purchaseSuccess && (
        <div className="pur-toast" role="status" aria-live="polite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span><strong>{purchaseSuccess}</strong> purchased successfully.</span>
        </div>
      )}

      {/* Member card-back lightbox */}
      {selectedMember !== null && c.members?.[selectedMember] && (() => {
        const m = c.members[selectedMember];
        const color = m.color || c.accent || "var(--rx)";
        return (
          <div className="card-overlay" role="dialog" aria-modal="true" aria-labelledby="cardName" onClick={() => setSelectedMember(null)}>
            <div className="card-modal" onClick={e => e.stopPropagation()}>
              <button className="card-close" onClick={() => setSelectedMember(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <div className="card-back-band" style={{ background: color }}>
                <span className="cb-name" id="cardName">{m.name}</span>
              </div>
              <div className="card-back-body">
                {m.role && <div className="cb-role">{m.role}</div>}
                {m.position && <div className="cb-position">{m.position}</div>}
                {m.traits && m.traits.length > 0 && (
                  <div className="cb-traits">
                    {m.traits.map(t => <span key={t} className="cb-trait">{t}</span>)}
                  </div>
                )}
                {m.quote && <p className="cb-quote">&quot;{m.quote}&quot;</p>}
                {m.detail && <p className="cb-detail">{m.detail}</p>}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}




