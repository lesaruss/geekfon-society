"use client";
// components/shell/GfsShell.tsx
// The universal dashboard frame on geekfon.ai (Sean, 2026-10-04: "all
// dashboards should have that look and feel and be connected to that system").
// Ported from LESARUSS HQ's shell (components/shell/WindowChrome.tsx,
// HqTopNav.tsx, UniversalBar.tsx in lesaruss/lesaruss-hq), skinned dark, per
// the geekfon-universal-dashboard-playbook:
//
//   backdrop     the dashboard's existing aurora (rendered by the layout)
//   window       macOS-style frame: traffic lights + "GEEKFON SOCIETY · page"
//                  red    out to the geekfon.ai home page
//                  yellow back into the frame (only while full screen)
//                  green  full screen (remembered across pages and reloads)
//   top nav      tier-aware, from lib/gfsNav.ts (the same registry the public
//                chrome uses), Apps (the shared brand launcher), account menu
//                with View As for the admin account
//   universal    the ONE shared bar, loaded from
//   bar          https://hq.lesaruss.ai/shell/universal-bar.js, fed by
//                geekfon.ai's own /api/shell routes (same contract as HQ)
//
// Scope: the signed-in /dashboard tree, and signed-in label artist pages
// (components/roster/ArtistChrome.tsx, 2026-10-04 Sean: "when they're logged
// in, they should be using the universal framing"). Signed-out visitors keep
// SiteChrome, because they get the art-led storefront.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { navForTier, parseTier, splitTools, type Tier } from "@/lib/gfsNav";

const ADMIN_EMAIL = "contact@lesaruss.com";

// True for anything rendered inside the frame, so a page can drop its own
// public-chrome furniture (artist pages swap their header and tabs for a
// section nav).
const FramedContext = createContext(false);
export function useFramed(): boolean { return useContext(FramedContext); }
const WINDOW_MODE_KEY = "gfs-window-mode";
const BAR_SRC = "https://hq.lesaruss.ai/shell/universal-bar.js";
const CURRENT_SLUG = "geekfon-society";
const TIERS: Tier[] = ["public", "passport", "plus", "pro"];
const TIER_LABEL: Record<Tier, string> = { public: "Public", passport: "Passport", plus: "Plus", pro: "Pro" };

type ShellMember = { name: string | null; firstName: string | null; avatarUrl: string | null; initials: string | null; color: string | null; points: number | null };

type BarProvider = {
  load: () => Promise<unknown>;
  signedIn: () => boolean;
  setDock: (slug: string, op: "add" | "remove") => Promise<string[] | null>;
  handoff: () => Promise<string | null>;
};
type BarApi = { version: number; mount: (opts: { mount: HTMLElement; current?: string; provider?: BarProvider; loginUrl?: string }) => unknown };
declare global { interface Window { LRUniversalBar?: BarApi } }

async function bearer(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function loadBarScript(): Promise<BarApi | null> {
  if (window.LRUniversalBar?.version && window.LRUniversalBar.version >= 2) return Promise.resolve(window.LRUniversalBar);
  return new Promise(resolve => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${BAR_SRC}"]`);
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve(window.LRUniversalBar ?? null));
    s.addEventListener("error", () => resolve(null));
    if (!existing) { s.src = BAR_SRC; s.async = true; document.head.appendChild(s); }
  });
}

export default function GfsShell({ children, email, rawTier, fallbackName, title, activeHref }: {
  children: React.ReactNode;
  email: string | null;
  rawTier: string | null;
  fallbackName: string;
  /** Window title after "GeekFon Society ·"; defaults to the nav item's label. */
  title?: string;
  /** Nav item to mark current when the path itself is not in the nav (artist pages mark Roster). */
  activeHref?: string;
}) {
  const pathname = usePathname() || "/dashboard";
  const isAdmin = email === ADMIN_EMAIL;
  const [fullscreen, setFullscreen] = useState(false);
  const [member, setMember] = useState<ShellMember | null>(null);
  const [viewAs, setViewAs] = useState<Tier | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const appsRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const signedInRef = useRef(false);

  // Window mode and View As are read after mount so server and first client
  // render agree; storage can throw in private mode, and the frame is the
  // safe answer then.
  useEffect(() => {
    try { if (localStorage.getItem(WINDOW_MODE_KEY) === "fullscreen") setFullscreen(true); } catch { /* ignore */ }
    try { const v = localStorage.getItem("gfs-view-as") as Tier | null; if (v && TIERS.includes(v)) setViewAs(v); } catch { /* ignore */ }
    const onViewAs = (e: Event) => setViewAs(((e as CustomEvent).detail as Tier | null) ?? null);
    window.addEventListener("gfs-view-as", onViewAs);
    return () => window.removeEventListener("gfs-view-as", onViewAs);
  }, []);

  // Desktop: the document does not scroll, the window does (as on HQ).
  useEffect(() => {
    document.body.classList.add("gw-lock");
    return () => document.body.classList.remove("gw-lock");
  }, []);

  const changeFullscreen = useCallback((next: boolean) => {
    setFullscreen(next);
    try { localStorage.setItem(WINDOW_MODE_KEY, next ? "fullscreen" : "window"); } catch { /* ignore */ }
  }, []);

  // One shell fetch feeds the avatar and the universal bar.
  const loadShell = useCallback(async () => {
    const res = await fetch("/api/shell/me", { headers: await bearer(), cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    signedInRef.current = !!data?.member;
    if (data?.member) setMember(data.member as ShellMember);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const provider: BarProvider = {
      load: () => loadShell(),
      signedIn: () => signedInRef.current,
      setDock: async (slug, op) => {
        const res = await fetch("/api/shell/dock", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await bearer()) },
          body: JSON.stringify({ brand_slug: slug, action: op }),
        });
        if (!res.ok) return null;
        const d = await res.json().catch(() => null);
        return Array.isArray(d?.brand_slugs) ? d.brand_slugs : null;
      },
      handoff: async () => {
        const res = await fetch("/api/shell/handoff", { method: "POST", headers: await bearer() });
        if (!res.ok) return null;
        const d = await res.json().catch(() => null);
        return typeof d?.token === "string" ? d.token : null;
      },
    };
    loadBarScript().then(bar => {
      if (cancelled || !bar || !barRef.current) { if (!bar) loadShell(); return; }
      bar.mount({ mount: barRef.current, current: CURRENT_SLUG, provider, loginUrl: "/dashboard" });
    });
    return () => { cancelled = true; };
  }, [loadShell]);

  // Navigation: the same registry and the same per-account admin gates as
  // SiteChrome, so the two can never disagree.
  const realTier = parseTier(rawTier || "");
  const effectiveTier: Tier = isAdmin && viewAs ? viewAs : realTier;
  const adminView = isAdmin && !viewAs;
  const nav = navForTier(effectiveTier, adminView, adminView, adminView, adminView, adminView, adminView);
  const current = nav.find(n => n.href === pathname) ?? nav.find(n => n.href !== "/dashboard" && pathname.startsWith(n.href))
    ?? (activeHref ? nav.find(n => n.href === activeHref) : undefined);
  const pageTitle = title ?? current?.label ?? (pathname === "/" ? "Home" : "Dashboard");
  const { main, tools } = splitTools(nav);
  const toolCurrent = tools.find(t => t.href === current?.href);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!toolsOpen) return;
    const close = (e: MouseEvent) => { if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setToolsOpen(false); };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [toolsOpen]);

  function chooseViewAs(t: Tier | null) {
    setViewAs(t);
    try { if (t) localStorage.setItem("gfs-view-as", t); else localStorage.removeItem("gfs-view-as"); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("gfs-view-as", { detail: t }));
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const displayName = member?.name || fallbackName;
  const initials = member?.initials || displayName.slice(0, 2).toUpperCase();

  return (
    <div className="gw-shell">
      <style>{CSS}</style>
      <div className={"gw-window" + (fullscreen ? " is-fullscreen" : "")}>
        <div className="gw-titlebar">
          <div className="gw-dots">
            <a href="/" className="gw-light gw-close" aria-label="Close, back to the GeekFon home page" title="Back to geekfon.ai">
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 3l4 4M7 3l-4 4" /></svg>
            </a>
            <button type="button" className="gw-light gw-min" aria-label="Exit full screen" aria-disabled={!fullscreen}
              title={fullscreen ? "Back into the window" : "Already in the window"} onClick={() => { if (fullscreen) changeFullscreen(false); }}>
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 5h5" /></svg>
            </button>
            <button type="button" className="gw-light gw-max" aria-label="Full screen" aria-disabled={fullscreen}
              title={fullscreen ? "Already full screen" : "Full screen"} onClick={() => { if (!fullscreen) changeFullscreen(true); }}>
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 6.5V3h3.5M7 3.5V7H3.5" /></svg>
            </button>
          </div>
          <div className="gw-title">GeekFon Society <span aria-hidden="true">&middot;</span> {pageTitle}</div>
          <div className="gw-spacer" aria-hidden="true" />
        </div>

        <nav className="gw-topnav" aria-label="GeekFon">
          <div className="gw-left">
            <a href="/" className="gw-logo" aria-label="GeekFon Society home">
              <img src="/geekfon-logo.png" alt="" aria-hidden="true" />
              <span><span className="gw-geek">GEEK</span><span className="gw-fon">FON</span></span>
            </a>
            <div className="gw-links">
              {main.map(n => (
                <a key={n.href} href={n.href} className={"gw-link" + (current?.href === n.href ? " active" : "")} aria-current={current?.href === n.href ? "page" : undefined}>
                  {n.label}
                </a>
              ))}
            </div>
            {tools.length > 0 && (
              <div className="gw-tools" ref={toolsRef}>
                <button type="button" className={"gw-link gw-tools-btn" + (toolCurrent ? " active" : "")} aria-haspopup="menu" aria-expanded={toolsOpen} onClick={() => { setAccountOpen(false); setToolsOpen(o => !o); }}>
                  Tools
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {toolsOpen && (
                  <div className="gw-menu gw-tools-menu" role="menu">
                    <div className="gw-menu-label">Admin tools</div>
                    {tools.map(t => (
                      <a key={t.href} href={t.href} role="menuitem" className={"gw-menu-item" + (toolCurrent?.href === t.href ? " on" : "")}>{t.label}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <select className="gw-select" aria-label="Go to section" value={current?.href ?? ""} onChange={e => { if (e.target.value) window.location.href = e.target.value; }}>
            {!current && <option value="">{pageTitle}</option>}
            {main.map(n => <option key={n.href} value={n.href}>{n.label}</option>)}
            {tools.length > 0 && (
              <optgroup label="Tools">
                {tools.map(n => <option key={n.href} value={n.href}>{n.label}</option>)}
              </optgroup>
            )}
          </select>
          <div className="gw-right">
            {member?.points != null && <span className="gw-points" title="Your LESARs">{member.points.toLocaleString()} <small>LESARs</small></span>}
            <button ref={appsRef} type="button" className="gw-apps" aria-label="Apps: go to a LESARUSS brand"
              onClick={() => { setAccountOpen(false); window.dispatchEvent(new CustomEvent("lr:toggle-waffle", { detail: { anchor: appsRef.current } })); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" /></svg>
              <span className="gw-apps-label">Apps</span>
            </button>
            <div className="gw-account">
              <button type="button" className="gw-avatar" aria-label="Account" aria-expanded={accountOpen} onClick={() => setAccountOpen(o => !o)}
                style={member?.avatarUrl ? undefined : { background: member?.color || "#7C3AED" }}>
                {member?.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initials}
              </button>
              {accountOpen && (
                <div className="gw-menu" role="menu">
                  <div className="gw-menu-name">{displayName}</div>
                  <div className="gw-menu-sub">{isAdmin && !viewAs ? "Super Admin" : TIER_LABEL[effectiveTier]}</div>
                  {isAdmin && (
                    <div className="gw-menu-section">
                      <div className="gw-menu-label">View as membership</div>
                      {TIERS.map(t => (
                        <button key={t} type="button" role="menuitemradio" aria-checked={viewAs === t} className={"gw-menu-item" + (viewAs === t ? " on" : "")}
                          onClick={() => chooseViewAs(viewAs === t ? null : t)}>
                          {TIER_LABEL[t]}
                        </button>
                      ))}
                      {viewAs && <button type="button" className="gw-menu-item" onClick={() => chooseViewAs(null)}>Back to my real view</button>}
                    </div>
                  )}
                  <a className="gw-menu-item" href="/" role="menuitem">geekfon.ai home</a>
                  <button type="button" className="gw-menu-item" role="menuitem" onClick={signOut}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="gw-body"><FramedContext.Provider value={true}>{children}</FramedContext.Provider></div>
      </div>
      <div ref={barRef} className="gw-bar-mount" />
    </div>
  );
}

const CSS = `
@media (min-width: 761px) { body.gw-lock { overflow: hidden; } }
.gw-shell { position: relative; z-index: 1; min-height: 100vh; }
.gw-window {
  position: fixed; top: 14px; left: 0; right: 0; margin: 0 auto; z-index: 1;
  display: flex; flex-direction: column;
  width: min(96vw, 1560px); height: calc(100vh - 104px); min-height: 320px;
  background: rgba(8,18,16,.82); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,.08); border-radius: 18px; overflow: hidden;
  box-shadow: 0 30px 90px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.3);
}
.gw-titlebar { position: relative; z-index: 30; display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding: 13px 18px; background: rgba(255,255,255,.04); border-bottom: 1px solid rgba(255,255,255,.07); }
.gw-dots { display: flex; gap: 6px; flex-shrink: 0; }
.gw-light { position: relative; width: 11px; height: 11px; border-radius: 50%; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; flex-shrink: 0; }
.gw-light::before { content: ''; position: absolute; inset: -5px -3px; }
.gw-light svg { width: 9px; height: 9px; fill: none; stroke: rgba(0,0,0,.6); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; opacity: 0; }
.gw-dots:hover .gw-light svg, .gw-light:focus-visible svg { opacity: 1; }
.gw-light:focus-visible { outline: 2px solid #00B4FF; outline-offset: 2px; }
.gw-close { background: #ff5f57; } .gw-min { background: #febc2e; } .gw-max { background: #28c840; }
.gw-light[aria-disabled="true"] { cursor: default; }
.gw-dots:hover .gw-light[aria-disabled="true"] svg { opacity: 0; }
.gw-title { flex: 1; min-width: 0; text-align: center; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gw-spacer { width: 45px; flex-shrink: 0; }

.gw-topnav { position: relative; z-index: 30; flex-shrink: 0; min-height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 20px; border-bottom: 1px solid rgba(255,255,255,.07); background: rgba(2,12,10,.6); }
.gw-left { display: flex; align-items: center; gap: 22px; min-width: 0; }
.gw-logo { display: inline-flex; align-items: center; gap: 7px; text-decoration: none; font-size: 18px; font-weight: 900; letter-spacing: -.01em; flex-shrink: 0; }
.gw-logo img { width: 26px; height: 26px; object-fit: contain; }
.gw-geek { color: #fff; }
@keyframes gwHue { 0% { color: #E91E8C; } 25% { color: #00B4FF; } 50% { color: #AAFF00; } 75% { color: #F69820; } 100% { color: #E91E8C; } }
.gw-fon { animation: gwHue 6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .gw-fon { animation: none; color: #00B4FF; } }
.gw-links { display: flex; gap: 4px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
.gw-link { font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: rgba(255,255,255,.7); text-decoration: none; padding: 8px 11px; border-radius: 8px; white-space: nowrap; }
.gw-link:hover { color: #fff; background: rgba(255,255,255,.06); }
.gw-link.active { color: #fff; background: rgba(255,255,255,.1); }
.gw-select { display: none; }
.gw-tools { position: relative; flex-shrink: 0; margin-left: -18px; }
.gw-tools-btn { display: inline-flex; align-items: center; gap: 5px; border: none; background: none; font: inherit; font-size: 12px; cursor: pointer; }
.gw-tools-btn svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.gw-tools-btn:focus:not(:focus-visible) { outline: none; }
.gw-tools-btn.active { background: rgba(255,255,255,.1); color: #fff; }
.gw-tools-menu { left: 0; right: auto; }
.gw-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.gw-points { font-size: 13px; font-weight: 900; color: #fff; }
.gw-points small { font-size: 9px; font-weight: 800; letter-spacing: .14em; color: #F69820; }
.gw-apps { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); color: #fff; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.gw-apps svg { width: 15px; height: 15px; fill: currentColor; }
.gw-apps:hover { background: rgba(255,255,255,.1); }
.gw-account { position: relative; }
.gw-avatar { width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(255,255,255,.18); color: #fff; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
.gw-avatar img { width: 100%; height: 100%; object-fit: cover; }
.gw-menu { position: absolute; right: 0; top: calc(100% + 8px); min-width: 220px; background: #141a19; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 8px; box-shadow: 0 18px 40px rgba(0,0,0,.5); z-index: 50; }
.gw-menu-name { font-size: 13px; font-weight: 800; color: #fff; padding: 6px 8px 0; }
.gw-menu-sub { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #F69820; padding: 2px 8px 8px; }
.gw-menu-section { border-top: 1px solid rgba(255,255,255,.08); border-bottom: 1px solid rgba(255,255,255,.08); margin: 4px 0; padding: 6px 0; }
.gw-menu-label { font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.45); padding: 4px 8px; }
.gw-menu-item { display: block; width: 100%; text-align: left; background: none; border: none; color: rgba(255,255,255,.8); font: inherit; font-size: 12px; font-weight: 700; padding: 8px; border-radius: 8px; text-decoration: none; cursor: pointer; }
.gw-menu-item:hover, .gw-menu-item.on { background: rgba(255,255,255,.08); color: #fff; }

/* The page's own stacking context, under the title bar and nav: art-led pages
   (home, radio, roster) paint full-window fixed layers that should sit
   behind the glass chrome, never over it. */
.gw-body { position: relative; z-index: 1; flex: 1; min-height: 0; overflow-y: auto; }

@media (min-width: 761px) {
  .gw-window.is-fullscreen { top: 0; width: 100%; height: 100vh; min-height: 0; border-radius: 0; border: none; box-shadow: none; }
  .gw-window.is-fullscreen .gw-body { padding-bottom: 104px; }
}
@media (max-width: 900px) {
  .gw-topnav { flex-wrap: wrap; padding: 10px 14px; row-gap: 10px; }
  .gw-links, .gw-tools { display: none; }
  .gw-select { display: block; order: 3; flex: 0 0 100%; height: 40px; border-radius: 10px; background: rgba(255,255,255,.06); color: #fff; border: 1px solid rgba(255,255,255,.14); font: inherit; font-size: 13px; font-weight: 700; padding: 0 10px; }
  .gw-select option { color: #111; }
  .gw-apps-label, .gw-points { display: none; }
  .gw-apps { padding: 0 9px; }
}
@media (max-width: 760px) {
  .gw-shell { padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)); }
  /* No backdrop-filter on phones: it makes the window the containing block
     for fixed children, and here the window scrolls with the page, so docked
     players would land at the end of the page instead of the screen. */
  .gw-window { position: static; display: block; overflow: clip; width: auto; max-width: 100%; height: auto; min-height: 0; margin: 12px; border-radius: 14px; backdrop-filter: none; -webkit-backdrop-filter: none; background: #0b1513; }
  .gw-titlebar { display: none; }
  .gw-body { overflow: visible; }
  .gw-topnav { position: sticky; top: 0; }
}
`;
