"use client";
import { useState, useEffect, useRef } from "react";
import type { SyntheticEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

const AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";
const MEDIA = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/";

type Track = { n: string; m: string; v: string; url?: string; scheduledFor?: string; hasRemix?: boolean; isRemix?: boolean; isFinale?: boolean; isPremiere?: boolean };
type Stat = { v: string; l: string };
type Pill = { label: string; accent?: boolean };
type Rel = { name: string; desc: string };
type News = { slug?: string; tag?: string; date?: string; title?: string; blurb?: string; href?: string; thumb?: string; content?: string; draft?: boolean };
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
};

const TABS: { key: string; label: string; admin?: boolean }[] = [
  { key: "news",     label: "Overview" },
  { key: "music",    label: "Music" },
  { key: "pulse",    label: "Pulse" },
  { key: "brief",    label: "Brief", admin: true },
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
  const [tab, setTab] = useState("news");
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
  const [isMobile, setIsMobile] = useState(false);
  const [tabDropOpen, setTabDropOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewAs, setViewAs] = useState<"real" | "visitor" | "passport" | "plus" | "pro">("real");
  const [viewDropOpen, setViewDropOpen] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ trackName: string; price: number } | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [pulseShown, setPulseShown] = useState(3);
  const [currTrackIdx, setCurrTrackIdx] = useState(0);
  const [musicShuffle, setMusicShuffle] = useState(false);
  const [musicRepeat, setMusicRepeat] = useState(false);
  const [lyricsDrawerOpen, setLyricsDrawerOpen] = useState(false);
  const [bibleModules, setBibleModules] = useState<BibleModule[]>([]);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleOpenModule, setBibleOpenModule] = useState<string | null>(null);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState<"non-member" | "lesar" | null>(null);
  const [lesarVoteCount, setLesarVoteCount] = useState(1);
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

  // Super admin view-as override: maps the selected preview tier to an actual tier value
  const effectiveTier: string | null = isSuperAdmin && viewAs !== "real"
    ? viewAs === "visitor" ? null
    : viewAs === "passport" ? "passport"
    : viewAs === "plus" ? "promoter"
    : "pro"
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
      ]).then(([{ data: member }, { data: pts }]) => {
        if (member?.tier) setUserTier(member.tier);
        if (pts?.available_points != null) setUserBalance(pts.available_points);
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
    // Enforce 20s clip only for non-members; passport+ gets the full track
    if (playingV === "preview" && !userTier && a.currentTime >= 20) {
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
    if (v === "passport") return !effectiveTier;
    if (v === "members")  return !effectiveTier || (TIER_RANK[effectiveTier] || 0) < 2;
    return true; // locked / admin
  }
  function trackBadge(v: string): { label: string; cls: string } {
    if (v === "public")   return { label: "Public",   cls: "vb-public" };
    if (v === "preview")  return { label: "Passport", cls: "vb-preview" };
    if (v === "passport") return { label: "Passport", cls: "vb-passport" };
    if (v === "members")  return { label: "Plus",     cls: "vb-members" };
    return                       { label: "Locked",   cls: "vb-locked" };
  }

  // Purchase routing: what happens when a user clicks a song badge
  function handleBadgeClick(t: Track) {
    const returnPath = typeof window !== "undefined" ? window.location.pathname : "";
    const rank = effectiveTier ? (TIER_RANK[effectiveTier] || 0) : 0;

    if (t.v === "public") {
      // Public songs: anyone with an account can purchase; visitors go to Passport
      if (!effectiveTier) { window.location.href = `/passport?return=${encodeURIComponent(returnPath)}`; return; }
      setPurchaseModal({ trackName: t.n, price: 25 });
      return;
    }
    if (t.v === "preview" || t.v === "passport") {
      // Passport-tier songs: Passport+ can purchase; others go to Passport page
      if (!effectiveTier) { window.location.href = `/passport?return=${encodeURIComponent(returnPath)}`; return; }
      setPurchaseModal({ trackName: t.n, price: 25 });
      return;
    }
    if (t.v === "members") {
      // Plus-tier songs: promoter/pro can purchase; Passport tier goes to Plus waitlist; visitors go to Passport
      if (!effectiveTier) { window.location.href = `/passport?return=${encodeURIComponent(returnPath)}`; return; }
      if (rank < 2) { window.location.href = `/plus?return=${encodeURIComponent(returnPath)}`; return; }
      setPurchaseModal({ trackName: t.n, price: 25 });
      return;
    }
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
      p_amount: cost,
      p_track_name: purchaseModal.trackName,
    });
    if (error || !data?.ok) {
      setPurchaseError(data?.error === "insufficient_balance"
        ? `Not enough LESARs. You have ${(data?.balance || 0).toLocaleString()}, need ${cost}.`
        : "Purchase failed. Please try again.");
      return;
    }
    setUserBalance(data.balance);
    setPurchaseSuccess(purchaseModal.trackName);
    setPurchaseModal(null);
    setTimeout(() => setPurchaseSuccess(null), 4000);
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
  // Schedule tab: maps visibility to user-facing tier label + style
  function scheduleTier(v: string): { label: string; cls: string } {
    if (v === "public")   return { label: "Public",   cls: "st-free" };
    if (v === "preview")  return { label: "Passport", cls: "st-preview" };
    if (v === "passport" || v === "locked") return { label: "Passport", cls: "st-passport" };
    if (v === "members")  return { label: "Plus",     cls: "st-plus" };
    return                       { label: "Pro",      cls: "st-pro" };
  }
  // Which tracks are visible in the schedule for the current user
  function scheduleVisible(v: string): boolean {
    if (v === "public" || v === "preview") return true;
    if (v === "passport") return !!effectiveTier;
    if (v === "members") return !!effectiveTier && (TIER_RANK[effectiveTier] || 0) >= 2;
    return false;
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

  async function submitLesarVote() {
    const count = lesarVoteCount;
    if (!effectiveTier || !userId || count < 1) return;
    if (userBalance < count) return;
    setVoteLoading(true);
    try {
      const sb = createClient(SUPA_URL, SUPA_ANON!);
      const { error } = await sb.from("gfs_artist_votes").insert({ artist_slug: slug, user_id: userId, vote_count: count, lesars_spent: count });
      if (!error) {
        setUserBalance(b => b - count);
        setVoteSuccess(true);
        setShowVoteModal(null);
        setTimeout(() => setVoteSuccess(false), 3000);
      }
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
              {isSuperAdmin && (
                <div className="va-wrap">
                  <button className="va-btn" onClick={() => setViewDropOpen(o => !o)}>
                    <span className="va-dot" />
                    <span>{viewAs === "real" ? "My View" : viewAs === "visitor" ? "Visitor" : viewAs === "passport" ? "Passport" : viewAs === "plus" ? "Plus" : "Pro"}</span>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} style={{transform: viewDropOpen ? "rotate(180deg)" : "none", transition:"transform .15s"}}><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {viewDropOpen && (
                    <div className="va-menu">
                      {(["real","visitor","passport","plus","pro"] as const).map(v => (
                        <button key={v} className={"va-item" + (viewAs === v ? " active" : "")}
                          onClick={() => { setViewAs(v); setViewDropOpen(false); }}>
                          {v === "real" ? "My View" : v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                <div className="pill-row">
                  {c.pills && c.pills[0] && <span className={"pill" + (c.pills[0].accent ? " accent" : "")}>{c.pills[0].label}</span>}
                  <button
                    className={"pill-vote" + (hasVotedToday ? " voted" : "") + (voteLoading ? " loading" : "") + (voteSuccess ? " success" : "")}
                    onClick={submitVote}
                    disabled={voteLoading}
                    aria-label={hasVotedToday ? "Already voted today" : "Vote for this artist"}
                  >
                    {voteSuccess ? "Voted!" : hasVotedToday ? "Voted" : "Vote"}
                  </button>
                  {(c.pills || []).slice(1).map((p, i) => (<span key={i} className={"pill" + (p.accent ? " accent" : "")}>{p.label}</span>))}
                </div>
                {userBalance > 0 && !showVoteModal && (
                  <button className="pill-lesar-vote" onClick={() => setShowVoteModal("lesar")}>
                    Use LESARs for extra votes
                  </button>
                )}
                {showVoteModal === "non-member" && (
                  <div className="vote-modal">
                    <p>You need to be a member in order to vote. Membership is free. Register today.</p>
                    <div className="vote-modal-actions">
                      <a href="/passport" className="vote-modal-cta">Get Passport - Free</a>
                      <button className="vote-modal-dismiss" onClick={() => setShowVoteModal(null)}>Dismiss</button>
                    </div>
                  </div>
                )}
                {showVoteModal === "lesar" && (
                  <div className="vote-modal">
                    <p className="vote-modal-title">Extra Votes with LESARs</p>
                    <p className="vote-modal-sub">1 LESAR = 1 vote. You have <strong>{userBalance.toLocaleString()}</strong> LESARs.</p>
                    <div className="vote-modal-input">
                      <button className="vote-count-btn" onClick={() => setLesarVoteCount(v => Math.max(1, v - 1))}>-</button>
                      <span className="vote-count-val">{lesarVoteCount}</span>
                      <button className="vote-count-btn" onClick={() => setLesarVoteCount(v => Math.min(userBalance, v + 1))}>+</button>
                      <span className="vote-count-cost">{lesarVoteCount} LESAR{lesarVoteCount > 1 ? "s" : ""}</span>
                    </div>
                    <div className="vote-modal-actions">
                      <button className="vote-modal-cta" onClick={submitLesarVote} disabled={voteLoading || userBalance < lesarVoteCount}>
                        {voteLoading ? "Voting..." : `Submit ${lesarVoteCount} Vote${lesarVoteCount > 1 ? "s" : ""}`}
                      </button>
                      <button className="vote-modal-dismiss" onClick={() => setShowVoteModal(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          {(() => {
            const canSeeBrief = isSuperAdmin || (!!effectiveTier && (TIER_RANK[effectiveTier] || 0) >= 3);
            const visibleTabs = TABS.filter(t => !t.admin || canSeeBrief);
            return (
              <div className="tabbar" role="tablist">
                {visibleTabs.map(t => (
                  <button key={t.key} className="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
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
                    <a href={`/${typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""}`} className="art-crumb-link">{c.name || ""}</a>
                    <span className="art-crumb-sep">›</span>
                    <span className="art-crumb-cur">{activeArticle.title}</span>
                  </nav>
                  {activeArticle.thumb && (
                    <div className="art-hero"><img src={activeArticle.thumb} alt={activeArticle.title || ""} /></div>
                  )}
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
                  <a href={typeof window !== "undefined" ? "/" + window.location.pathname.split("/")[1] : "/"} className="art-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
                    Back to {c.name || "Artist"}
                  </a>
                </div>
              ) : (
              <>{/* Pulse tab - social feed */}
              {tab === "pulse" && (
                <section className="pulse-section">
                  {!c.pulse || c.pulse.length === 0 ? (
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
                  )}
                </section>
              )}
{tab === "news" && (
                <section className="panel">

                  {/* Intro: video (left) + bio blurb (right) */}
                  <div className="ov-intro">
                    <div className="ov-video-wrap">
                      {c.introVideoUrl ? (
                        <video src={c.introVideoUrl} controls playsInline preload="metadata" poster={c.videoThumbUrl || c.heroUrl || undefined} className="ov-video-el" />
                      ) : (
                        <div className="ov-video-ph">
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="15" height="10" rx="2"/><path d="M17 9l5-3v12l-5-3"/></svg>
                          <span>Video coming soon</span>
                        </div>
                      )}
                    </div>
                    <div className="ov-bio">
                      {(c.bio || []).slice(0, 2).map((p, i) => (
                        <p key={i} className="ov-bio-p" dangerouslySetInnerHTML={{ __html: emph(p) }} />
                      ))}
                    </div>
                  </div>

                  {/* Pull quote - between intro and news */}
                  {c.quote && (
                    <div className="ov-pull-quote">
                      <span className="ov-pull-mark open">{"\u201c"}</span>
                      <p className="ov-pull-text">{c.quote}</p>
                      <span className="ov-pull-mark close">{"\u201d"}</span>
                    </div>
                  )}

                  {/* News & Updates section */}
                  <div className="ov-news-head">News &amp; Updates</div>
                  <div className="pulse-articles-grid">
                    {pulseArticles.map((n, i) => (
                      <div key={i} className="pulse-article-card">
                        <a href={n.href || "#"} className="pf-article-img">
                          {n.thumb
                            ? <img src={n.thumb} alt={n.title || ""} />
                            : <div className="pf-article-ph" style={{ background: `hsl(${(i * 47 + 200) % 360}, 60%, 92%)` }} />
                          }
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

              {tab === "music" && (() => {
                const tracks = c.tracks || [];
                const safeIdx = Math.min(currTrackIdx, tracks.length - 1);
                const npTrack = tracks[safeIdx];
                const npUrl = npTrack?.url ? AUDIO + npTrack.url : null;
                const npLocked = npTrack ? trackLocked(npTrack.v) : true;
                const npPlaying = !!npUrl && playing === npUrl;
                const npProgress = npUrl ? (audioProgress[npUrl] || 0) : 0;
                const npDuration = npUrl ? (audioDuration[npUrl] || 0) : 0;
                const npMax = npTrack?.v === "preview" ? 20 : npDuration;
                const npPct = npMax > 0 ? Math.min(100, (npProgress / npMax) * 100) : 0;
                const npBadge = npTrack ? trackBadge(npTrack.v) : { label: "", cls: "" };

                function selectTrack(i: number) {
                  setCurrTrackIdx(i);
                  if (playing) { const a = audioRef.current; if (a) { a.pause(); setPlaying(null); setPlayingV(null); } }
                }
                function playPrev() {
                  let i = safeIdx - 1;
                  while (i >= 0 && trackLocked(tracks[i].v)) i--;
                  if (i >= 0) selectTrack(i);
                }
                function playNext() {
                  let i = safeIdx + 1;
                  while (i < tracks.length && trackLocked(tracks[i].v)) i++;
                  if (i < tracks.length) selectTrack(i);
                }

                return (
                  <section className="mp-root">
                    {/* Now-playing card */}
                    <div className="mp-player">
                      <div className="mp-np">
                        <div className="mp-cover">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        </div>
                        <div className="mp-npmeta">
                          <div className="mp-nptitle">{npTrack?.n || "Select a track"}</div>
                          <div className="mp-npartist">{name}</div>
                          <span className={"mp-nptag " + npBadge.cls}>{npBadge.label}</span>
                        </div>
                        <div className="mp-transport">
                          <button className={"mp-ic" + (musicShuffle ? " on" : "")} aria-label="Shuffle" onClick={() => setMusicShuffle(s => !s)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                          </button>
                          <button className="mp-ic" aria-label="Previous" onClick={playPrev}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
                          </button>
                          <button
                            className="mp-orb"
                            aria-label={npPlaying ? "Pause" : "Play"}
                            disabled={npLocked || !npUrl}
                            onClick={() => { if (npUrl) togglePlay(npUrl, npTrack?.v); }}
                          >
                            {npPlaying ? PAUSE : PLAY}
                          </button>
                          <button className="mp-ic" aria-label="Next" onClick={playNext}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                          </button>
                          <button className={"mp-ic" + (musicRepeat ? " on" : "")} aria-label="Repeat" onClick={() => setMusicRepeat(r => !r)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                          </button>
                        </div>
                      </div>

                      {/* Scrub bar */}
                      <div className="mp-scrub">
                        <span className="mp-time">{fmtTime(npProgress)}</span>
                        <div className="mp-bar" onClick={(e) => npUrl && seekTo(e, npUrl)}>
                          <div className="mp-bar-fill" style={{ width: `${npPct}%` }} />
                          <div className="mp-bar-knob" style={{ left: `${npPct}%` }} />
                        </div>
                        <span className="mp-time">{npMax > 0 ? fmtTime(npMax) : "--:--"}</span>
                      </div>

                      {/* Bottom bar */}
                      <div className="mp-barrow">
                        <div className="mp-vol">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                          <div className="mp-voltrack"><div className="mp-volfill" style={{ width: "70%" }} /></div>
                        </div>
                        <div className="mp-chips">
                          <button className={"mp-chip" + (lyricsDrawerOpen ? " active" : "")} onClick={() => setLyricsDrawerOpen(o => !o)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            Lyrics
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lyrics drawer (inline, below player) */}
                    {lyricsDrawerOpen && npTrack && (
                      <div className="mp-lyrics-inline">
                        <div className="mp-lyrics-head">
                          <span className="mp-lyrics-label">Lyrics</span>
                          <span className="mp-lyrics-track">{npTrack.n}</span>
                          <button className="mp-lyrics-close" onClick={() => setLyricsDrawerOpen(false)}>&#x2715;</button>
                        </div>
                        <div className="mp-lyrics-body">
                          <p style={{ color: "var(--lr-text-50)", fontSize: 13 }}>Lyrics sync coming soon.</p>
                        </div>
                      </div>
                    )}

                    {/* Catalog */}
                    <div className="mp-catalog-head">
                      <h2 className="mp-catalog-title">{name} - Full Catalog</h2>
                    </div>
                    <p className="mp-catalog-note">Each track is <strong>25 LESARs.</strong> Clicking Buy deducts from your LESARUSS balance instantly - no checkout required.</p>

                    <div className="mp-rows">
                      {tracks.map((t, i) => {
                        const url = t.url ? AUDIO + t.url : null;
                        const locked = trackLocked(t.v);
                        const isCurr = i === safeIdx;
                        const badge = trackBadge(t.v);
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
                                  <span className="mp-badge-lk">LOCKED</span>
                                  <span className="mp-row-date">{t.scheduledFor || "Coming soon"}</span>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={"mp-btn-pre" + (!url ? " disabled" : "")}
                                    disabled={!url}
                                    title={!url ? "Audio coming soon" : undefined}
                                    onClick={(e) => { e.stopPropagation(); if (url) { setCurrTrackIdx(i); togglePlay(url, t.v, t.n); } }}
                                    aria-label={`Preview ${t.n}`}
                                  >
                                    {url ? "Preview" : "Soon"}
                                  </button>
                                  <button
                                    className="mp-btn-buy"
                                    onClick={(e) => { e.stopPropagation(); setPurchaseModal({ trackName: t.n, price: 25 }); }}
                                    aria-label={`Buy ${t.n}`}
                                  >
                                    Buy
                                  </button>
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
                  const isAvailable = t.v === "public" || (t.v === "preview" && !!t.url && isReleased);
                  const releasedLabel = t.scheduledFor ? `Released ${t.scheduledFor}` : "Available now";
                  const statusLabel = isAvailable ? releasedLabel : (t.scheduledFor || "Coming soon");
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
            <div className="pur-balance-row">
              <span className="pur-balance-label">Your balance:</span>
              <span className={"pur-balance-val" + (userBalance < purchaseModal.price ? " pur-balance-low" : "")}>{userBalance.toLocaleString()} LESARs</span>
            </div>
            {userBalance < purchaseModal.price && (
              <p className="pur-low-msg">You need {(purchaseModal.price - userBalance).toLocaleString()} more LESARs to unlock this track.</p>
            )}
            <p className="pur-desc">You&apos;ll receive lifetime access to this track. Purchase is tied to your account.</p>
            {purchaseError && <p className="pur-error">{purchaseError}</p>}
            <div className="pur-actions">
              {userBalance < purchaseModal.price ? (
                <a href="/passport" className="pur-confirm pur-reload">Reload LESARs</a>
              ) : (
                <button className="pur-confirm" onClick={handlePurchaseConfirm}>Continue</button>
              )}
              <button className="pur-cancel" onClick={() => { setPurchaseModal(null); setPurchaseError(null); }}>Cancel</button>
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

    </div>
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
/* Super admin view-as pill */
.va-wrap{margin-left:auto;position:relative}
.va-btn{display:flex;align-items:center;gap:7px;font-family:inherit;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7);background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);border-radius:100px;padding:5px 12px 5px 10px;cursor:pointer;white-space:nowrap}
.va-btn:hover{background:rgba(255,255,255,.14)}
.va-dot{width:7px;height:7px;border-radius:50%;background:var(--rx);flex-shrink:0}
.va-menu{position:absolute;top:calc(100% + 6px);right:0;background:#1a1a1a;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;min-width:130px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.va-item{display:block;width:100%;padding:10px 16px;font-family:inherit;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.65);background:none;border:none;cursor:pointer;text-align:left;border-top:1px solid rgba(255,255,255,.06)}
.va-item:first-child{border-top:none}
.va-item:hover{background:rgba(255,255,255,.07);color:#fff}
.va-item.active{color:var(--rx);background:rgba(233,30,140,.08)}
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
.pill.accent{background:var(--rx);border-color:var(--rx);color:#fff}
.pill-vote{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;padding:6px 16px;border-radius:20px;background:var(--rx);border:1px solid var(--rx);color:#fff;cursor:pointer;transition:opacity .15s,transform .1s;font-family:inherit}
.pill-vote:hover:not(:disabled){opacity:.85;transform:scale(1.03)}
.pill-vote:disabled{cursor:default}
.pill-vote.voted{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.5)}
.pill-vote.success{background:#22c55e;border-color:#22c55e}
.pill-vote.loading{opacity:.6}
.pill-lesar-vote{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:4px 12px;border-radius:20px;background:none;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);cursor:pointer;font-family:inherit;transition:all .15s;margin-top:4px}
.pill-lesar-vote:hover{border-color:var(--rx);color:var(--rx)}
.vote-modal{margin-top:16px;padding:16px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}
.vote-modal p{font-size:13px;color:rgba(255,255,255,.8);line-height:1.6;margin:0 0 12px}
.vote-modal-title{font-weight:800;color:#fff!important}
.vote-modal-sub{font-size:12px!important}
.vote-modal-input{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.vote-count-btn{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}
.vote-count-btn:hover{background:rgba(255,255,255,.2)}
.vote-count-val{font-size:20px;font-weight:900;color:#fff;min-width:32px;text-align:center}
.vote-count-cost{font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em}
.vote-modal-actions{display:flex;gap:10px;flex-wrap:wrap}
.vote-modal-cta{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:9px 18px;border-radius:20px;background:var(--rx);color:#fff;border:none;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block}
.vote-modal-cta:hover:not(:disabled){opacity:.85}
.vote-modal-cta:disabled{opacity:.5;cursor:default}
.vote-modal-dismiss{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:9px 16px;border-radius:20px;background:none;color:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.15);cursor:pointer;font-family:inherit}
.vote-modal-dismiss:hover{color:#fff;border-color:rgba(255,255,255,.4)}

.tabbar{position:sticky;top:60px;z-index:6;background:#fff;border-bottom:1px solid var(--lr-border);display:flex;gap:2px;padding:0 40px}
.tab{position:relative;font-family:inherit;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);background:none;border:none;padding:18px 18px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}
.tab[aria-selected="true"]{color:var(--rx-text)}
.tab[aria-selected="true"]::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--rx)}
.adminbadge{font-size:8px;font-weight:900;background:var(--rx-tint);color:var(--rx-text);padding:2px 5px;border-radius:3px}

.body-layout{display:flex;align-items:flex-start;gap:0;padding:0 40px;margin-top:0}
.body-main{flex:1;min-width:0;padding-top:30px;padding-right:28px}
.panel{max-width:none}

.billboard{width:300px;flex-shrink:0;position:sticky;top:120px;padding-top:30px;display:flex;flex-direction:column;gap:16px}
.bb-label{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:var(--lr-text-50);margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--lr-border)}
/* Rotator */
.bb-rotator{position:relative;width:100%}
.bb-slide{display:none}
.bb-slide.active{display:block}
.bb-placeholder{border:1px dashed var(--lr-border);border-radius:10px;background:var(--lr-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 16px;color:var(--lr-text-30);min-height:250px}
.bb-ad-img{width:100%;border-radius:12px;display:block;object-fit:cover}
.bb-ad-img-sm{width:100%;border-radius:10px;display:block;object-fit:cover}
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
  .billboard{width:100%;position:static;padding-top:0;margin-top:40px}
  .bb-slot-tall{display:none}
  .head-grid{display:flex;flex-direction:row;align-items:flex-start;gap:16px;padding:0 16px}
  .head-art{width:100px;height:100px;min-height:unset;border-radius:12px;border:2px solid var(--rx);flex-shrink:0;object-position:top center}
  .head-art-fallback{width:100px;height:100px;min-height:unset;border-radius:12px;border:2px solid var(--rx);font-size:36px;flex-shrink:0}
  .head-meta{padding:0}
  .head-name{font-size:clamp(18px,5vw,28px)}
  .head-tagline{font-size:13px;margin-top:6px}
  .pill-row{margin-top:10px}
  .head-topbar{padding:14px 16px 16px}
  .tabbar{padding:0 16px;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .tab{padding:14px 12px;font-size:12px}
}
.tabbar-mobile{position:sticky;top:60px;z-index:6;background:#fff;border-bottom:2px solid var(--rx);padding:0 16px}
.tabbar-drop-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 0;font-family:inherit;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--lr-text);background:none;border:none;cursor:pointer}
.tabbar-drop-menu{position:absolute;left:-16px;right:-16px;top:100%;background:#fff;border-bottom:1px solid var(--lr-border);z-index:200;box-shadow:0 6px 20px rgba(0,0,0,.09);margin-top:0}
/* Overview tab */
.ov-intro{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:flex-start;margin-bottom:36px}
.ov-video-wrap{border-radius:12px;overflow:hidden;background:#000;aspect-ratio:16/9;width:100%}
.ov-video-el{width:100%;height:100%;display:block;object-fit:cover}
.ov-video-ph{width:100%;height:100%;min-height:200px;background:var(--lr-surface);border:1px dashed var(--lr-border);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--lr-text-30);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.ov-bio{padding-top:4px}
.ov-bio-p{font-size:15px;color:var(--lr-text-75);line-height:1.75;margin-bottom:12px}
.ov-pull-quote{position:relative;margin:8px 0 40px;padding:36px 48px;background:var(--lr-surface);border-left:4px solid var(--lr-accent,#a78bfa);border-radius:4px}
.ov-pull-mark{display:block;font-size:72px;line-height:1;font-weight:900;color:var(--lr-accent,#a78bfa);opacity:.35;font-style:normal;user-select:none}
.ov-pull-mark.open{margin-bottom:-12px}
.ov-pull-mark.close{text-align:right;margin-top:-12px}
.ov-pull-text{font-size:22px;font-weight:700;line-height:1.55;color:var(--lr-text);font-style:italic;letter-spacing:-.015em;margin:0;text-align:center}
.ov-news-head{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:var(--lr-text-50);margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--lr-border)}
@media(max-width:900px){.ov-intro{grid-template-columns:1fr}}
.tabbar-drop-item{display:block;width:100%;padding:13px 22px 13px 16px;font-family:inherit;font-size:13px;font-weight:700;color:var(--lr-text-75);background:none;border:none;border-top:1px solid var(--lr-border);cursor:pointer;text-align:left}
.tabbar-drop-item.active{color:var(--rx);font-weight:900;background:var(--rx-tint)}
.tabbar-drop-item:hover:not(.active){background:var(--lr-bg)}
.article-cta{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--rx-text);text-decoration:none;margin-top:4px}
.article-cta svg{width:14px;height:14px;transition:transform .15s}
.article-cta:hover svg{transform:translateX(3px)}
.article-tag{position:absolute;top:10px;left:10px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:4px 10px;border-radius:20px;background:var(--rx-tint);color:var(--rx-text);backdrop-filter:blur(4px)}
.panel-intro{font-size:13px;color:var(--lr-text-50);margin-bottom:18px}
.mp-root{padding-bottom:40px}
.mp-player{background:#fff;border:1px solid var(--lr-border);border-radius:20px;box-shadow:0 6px 28px rgba(20,20,40,.07);overflow:hidden;margin-bottom:20px}
.mp-np{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;padding:18px 22px}
.mp-cover{width:60px;height:60px;border-radius:14px;background:var(--rx);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.mp-cover svg{width:26px;height:26px}
.mp-npmeta .mp-nptitle{font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
.mp-npmeta .mp-npartist{color:rgba(26,26,26,.55);font-size:13.5px;margin-top:2px}
.mp-nptag{display:inline-block;margin-top:6px;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:3px 9px;border-radius:999px}
.mp-nptag.vb-public{background:rgba(76,175,80,.14);color:#2e7d32}
.mp-nptag.vb-preview,.mp-nptag.vb-passport{background:var(--rx-tint);color:var(--rx-text)}
.mp-nptag.vb-locked{background:rgba(0,0,0,.06);color:rgba(26,26,26,.4)}
.mp-transport{display:flex;align-items:center;gap:8px;flex-shrink:0}
.mp-ic{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:rgba(26,26,26,.5);background:none;border:none;cursor:pointer;transition:.12s}
.mp-ic:hover{background:#f0f0f4;color:#1a1a1a}
.mp-ic.on{color:var(--rx)}
.mp-ic svg{width:19px;height:19px}
.mp-orb{width:56px;height:56px;border-radius:50%;background:var(--rx);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.2);transition:box-shadow .15s,transform .08s;color:#fff}
.mp-orb:hover{box-shadow:0 8px 24px rgba(0,0,0,.28)}
.mp-orb:active{transform:scale(.94)}
.mp-orb:disabled{opacity:.45;cursor:not-allowed}
.mp-orb svg{width:22px;height:22px;fill:currentColor}
.mp-scrub{display:flex;align-items:center;gap:12px;padding:0 22px 16px}
.mp-time{font-size:12px;color:rgba(26,26,26,.45);font-variant-numeric:tabular-nums;min-width:36px;text-align:center;font-weight:700}
.mp-bar{flex:1;height:6px;border-radius:999px;background:#ececf2;position:relative;cursor:pointer}
.mp-bar-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--rx);transition:width .1s linear}
.mp-bar-knob{position:absolute;top:50%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:50%;background:#fff;border:2px solid var(--rx);box-shadow:0 1px 4px rgba(0,0,0,.18);transition:left .1s linear}
.mp-barrow{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--lr-border);padding:11px 22px;background:#fafafb}
.mp-vol{display:flex;align-items:center;gap:10px;color:rgba(26,26,26,.5)}
.mp-voltrack{width:100px;height:5px;border-radius:999px;background:#e2e2ea;position:relative}
.mp-volfill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:#1a1a1a}
.mp-chips{display:flex;gap:8px}
.mp-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.3px;color:rgba(26,26,26,.55);border:1px solid var(--lr-border);border-radius:999px;padding:7px 13px;background:none;cursor:pointer;font-family:inherit;transition:.12s}
.mp-chip:hover{border-color:var(--rx);color:var(--rx)}
.mp-chip.active{background:var(--rx);border-color:var(--rx);color:#fff}
.mp-lyrics-inline{background:#fff;border:1px solid var(--lr-border);border-radius:16px;margin-bottom:20px;overflow:hidden}
.mp-lyrics-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--lr-border)}
.mp-lyrics-label{font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:var(--rx)}
.mp-lyrics-track{flex:1;font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mp-lyrics-close{margin-left:auto;width:28px;height:28px;border-radius:50%;background:#f0f0f4;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:rgba(26,26,26,.5)}
.mp-lyrics-body{padding:16px 18px}
.mp-catalog-head{margin-bottom:6px}
.mp-catalog-title{font-size:13px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:rgba(26,26,26,.45);margin:0}
.mp-catalog-note{font-size:11.5px;color:rgba(26,26,26,.45);font-weight:600;margin-bottom:14px}
.mp-catalog-note strong{color:rgba(26,26,26,.65);font-weight:800}
.mp-rows{display:grid;gap:8px}
.mp-row{display:grid;grid-template-columns:44px 1fr auto;gap:14px;align-items:center;background:#fff;border:1px solid var(--lr-border);border-radius:14px;padding:11px 14px;cursor:pointer;transition:.12s}
.mp-row:hover{border-color:rgba(0,0,0,.16);box-shadow:0 4px 16px rgba(20,20,40,.06)}
.mp-row.current{border-color:var(--rx);box-shadow:0 0 0 1px var(--rx)}
.mp-row.locked{cursor:default;opacity:.75}
.mp-row-art{width:44px;height:44px;border-radius:10px;background:#eeeeee;display:flex;align-items:center;justify-content:center;color:rgba(26,26,26,.35);flex-shrink:0}
.mp-row-title{font-weight:800;font-size:14.5px}
.mp-row-sub{color:rgba(26,26,26,.45);font-size:12.5px;margin-top:2px}
.mp-row-state{display:flex;align-items:center;gap:8px;flex-shrink:0}
.mp-badge-lk{font-size:10px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:rgba(26,26,26,.5);background:rgba(0,0,0,.06);padding:4px 9px;border-radius:999px;white-space:nowrap}
.mp-row-date{color:rgba(26,26,26,.4);font-size:12px;white-space:nowrap}
.mp-btn-pre{border-radius:999px;font-weight:800;font-size:12px;padding:7px 14px;border:1px solid var(--lr-border);color:#1a1a1a;background:none;cursor:pointer;font-family:inherit;transition:.12s;white-space:nowrap}
.mp-btn-pre:hover:not(:disabled){border-color:var(--rx);color:var(--rx)}
.mp-btn-pre.disabled,.mp-btn-pre:disabled{opacity:.4;cursor:not-allowed;color:rgba(26,26,26,.45)}
.mp-btn-buy{border-radius:999px;font-weight:800;font-size:12px;padding:7px 14px;background:#1f8f50;color:#fff;border:none;cursor:pointer;font-family:inherit;transition:.12s;white-space:nowrap}
.mp-btn-buy:hover{background:#17763f}
@media(max-width:768px){.mp-np{grid-template-columns:auto 1fr;gap:14px}.mp-transport{grid-column:1/-1;justify-content:center;margin-top:6px}.mp-barrow{flex-direction:column;gap:10px}.mp-chips{justify-content:center}}
.track{display:flex;align-items:center;gap:16px;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:10px;padding:13px 18px;margin-bottom:9px}
.tplay{width:42px;height:42px;border-radius:50%;border:none;background:var(--rx);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.tplay svg{width:16px;height:16px;fill:currentColor}
.tplay.on{filter:brightness(.92)}
.tplay.locked{background:var(--lr-bg);color:var(--lr-text-30);border:1px solid var(--lr-border);cursor:not-allowed}
.tplay.locked svg{fill:none;width:15px;height:15px}
.track .ti{flex:1}.track .tn{font-size:15px;font-weight:800}.track .tm{font-size:11px;color:var(--lr-text-50);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.vis-badge{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:3px 9px;border-radius:20px;white-space:nowrap}
.vis-badge-btn{border:none;font-family:inherit;cursor:pointer;transition:filter .15s,transform .1s}
.vis-badge-btn:hover{filter:brightness(1.15);transform:scale(1.04)}
.vis-badge-btn:focus-visible{outline:2px solid var(--rx);outline-offset:2px}
.sch-tier-pill-btn{border:none;font-family:inherit;cursor:pointer;transition:filter .15s,transform .1s}
.sch-tier-pill-btn:hover{filter:brightness(1.15);transform:scale(1.04)}
.sch-tier-pill-btn:focus-visible{outline:2px solid var(--rx);outline-offset:2px}
.vb-public  {background:rgba(76,175,80,.14);color:#2e7d32}
.vb-preview {background:rgba(246,152,32,.16);color:#b45309}
.vb-passport{background:var(--rx-tint);color:var(--rx-text)}
.vb-members {background:rgba(99,102,241,.13);color:#4338ca}
.vb-locked  {background:rgba(0,0,0,.06);color:var(--lr-text-30)}
/* Purchase modal */
.pur-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.pur-modal{background:#fff;border-radius:20px;padding:36px 32px 28px;max-width:400px;width:100%;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.18)}
.pur-close{position:absolute;top:14px;right:14px;background:rgba(0,0,0,.06);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;padding:0}
.pur-close svg{width:14px;height:14px}
.pur-close:hover{background:rgba(0,0,0,.1)}
.pur-close:focus-visible{outline:2px solid var(--rx);outline-offset:2px}
.pur-song-label{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:var(--lr-text-50);margin-bottom:6px}
.pur-song-name{font-size:22px;font-weight:900;color:#1a1a1a;margin:0 0 20px;letter-spacing:-.01em}
.pur-price-row{display:flex;align-items:baseline;gap:7px;margin-bottom:14px}
.pur-price{font-size:42px;font-weight:900;color:var(--rx-text);line-height:1}
.pur-currency{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--rx-text);opacity:.7}
.pur-balance-low{color:#ef4444}
.pur-low-msg{font-size:12px;color:#ef4444;font-weight:600;margin:6px 0 14px;line-height:1.5}
.pur-desc{font-size:13px;color:#555;line-height:1.65;margin-bottom:28px}
.pur-actions{display:flex;flex-direction:column;gap:10px}
.pur-confirm{padding:14px;background:var(--rx);color:#fff;border:none;border-radius:10px;font-family:inherit;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;text-align:center;display:block;text-decoration:none}
.pur-confirm:hover{filter:brightness(1.08)}
.pur-confirm:focus-visible{outline:2px solid var(--rx);outline-offset:3px}
.pur-confirm.pur-reload{background:#F69820;color:#000}
.pur-confirm.pur-reload:hover{background:#ffaf30;filter:none}
.pur-confirm.pur-reload:focus-visible{outline-color:#F69820}
.pur-cancel{padding:14px;background:#f5f5f5;color:#1a1a1a;border:none;border-radius:10px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer}
.pur-cancel:hover{background:#ebebeb}
.pur-cancel:focus-visible{outline:2px solid #aaa;outline-offset:2px}
/* Purchase success toast */
.pur-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;border-radius:100px;padding:12px 22px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;z-index:1100;box-shadow:0 8px 32px rgba(0,0,0,.22);animation:toast-in .25s ease}
.pur-toast svg{width:16px;height:16px;stroke:#4ade80;flex-shrink:0}
@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
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
/* Article grid */
.pulse-articles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.pulse-article-card{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.pulse-article-card .pf-article-img{position:relative;aspect-ratio:16/9;overflow:hidden;flex-shrink:0}
.pulse-article-card .pf-article-img img{width:100%;height:100%;object-fit:cover;display:block}
.pulse-article-card .pf-article-ph{width:100%;height:100%}
.pulse-article-card .pf-article-body{padding:14px 16px 16px;flex:1;display:flex;flex-direction:column}
.pf-article-date{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--lr-text-30);margin-bottom:6px}
@media(max-width:900px){.pulse-articles-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.pulse-articles-grid{grid-template-columns:1fr}}
.pf-post{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:14px;overflow:hidden;padding:20px 22px}
.pf-meta{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.pf-type-badge{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;padding:3px 9px;border-radius:20px}
.pf-type-voice,.pf-type-drop{background:var(--rx-tint);color:var(--rx-text)}
.pf-type-bio,.pf-type-article{background:rgba(0,0,0,.05);color:var(--lr-text-50)}
.pf-date{font-size:11px;font-weight:700;color:var(--lr-text-30);text-transform:uppercase;letter-spacing:.06em}
/* Voice message card — square image + player side by side */
.pf-voice-card{display:flex;gap:16px;align-items:flex-start}
.pf-voice-avatar{width:120px;height:120px;border-radius:12px;overflow:hidden;flex-shrink:0;border:2px solid var(--rx)}
.pf-voice-avatar img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.pf-voice-right{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
/* Waveform scrubber */
.pf-waveform{display:flex;align-items:center;gap:2px;height:48px;cursor:pointer;padding:4px 0}
.pf-waveform span{flex-shrink:0;width:4px;border-radius:3px;background:rgba(233,30,140,.18);display:block;transition:background .1s}
.pf-waveform span.wf-active{background:var(--rx)}
/* Controls row */
.pf-voice-controls{display:flex;align-items:center;gap:10px}
.pf-voice-play-btn{width:34px;height:34px;border-radius:50%;border:none;background:var(--rx);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;transition:filter .15s}
.pf-voice-play-btn svg{width:13px;height:13px;fill:currentColor}
.pf-voice-play-btn.on{filter:brightness(.88)}
.pf-voice-time{font-size:11px;font-weight:700;color:var(--lr-text-50);font-variant-numeric:tabular-nums;flex:1}
/* Karaoke caption */
.pf-karaoke{font-size:14px;line-height:1.75;color:var(--lr-text-30);font-style:italic;margin:0}
.kc{transition:color .35s,font-weight .35s}
.kc-past{color:var(--lr-text-50)}
.kc-active{color:var(--rx-text);font-weight:800;font-style:normal}
/* Billboard stacked + tall */
.bb-stacked{display:flex;flex-direction:column;gap:12px}
.bb-placeholder.bb-tall{min-height:500px}
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
.track-coming-soon{color:var(--lr-text-30);font-style:italic}
.pf-lock-static{cursor:default;pointer-events:none;border-style:solid;opacity:.45}
.pf-coming-soon{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--lr-text-30);font-style:italic}
/* Article post */
.pf-article-card{border:1px solid var(--lr-border);border-radius:10px;overflow:hidden;background:var(--lr-bg)}
.pf-article-img{aspect-ratio:16/8;position:relative;overflow:hidden}
.pf-article-img img,.pf-article-ph{width:100%;height:100%;object-fit:cover;display:block}
.pf-article-body{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.pf-article-title{font-size:17px;font-weight:900;line-height:1.25;color:var(--lr-text)}.pf-article-title-link{display:block;text-decoration:none;color:inherit;margin-bottom:6px;cursor:pointer;transition:opacity .15s}.pf-article-title-link:hover{opacity:.75}
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

/* ---- Schedule tab ---- */
.sch-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:28px}
.sch-season-label{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;color:var(--lr-text-50)}
.sch-tier-legend{display:flex;gap:7px;flex-wrap:wrap}
.sch-tier-pill{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:4px 11px;border-radius:20px;white-space:nowrap}
.st-free    {background:rgba(76,175,80,.14);color:#2e7d32}
.st-preview {background:rgba(246,152,32,.16);color:#b45309}
.st-passport{background:var(--rx-tint);color:var(--rx-text)}
.st-plus    {background:rgba(99,102,241,.13);color:#4338ca}
.st-pro     {background:rgba(0,0,0,.07);color:var(--lr-text-50)}
.sch-timeline{display:flex;flex-direction:column;border-left:2px solid var(--lr-border);margin-left:7px;padding-left:0}
.sch-row{display:flex;align-items:center;gap:16px;padding:16px 0 16px 28px;position:relative;border-bottom:1px solid var(--lr-border)}
.sch-row:last-child{border-bottom:none}
.sch-dot-wrap{position:absolute;left:-7px;top:50%;transform:translateY(-50%)}
.sch-dot{width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid var(--lr-border);transition:background .2s,border-color .2s}
.sch-dot.on{background:var(--rx);border-color:var(--rx)}
.sch-body{flex:1;min-width:0}
.sch-track-name{font-size:15px;font-weight:900;color:var(--lr-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sch-row:not(.sch-live) .sch-track-name{color:var(--lr-text-50)}
.sch-track-meta{display:flex;align-items:center;gap:7px;margin-top:3px}
.sch-era{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-30)}
.sch-sep{color:var(--lr-text-30);font-size:10px}
.sch-status{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--lr-text-30)}
.sch-status-live{color:#2e7d32}
.sch-footnote{font-size:11px;color:var(--lr-text-30);font-style:italic;margin-top:22px;border-top:1px solid var(--lr-border);padding-top:16px}
.sch-remix-badge{display:inline-block;margin-left:8px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;padding:2px 7px;border-radius:20px;background:rgba(99,102,241,.13);color:#4338ca;vertical-align:middle;position:relative;top:-1px}

    .pulse-section { padding: 0; }
    .pulse-container { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; align-items: start; }
    .pulse-card { border: 1px solid #e5e5e5; border-radius: 8px; background: #fafafa; padding: 20px; }
    .pulse-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .pulse-card-meta { display: flex; gap: 12px; align-items: flex-start; }
    .pulse-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; object-position: top center; }
    .pulse-avatar-init { width: 40px; height: 40px; border-radius: 50%; background: #764ba2; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .pulse-card-meta h4 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
    .pulse-date { font-size: 12px; color: #999; }
    .pulse-badge { display: inline-block; background: #e8f0fe; color: #1967d2; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .pulse-card-body { margin-bottom: 16px; }
    .pulse-text { font-size: 15px; line-height: 1.6; color: #1a1a1a; margin-bottom: 12px; }
    .pulse-media { width: 100%; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
    .pulse-media img { width: 100%; height: auto; display: block; }
    .pulse-media-video { aspect-ratio: 16 / 9; background: #000; }
    .pulse-media-video video { width: 100%; height: 100%; display: block; object-fit: cover; }
    .pulse-stats { display: flex; gap: 18px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 13px; color: #666; }
    .pulse-stat { display: inline-flex; align-items: center; gap: 6px; }
    .pulse-stat svg { width: 15px; height: 15px; flex-shrink: 0; }
    .pulse-voice { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .pulse-voice audio { width: 100%; height: 36px; }
    .pulse-voice-dur { font-size: 12px; color: #999; flex-shrink: 0; }
    .pulse-load-container { grid-column: 1 / -1; display: flex; justify-content: center; margin-top: 32px; }
    @media(max-width:1150px){ .pulse-container{grid-template-columns:repeat(2,minmax(0,1fr))} }
    @media(max-width:680px){ .pulse-container{grid-template-columns:1fr} }
    .pulse-load-btn { padding: 12px 32px; background: #1a1a1a; color: white; border: none; border-radius: 4px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; }
    .pulse-load-btn:hover { background: #333; }
    .pulse-empty { text-align: center; padding: 60px 20px; color: #999; }
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
.has-city-bg .head-grid::before {content: ""; position: absolute; inset: -20px -60px; background: rgba(0, 0, 0, 0.48); z-index: -1;}
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

/* ---- Pulse social feed ---- */
.feed { display:flex; flex-direction:column; gap:0; }
.feed-post { display:flex; gap:12px; padding:16px 0; border-bottom:1px solid var(--lr-border); }
.feed-post:last-child { border-bottom:none; }
.feed-left { flex-shrink:0; }
.feed-avatar { width:38px; height:38px; border-radius:50%; object-fit:cover; display:block; }
.feed-avatar-fallback { width:38px; height:38px; border-radius:50%; background:var(--rx-tint); color:var(--rx-text); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; }
.feed-body { flex:1; min-width:0; }
.feed-header { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
.feed-name { font-size:13px; font-weight:800; color:var(--lr-text); }
.feed-time { font-size:12px; color:var(--lr-text-50); }
.feed-badge { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:.1em; padding:3px 8px; border-radius:20px; }
.feed-badge-music { background:var(--rx-tint); color:var(--rx-text); }
.feed-badge-voice { background:rgba(76,175,80,.14); color:#2e7d32; }
.feed-text { font-size:14px; line-height:1.55; color:var(--lr-text); margin:0 0 10px; white-space:pre-wrap; }
.feed-music-chip { display:inline-flex; align-items:center; gap:8px; background:var(--rx-tint); border-radius:10px; padding:10px 14px; margin-top:4px; }
.feed-music-chip svg { width:16px; height:16px; color:var(--rx-text); flex-shrink:0; }
.feed-chip-track { font-size:13px; font-weight:700; color:var(--lr-text); }
.feed-chip-era { font-size:11px; color:var(--lr-text-50); }
.feed-article-chip { display:flex; align-items:center; gap:12px; background:var(--lr-bg); border:1px solid var(--lr-border); border-radius:10px; overflow:hidden; text-decoration:none; margin-top:6px; transition:border-color .15s; }
.feed-article-chip:hover { border-color:var(--rx-text); }
.feed-article-chip img { width:64px; height:64px; object-fit:cover; flex-shrink:0; display:block; }
.feed-article-chip-body { padding:10px 12px 10px 0; min-width:0; }
.feed-chip-tag { display:block; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:var(--rx-text); margin-bottom:3px; }
.feed-chip-title { font-size:13px; font-weight:700; color:var(--lr-text); line-height:1.35; }
.feed-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 24px; gap:14px; text-align:center; }
.feed-empty-icon { width:44px; height:44px; color:var(--lr-text-50); }
.feed-empty-icon svg { width:100%; height:100%; }
.feed-empty-text { font-size:14px; color:var(--lr-text-50); margin:0; }
.sch-finale-badge { background:rgba(233,30,140,.13); color:#9c1458; }
.sch-premiere-badge { background:rgba(99,102,241,.13); color:#4338ca; }
.sch-season-block { margin-bottom:36px; }
.sch-season-block:last-child { margin-bottom:0; }
.sch-season-heading { font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.18em; color:var(--lr-text-50); padding-bottom:14px; border-bottom:2px solid var(--lr-border); margin-bottom:4px; }

/* Article detail view inside body-main */
.art-view{padding:0 0 40px}
.art-crumb{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--lr-text-30);padding-bottom:24px;flex-wrap:wrap}
.art-crumb-link{color:var(--lr-text-30);text-decoration:none;transition:color .15s}.art-crumb-link:hover{color:var(--lr-text)}
.art-crumb-sep{opacity:.4}
.art-crumb-cur{color:var(--lr-text-50)}
.art-hero{width:100%;border-radius:14px;overflow:hidden;margin-bottom:28px;aspect-ratio:16/9;background:var(--lr-surface)}.art-hero img{width:100%;height:100%;object-fit:cover;display:block}
.art-meta{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.art-tag{display:inline-block;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;background:var(--rx,#c084fc);color:#fff;padding:3px 10px;border-radius:99px}
.art-date{font-size:12px;font-weight:600;color:var(--lr-text-30)}
.art-title{font-size:clamp(20px,3.5vw,32px);font-weight:900;line-height:1.2;color:var(--lr-text);margin-bottom:24px}
.art-body{font-size:15px;line-height:1.8;color:var(--lr-text-70)}.art-body p{margin:0 0 18px}.art-body p:last-child{margin-bottom:0}
.art-body .art-quote{font-style:italic;font-size:17px;line-height:1.6;color:var(--lr-text);border-left:3px solid var(--rx,#c084fc);padding-left:18px;margin:24px 0}
.art-back{display:inline-flex;align-items:center;gap:8px;margin-top:40px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--rx,#c084fc);text-decoration:none;transition:opacity .15s}.art-back:hover{opacity:.7}
.art-hr{border:none;border-top:2px solid var(--lr-border);margin:32px 0}
.art-section-head{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:var(--lr-text);margin:32px 0 12px}
.art-q{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--lr-text-50);margin:28px 0 2px}
.art-a{font-size:15px;line-height:1.8;color:var(--lr-text);margin:0 0 4px;padding:14px 18px;background:rgba(0,0,0,.035);border-radius:10px;border-left:3px solid var(--rx,#c084fc)}
`;



