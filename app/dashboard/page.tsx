"use client";
import { useState, useEffect } from "react";
import { useDashboard } from "./context";
import { supabase } from "@/lib/supabase";
import AdminCommandCenter from "@/components/AdminCommandCenter";

// Passport plan picker + Points top-up (both retired 2026-07-23, see components/ArtistPage.tsx
// for the replacement model: free membership + one-time $11 per-artist unlock) removed from
// here. TIER_MONTHLY/TIER_LABEL/TIER_RATE are left in place - the affiliate/referral portal
// below still keys off promoter/pro tier for existing affiliates' commission math, and that
// program wasn't part of this retirement.
const TIER_MONTHLY: Record<string, number> = { passport: 1500, promoter: 2500, pro: 6000 };
const TIER_LABEL: Record<string, string>   = { passport: "Passport", promoter: "Promoter", pro: "Community Manager" };
const TIER_RATE:  Record<string, number>   = { promoter: 0.10, pro: 0.25 };
const ADMIN_EMAIL = "contact@lesaruss.com";
const GOAL = 1_000_000;

export default function DashboardOverview() {
  const { userId, userEmail, member, points, purchases, referral, memberCount, isAdmin, viewAs } = useDashboard();

  const [copied, setCopied] = useState(false);

  // Buy LESARs (added 2026-08-14, per Sean's dashboard direct top-up
  // request): lets members top up their LESARs balance from the dashboard
  // instead of only running into the LESARs-pack purchase modal reactively
  // when they run short mid-unlock (see components/ArtistPage.tsx
  // openLesarsPackModal/buyLesarsPack). Same four tiers as that modal now
  // offers, same checkout branch (app/api/checkout/route.ts
  // plan === "lesars-pack"), now generalized to accept packAmount.
  const LESARS_PACKS: { amount: number; lesars: number }[] = [
    { amount: 11, lesars: 1110 },
    { amount: 22, lesars: 2220 },
    { amount: 55, lesars: 5550 },
    { amount: 111, lesars: 11100 },
  ];
  const [buyLoading, setBuyLoading] = useState<number | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  async function buyLesarsPack(amount: number) {
    if (!userId || buyLoading) return;
    setBuyError(null);
    setBuyLoading(amount);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "lesars-pack",
          packAmount: amount,
          userId,
          returnUrl: "/dashboard",
        }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setBuyError(error || "Checkout failed. Please try again.");
        setBuyLoading(null);
      }
    } catch {
      setBuyError("Checkout failed. Please try again.");
      setBuyLoading(null);
    }
  }

  // Artists this member has unlocked via the one-time $11 Full Experience purchase
  // (components/ArtistPage.tsx handleUnlockArtist). Replaces the old Points balance.
  const [unlockedArtists, setUnlockedArtists] = useState<string[] | null>(null);
  useEffect(() => {
    if (!userId) { setUnlockedArtists([]); return; }
    supabase
      .from("gfs_artist_unlocks")
      .select("artist_slug")
      .eq("user_id", userId)
      .then(({ data }) => setUnlockedArtists((data || []).map(r => r.artist_slug)));
  }, [userId]);

  // Real count backing the "Songs Owned" stat card below (was previously a permanent "..." placeholder)
  const [songsOwned, setSongsOwned] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) { setSongsOwned(0); return; }
    supabase
      .from("gfs_track_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count }) => setSongsOwned(count ?? 0));
  }, [userId]);

  const displayName = member?.name || userEmail || "Member";
  const tier       = member?.tier || "passport";
  const tierLabel  = TIER_LABEL[tier] || tier;
  const isAffiliate = tier === "promoter" || tier === "pro";
  const commissionPct = TIER_RATE[tier] ? (TIER_RATE[tier] * 100).toFixed(0) : null;
  const progressPct   = Math.min((memberCount / GOAL) * 100, 100);
  const passportArtists = member?.passport_artists || [];

  // 2026-07-27 per Sean: this page always showed the real DB tier ("Passport" -
  // his own account's real gfs_members.tier) with zero admin awareness, and the
  // "View as membership" simulator elsewhere in the app had no effect on this
  // specific page at all. Real Super Admin (not simulating) now gets the new
  // Admin Command Center instead of the member-facing page below. While
  // simulating a tier via View As, this page reflects THAT tier's label
  // instead of the real DB tier - and hides real account data (affiliate
  // earnings/referral link, purchase history) that shouldn't leak into a
  // "what does this tier look like" preview.
  const simulating = isAdmin && !!viewAs;
  const isRealAdminView = isAdmin && !viewAs;

  if (isRealAdminView) {
    return <AdminCommandCenter displayName={displayName} />;
  }

  const SIM_TIER_LABEL: Record<string, string> = { public: "Public", passport: "Passport", plus: "Plus", pro: "Pro" };
  const displayTierLabel = simulating ? (SIM_TIER_LABEL[viewAs as string] || (viewAs as string)) : tierLabel;

  function copyLink() {
    if (!referral?.ref_code) return;
    navigator.clipboard.writeText(`https://geekfon.ai/join?ref=${referral.ref_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Welcome bar */}
      <div className="do-welcome">
        <div className="do-welcome-top">
          <div>
            <div className="do-welcome-eyebrow">Member Dashboard</div>
            <h1 className="do-welcome-name">Welcome back, {displayName}</h1>
            <div className="do-welcome-since">Passport holder since {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="do-stats-row">
        <div className="do-stat-card do-stat-passport">
          <div className="do-stat-label">Status</div>
          <div className="do-stat-val do-val-orange">{displayTierLabel.toUpperCase()}</div>
          <div className="do-stat-sub">Active</div>
        </div>
        <div className="do-stat-card">
          <div className="do-stat-label">LESARs Balance</div>
          <div className="do-stat-val do-val-green">{points === null ? "..." : (points.available_points ?? 0).toLocaleString()}</div>
          <div className="do-stat-sub">Spend on unlocks</div>
        </div>
        <div className="do-stat-card">
          <div className="do-stat-label">Artists Unlocked</div>
          <div className="do-stat-val do-val-green">{unlockedArtists === null ? "..." : unlockedArtists.length}</div>
          <div className="do-stat-sub">Full Experience</div>
        </div>
        <a href="/dashboard/library" className="do-stat-card do-stat-link">
          <div className="do-stat-label">Songs Owned</div>
          <div className="do-stat-val">{songsOwned === null ? "..." : songsOwned}</div>
          <div className="do-stat-sub">In library &rarr;</div>
        </a>
      </div>

      {/* Buy LESARs (added 2026-08-14): direct top-up from the dashboard,
          not just the reactive insufficient-balance modal on ArtistPage.
          Same four tiers as that modal now offers. */}
      <div className="do-section do-buy-section">
        <div className="do-section-title">Buy LESARs</div>
        <p className="do-buy-sub">111 LESARs unlocks any song, released or not - forever, yours to download.</p>
        {buyError && <p className="do-buy-error">{buyError}</p>}
        <div className="do-buy-grid">
          {LESARS_PACKS.map(pack => (
            <button
              key={pack.amount}
              className="do-buy-tile"
              disabled={buyLoading !== null}
              onClick={() => buyLesarsPack(pack.amount)}
            >
              <div className="do-buy-tile-lesars">{pack.lesars.toLocaleString()}<span> LESARs</span></div>
              <div className="do-buy-tile-price">{buyLoading === pack.amount ? "Please wait..." : `${pack.amount}`}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Unlocks + Passport grid - replaces the old Points Balance card + Passport plan picker,
          both retired 2026-07-23. Free membership is the only tier now; the paid mechanic is a
          one-time $11 per-artist unlock (see components/ArtistPage.tsx handleUnlockArtist). */}
      <div className="do-main-grid">
        {/* Unlocks card */}
        <div className="do-balance-card">
          <div className="do-card-eyebrow">Full Experience Unlocks</div>
          {unlockedArtists === null ? (
            <div className="do-bal-reset">Loading...</div>
          ) : unlockedArtists.length === 0 ? (
            <>
              <div className="do-bal-amount" style={{ fontSize: 20, color: "rgba(255,255,255,.7)" }}>No artists unlocked yet</div>
              <div className="do-bal-reset">Every song plays free once it&apos;s released. Unlock any artist once for $11 to hear their full catalog right now, including tracks that haven&apos;t dropped yet.</div>
            </>
          ) : (
            <>
              <div className="do-bal-label">Unlocked</div>
              <div className="do-artist-chips" style={{ marginTop: 8 }}>
                {unlockedArtists.map(slug => (
                  <a key={slug} href={`/${slug}`} className="do-artist-chip">{slug.replace(/-/g, " ")}</a>
                ))}
              </div>
            </>
          )}
          <a href="/roster" className="do-btn-topup" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
            Browse Artists
          </a>
        </div>

        {/* Passport card */}
        <div className="do-psp-card">
          <div className="do-psp-badge">
            <div className="do-psp-dot" />
            <span className="do-psp-badge-label">Free Member</span>
          </div>
          <div className="do-psp-features">
            {[
              "Stream every released song, free, always",
              "Preview any unreleased track before it drops",
              "Unlock an artist's full catalog once for $11 - yours forever",
              "GeekFon Radio full access",
            ].map(f => (
              <div key={f} className="do-psp-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(0,215,95,.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </div>
            ))}
          </div>
          <div className="do-psp-renewal">No subscription, no monthly charge. Member since {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.</div>
        </div>
      </div>

      {/* Passport artists */}
      {passportArtists.length > 0 && (
        <div className="do-section" style={{marginTop:28}}>
          <div className="do-section-title">Your Passport Artists</div>
          <div className="do-artist-chips">
            {passportArtists.map(slug => (
              <a key={slug} href={`/${slug}`} className="do-artist-chip">{slug.replace(/-/g, " ")}</a>
            ))}
          </div>
        </div>
      )}

      {/* Affiliate portal - real account data, hidden while simulating a tier */}
      {isAffiliate && !simulating && (
        <div className="do-affiliate">
          <div className="do-aff-top">
            <div>
              <div className="do-aff-eyebrow">{tier === "pro" ? "Community Manager Portal" : "Promoter Portal"}</div>
              <h2 className="do-aff-heading">Help us reach 1,000,000 members.</h2>
              <p className="do-aff-sub">Every person you bring in earns you <strong>{commissionPct}% commission</strong> on their transactions for a full year.</p>
            </div>
            <div className="do-aff-rate" aria-label={`${commissionPct}% commission`}>{commissionPct}%</div>
          </div>
          <div className="do-progress">
            <div className="do-progress-labels">
              <span className="do-progress-label">Movement progress</span>
              <span className="do-progress-count">{memberCount.toLocaleString()} / 1,000,000 members</span>
            </div>
            <div className="do-progress-track">
              <div className="do-progress-fill" style={{ width: `${Math.max(progressPct, 0.4)}%` }} />
            </div>
            <div className="do-progress-goal">Goal: 1,000,000 by Dec 31, 2026</div>
          </div>
          {referral ? (
            <>
              <div className="do-link-row">
                <div className="do-link-display">geekfon.ai/join?ref={referral.ref_code}</div>
                <button className="do-copy-btn" onClick={copyLink}>
                  {copied
                    ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14"><path d="M5 13l4 4L19 7"/></svg>Copied</>
                    : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy link</>
                  }
                </button>
              </div>
              <div className="do-aff-stats">
                <div className="do-aff-stat"><div className="do-aff-stat-num">${((referral.total_earned_cents || 0) / 100).toFixed(2)}</div><div className="do-aff-stat-label">Total Earned</div></div>
                <div className="do-aff-stat"><div className="do-aff-stat-num">${((referral.pending_earned_cents || 0) / 100).toFixed(2)}</div><div className="do-aff-stat-label">Pending</div></div>
                <div className="do-aff-stat">
                  <div className="do-aff-stat-num">{referral.window_expires_at ? Math.max(0, Math.ceil((new Date(referral.window_expires_at).getTime() - Date.now()) / 86400000)) : "-"}</div>
                  <div className="do-aff-stat-label">Days remaining</div>
                </div>
              </div>
            </>
          ) : (
            <p className="do-aff-pending">Your unique link is being generated. Check back shortly.</p>
          )}
        </div>
      )}

      {/* Purchase history - real account data, hidden while simulating a tier */}
      {!simulating && (
        <div className="do-section" style={{marginTop:32}}>
          <div className="do-section-row">
            <div className="do-section-title">Purchase History</div>
          </div>
          {purchases.length === 0 ? (
            <div className="dp-empty">
              <p>No purchases yet.</p>
              <a href="/roster" className="dp-btn-outline">Browse Artists</a>
            </div>
          ) : (
            <div className="do-purchases">
              {purchases.map(p => (
                <div key={p.id} className="do-purchase-row">
                  <div>
                    <div className="do-purchase-name">Passport Purchase</div>
                    <div className="do-purchase-date">{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="do-purchase-amount">${(p.amount_cents / 100).toFixed(2)}</div>
                    <div className={"do-purchase-status s-" + p.status}>{p.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin console (Members Console link) removed 2026-07-27 - real Super
          Admin now lands on AdminCommandCenter above instead of ever reaching
          this branch, so it was dead code (this page only renders for a real
          regular member, or an admin simulating a tier via View As). */}

    </>
  );
}

const CSS = `
/* Welcome */
.do-welcome{padding:32px 0 28px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:28px;}
.do-welcome-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.do-welcome-eyebrow{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.22em;color:#F69820;margin-bottom:8px;}
.do-welcome-name{font-size:clamp(22px,4vw,36px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;margin:0;}
.do-welcome-since{font-size:11px;font-weight:500;color:rgba(255,255,255,.35);margin-top:4px;}
.do-topup-hero-btn{flex-shrink:0;padding:13px 24px;border-radius:100px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;border:1px solid rgba(0,215,95,.3);background:rgba(0,215,95,.14);color:rgba(0,215,95,.95);cursor:pointer;font-family:inherit;transition:background .15s;white-space:nowrap;margin-top:2px;}
.do-topup-hero-btn:hover{background:rgba(0,215,95,.22);}
/* Stats row */
.do-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
.do-stat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;}
.do-stat-link{text-decoration:none;display:block;transition:background .15s,border-color .15s;}
.do-stat-link:hover{background:rgba(255,255,255,.07);border-color:rgba(246,152,32,.3);}
.do-stat-passport{border-color:rgba(246,152,32,.22);}
.do-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.35);margin-bottom:8px;}
.do-stat-val{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.02em;line-height:1;}
.do-val-orange{color:#F69820;font-size:14px;letter-spacing:.06em;margin-top:2px;}
.do-val-green{color:rgba(0,215,95,.9);}
.do-stat-sub{font-size:10px;font-weight:500;color:rgba(255,255,255,.3);margin-top:4px;}
@media(max-width:700px){.do-stats-row{grid-template-columns:1fr 1fr;}}
/* Main grid */
.do-main-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
@media(max-width:700px){.do-main-grid{grid-template-columns:1fr;}}
/* Balance card */
.do-balance-card{background:rgba(255,255,255,.05);border:1px solid rgba(0,215,95,.18);border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:0;}
.do-card-eyebrow{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:rgba(255,255,255,.35);margin-bottom:16px;}
.do-bal-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:rgba(0,215,95,.6);margin-bottom:4px;}
.do-bal-amount{font-size:44px;font-weight:900;color:rgba(0,215,95,.95);letter-spacing:-.03em;line-height:1;margin-bottom:0;}
.do-bal-unit{font-size:13px;font-weight:700;color:rgba(0,215,95,.5);margin-left:4px;}
.do-bal-divider{height:1px;background:rgba(255,255,255,.06);margin:18px 0;}
.do-bal-secondary{display:flex;justify-content:space-between;align-items:flex-end;}
.do-bal-sec-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.3);margin-bottom:3px;}
.do-bal-sec-val{font-size:18px;font-weight:900;color:rgba(255,255,255,.7);letter-spacing:-.02em;}
.do-val-green-sm{color:rgba(0,215,95,.65);}
.do-bal-reset{font-size:9px;font-weight:600;color:rgba(255,255,255,.25);margin-top:16px;line-height:1.6;}
.do-btn-topup{display:block;width:100%;text-align:center;margin-top:18px;padding:13px;border-radius:10px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;border:1px solid rgba(0,215,95,.2);background:rgba(0,215,95,.12);color:rgba(0,215,95,.9);transition:background .15s;cursor:pointer;font-family:inherit;}
.do-btn-topup:hover{background:rgba(0,215,95,.18);}
.do-btn-plans{display:block;width:100%;text-align:center;margin-top:10px;padding:11px;border-radius:10px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.5);transition:border-color .15s,color .15s;cursor:pointer;font-family:inherit;}
.do-btn-plans:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.8);}
/* Passport card */
.do-psp-card{background:rgba(255,255,255,.04);border:1px solid rgba(246,152,32,.2);border-radius:20px;padding:28px;display:flex;flex-direction:column;}
.do-psp-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(246,152,32,.1);border:1px solid rgba(246,152,32,.2);border-radius:100px;padding:5px 13px;margin-bottom:16px;width:fit-content;}
.do-psp-dot{width:6px;height:6px;border-radius:50%;background:#F69820;}
.do-psp-badge-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:#F69820;}
.do-psp-features{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;flex:1;}
.do-psp-feature{display:flex;align-items:flex-start;gap:10px;font-size:11px;font-weight:500;color:rgba(255,255,255,.6);line-height:1.5;}
.do-psp-feature svg{flex-shrink:0;margin-top:1px;}
.do-psp-renewal{font-size:10px;font-weight:600;color:rgba(255,255,255,.28);margin-top:auto;padding-top:16px;border-top:1px solid rgba(255,255,255,.06);}
.do-psp-renewal span{color:rgba(255,255,255,.55);}
/* Tier panel */
.do-tier-panel{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;margin-bottom:24px;}
.do-tier-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.do-tier-panel-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#F69820;}
.do-tier-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);display:flex;align-items:center;padding:4px;border-radius:4px;}
.do-tier-close:hover{color:#fff;}
.do-tier-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:640px;}
@media(max-width:700px){.do-tier-grid{grid-template-columns:1fr;}}
.do-tier-card{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;position:relative;}
.do-tier-card.current{border-color:#F69820;box-shadow:0 0 0 3px rgba(246,152,32,.08);}
.do-tier-card.invite-only{border-style:dashed;opacity:.85;}
.do-tier-cur-badge{position:absolute;top:-10px;left:16px;background:#F69820;color:#000;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:20px;}
.do-tier-invite-badge{position:absolute;top:-10px;left:16px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.75);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,.2);}
.do-tier-name{font-size:15px;font-weight:900;color:#fff;margin-bottom:4px;}
.do-tier-price{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.02em;margin-bottom:4px;}
.do-tier-lesars{font-size:11px;font-weight:800;color:rgba(0,215,95,.8);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}
.do-tier-desc{font-size:12px;color:rgba(255,255,255,.5);line-height:1.5;margin-bottom:14px;}
.do-tier-cta{display:block;text-align:center;background:#F69820;color:#000;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:11px;border-radius:100px;text-decoration:none;transition:background .15s;border:none;width:100%;cursor:pointer;font-family:inherit;}
.do-tier-cta:hover{background:#ffaf30;}
.do-tier-cta-disabled{background:rgba(255,255,255,.08);color:rgba(255,255,255,.35);cursor:not-allowed;}
.do-tier-cta-disabled:hover{background:rgba(255,255,255,.08);}
/* Artist chips */
.do-section{margin-bottom:28px;}
.do-section-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.45);margin-bottom:14px;}
.do-section-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.do-section-action{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(0,215,95,.7);background:none;border:none;cursor:pointer;font-family:inherit;padding:0;}
.do-section-action:hover{color:rgba(0,215,95,.95);}
.do-artist-chips{display:flex;flex-wrap:wrap;gap:10px;}
.do-artist-chip{font-size:12px;font-weight:800;text-transform:capitalize;padding:8px 16px;border-radius:100px;background:rgba(246,152,32,.1);border:1px solid rgba(246,152,32,.25);color:#F69820;text-decoration:none;letter-spacing:.04em;}
.do-artist-chip:hover{background:rgba(246,152,32,.18);}
/* Affiliate */
.do-affiliate{background:linear-gradient(135deg,#0d0d0d 0%,#1a0a0d 100%);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:28px 28px 24px;margin-bottom:32px;}
.do-aff-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px;}
.do-aff-eyebrow{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:rgba(246,152,32,.8);margin-bottom:8px;}
.do-aff-heading{font-size:20px;font-weight:900;color:#fff;letter-spacing:-.01em;line-height:1.2;margin:0 0 10px;}
.do-aff-sub{font-size:13px;color:rgba(255,255,255,.55);line-height:1.6;margin:0;}
.do-aff-sub strong{color:#fff;}
.do-aff-rate{flex-shrink:0;width:60px;height:60px;border-radius:50%;background:rgba(246,152,32,.15);border:2px solid #F69820;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#F69820;}
@media(max-width:700px){.do-aff-top{flex-wrap:wrap;}.do-aff-rate{display:none;}}
.do-progress{margin-bottom:20px;}
.do-progress-labels{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
.do-progress-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.4);}
.do-progress-count{font-size:13px;font-weight:800;color:#fff;}
.do-progress-track{height:5px;background:rgba(255,255,255,.1);border-radius:100px;overflow:hidden;}
.do-progress-fill{height:100%;background:linear-gradient(90deg,#F69820,#ffcf7a);border-radius:100px;transition:width .6s ease;}
.do-progress-goal{font-size:9px;color:rgba(255,255,255,.3);margin-top:6px;font-weight:600;}
.do-link-row{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
.do-link-display{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 16px;font-size:12px;font-weight:600;color:rgba(255,255,255,.7);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.do-copy-btn{display:flex;align-items:center;gap:6px;flex-shrink:0;background:#F69820;color:#000;border:none;cursor:pointer;font-family:inherit;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:11px 16px;border-radius:100px;transition:background .15s;}
.do-copy-btn:hover{background:#ffaf30;}
.do-aff-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
@media(max-width:700px){.do-aff-stats{grid-template-columns:1fr;}}
.do-aff-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px 16px;}
.do-aff-stat-num{font-size:20px;font-weight:900;color:#fff;letter-spacing:-.01em;}
.do-aff-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.35);margin-top:3px;}
.do-aff-pending{font-size:13px;color:rgba(255,255,255,.35);padding:16px 0;}
/* Purchases */
.do-purchases{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;}
.do-purchase-row{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.05);}
.do-purchase-row:last-child{border-bottom:none;}
.do-purchase-name{font-size:13px;font-weight:700;color:#fff;}
.do-purchase-date{font-size:11px;color:rgba(255,255,255,.35);font-weight:500;margin-top:2px;}
.do-purchase-amount{font-size:14px;font-weight:900;color:#fff;}
.do-purchase-status{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:2px 8px;border-radius:20px;margin-top:3px;display:inline-block;}
.do-purchase-status.s-succeeded,.do-purchase-status.s-complete{background:rgba(0,215,95,.12);color:rgba(0,215,95,.9);}
.do-purchase-status.s-pending{background:rgba(246,152,32,.14);color:#F69820;}
.do-purchase-status.s-failed{background:rgba(239,68,68,.1);color:rgba(255,120,120,.9);}
/* Admin */
.do-admin{border-top:1px solid rgba(255,255,255,.08);padding-top:24px;}
.do-invite-trigger{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#000;background:#F69820;border:none;cursor:pointer;font-family:inherit;padding:9px 18px;border-radius:100px;transition:background .15s;}
.do-invite-trigger:hover{background:#ffaf30;}
/* Top-up modal (dashboard-scoped, mirrors the purchase top-up modal pattern in components/ArtistPage.tsx) */
.do-tu-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;}
.do-tu-modal{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:36px 32px 28px;max-width:400px;width:100%;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.5);}
.do-tu-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.08);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.6);padding:0;}
.do-tu-close svg{width:14px;height:14px;}
.do-tu-close:hover{background:rgba(255,255,255,.14);color:#fff;}
.do-tu-eyebrow{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#F69820;margin-bottom:8px;}
.do-tu-title{font-size:20px;font-weight:900;color:#fff;margin:0 0 12px;}
.do-tu-desc{font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;margin:0 0 20px;}
.do-tu-pack-list{display:flex;flex-direction:column;gap:10px;margin:4px 0 20px;}
.do-tu-pack-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid rgba(255,255,255,.12);border-radius:12px;cursor:pointer;background:rgba(255,255,255,.03);transition:border-color .15s,background .15s;position:relative;font-family:inherit;text-align:left;width:100%;}
.do-tu-pack-row:hover{border-color:#F69820;}
.do-tu-pack-row.do-tu-selected{border-color:#F69820;background:rgba(246,152,32,.1);box-shadow:0 0 0 1px #F69820;}
.do-tu-pack-badge{position:absolute;top:-9px;left:14px;background:#F69820;color:#000;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:100px;}
.do-tu-pack-lesars{font-size:15px;font-weight:900;color:#fff;}
.do-tu-pack-note{font-size:11px;color:rgba(255,255,255,.4);font-weight:600;margin-top:2px;}
.do-tu-pack-price{font-size:16px;font-weight:900;color:#F69820;flex-shrink:0;}
.do-tu-error{font-size:12px;font-weight:700;color:rgba(255,100,100,.9);margin:0 0 12px;}
.do-tu-actions{display:flex;flex-direction:column;gap:10px;}
.do-tu-confirm{padding:14px;background:#F69820;color:#000;border:none;border-radius:10px;font-family:inherit;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;text-align:center;}
.do-tu-confirm:hover{background:#ffaf30;}
.do-tu-confirm.do-tu-disabled{opacity:.45;cursor:not-allowed;}
.do-tu-confirm.do-tu-disabled:hover{background:#F69820;}
.do-tu-cancel{padding:14px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.8);border:none;border-radius:10px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;}
.do-tu-cancel:hover{background:rgba(255,255,255,.14);}
`;
