"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";
import { DashboardContext, DashboardCtx, TIER_LABEL } from "./context";
import type { GfsMember, MemberPoints, Purchase, Referral } from "./context";

// ── Dashboard sub-pages ───────────────────────────────────────────────────────
const DASH_NAV = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Library",
    href: "/dashboard/library",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="2" fill="currentColor" />
        <line x1="8" y1="2" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    href: "/dashboard/leaderboard",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor" />
        <rect x="6.5" y="5" width="3" height="10" rx="1" fill="currentColor" />
        <rect x="12" y="2" width="3" height="13" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    label: "Artist Top 10",
    href: "/dashboard/top10",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <path
          d="M8 2l1.4 3.2L13 5.8l-2.5 2.4.6 3.5L8 10l-3.1 1.7.6-3.5L3 5.8l3.6-.6L8 2z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

// ── Site-wide nav ─────────────────────────────────────────────────────────────
const SITE_NAV = [
  {
    label: "Roster",
    href: "/roster",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 14c0-2.8 2-4.5 4.5-4.5S10 11.2 10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <path d="M13.5 14c0-2-1-3.5-2-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
  {
    label: "GeekFon Radio",
    href: "/radio",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <path d="M2.5 8a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Passport",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
        <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 12.5c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ctx, setCtx] = useState<DashboardCtx>({
    userId: null,
    userEmail: null,
    member: null,
    points: null,
    purchases: [],
    referral: null,
    memberCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setCtx((c) => ({ ...c, loading: false }));
        return;
      }
      const u = session.user;
      const [memberRes, pointsRes, purchasesRes, referralRes, countRes] =
        await Promise.all([
          supabase.from("gfs_members").select("*").eq("user_id", u.id).maybeSingle(),
          supabase
            .from("member_points")
            .select("available_points,total_points,spent_points")
            .eq("user_id", u.id)
            .maybeSingle(),
          supabase
            .from("point_purchases")
            .select("id,amount_cents,status,created_at")
            .eq("buyer_id", u.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase.from("referrals").select("*").eq("referrer_id", u.id).maybeSingle(),
          supabase.from("gfs_members").select("*", { count: "exact", head: true }),
        ]);
      setCtx({
        userId: u.id,
        userEmail: u.email || null,
        member: memberRes.data ?? null,
        points: pointsRes.data ?? null,
        purchases: purchasesRes.data ?? [],
        referral: referralRes.data ?? null,
        memberCount: countRes.count ?? 0,
        loading: false,
      });
    }
    load();
  }, []);

  const { userId, userEmail, member, points, loading } = ctx;
  const lesars = points?.available_points ?? 0;
  const displayName = member?.name || userEmail || "Member";
  const initial = displayName.charAt(0).toUpperCase();
  const tier = member?.tier || "passport";
  const memberProp = userId
    ? { name: displayName, balance: lesars, initial, tier }
    : undefined;

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? window.location.href
            : "https://geekfon.ai/dashboard",
      },
    });
  }

  const Aurora = () => (
    <div className="dl-aurora" aria-hidden="true">
      <div className="dl-stars" />
      <div className="dl-a dl-a1" />
      <div className="dl-a dl-a2" />
      <div className="dl-a dl-a3" />
      <div className="dl-aurora-ground" />
    </div>
  );

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="dl-sidebar">
      {/* Logo */}
      <a href="/" className="dl-sidebar-logo">
        <span className="dl-sidebar-logo-text">GeekFon</span>
        <span className="dl-sidebar-logo-dot" />
      </a>

      {/* Dashboard sub-pages */}
      <div className="dl-nav-group">
        <div className="dl-nav-group-label">Dashboard</div>
        {DASH_NAV.map((n) => {
          const path = pathname ?? "";
          const active =
            n.href === "/dashboard"
              ? path === "/dashboard"
              : path.startsWith(n.href);
          return (
            <a
              key={n.href}
              href={n.href}
              className={"dl-nav-item" + (active ? " active" : "")}
            >
              <span className="dl-nav-icon">{n.icon}</span>
              {n.label}
            </a>
          );
        })}
      </div>

      <div className="dl-nav-sep" />

      {/* Site nav */}
      <div className="dl-nav-group">
        <div className="dl-nav-group-label">Explore</div>
        {SITE_NAV.map((n) => (
          <a key={n.href + n.label} href={n.href} className="dl-nav-item">
            <span className="dl-nav-icon">{n.icon}</span>
            {n.label}
          </a>
        ))}
      </div>

      {/* Member tag at bottom */}
      {userId && (
        <div className="dl-sidebar-member">
          <div className="dl-sidebar-av">{initial}</div>
          <div className="dl-sidebar-member-info">
            <div className="dl-sidebar-member-name">{displayName}</div>
            <div className="dl-sidebar-member-tier">
              {TIER_LABEL[tier] || tier}
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading)
    return (
      <SiteChrome>
        <style>{LAYOUT_CSS}</style>
        <Aurora />
        <div className="dl-loading">
          <div className="dl-spinner" />
        </div>
      </SiteChrome>
    );

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!userId)
    return (
      <SiteChrome>
        <style>{LAYOUT_CSS}</style>
        <Aurora />
        <div className="dl-gate">
          <div className="dl-gate-card">
            <div className="dl-gate-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#F69820" strokeWidth="2" />
                <path
                  d="M24 14a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-10 20c0-4.4 4.5-8 10-8s10 3.6 10 8"
                  stroke="#F69820"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="dl-gate-title">Members only</h1>
            <p className="dl-gate-sub">
              Sign in to access your dashboard, LESARs balance, and Passport artists.
            </p>
            <button className="dl-google-btn" onClick={signInWithGoogle}>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <div className="dl-gate-divider">
              <span>or</span>
            </div>
            <a href="/passport" className="dl-gate-outline">
              Get your Passport
            </a>
          </div>
        </div>
      </SiteChrome>
    );

  // ── Authenticated layout ───────────────────────────────────────────────────
  return (
    <DashboardContext.Provider value={ctx}>
      <SiteChrome member={memberProp}>
        <style>{LAYOUT_CSS}</style>
        <Aurora />
        <div className="dl-shell">
          <Sidebar />
          {/* Mobile top bar (shown instead of sidebar on small screens) */}
          <div className="dl-mobile-nav" aria-label="Dashboard sections">
            {DASH_NAV.map((n) => {
              const path = pathname ?? "";
              const active =
                n.href === "/dashboard"
                  ? path === "/dashboard"
                  : path.startsWith(n.href);
              return (
                <a
                  key={n.href}
                  href={n.href}
                  className={"dl-mobile-tab" + (active ? " active" : "")}
                >
                  {n.label}
                </a>
              );
            })}
          </div>
          <main className="dl-main">{children}</main>
        </div>
      </SiteChrome>
    </DashboardContext.Provider>
  );
}

const LAYOUT_CSS = `
/* ── Dark bg override ──────────────────────────────────────────────── */
.gbody{background:#020c0a !important;color:#e8e8e8;min-height:100vh;}

/* ── Aurora ────────────────────────────────────────────────────────── */
.dl-aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.dl-stars{position:absolute;inset:0;background-image:
  radial-gradient(1px 1px at 9% 6%,rgba(255,255,255,.55) 0%,transparent 100%),
  radial-gradient(1px 1px at 24% 12%,rgba(255,255,255,.35) 0%,transparent 100%),
  radial-gradient(1px 1px at 44% 4%,rgba(255,255,255,.48) 0%,transparent 100%),
  radial-gradient(1px 1px at 76% 7%,rgba(255,255,255,.52) 0%,transparent 100%);}
.dl-a{position:absolute;border-radius:50%;filter:blur(90px);}
.dl-a1{width:85vw;height:48vh;top:-20vh;left:4vw;background:radial-gradient(ellipse at center,rgba(0,215,95,.24) 0%,transparent 70%);animation:dlA1 18s ease-in-out infinite alternate;}
.dl-a2{width:62vw;height:40vh;top:-14vh;right:-6vw;background:radial-gradient(ellipse at center,rgba(0,155,255,.18) 0%,transparent 70%);animation:dlA2 24s ease-in-out infinite alternate;}
.dl-a3{width:52vw;height:34vh;top:0;left:24vw;background:radial-gradient(ellipse at center,rgba(120,0,255,.13) 0%,transparent 70%);animation:dlA3 20s ease-in-out infinite alternate;}
.dl-aurora-ground{position:absolute;bottom:0;left:0;right:0;height:50%;background:linear-gradient(to top,rgba(2,12,10,.95) 0%,transparent 100%);}
@keyframes dlA1{from{transform:translate(0,0)}to{transform:translate(4vw,5vh)}}
@keyframes dlA2{from{transform:translate(0,0)}to{transform:translate(-5vw,3vh)}}
@keyframes dlA3{from{transform:translate(0,0)}to{transform:translate(3vw,-4vh) rotate(7deg)}}

/* ── Shell (sidebar + main) ─────────────────────────────────────────── */
.dl-shell{position:relative;z-index:1;display:flex;min-height:calc(100vh - 60px);}

/* ── Sidebar ────────────────────────────────────────────────────────── */
.dl-sidebar{
  width:220px;flex-shrink:0;
  position:sticky;top:0;height:calc(100vh - 60px);overflow-y:auto;
  scrollbar-width:none;
  border-right:1px solid rgba(255,255,255,.06);
  background:rgba(2,12,10,.9);
  backdrop-filter:blur(16px);
  display:flex;flex-direction:column;
  padding:20px 0 16px;
  gap:0;
}
.dl-sidebar::-webkit-scrollbar{display:none;}

/* Logo */
.dl-sidebar-logo{
  display:flex;align-items:center;gap:8px;
  padding:0 18px 18px;
  text-decoration:none;
  border-bottom:1px solid rgba(255,255,255,.05);
  margin-bottom:16px;
  flex-shrink:0;
}
.dl-sidebar-logo-text{font-size:17px;font-weight:900;color:#F69820;letter-spacing:-.02em;}
.dl-sidebar-logo-dot{width:6px;height:6px;border-radius:50%;background:#F69820;flex-shrink:0;opacity:.6;}

/* Nav group */
.dl-nav-group{padding:0 10px;margin-bottom:6px;}
.dl-nav-group-label{
  font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;
  color:rgba(255,255,255,.18);
  padding:0 8px 6px;
  margin-top:2px;
}
.dl-nav-item{
  display:flex;align-items:center;gap:9px;
  padding:8px 10px;border-radius:8px;
  font-size:12px;font-weight:700;
  color:rgba(255,255,255,.38);
  text-decoration:none;
  transition:background .13s,color .13s;
  margin-bottom:2px;
}
.dl-nav-item:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.72);}
.dl-nav-item.active{background:rgba(246,152,32,.1);color:#F69820;}
.dl-nav-icon{display:flex;align-items:center;flex-shrink:0;opacity:.65;}
.dl-nav-item.active .dl-nav-icon{opacity:1;}
.dl-nav-item:hover .dl-nav-icon{opacity:.9;}

/* Separator */
.dl-nav-sep{height:1px;background:rgba(255,255,255,.05);margin:8px 18px 14px;}

/* Member tag */
.dl-sidebar-member{
  display:flex;align-items:center;gap:10px;
  margin-top:auto;padding:14px 18px 4px;
  border-top:1px solid rgba(255,255,255,.05);
}
.dl-sidebar-av{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:900;
  background:rgba(246,152,32,.15);color:#F69820;
}
.dl-sidebar-member-info{display:flex;flex-direction:column;gap:1px;min-width:0;}
.dl-sidebar-member-name{font-size:11px;font-weight:700;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dl-sidebar-member-tier{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(246,152,32,.7);}

/* ── Main content - full width ──────────────────────────────────────── */
.dl-main{flex:1;min-width:0;padding:36px 48px 80px;}

/* ── Mobile nav (hidden on desktop) ────────────────────────────────── */
.dl-mobile-nav{display:none;}
@media(max-width:768px){
  .dl-sidebar{display:none;}
  .dl-shell{flex-direction:column;}
  .dl-mobile-nav{
    display:flex;overflow-x:auto;scrollbar-width:none;
    border-bottom:1px solid rgba(255,255,255,.06);
    background:rgba(2,12,10,.88);backdrop-filter:blur(12px);
    position:sticky;top:0;z-index:2;
  }
  .dl-mobile-nav::-webkit-scrollbar{display:none;}
  .dl-mobile-tab{
    padding:12px 18px;white-space:nowrap;
    font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
    color:rgba(255,255,255,.35);text-decoration:none;
    border-bottom:2px solid transparent;margin-bottom:-1px;
  }
  .dl-mobile-tab.active{color:#F69820;border-bottom-color:#F69820;}
  .dl-main{padding:20px 16px 60px;}
}

/* ── Loading ────────────────────────────────────────────────────────── */
.dl-loading{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;min-height:60vh;}
.dl-spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.1);border-top-color:#F69820;border-radius:50%;animation:dlSpin .8s linear infinite;}
@keyframes dlSpin{to{transform:rotate(360deg)}}

/* ── Auth gate ──────────────────────────────────────────────────────── */
.dl-gate{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;min-height:70vh;padding:40px 20px;}
.dl-gate-card{max-width:400px;width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 32px;}
.dl-gate-icon svg{width:60px;height:60px;}
.dl-gate-title{font-size:26px;font-weight:900;color:#fff;margin:0;}
.dl-gate-sub{font-size:14px;color:rgba(255,255,255,.5);line-height:1.6;margin:0;}
.dl-google-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px 20px;border-radius:100px;background:#fff;border:none;font-family:inherit;font-size:14px;font-weight:700;color:#3c4043;cursor:pointer;transition:box-shadow .15s;}
.dl-google-btn:hover{box-shadow:0 2px 10px rgba(0,0,0,.3);}
.dl-gate-divider{display:flex;align-items:center;gap:12px;width:100%;color:rgba(255,255,255,.2);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;}
.dl-gate-divider::before,.dl-gate-divider::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.1);}
.dl-gate-outline{display:inline-block;border:1px solid rgba(246,152,32,.4);color:#F69820;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:11px 24px;border-radius:100px;text-decoration:none;}
.dl-gate-outline:hover{background:rgba(246,152,32,.08);}

/* ── Shared dark styles used across sub-pages ───────────────────────── */
.dp-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.dp-section-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.6);}
.dp-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;}
.dp-card-lg{background:rgba(255,255,255,.05);border-radius:20px;padding:28px;}
.dp-empty{text-align:center;padding:48px 20px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;}
.dp-empty p{font-size:13px;font-weight:600;color:rgba(255,255,255,.25);margin-bottom:14px;}
.dp-btn-outline{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.55);transition:border-color .15s,color .15s;cursor:pointer;font-family:inherit;text-decoration:none;}
.dp-btn-outline:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.8);}
.dp-spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,.1);border-top-color:#F69820;border-radius:50%;animation:dlSpin .8s linear infinite;margin:40px auto;display:block;}
`;
