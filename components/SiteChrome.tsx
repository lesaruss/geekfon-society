"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ── Tier system ────────────────────────────────────────────────────────────────
type Tier = "public" | "passport" | "plus" | "pro";

type NavItem = { label: string; href: string };

// Public (not logged in)
const NAV_PUBLIC: NavItem[] = [
  { label: "Roster",        href: "/roster" },
  { label: "GeekFon Radio", href: "/radio" },
];

// Passport - basic member
const NAV_PASSPORT: NavItem[] = [
  { label: "Overview",      href: "/dashboard" },
  { label: "Roster",        href: "/roster" },
  { label: "Library",       href: "/dashboard/library" },
  { label: "Leaderboard",   href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "GeekFon Radio", href: "/radio" },
];

// Plus - enhanced member
const NAV_PLUS: NavItem[] = [
  { label: "Overview",      href: "/dashboard" },
  { label: "Roster",        href: "/roster" },
  { label: "Library",       href: "/dashboard/library" },
  { label: "Leaderboard",   href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Plus",          href: "/plus" },
  { label: "GeekFon Radio", href: "/radio" },
];

// Pro - full access (same as Plus for now, expands as features ship)
const NAV_PRO: NavItem[] = [
  { label: "Overview",      href: "/dashboard" },
  { label: "Roster",        href: "/roster" },
  { label: "Library",       href: "/dashboard/library" },
  { label: "Leaderboard",   href: "/dashboard/leaderboard" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Plus",          href: "/plus" },
  { label: "GeekFon Radio", href: "/radio" },
];

function navForTier(tier: Tier): NavItem[] {
  if (tier === "plus")    return NAV_PLUS;
  if (tier === "pro")     return NAV_PRO;
  if (tier === "passport") return NAV_PASSPORT;
  return NAV_PUBLIC;
}

const TIER_ACCENT: Record<Tier, string> = {
  public:   "#E91E8C",
  passport: "#E91E8C",
  plus:     "#F69820",
  pro:      "#AAFF00",
};

const TIER_LABEL: Record<string, string> = {
  passport: "Passport",
  plus:     "Plus",
  pro:      "Pro",
};

// ── Types ──────────────────────────────────────────────────────────────────────
type Crumb = { label: string; href?: string };

// Optional override prop — dashboard passes this since it already fetched auth data.
// All other pages omit it; SiteChrome self-authenticates.
type MemberOverride = {
  name: string;
  balance: number;
  initial: string;
  tier?: string;
};

type AuthState = {
  loading: boolean;
  tier: Tier;
  name: string;
  initial: string;
  balance: number; // only populated when member prop is passed
};

// ── Logo ───────────────────────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────────
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
    loading: !member,   // if member prop provided, skip loading
    tier: "public",
    name: "",
    initial: "",
    balance: 0,
  });

  // Close drawer on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auth: use override prop if provided; otherwise self-authenticate
  useEffect(() => {
    if (member) {
      const rawTier = (member.tier || "passport").toLowerCase();
      const tier: Tier =
        rawTier === "plus"    ? "plus"    :
        rawTier === "pro"     ? "pro"     :
        rawTier === "passport"? "passport":
        "public";
      setAuth({ loading: false, tier, name: member.name, initial: member.initial, balance: member.balance });
      return;
    }

    let cancelled = false;
    async function loadAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setAuth({ loading: false, tier: "public", name: "", initial: "", balance: 0 });
          return;
        }
        const u = session.user;
        const { data } = await supabase
          .from("gfs_members")
          .select("name, tier")
          .eq("user_id", u.id)
          .maybeSingle();
        if (cancelled) return;
        const displayName = data?.name || u.email || "Member";
        const rawTier = (data?.tier || "passport").toLowerCase();
        const tier: Tier =
          rawTier === "plus"    ? "plus"    :
          rawTier === "pro"     ? "pro"     :
          rawTier === "passport"? "passport":
          "public";
        setAuth({
          loading: false,
          tier,
          name: displayName,
          initial: displayName.charAt(0).toUpperCase(),
          balance: 0, // balance is only loaded on dashboard (perf)
        });
      } catch {
        if (!cancelled) setAuth({ loading: false, tier: "public", name: "", initial: "", balance: 0 });
      }
    }
    loadAuth();
    return () => { cancelled = true; };
  }, [member]);

  const nav = navForTier(auth.tier);
  const isLoggedIn = auth.tier !== "public" && !auth.loading;
  const tierAccent = TIER_ACCENT[auth.tier];
  const tierLabel  = TIER_LABEL[auth.tier] || "";

  return (
    <>
      <style>{CHROME_CSS}</style>

      {/* ── Topbar ── */}
      <header className="gtop">
        <button
          className="gham"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <a href="/" className="glogo" aria-label="GeekFon Society home">
          <GeekFonLogo />
        </a>

        {crumb && crumb.length > 0 && (
          <nav className="gcrumb" aria-label="Breadcrumb">
            {crumb.map((x, i, a) => (
              <span key={i}>
                {x.href ? (
                  <a href={x.href}>{x.label}</a>
                ) : (
                  <span className="gcrumb-cur">{x.label}</span>
                )}
                {i < a.length - 1 && <span className="gcrumb-sep">/</span>}
              </span>
            ))}
          </nav>
        )}

        {/* Right side: loading shimmer | member chip | logged-out CTA */}
        {auth.loading ? (
          <div className="gtop-shimmer" aria-hidden="true" />
        ) : isLoggedIn ? (
          <div className="gmember-chip">
            {auth.balance > 0 && (
              <div className="gmember-balance">
                <span className="gmember-balance-num">
                  {auth.balance.toLocaleString()}
                </span>
                <span className="gmember-balance-label">LESARs</span>
              </div>
            )}
            <div
              className="gmember-avatar"
              aria-label={auth.name}
              style={{ background: tierAccent }}
            >
              {auth.initial}
            </div>
          </div>
        ) : (
          <a href="/passport" className="gcta">
            Get Passport
          </a>
        )}
      </header>

      {/* ── Scrim ── */}
      <div
        className={"gscrim" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <aside
        className={"gdrawer" + (open ? " open" : "")}
        aria-hidden={!open}
        aria-label="Site navigation"
      >
        <div className="gdrawer-head">
          <GeekFonLogo />
          <button className="gx" aria-label="Close menu" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="gnav">
          {nav.map((n, i) => (
            <a
              key={n.href + i}
              href={n.href}
              className="gitem"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Drawer footer: member info if logged in, upgrade CTA if not */}
        {isLoggedIn ? (
          <div className="gdrawer-member">
            <div
              className="gdm-avatar"
              style={{ background: tierAccent }}
            >
              {auth.initial}
            </div>
            <div className="gdm-info">
              <div className="gdm-name">{auth.name}</div>
              <div className="gdm-tier" style={{ color: tierAccent }}>
                {tierLabel} Member
              </div>
            </div>
            {auth.balance > 0 && (
              <div className="gdm-balance">
                <div className="gdm-balance-num">
                  {auth.balance.toLocaleString()}
                </div>
                <div className="gdm-balance-label" style={{ color: tierAccent }}>
                  LESARs
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="gdrawer-cta">
            <a href="/passport" className="gdrawer-cta-btn" onClick={() => setOpen(false)}>
              Get Your Passport
            </a>
            <p className="gdrawer-cta-sub">
              Join GeekFon Society and unlock your dashboard, LESARs, and exclusive artist content.
            </p>
          </div>
        )}
      </aside>

      <div className="gbody">{children}</div>
    </>
  );
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CHROME_CSS = `
/* ── Topbar ── */
.gtop {
  position: sticky; top: 0; z-index: 40; height: 60px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 18px; background: #fff; border-bottom: 1px solid rgba(0,0,0,.08);
}
.gham {
  width: 40px; height: 40px; border: none; background: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; color: #1a1a1a; flex-shrink: 0;
}
.gham:hover { background: #f5f5f5; }
.gham svg {
  width: 23px; height: 23px; stroke: currentColor; fill: none;
  stroke-width: 2.2; stroke-linecap: round;
}

/* ── Logo ── */
@keyframes fonHue {
  0%   { color: #E91E8C; }
  25%  { color: #00B4FF; }
  50%  { color: #AAFF00; }
  75%  { color: #F69820; }
  100% { color: #E91E8C; }
}
.gfs-logo {
  font-family: 'Montserrat', -apple-system, sans-serif;
  font-size: 20px; font-weight: 900; letter-spacing: -.01em; line-height: 1;
  text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px;
  user-select: none; text-decoration: none;
}
.gfs-word { display: inline; }
.gfs-geek, .gfs-fon { display: inline; }
.gfs-icon { height: 28px; width: 28px; object-fit: contain; display: block; flex-shrink: 0; }
.gfs-geek { color: #1a1a1a; }
.gfs-fon  { animation: fonHue 6s ease-in-out infinite; }
.gdrawer .gfs-geek { color: #fff; }
.glogo { display: flex; align-items: center; flex-shrink: 0; text-decoration: none; }

/* ── Breadcrumb ── */
.gcrumb {
  display: flex; align-items: center; gap: 9px; min-width: 0;
  overflow: hidden; font-family: 'Montserrat', sans-serif;
}
.gcrumb a, .gcrumb .gcrumb-cur {
  font-size: 14px; font-weight: 800; letter-spacing: .01em;
  color: #1a1a1a; white-space: nowrap;
}
.gcrumb a:hover { color: #9c1458; }
.gcrumb .gcrumb-cur { color: #9c1458; }
.gcrumb-sep { color: rgba(26,26,26,.3); font-weight: 600; }

/* ── Loading shimmer ── */
.gtop-shimmer {
  margin-left: auto; width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: gShimmer 1.4s infinite;
  flex-shrink: 0;
}
@keyframes gShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

/* ── Logged-out CTA ── */
.gcta {
  margin-left: auto; flex-shrink: 0;
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em;
  color: #9c1458; border: 1px solid #E91E8C;
  border-radius: 20px; padding: 8px 17px; background: #fff; text-decoration: none;
}
.gcta:hover { background: rgba(233,30,140,.07); }

/* ── Member chip ── */
.gmember-chip { margin-left: auto; flex-shrink: 0; display: flex; align-items: center; gap: 10px; }
.gmember-balance { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
.gmember-balance-num { font-size: 15px; font-weight: 900; color: #1a1a1a; letter-spacing: -.01em; }
.gmember-balance-label {
  font-size: 8px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .14em; color: #9c1458; margin-top: 2px;
}
.gmember-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  color: #fff; font-size: 14px; font-weight: 900; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; cursor: pointer;
}

/* ── Scrim ── */
.gscrim {
  position: fixed; inset: 0; background: rgba(0,0,0,.45); opacity: 0;
  pointer-events: none; transition: opacity .25s; z-index: 50;
}
.gscrim.open { opacity: 1; pointer-events: auto; }

/* ── Drawer ── */
.gdrawer {
  position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
  background: #111; color: #fff; z-index: 60;
  transform: translateX(-100%); transition: transform .26s cubic-bezier(.4,0,.2,1);
  display: flex; flex-direction: column; overflow-y: auto;
}
.gdrawer.open { transform: translateX(0); }
.gdrawer-head {
  display: flex; align-items: center; justify-content: space-between;
  height: 60px; padding: 0 14px 0 18px; border-bottom: 1px solid rgba(255,255,255,.08);
}
.gx {
  width: 34px; height: 34px; border: none; background: none; cursor: pointer;
  color: rgba(255,255,255,.6); display: flex; align-items: center; justify-content: center;
  border-radius: 7px;
}
.gx:hover { background: rgba(255,255,255,.08); color: #fff; }
.gx svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

/* ── Nav ── */
.gnav { padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
.gitem {
  display: block; padding: 11px 14px; border-radius: 8px;
  font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: rgba(255,255,255,.7); text-decoration: none;
}
.gitem:hover { background: rgba(255,255,255,.07); color: #fff; }

/* ── Drawer member footer ── */
.gdrawer-member {
  padding: 16px; border-top: 1px solid rgba(255,255,255,.08);
  display: flex; align-items: center; gap: 12px;
}
.gdm-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  color: #fff; font-size: 15px; font-weight: 900;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.gdm-info { flex: 1; min-width: 0; }
.gdm-name {
  font-size: 13px; font-weight: 800; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gdm-tier {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .1em; margin-top: 2px;
}
.gdm-balance { text-align: right; flex-shrink: 0; }
.gdm-balance-num { font-size: 14px; font-weight: 900; color: #fff; }
.gdm-balance-label {
  font-size: 8px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .14em; margin-top: 1px;
}

/* ── Drawer CTA (logged out) ── */
.gdrawer-cta {
  padding: 20px 18px; border-top: 1px solid rgba(255,255,255,.08);
  display: flex; flex-direction: column; gap: 12px;
}
.gdrawer-cta-btn {
  display: block; text-align: center; padding: 13px 20px; border-radius: 100px;
  background: #E91E8C; color: #fff; font-size: 12px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .1em; text-decoration: none;
}
.gdrawer-cta-btn:hover { background: #c41874; }
.gdrawer-cta-sub {
  font-size: 11px; font-weight: 500; line-height: 1.6;
  color: rgba(255,255,255,.35); margin: 0;
}
`;
