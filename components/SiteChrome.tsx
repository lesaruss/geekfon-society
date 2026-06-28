"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Tier = "public" | "passport" | "plus" | "pro";
type NavItem = { label: string; href: string };

const NAV_PUBLIC: NavItem[] = [
  { label: "Overview",   href: "/#overview" },
  { label: "Roster",     href: "/roster" },
];

const NAV_PASSPORT: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Library",         href: "/dashboard/library" },
  { label: "Jukebox",         href: "/dashboard/jukebox" },
  { label: "Leaderboard",     href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const NAV_PLUS: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Library",         href: "/dashboard/library" },
  { label: "Jukebox",         href: "/dashboard/jukebox" },
  { label: "Leaderboard",     href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Plus",            href: "/plus" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const NAV_PRO: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Library",         href: "/dashboard/library" },
  { label: "Jukebox",         href: "/dashboard/jukebox" },
  { label: "Leaderboard",     href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Plus",            href: "/plus" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const STAKEHOLDERS = [
  { label: "Music Fan", href: "/#music-fan" },
  { label: "Producers", href: "/#record-label" },
  { label: "Brand", href: "/#brand" },
  { label: "Promoter", href: "/#promoter" },
];

function navForTier(tier: Tier): NavItem[] {
  if (tier === "plus")     return NAV_PLUS;
  if (tier === "pro")      return NAV_PRO;
  if (tier === "passport") return NAV_PASSPORT;
  return NAV_PUBLIC;
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
type MemberOverride = { name: string; balance: number; initial: string; tier?: string; isAdmin?: boolean };
type AuthState = { loading: boolean; tier: Tier; name: string; initial: string; balance: number; isAdmin: boolean };

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
    setViewAs(final === auth.tier ? null : t);
    if (final === auth.tier) localStorage.removeItem("gfs-view-as");
    else if (t !== auth.tier) localStorage.setItem("gfs-view-as", t);
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
      });
      return;
    }

    let cancelled = false;
    async function loadAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setAuth({ loading: false, tier: "public", name: "", initial: "", balance: 0, isAdmin: false });
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
        });
      } catch {
        if (!cancelled) setAuth({ loading: false, tier: "public", name: "", initial: "", balance: 0, isAdmin: false });
      }
    }
    loadAuth();
    return () => { cancelled = true; };
  }, [member]);

  const effectiveTier: Tier = (auth.isAdmin && viewAs) ? viewAs : auth.tier;
  const nav = navForTier(effectiveTier);
  const isLoggedIn = effectiveTier !== "public" && !auth.loading;
  const tierAccent = TIER_ACCENT[effectiveTier];
  const tierLabel  = TIER_LABEL[effectiveTier];

  return (
    <>
      <style>{CHROME_CSS}</style>

      <header className="gtop">
        <button className="gham" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>

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

        {auth.loading ? (
          <div className="gtop-shimmer" aria-hidden="true" />
        ) : isLoggedIn ? (
          <div className="gmember-chip">
            {auth.balance > 0 && (
              <div className="gmember-balance">
                <span className="gmember-balance-num">{auth.balance.toLocaleString()}</span>
                <span className="gmember-balance-label">LESARs</span>
              </div>
            )}
            <div className="gmember-avatar" aria-label={auth.name} style={{ background: tierAccent }}>
              {auth.initial}
            </div>
          </div>
        ) : (
          <a href="/passport" className="gcta">Get Passport</a>
        )}
      </header>

      <div className={"gscrim" + (open ? " open" : "")} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={"gdrawer" + (open ? " open" : "")} aria-hidden={!open} aria-label="Site navigation">
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
          <div className="gdrawer-stakeholders">
            <div className="gds-label">Who are you?</div>
            <div className="gds-items">
              {STAKEHOLDERS.map((s, i) => (
                <a key={i} href={s.href} className="gds-item" onClick={() => setOpen(false)}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <a href="/shamanic-resin" className="gdrawer-ad" onClick={() => setOpen(false)}>
            <span className="gda-eyebrow">Now Playing</span>
            <span className="gda-title">Shamanic Resin</span>
            <span className="gda-sub">All I Do Is Eat. Listen now.</span>
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
                <div className="gdm-balance-label" style={{ color: tierAccent }}>LESARs</div>
              </div>
            )}
          </div>
        ) : (
          <div className="gdrawer-cta">
            <a href="/passport" className="gdrawer-cta-btn" onClick={() => setOpen(false)}>Get Your Passport</a>
            <p className="gdrawer-cta-sub">Join GeekFon Society and unlock your dashboard, LESARs, and exclusive artist content.</p>
          </div>
        )}

        {auth.isAdmin && !auth.loading && (
          <div className="gdrawer-viewas" ref={adminRef}>
            <div className="gdva-label">View as membership</div>
            <button className={"gdva-btn" + (adminOpen ? " open" : "")} onClick={() => setAdminOpen(v => !v)} aria-haspopup="listbox" aria-expanded={adminOpen}>
              <span className="gdva-dot" style={{ background: TIER_ACCENT[effectiveTier] }} />
              <span style={{ color: TIER_ACCENT[effectiveTier] }}>{TIER_LABEL[effectiveTier]}</span>
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
                  <button className="gdva-reset" onClick={() => { setViewAs(null); localStorage.removeItem("gfs-view-as"); setAdminOpen(false); }}>
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
.gtop { position: sticky; top: 0; z-index: 40; height: 60px; display: flex; align-items: center; gap: 8px; padding: 0 18px; background: #1a1a1a; border-bottom: 1px solid rgba(255,255,255,.08); }
.gham { width: 40px; height: 40px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #fff; flex-shrink: 0; }
.gham:hover { background: #f5f5f5; }
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
.gcrumb-sep { color: rgba(26,26,26,.3); font-weight: 600; }
.gtop-shimmer { margin-left: auto; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%); background-size: 200% 100%; animation: gShimmer 1.4s infinite; flex-shrink: 0; }
@keyframes gShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.gcta { margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #9c1458; border: 1px solid #E91E8C; border-radius: 20px; padding: 8px 17px; background: #fff; text-decoration: none; }
.gcta:hover { background: rgba(233,30,140,.07); }
.gmember-chip { margin-left: auto; flex-shrink: 0; display: flex; align-items: center; gap: 10px; }
.gmember-balance { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
.gmember-balance-num { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -.01em; }
.gmember-balance-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: #9c1458; margin-top: 2px; }
.gmember-avatar { width: 36px; height: 36px; border-radius: 50%; color: #fff; font-size: 14px; font-weight: 900; text-transform: uppercase; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
.gscrim { position: fixed; inset: 0; background: rgba(0,0,0,.45); opacity: 0; pointer-events: none; transition: opacity .25s; z-index: 50; }
.gscrim.open { opacity: 1; pointer-events: auto; }
.gdrawer { position: fixed; top: 0; left: 0; bottom: 0; width: 280px; background: #111; color: #fff; z-index: 60; transform: translateX(-100%); transition: transform .26s cubic-bezier(.4,0,.2,1); display: flex; flex-direction: column; overflow-y: auto; }
.gdrawer.open { transform: translateX(0); }
.gdrawer-head { display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 14px 0 18px; border-bottom: 1px solid rgba(255,255,255,.08); }
.gx { width: 34px; height: 34px; border: none; background: none; cursor: pointer; color: rgba(255,255,255,.6); display: flex; align-items: center; justify-content: center; border-radius: 7px; }
.gx:hover { background: rgba(255,255,255,.08); color: #fff; }
.gx svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }
.gnav { padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
.gitem { display: block; padding: 11px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.7); text-decoration: none; }
.gitem:hover { background: rgba(255,255,255,.07); color: #fff; }
.gdrawer-stakeholders { padding: 14px 16px; border-top: 1px solid rgba(255,255,255,.08); }
.gds-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: rgba(255,255,255,.3); margin-bottom: 8px; }
.gds-items { display: flex; flex-direction: column; gap: 4px; }
.gds-item { display: block; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.65); text-decoration: none; background: none; border: none; cursor: pointer; text-align: left; }
.gds-item:hover { background: rgba(255,255,255,.07); color: #fff; }
.gdrawer-member { padding: 16px; border-top: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; gap: 12px; }
.gdm-avatar { width: 38px; height: 38px; border-radius: 50%; color: #fff; font-size: 15px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gdm-info { flex: 1; min-width: 0; }
.gdm-name { font-size: 13px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gdm-tier { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; margin-top: 2px; }
.gdm-balance { text-align: right; flex-shrink: 0; }
.gdm-balance-num { font-size: 14px; font-weight: 900; color: #fff; }
.gdm-balance-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; margin-top: 1px; }
.gdrawer-ad { display: block; margin: 6px 16px 0; padding: 16px; border-radius: 10px; background: linear-gradient(135deg, rgba(156,39,176,.24), rgba(156,39,176,.06)); border: 1px solid rgba(156,39,176,.45); text-decoration: none; }
.gdrawer-ad:hover { background: linear-gradient(135deg, rgba(156,39,176,.34), rgba(156,39,176,.1)); }
.gda-eyebrow { display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: #cf9bff; margin-bottom: 7px; }
.gda-title { display: block; font-size: 16px; font-weight: 900; color: #fff; letter-spacing: -.01em; }
.gda-sub { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,.6); margin-top: 4px; }
.gdrawer-cta { margin-top: auto; padding: 20px 18px; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 12px; }
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
