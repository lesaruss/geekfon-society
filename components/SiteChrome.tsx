"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/app/dashboard/context";

type Tier = "public" | "passport" | "plus" | "pro";
type NavItem = { label: string; href: string };

// GeekFon Radio added 2026-07-26 per Sean: the /radio page (and the homepage
// hero-circle play button) no longer require an account, so the nav should
// surface it to anonymous visitors too, not just logged-in tiers below.
const NAV_PUBLIC: NavItem[] = [
  { label: "Overview",      href: "/#overview" },
  { label: "Roster",        href: "/roster" },
  { label: "GeekFon Radio", href: "/radio" },
];

const NAV_PASSPORT: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Library",         href: "/dashboard/library" },
  { label: "Leaderboard",     href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const NAV_PLUS: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Library",         href: "/dashboard/library" },
  { label: "Leaderboard",     href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Plus",            href: "/plus" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const NAV_PRO: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Library",         href: "/dashboard/library" },
  { label: "Leaderboard",     href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Plus",            href: "/plus" },
  { label: "GeekFon Radio",   href: "/radio" },
];



function navForTier(tier: Tier, isAdmin = false, canSeeReleaseSchedule = false, canSeeRadioSchedule = false, canSeeMembers = false): NavItem[] {
  let base: NavItem[];
  if (tier === "plus")          base = NAV_PLUS;
  else if (tier === "pro")      base = NAV_PRO;
  else if (tier === "passport") base = NAV_PASSPORT;
  else                          base = NAV_PUBLIC;
  // Release Schedule is restricted to Sean's account (ADMIN_EMAIL) only - not a tier
  // perk, not a role perk. isAdmin alone used to be enough (any super_admin/admin
  // role), which is broader than intended. See navForTier caller for the exact check.
  if (canSeeReleaseSchedule) {
    base = [...base, { label: "Release Schedule", href: "/dashboard/release-schedule" }];
  }
  // Radio Schedule is the admin control panel for the GeekFon Radio rotation - same
  // account-only gate as Release Schedule (locked 2026-07-07), not a tier/role perk.
  if (canSeeRadioSchedule) {
    base = [...base, { label: "Radio Schedule", href: "/dashboard/radio-schedule" }];
  }
  // Members list (name/email/tier/points/joined/last login) - same account-only gate,
  // not a tier/role perk. Standalone page pulled out of the dashboard 2026-07-13.
  if (canSeeMembers) {
    base = [...base, { label: "Members", href: "/dashboard/members" }];
  }
  return base;
}

const TIER_ACCENT: Record<Tier, string> = {
  public:   "#E91E8C",
  passport: "#E91E8C",
  plus:     "#F69820",
  pro:      "#AAFF00",
};

const TIER_LABEL: Record<Tier, string> = {
  public:   "Public",
  passport: "Passport",
  plus:     "Plus",
  pro:      "Pro",
};

const TIERS: Tier[] = ["public", "passport", "plus", "pro"];

function parseTier(raw: string): Tier {
  const r = (raw || "").toLowerCase();
  if (r === "all-access") return "plus";
  if (r === "lifetime")   return "pro";
  if (r === "passport")   return "passport";
  return "public";
}

type Crumb = { label: string; href?: string };
type MemberOverride = { name: string; balance: number; initial: string; tier?: string; isAdmin?: boolean; email?: string | null };
type AuthState = { loading: boolean; tier: Tier; name: string; initial: string; balance: number; isAdmin: boolean; email: string | null };

function GeekFonLogo() {
  return (
    <span className="gfs-logo" aria-label="GeekFon Society">
      <img src="/geekfon-logo.png" alt="" className="gfs-icon" aria-hidden="true" />
      <span className="gfs-word">
        <span className="gfs-geek">GEEK</span>
        <span className="gfs-fon">FON</span>
      </span>
    </span>
  );
}

export default function SiteChrome({
  children,
  crumb,
  member,
}: {
  children: React.ReactNode;
  crumb?: Crumb[];
  member?: MemberOverride;
}) {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({
    loading: !member,
    tier: "public",
    name: "",
    initial: "",
    balance: 0,
    isAdmin: false,
    email: null,
  });

  const [viewAs, setViewAs] = useState<Tier | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gfs-view-as") as Tier | null;
    if (saved && TIERS.includes(saved)) setViewAs(saved);
  }, []);

  const handleViewAs = (t: Tier) => {
    const final = t === auth.tier && viewAs === null ? null : t;
    const newViewAs = final === auth.tier ? null : t;
    setViewAs(newViewAs);
    if (final === auth.tier) {
      localStorage.removeItem("gfs-view-as");
      window.dispatchEvent(new CustomEvent("gfs-view-as", { detail: null }));
    } else if (t !== auth.tier) {
      localStorage.setItem("gfs-view-as", t);
      window.dispatchEvent(new CustomEvent("gfs-view-as", { detail: t }));
    }
    setAdminOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setAdminOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (member) {
      const tier = parseTier(member.tier || "passport");
      setAuth({
        loading: false,
        tier,
        name: member.name,
        initial: member.initial,
        balance: member.balance,
        isAdmin: member.isAdmin || false,
        email: member.email ?? null,
      });
      return;
    }

    let cancelled = false;
    async function loadAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setAuth({ loading: false, tier: "public", name: "", initial: "", balance: 0, isAdmin: false, email: null });
          return;
        }
        const u = session.user;
        const [{ data }, { data: pts }] = await Promise.all([
          supabase
            .from("gfs_members")
            .select("name, tier, role")
            .eq("user_id", u.id)
            .maybeSingle(),
          supabase
            .from("member_points")
            .select("available_points")
            .eq("user_id", u.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        const displayName = data?.name || u.email || "Member";
        const tier = parseTier(data?.tier || "passport");
        const isAdmin = data?.role === "admin" || data?.role === "super_admin";
        setAuth({
          loading: false,
          tier,
          name: displayName,
          initial: displayName.charAt(0).toUpperCase(),
          balance: pts?.available_points || 0,
          isAdmin,
          email: u.email ?? null,
        });
      } catch {
        if (!cancelled) setAuth({ loading: false, tier: "public", name: "", initial: "", balance: 0, isAdmin: false, email: null });
      }
    }
    loadAuth();
    return () => { cancelled = true; };
  }, [member]);

  const effectiveTier: Tier = (auth.isAdmin && viewAs) ? viewAs : auth.tier;
  // Real-account gate for Release Schedule: Sean's account only, never derived from
  // tier or role, and never visible while simulating another tier via View As.
  const canSeeReleaseSchedule = auth.email === ADMIN_EMAIL && !viewAs;
  const canSeeRadioSchedule = auth.email === ADMIN_EMAIL && !viewAs;
  const canSeeMembers = auth.email === ADMIN_EMAIL && !viewAs;
  const nav = navForTier(effectiveTier, auth.isAdmin && !viewAs, canSeeReleaseSchedule, canSeeRadioSchedule, canSeeMembers);
  const isLoggedIn = effectiveTier !== "public" && !auth.loading;
  const tierAccent = TIER_ACCENT[effectiveTier];
  const tierLabel  = TIER_LABEL[effectiveTier];

  // Not simulating - showing the real account, which for admin is "Super Admin", not
  // whatever membership tier happens to be on the underlying gfs_members row (Sean's is
  // "passport"). Only affects the "View as membership" selector's closed-state display;
  // the dropdown options themselves are still the 4 simulate-able tiers.
  const isRealAdminView   = auth.isAdmin && !viewAs;
  const viewAsDisplayLabel = isRealAdminView ? "Super Admin" : TIER_LABEL[effectiveTier];
  const viewAsDisplayColor = isRealAdminView ? "#fff" : TIER_ACCENT[effectiveTier];

  return (
    <>
      <style>{CHROME_CSS}</style>

      <header className="gtop">
        <a href="/" className="glogo" aria-label="GeekFon Society home">
          <GeekFonLogo />
        </a>

        {crumb && crumb.length > 0 && (
          <nav className="gcrumb" aria-label="Breadcrumb">
            {crumb.map((x, i, a) => (
              <span key={i}>
                {x.href ? <a href={x.href}>{x.label}</a> : <span className="gcrumb-cur">{x.label}</span>}
                {i < a.length - 1 && <span className="gcrumb-sep">/</span>}
              </span>
            ))}
          </nav>
        )}

        {/* Right side: always pinned to far right */}
        <div className="gtop-right">
          {!auth.loading && isLoggedIn && auth.balance > 0 && (
            <div className="gmember-balance">
              <span className="gmember-balance-num">{auth.balance.toLocaleString()}</span>
              <span className="gmember-balance-label">Points</span>
            </div>
          )}
          {!auth.loading && !isLoggedIn && (
            <div className="gauth">
              <a href="/login" className="glogin">Log in</a>
              <a href="/passport" className="gcta">Get Passport</a>
            </div>
          )}

          {/* Top-bar "Viewing as" chip removed 2026-07-07 per Sean - simulator state is
              still visible/controllable from the hamburger drawer's "View as membership"
              panel below, including its own "Reset to my account" exit control. */}
          <button className="gham" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
        </div>
      </header>

      <div className={"gscrim" + (open ? " open" : "")} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={"gdrawer" + (open ? " open" : "")} aria-hidden={!open} inert={!open} aria-label="Site navigation">
        <div className="gdrawer-head">
          <GeekFonLogo />
          <button className="gx" aria-label="Close menu" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <nav className="gnav">
          {nav.map((n, i) => (
            <a key={n.href + i} href={n.href} className="gitem" onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
        </nav>

        {!isLoggedIn && (
          <a href="/welcome" className="gdrawer-tour-link" onClick={() => setOpen(false)}>
            Take the Tour
          </a>
        )}

        {isLoggedIn ? (
          <div className="gdrawer-member">
            <div className="gdm-avatar" style={{ background: tierAccent }}>{auth.initial}</div>
            <div className="gdm-info">
              <div className="gdm-name">{auth.name}</div>
              <div className="gdm-tier" style={{ color: tierAccent }}>
                {auth.isAdmin ? "Super Admin" : `${tierLabel} Member`}
              </div>
            </div>
            {auth.balance > 0 && (
              <div className="gdm-balance">
                <div className="gdm-balance-num">{auth.balance.toLocaleString()}</div>
                <div className="gdm-balance-label" style={{ color: tierAccent }}>Points</div>
              </div>
            )}
          </div>
        ) : (
          <div className="gdrawer-cta">
            <a href="/passport" className="gdrawer-cta-btn" onClick={() => setOpen(false)}>Get Your Passport</a>
            <p className="gdrawer-cta-sub">Join GeekFon Society and unlock your dashboard, Points, and exclusive artist content.</p>
            <a href="/login" className="gdrawer-login" onClick={() => setOpen(false)}>Already a member? Log in</a>
          </div>
        )}

        {auth.isAdmin && !auth.loading && (
          <div className="gdrawer-viewas" ref={adminRef}>
            <div className="gdva-label">View as membership</div>
            <button className={"gdva-btn" + (adminOpen ? " open" : "")} onClick={() => setAdminOpen(v => !v)} aria-haspopup="listbox" aria-expanded={adminOpen}>
              <span className="gdva-dot" style={{ background: viewAsDisplayColor }} />
              <span style={{ color: viewAsDisplayColor }}>{viewAsDisplayLabel}</span>
              <svg viewBox="0 0 24 24" className="gdva-caret"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {adminOpen && (
              <div className="gdva-menu" role="listbox">
                {TIERS.map(t => (
                  <button key={t} className={"gdva-option" + (effectiveTier === t ? " active" : "")} onClick={() => handleViewAs(t)} role="option" aria-selected={effectiveTier === t}>
                    <span className="gdva-dot" style={{ background: TIER_ACCENT[t] }} />
                    {TIER_LABEL[t]}
                    {effectiveTier === t && <svg viewBox="0 0 24 24" className="gdva-check"><path d="M5 13l4 4L19 7" /></svg>}
                  </button>
                ))}
                {viewAs !== null && (
                  <button className="gdva-reset" onClick={() => { setViewAs(null); localStorage.removeItem("gfs-view-as"); window.dispatchEvent(new CustomEvent("gfs-view-as", { detail: null })); setAdminOpen(false); }}>
                    Reset to my account
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="gbody">{children}</div>
    </>
  );
}

const CHROME_CSS = `
/* Fixed 2026-07-26 per Sean (on his phone): position:sticky let the header
   detach from the top edge during iOS rubber-band overscroll - pulling down
   revealed a gray gap above it (the page background showing through, since
   a sticky element only holds its position within normal document flow,
   not the true viewport edge). Switched to position:fixed so the header is
   pinned to the actual top of the viewport (below the safe-area/notch) and
   never moves, drags, or gaps during overscroll. .gbody now carries the
   padding-top .gtop used to reserve automatically via flow when it was
   sticky, so content still starts right below the header. */
.gtop { position: fixed; top: 0; left: 0; right: 0; z-index: 40; height: calc(60px + env(safe-area-inset-top, 0px)); box-sizing: border-box; display: flex; align-items: center; gap: 8px; padding: env(safe-area-inset-top, 0px) 18px 0 18px; background: #1a1a1a; border-bottom: 1px solid rgba(255,255,255,.08); }
.gbody { padding-top: calc(60px + env(safe-area-inset-top, 0px)); }
.gtop-right { margin-left: auto; flex-shrink: 0; display: flex; align-items: center; gap: 8px; }
.gham { width: 40px; height: 40px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #fff; flex-shrink: 0; }
.gham:hover { background: rgba(255,255,255,0.1); }
.gham svg { width: 23px; height: 23px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; }
@keyframes fonHue { 0% { color: #E91E8C; } 25% { color: #00B4FF; } 50% { color: #AAFF00; } 75% { color: #F69820; } 100% { color: #E91E8C; } }
.gfs-logo { font-family: 'Montserrat', -apple-system, sans-serif; font-size: 20px; font-weight: 900; letter-spacing: -.01em; line-height: 1; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; user-select: none; text-decoration: none; }
.gfs-word { display: inline; }
.gfs-geek, .gfs-fon { display: inline; }
.gfs-icon { height: 28px; width: 28px; object-fit: contain; display: block; flex-shrink: 0; }
.gfs-geek { color: #fff; }
.gfs-fon { animation: fonHue 6s ease-in-out infinite; }
.gdrawer .gfs-geek { color: #fff; }
.glogo { display: flex; align-items: center; flex-shrink: 0; text-decoration: none; }
.gcrumb { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; overflow: hidden; font-family: 'Montserrat', sans-serif; }
.gcrumb a, .gcrumb .gcrumb-cur { font-size: 14px; font-weight: 800; letter-spacing: .01em; color: #fff; white-space: nowrap; }
.gcrumb a:hover { color: #9c1458; }
.gcrumb .gcrumb-cur { color: #9c1458; }
.gcrumb-sep { color: rgba(255,255,255,.3); font-weight: 600; }
.gtop-shimmer { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%); background-size: 200% 100%; animation: gShimmer 1.4s infinite; flex-shrink: 0; }
@keyframes gShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.gcta { flex-shrink: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #9c1458; border: 1px solid #E91E8C; border-radius: 20px; padding: 8px 17px; background: #fff; text-decoration: none; }
.gcta:hover { background: rgba(233,30,140,.07); }
.gauth { flex-shrink: 0; display: flex; align-items: center; gap: 14px; }
.glogin { flex-shrink: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #fff; text-decoration: none; opacity: .85; }
.glogin:hover { opacity: 1; }
@media(max-width:640px) { .glogin { display: none; } }
/* Mobile/tablet top bar (incl. iPad portrait): logo + hamburger only. Everything else
   the top bar can show - Log in, Get Passport, Points balance - is one tap away in the
   hamburger drawer already, so keeping it out of the bar itself avoids the crowding
   Sean flagged while traveling. Desktop keeps all of it. The admin "Viewing as" chip
   itself was removed from the top bar entirely on 2026-07-07 (desktop and mobile). */
@media(max-width:900px) {
  .gauth, .gmember-balance { display: none; }
}
.gdrawer-login { display: block; text-align: center; font-size: 11px; font-weight: 700; color: rgba(255,255,255,.55); text-decoration: underline; text-underline-offset: 3px; }
.gdrawer-login:hover { color: #fff; }
.gmember-balance { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
.gmember-balance-num { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -.01em; }
.gmember-balance-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: #9c1458; margin-top: 2px; }
.gmember-avatar { width: 36px; height: 36px; border-radius: 50%; color: #fff; font-size: 14px; font-weight: 900; text-transform: uppercase; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
.gscrim { position: fixed; inset: 0; background: rgba(0,0,0,.45); opacity: 0; pointer-events: none; transition: opacity .25s; z-index: 50; }
.gscrim.open { opacity: 1; pointer-events: auto; }
.gdrawer { position: fixed; top: 0; right: 0; left: auto; bottom: 0; width: 280px; background: #111; color: #fff; z-index: 60; transform: translateX(100%); transition: transform .26s cubic-bezier(.4,0,.2,1); display: flex; flex-direction: column; overflow-y: auto; }
.gdrawer.open { transform: translateX(0); }
.gfs-nav-circle { height: 28px; width: 28px; object-fit: contain; flex-shrink: 0; cursor: pointer; border-radius: 50%; filter: brightness(0) saturate(100%) invert(51%) sepia(98%) saturate(1200%) hue-rotate(178deg) brightness(103%) contrast(104%); opacity: .9; }
.gfs-nav-circle:hover { opacity: 1; }
.gdrawer-head { display: flex; align-items: center; justify-content: space-between; height: calc(60px + env(safe-area-inset-top, 0px)); box-sizing: border-box; padding: env(safe-area-inset-top, 0px) 14px 0 18px; border-bottom: 1px solid rgba(255,255,255,.08); }
.gx { width: 34px; height: 34px; border: none; background: none; cursor: pointer; color: rgba(255,255,255,.6); display: flex; align-items: center; justify-content: center; border-radius: 7px; }
.gx:hover { background: rgba(255,255,255,.08); color: #fff; }
.gx svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }
.gnav { padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
.gitem { display: block; padding: 11px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.7); text-decoration: none; }
.gitem:hover { background: rgba(255,255,255,.07); color: #fff; }
.gdrawer-tour-link { display: block; margin: 12px 16px; padding: 12px 18px; border-radius: 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #E91E8C; text-decoration: none; background: rgba(233,30,140,.1); border: 1px solid rgba(233,30,140,.3); text-align: center; transition: background .2s; }
.gdrawer-tour-link:hover { background: rgba(233,30,140,.2); }
.gdrawer-member { padding: 16px; border-top: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; gap: 12px; }
.gdm-avatar { width: 38px; height: 38px; border-radius: 50%; color: #fff; font-size: 15px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gdm-info { flex: 1; min-width: 0; }
.gdm-name { font-size: 13px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gdm-tier { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; margin-top: 2px; }
.gdm-balance { text-align: right; flex-shrink: 0; }
.gdm-balance-num { font-size: 14px; font-weight: 900; color: #fff; }
.gdm-balance-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; margin-top: 1px; }
.gdrawer-cta { padding: 20px 18px; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 12px; }
.gdrawer-cta-btn { display: block; text-align: center; padding: 13px 20px; border-radius: 100px; background: #E91E8C; color: #fff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; text-decoration: none; }
.gdrawer-cta-btn:hover { background: #c41874; }
.gdrawer-cta-sub { font-size: 11px; font-weight: 500; line-height: 1.6; color: rgba(255,255,255,.35); margin: 0; }
.gdrawer-viewas { position: relative; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,.08); }
.gdva-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.3); margin-bottom: 8px; }
.gdva-btn { display: flex; align-items: center; gap: 8px; width: 100%; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: background .15s; }
.gdva-btn:hover, .gdva-btn.open { background: rgba(255,255,255,.1); }
.gdva-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.gdva-caret { width: 14px; height: 14px; stroke: rgba(255,255,255,.4); fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; margin-left: auto; transition: transform .2s; }
.gdva-btn.open .gdva-caret { transform: rotate(180deg); }
.gdva-menu { position: absolute; bottom: calc(100% - 8px); left: 16px; right: 16px; background: #222; border-radius: 10px; overflow: hidden; box-shadow: 0 -4px 24px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.08); }
.gdva-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.6); background: none; border: none; cursor: pointer; text-align: left; transition: background .12s; }
.gdva-option:hover { background: rgba(255,255,255,.07); color: #fff; }
.gdva-option.active { color: #fff; background: rgba(255,255,255,.05); }
.gdva-check { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; margin-left: auto; opacity: .7; }
.gdva-reset { display: block; width: 100%; padding: 10px 14px; font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.3); background: none; border: none; border-top: 1px solid rgba(255,255,255,.07); cursor: pointer; text-align: center; }
.gdva-reset:hover { color: rgba(255,255,255,.6); }
`;


