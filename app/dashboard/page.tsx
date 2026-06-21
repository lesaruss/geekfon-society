"use client";
import { useState, useEffect } from "react";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";

type GfsMember = {
  id: string;
  user_id: string;
  name: string | null;
  tier: string | null;
  passport_artists: string[] | null;
};

type MemberPoints = {
  available_points: number;
  total_points: number;
  spent_points: number;
};

type Purchase = {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [member, setMember] = useState<GfsMember | null>(null);
  const [points, setPoints] = useState<MemberPoints | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const u = session.user;
      setUserId(u.id);
      setUserEmail(u.email || null);

      const [memberRes, pointsRes, purchasesRes] = await Promise.all([
        supabase.from("gfs_members").select("*").eq("user_id", u.id).maybeSingle(),
        supabase.from("member_points").select("available_points,total_points,spent_points").eq("user_id", u.id).maybeSingle(),
        supabase.from("point_purchases").select("id,amount_cents,status,created_at").eq("buyer_id", u.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setMember(memberRes.data ?? null);
      setPoints(pointsRes.data ?? null);
      setPurchases(purchasesRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const lesars = points?.available_points ?? 0;
  const displayName = member?.name || userEmail || "Member";
  const initial = displayName.charAt(0).toUpperCase();
  const tier = member?.tier || "passport";
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const passportArtists = member?.passport_artists || [];

  const memberProp = userId
    ? { name: displayName, balance: lesars, initial, tier }
    : undefined;

  /* Loading state */
  if (loading) {
    return (
      <SiteChrome>
        <style>{CSS}</style>
        <div className="dash-loading">
          <div className="dash-spinner" />
        </div>
      </SiteChrome>
    );
  }

  /* Not logged in */
  if (!userId) {
    return (
      <SiteChrome>
        <style>{CSS}</style>
        <div className="dash-gate">
          <div className="dash-gate-card">
            <div className="dash-gate-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#E91E8C" strokeWidth="2" />
                <path d="M24 14a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-10 20c0-4.4 4.5-8 10-8s10 3.6 10 8" stroke="#E91E8C" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="dash-gate-title">Members only</h1>
            <p className="dash-gate-sub">You need a GeekFon Passport to access the dashboard.</p>
            <a href="/passport" className="dash-gate-cta">Get your Passport</a>
          </div>
        </div>
      </SiteChrome>
    );
  }

  /* Dashboard */
  return (
    <SiteChrome member={memberProp}>
      <style>{CSS}</style>
      <div className="dash">

        {/* Hero balance strip */}
        <div className="dash-hero">
          <div className="dash-hero-inner">
            <div className="dash-avatar">{initial}</div>
            <div className="dash-hero-info">
              <div className="dash-welcome">Welcome back</div>
              <div className="dash-name">{displayName}</div>
              <div className="dash-tier-badge">{tierLabel} Member</div>
            </div>
            <div className="dash-balance-card">
              <div className="dash-balance-label">LESARs Balance</div>
              <div className="dash-balance-num">{lesars.toLocaleString()}</div>
              <a href="/passport" className="dash-topup">+ Top up</a>
            </div>
          </div>
        </div>

        <div className="dash-body">

          {/* Passport artists */}
          {passportArtists.length > 0 && (
            <section className="dash-section">
              <h2 className="dash-section-title">Your Passport Artists</h2>
              <div className="dash-artist-chips">
                {passportArtists.map((slug) => (
                  <a key={slug} href={`/${slug}`} className="dash-artist-chip">
                    {slug.replace(/-/g, " ")}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Stats row */}
          <section className="dash-section">
            <div className="dash-stats">
              <div className="dash-stat">
                <div className="dash-stat-num">{lesars.toLocaleString()}</div>
                <div className="dash-stat-label">LESARs Available</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-num">{(points?.spent_points ?? 0).toLocaleString()}</div>
                <div className="dash-stat-label">LESARs Spent</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-num">{passportArtists.length}</div>
                <div className="dash-stat-label">Passport Artists</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-num">{purchases.length}</div>
                <div className="dash-stat-label">Total Purchases</div>
              </div>
            </div>
          </section>

          {/* Purchase history */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Purchase History</h2>
              <a href="/passport" className="dash-section-cta">+ Top up LESARs</a>
            </div>
            {purchases.length === 0 ? (
              <div className="dash-empty">
                <p>No purchases yet.</p>
                <a href="/passport" className="dash-empty-cta">Explore Passport options</a>
              </div>
            ) : (
              <div className="dash-purchases">
                {purchases.map((p) => (
                  <div key={p.id} className="dash-purchase-row">
                    <div className="dash-purchase-info">
                      <div className="dash-purchase-name">Passport Purchase</div>
                      <div className="dash-purchase-date">
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div className="dash-purchase-right">
                      <div className="dash-purchase-amount">${(p.amount_cents / 100).toFixed(2)}</div>
                      <div className={"dash-purchase-status s-" + p.status}>{p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick links */}
          <section className="dash-section">
            <h2 className="dash-section-title">Explore</h2>
            <div className="dash-quick-links">
              {[
                { label: "Roster", href: "/roster", desc: "Browse all artists" },
                { label: "GeekFon Radio", href: "/radio", desc: "Stream the universe" },
                { label: "Library", href: "/library", desc: "Your saved content" },
                { label: "Passport", href: "/passport", desc: "Manage your membership" },
              ].map((l) => (
                <a key={l.href} href={l.href} className="dash-quick-card">
                  <div className="dash-quick-label">{l.label}</div>
                  <div className="dash-quick-desc">{l.desc}</div>
                  <div className="dash-quick-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </div>
      </div>
    </SiteChrome>
  );
}

const CSS = `
/* Loading */
.dash-loading{display:flex;align-items:center;justify-content:center;min-height:60vh}
.dash-spinner{width:40px;height:40px;border:3px solid var(--lr-border);border-top-color:#E91E8C;border-radius:50%;animation:dashSpin .8s linear infinite}
@keyframes dashSpin{to{transform:rotate(360deg)}}

/* Auth gate */
.dash-gate{display:flex;align-items:center;justify-content:center;min-height:60vh;padding:40px 20px}
.dash-gate-card{max-width:400px;width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px}
.dash-gate-icon svg{width:64px;height:64px}
.dash-gate-title{font-size:28px;font-weight:900;margin:0}
.dash-gate-sub{font-size:15px;color:var(--lr-text-75);line-height:1.6;margin:0}
.dash-gate-cta{display:inline-block;background:#E91E8C;color:#fff;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:13px 28px;border-radius:100px;text-decoration:none}
.dash-gate-cta:hover{filter:brightness(.92)}

/* Dashboard layout */
.dash{padding-bottom:80px}

/* Hero strip */
.dash-hero{background:#111;color:#fff;padding:32px 40px}
.dash-hero-inner{display:flex;align-items:center;gap:24px;max-width:1100px;margin:0 auto}
.dash-avatar{width:64px;height:64px;border-radius:50%;background:#E91E8C;color:#fff;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid rgba(255,255,255,.15)}
.dash-hero-info{flex:1;min-width:0}
.dash-welcome{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.45);margin-bottom:4px}
.dash-name{font-size:26px;font-weight:900;letter-spacing:-.01em;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-tier-badge{display:inline-block;margin-top:8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;padding:4px 10px;border-radius:20px;background:rgba(233,30,140,.2);color:#E91E8C}
.dash-balance-card{flex-shrink:0;text-align:right;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px 22px}
.dash-balance-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.45);margin-bottom:6px}
.dash-balance-num{font-size:32px;font-weight:900;letter-spacing:-.02em;line-height:1}
.dash-topup{display:block;margin-top:10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#E91E8C;text-decoration:none;text-align:center}
.dash-topup:hover{text-decoration:underline}

@media(max-width:640px){
  .dash-hero{padding:24px 16px}
  .dash-hero-inner{flex-wrap:wrap}
  .dash-balance-card{width:100%;text-align:left;display:flex;align-items:center;gap:16px}
  .dash-balance-label{margin-bottom:0}
  .dash-balance-num{font-size:26px}
}

/* Body */
.dash-body{max-width:1100px;margin:0 auto;padding:32px 40px 0}
@media(max-width:700px){.dash-body{padding:24px 16px 0}}

.dash-section{margin-bottom:40px}
.dash-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.dash-section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#9c1458;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid var(--lr-border)}
.dash-section-header .dash-section-title{margin-bottom:0;border-bottom:none;padding-bottom:0}
.dash-section-cta{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#9c1458;text-decoration:none}
.dash-section-cta:hover{text-decoration:underline}

/* Stats row */
.dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dash-stat{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:18px 20px}
.dash-stat-num{font-size:28px;font-weight:900;letter-spacing:-.02em;color:#1a1a1a}
.dash-stat-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);margin-top:4px}
@media(max-width:700px){.dash-stats{grid-template-columns:repeat(2,1fr)}}

/* Passport artists */
.dash-artist-chips{display:flex;flex-wrap:wrap;gap:10px}
.dash-artist-chip{font-size:12px;font-weight:800;text-transform:capitalize;padding:8px 16px;border-radius:100px;background:rgba(233,30,140,.1);border:1px solid rgba(233,30,140,.25);color:#9c1458;text-decoration:none;letter-spacing:.04em}
.dash-artist-chip:hover{background:rgba(233,30,140,.18)}

/* Purchase history */
.dash-purchases{display:flex;flex-direction:column;gap:1px;background:var(--lr-border);border:1px solid var(--lr-border);border-radius:12px;overflow:hidden}
.dash-purchase-row{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff}
.dash-purchase-row:first-child{border-radius:11px 11px 0 0}
.dash-purchase-row:last-child{border-radius:0 0 11px 11px}
.dash-purchase-info{display:flex;flex-direction:column;gap:3px}
.dash-purchase-name{font-size:14px;font-weight:700}
.dash-purchase-date{font-size:11px;color:var(--lr-text-50);font-weight:600}
.dash-purchase-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.dash-purchase-amount{font-size:15px;font-weight:900}
.dash-purchase-status{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:2px 8px;border-radius:20px}
.dash-purchase-status.s-succeeded,.dash-purchase-status.s-complete{background:rgba(76,175,80,.12);color:#2e7d32}
.dash-purchase-status.s-pending{background:rgba(246,152,32,.14);color:#b45309}
.dash-purchase-status.s-failed{background:rgba(239,68,68,.1);color:#b91c1c}

/* Empty state */
.dash-empty{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.dash-empty p{font-size:14px;color:var(--lr-text-50);margin:0}
.dash-empty-cta{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#9c1458;text-decoration:none}
.dash-empty-cta:hover{text-decoration:underline}

/* Quick links */
.dash-quick-links{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.dash-quick-card{display:flex;flex-direction:column;gap:4px;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:18px 18px 16px;text-decoration:none;transition:border-color .15s,box-shadow .15s;position:relative}
.dash-quick-card:hover{border-color:#E91E8C;box-shadow:0 0 0 3px rgba(233,30,140,.07)}
.dash-quick-label{font-size:15px;font-weight:900;color:#1a1a1a}
.dash-quick-desc{font-size:12px;color:var(--lr-text-50);font-weight:500}
.dash-quick-arrow{position:absolute;bottom:14px;right:14px;color:var(--lr-text-30)}
.dash-quick-arrow svg{width:16px;height:16px}
.dash-quick-card:hover .dash-quick-arrow{color:#E91E8C}
@media(max-width:700px){.dash-quick-links{grid-template-columns:repeat(2,1fr)}}
`;
