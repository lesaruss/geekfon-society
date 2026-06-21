"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";

/* ─── Types ─── */
type GfsMember = {
  id: string; user_id: string; name: string | null; tier: string | null;
  passport_artists: string[] | null;
};
type MemberPoints = { available_points: number; total_points: number; spent_points: number };
type Purchase = { id: string; amount_cents: number; status: string; created_at: string };
type AdminMember = {
  id: string; user_id: string; name: string | null; email: string | null;
  tier: string | null; available_points: number; created_at: string; last_sign_in: string | null;
};
type Referral = {
  id: string; ref_code: string; commission_rate: number;
  window_expires_at: string | null; total_earned_cents: number;
  pending_earned_cents: number; referred_id?: string | null; converted_at?: string | null;
};

const PASSPORT_TIERS = [
  { id: "passport", label: "Passport", price: "$11/mo", lesars: 1000, desc: "1,000 LESARs per month. Full access to all artists and content." },
  { id: "plus", label: "Passport Plus", price: "$22/mo", lesars: 2500, desc: "2,500 LESARs/mo + 10% affiliate commission on every referral for 1 year." },
  { id: "pro", label: "Community Manager", price: "$44/mo", lesars: 6000, desc: "6,000 LESARs/mo + 25% affiliate commission. Convention, enrollment, and talent partner role." },
];

const TIER_DEFAULT_LESARS: Record<string, number> = { passport: 100, plus: 1000, pro: 0 };
const TIER_RATE: Record<string, number> = { plus: 0.10, pro: 0.25 };
const TIER_OPTIONS = ["passport", "plus", "pro"];
const ADMIN_EMAIL = "contact@lesaruss.com";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [member, setMember] = useState<GfsMember | null>(null);
  const [points, setPoints] = useState<MemberPoints | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [referral, setReferral] = useState<Referral | null>(null);

  /* Passport panel */
  const [passportOpen, setPassportOpen] = useState(false);

  /* Admin */
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLesars, setInviteLesars] = useState(100);
  const [inviteTier, setInviteTier] = useState("passport");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [inviteError, setInviteError] = useState("");

  /* Affiliate copy */
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const u = session.user;
      setUserId(u.id);
      setUserEmail(u.email || null);

      const [memberRes, pointsRes, purchasesRes, referralRes] = await Promise.all([
        supabase.from("gfs_members").select("*").eq("user_id", u.id).maybeSingle(),
        supabase.from("member_points").select("available_points,total_points,spent_points").eq("user_id", u.id).maybeSingle(),
        supabase.from("point_purchases").select("id,amount_cents,status,created_at").eq("buyer_id", u.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("referrals").select("*").eq("referrer_id", u.id).maybeSingle(),
      ]);

      setMember(memberRes.data ?? null);
      setPoints(pointsRes.data ?? null);
      setPurchases(purchasesRes.data ?? []);
      setReferral(referralRes.data ?? null);
      setLoading(false);

      if (u.email === ADMIN_EMAIL) loadAdminMembers();
    }
    load();
  }, []);

  async function loadAdminMembers() {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      const json = await res.json();
      setAdminMembers(json.members || []);
    } catch (_) {/* silent */}
    setAdminLoading(false);
  }

  function handleTierChange(t: string) {
    setInviteTier(t);
    setInviteLesars(TIER_DEFAULT_LESARS[t] ?? 0);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteStatus("sending"); setInviteError("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, initial_lesars: inviteLesars, tier: inviteTier }),
      });
      const json = await res.json();
      if (!res.ok) { setInviteError(json.error || "Failed"); setInviteStatus("error"); return; }
      setInviteStatus("done");
      setInviteEmail(""); setInviteLesars(100); setInviteTier("passport");
      loadAdminMembers();
      setTimeout(() => { setInviteOpen(false); setInviteStatus("idle"); }, 2500);
    } catch (_) { setInviteError("Network error"); setInviteStatus("error"); }
  }

  function copyLink() {
    if (!referral?.ref_code) return;
    navigator.clipboard.writeText(`https://geekfon.ai/join?ref=${referral.ref_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.href : "https://geekfon.ai/dashboard" },
    });
  }

  const lesars = points?.available_points ?? 0;
  const displayName = member?.name || userEmail || "Member";
  const initial = displayName.charAt(0).toUpperCase();
  const tier = member?.tier || "passport";
  const tierLabel = tier === "pro" ? "Community Manager" : tier.charAt(0).toUpperCase() + tier.slice(1);
  const passportArtists = member?.passport_artists || [];
  const isAdmin = userEmail === ADMIN_EMAIL;
  const isAffiliate = tier === "plus" || tier === "pro";
  const commissionRate = TIER_RATE[tier] ? (TIER_RATE[tier] * 100).toFixed(0) : null;
  const memberProp = userId ? { name: displayName, balance: lesars, initial, tier } : undefined;

  /* ── Loading ── */
  if (loading) return (
    <SiteChrome>
      <style>{CSS}</style>
      <div className="dash-loading"><div className="dash-spinner" /></div>
    </SiteChrome>
  );

  /* ── Gate ── */
  if (!userId) return (
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
          <p className="dash-gate-sub">Sign in to access your dashboard, LESARs balance, and Passport artists.</p>
          <button className="dash-google-btn" onClick={signInWithGoogle}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <div className="dash-gate-divider"><span>or</span></div>
          <a href="/passport" className="dash-gate-cta-outline">Get your Passport</a>
        </div>
      </div>
    </SiteChrome>
  );

  /* ── Dashboard ── */
  return (
    <SiteChrome member={memberProp}>
      <style>{CSS}</style>
      <div className="dash">

        {/* Hero */}
        <div className="dash-hero">
          <div className="dash-hero-inner">
            <div className="dash-avatar">{initial}</div>
            <div className="dash-hero-info">
              <div className="dash-welcome">Welcome back</div>
              <div className="dash-name">{displayName}</div>
              <div className="dash-tier-badge">{tierLabel}</div>
            </div>
            <div className="dash-balance-card">
              <div className="dash-balance-label">LESARs Balance</div>
              <div className="dash-balance-num">{lesars.toLocaleString()}</div>
              <button className="dash-topup" onClick={() => setPassportOpen(v => !v)}>
                {passportOpen ? "- Hide options" : "+ Top up"}
              </button>
            </div>
          </div>
        </div>

        {/* Inline passport panel */}
        {passportOpen && (
          <div className="dash-passport-panel">
            <div className="dash-passport-inner">
              <div className="dash-passport-head">
                <h2 className="dash-passport-title">Passport Plans</h2>
                <button className="dash-passport-close" onClick={() => setPassportOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
              <div className="dash-passport-tiers">
                {PASSPORT_TIERS.map((t) => (
                  <div key={t.id} className={"dash-passport-tier" + (tier === t.id ? " current" : "")}>
                    {tier === t.id && <div className="dash-passport-cur-badge">Current plan</div>}
                    <div className="dash-pt-name">{t.label}</div>
                    <div className="dash-pt-price">{t.price}</div>
                    <div className="dash-pt-lesars">{t.lesars.toLocaleString()} LESARs/mo</div>
                    <div className="dash-pt-desc">{t.desc}</div>
                    {tier !== t.id && (
                      <a href={`/passport?tier=${t.id}`} className="dash-pt-cta">
                        {tier === "passport" ? "Upgrade" : "Switch"} to {t.label}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="dash-body">

          {/* Affiliate portal - Plus and Pro */}
          {isAffiliate && (
            <section className="dash-section dash-affiliate-section">
              <div className="dash-affiliate-head">
                <div>
                  <h2 className="dash-section-title dash-affiliate-title">
                    {tier === "pro" ? "Affiliate Portal" : "Your Referral Link"}
                  </h2>
                  <p className="dash-affiliate-sub">
                    Earn <strong>{commissionRate}% commission</strong> on every member you bring in - for a full year from their join date.
                  </p>
                </div>
                <div className="dash-affiliate-rate-badge">{commissionRate}%</div>
              </div>

              {referral ? (
                <>
                  <div className="dash-link-row">
                    <div className="dash-link-display">
                      geekfon.ai/join?ref={referral.ref_code}
                    </div>
                    <button className="dash-copy-btn" onClick={copyLink}>
                      {copied ? (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg> Copied</>
                      ) : (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy link</>
                      )}
                    </button>
                  </div>
                  <div className="dash-affiliate-stats">
                    <div className="dash-aff-stat">
                      <div className="dash-aff-stat-num">${((referral.total_earned_cents || 0) / 100).toFixed(2)}</div>
                      <div className="dash-aff-stat-label">Total Earned</div>
                    </div>
                    <div className="dash-aff-stat">
                      <div className="dash-aff-stat-num">${((referral.pending_earned_cents || 0) / 100).toFixed(2)}</div>
                      <div className="dash-aff-stat-label">Pending</div>
                    </div>
                    <div className="dash-aff-stat">
                      <div className="dash-aff-stat-num">
                        {referral.window_expires_at
                          ? Math.max(0, Math.ceil((new Date(referral.window_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                          : "-"}
                      </div>
                      <div className="dash-aff-stat-label">Days remaining</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="dash-empty">
                  <p>Your affiliate link is being generated. Check back shortly.</p>
                </div>
              )}
            </section>
          )}

          {/* Passport artists */}
          {passportArtists.length > 0 && (
            <section className="dash-section">
              <h2 className="dash-section-title">Your Passport Artists</h2>
              <div className="dash-artist-chips">
                {passportArtists.map((slug) => (
                  <a key={slug} href={`/${slug}`} className="dash-artist-chip">{slug.replace(/-/g, " ")}</a>
                ))}
              </div>
            </section>
          )}

          {/* Stats */}
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
              <button className="dash-section-cta" onClick={() => { setPassportOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ Top up LESARs</button>
            </div>
            {purchases.length === 0 ? (
              <div className="dash-empty">
                <p>No purchases yet.</p>
                <button className="dash-empty-cta" onClick={() => { setPassportOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  Explore Passport options
                </button>
              </div>
            ) : (
              <div className="dash-purchases">
                {purchases.map((p) => (
                  <div key={p.id} className="dash-purchase-row">
                    <div className="dash-purchase-info">
                      <div className="dash-purchase-name">Passport Purchase</div>
                      <div className="dash-purchase-date">{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
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

          {/* Explore */}
          <section className="dash-section">
            <h2 className="dash-section-title">Explore</h2>
            <div className="dash-quick-links">
              {[
                { label: "Roster", href: "/roster", desc: "Browse all artists" },
                { label: "GeekFon Radio", href: "/radio", desc: "Stream the universe" },
                { label: "Library", href: "/library", desc: "Your saved content" },
              ].map((l) => (
                <a key={l.href} href={l.href} className="dash-quick-card">
                  <div className="dash-quick-label">{l.label}</div>
                  <div className="dash-quick-desc">{l.desc}</div>
                  <div className="dash-quick-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Admin: Members Console */}
          {isAdmin && (
            <section className="dash-section dash-admin-section">
              <div className="dash-section-header">
                <h2 className="dash-section-title dash-admin-title">Members Console</h2>
                <button className="dash-invite-btn" onClick={() => { setInviteOpen(v => !v); setInviteStatus("idle"); }}>
                  {inviteOpen ? "Cancel" : "+ Invite Member"}
                </button>
              </div>

              {inviteOpen && (
                <form className="dash-invite-form" onSubmit={sendInvite}>
                  <div className="dash-invite-row">
                    <div className="dash-invite-field">
                      <label className="dash-invite-label">Email address</label>
                      <input className="dash-invite-input" type="email" required placeholder="member@example.com"
                        value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                    </div>
                    <div className="dash-invite-field">
                      <label className="dash-invite-label">Tier</label>
                      <select className="dash-invite-select" value={inviteTier} onChange={e => handleTierChange(e.target.value)}>
                        {TIER_OPTIONS.map(t => (
                          <option key={t} value={t}>
                            {t === "pro" ? "Community Manager (Pro)" : t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="dash-invite-field">
                      <label className="dash-invite-label">Seed LESARs <span className="dash-invite-hint">(auto by tier)</span></label>
                      <input className="dash-invite-input" type="number" min={0} step={100}
                        value={inviteLesars} onChange={e => setInviteLesars(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="dash-invite-tier-note">
                    {inviteTier === "pro" && <span>Community Manager - 25% affiliate commission, 1 year window. Seeded 0 LESARs by default.</span>}
                    {inviteTier === "plus" && <span>Plus - 10% affiliate commission, 1 year window. Seeded 1,000 LESARs by default.</span>}
                    {inviteTier === "passport" && <span>Passport - basic fan. Seeded 100 LESARs (enough to sample a few songs).</span>}
                  </div>
                  <div className="dash-invite-actions">
                    <button type="submit" className="dash-invite-submit" disabled={inviteStatus === "sending"}>
                      {inviteStatus === "sending" ? "Sending..." : inviteStatus === "done" ? "Sent!" : "Send Magic Link"}
                    </button>
                    {inviteError && <span className="dash-invite-error">{inviteError}</span>}
                    {inviteStatus === "done" && <span className="dash-invite-success">Invite sent to {inviteEmail}</span>}
                  </div>
                </form>
              )}

              {adminLoading ? (
                <div className="dash-admin-loading"><div className="dash-spinner" /></div>
              ) : adminMembers.length === 0 ? (
                <div className="dash-empty"><p>No members yet.</p></div>
              ) : (
                <div className="dash-members-table-wrap">
                  <table className="dash-members-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Tier</th><th>LESARs</th><th>Joined</th><th>Last login</th></tr>
                    </thead>
                    <tbody>
                      {adminMembers.map((m) => (
                        <tr key={m.id}>
                          <td className="dash-member-name">{m.name || "-"}</td>
                          <td className="dash-member-email">{m.email || "-"}</td>
                          <td><span className={"dash-member-tier t-" + (m.tier || "passport")}>{m.tier === "pro" ? "CM" : m.tier || "passport"}</span></td>
                          <td className="dash-member-lesars">{(m.available_points || 0).toLocaleString()}</td>
                          <td className="dash-member-date">{m.created_at ? new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "-"}</td>
                          <td className="dash-member-date">{m.last_sign_in ? new Date(m.last_sign_in).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "Never"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </SiteChrome>
  );
}

const CSS = `
.dash-google-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px 20px;border:1px solid #dadce0;border-radius:100px;background:#fff;font-family:inherit;font-size:14px;font-weight:700;color:#3c4043;cursor:pointer;transition:box-shadow .15s,border-color .15s}
.dash-google-btn:hover{box-shadow:0 1px 6px rgba(0,0,0,.14);border-color:#bbb}
.dash-gate-divider{display:flex;align-items:center;gap:12px;width:100%;color:var(--lr-text-30);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}
.dash-gate-divider::before,.dash-gate-divider::after{content:"";flex:1;height:1px;background:var(--lr-border)}
.dash-gate-cta-outline{display:inline-block;border:1px solid #E91E8C;color:#9c1458;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:11px 24px;border-radius:100px;text-decoration:none}
.dash-gate-cta-outline:hover{background:rgba(233,30,140,.06)}
.dash-loading{display:flex;align-items:center;justify-content:center;min-height:60vh}
.dash-spinner{width:40px;height:40px;border:3px solid var(--lr-border);border-top-color:#E91E8C;border-radius:50%;animation:dashSpin .8s linear infinite}
@keyframes dashSpin{to{transform:rotate(360deg)}}
.dash-gate{display:flex;align-items:center;justify-content:center;min-height:60vh;padding:40px 20px}
.dash-gate-card{max-width:400px;width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px}
.dash-gate-icon svg{width:64px;height:64px}
.dash-gate-title{font-size:28px;font-weight:900;margin:0}
.dash-gate-sub{font-size:15px;color:var(--lr-text-75);line-height:1.6;margin:0}
.dash{padding-bottom:80px}
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
.dash-topup{display:block;margin-top:10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#E91E8C;background:none;border:none;cursor:pointer;padding:0;font-family:inherit;text-align:right;width:100%}
.dash-topup:hover{text-decoration:underline}
@media(max-width:640px){
  .dash-hero{padding:24px 16px}
  .dash-hero-inner{flex-wrap:wrap}
  .dash-balance-card{width:100%;text-align:left;display:flex;align-items:center;gap:16px}
  .dash-balance-num{font-size:26px}
}
.dash-passport-panel{background:#f9f9f9;border-bottom:1px solid var(--lr-border)}
.dash-passport-inner{max-width:1100px;margin:0 auto;padding:32px 40px}
.dash-passport-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.dash-passport-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#9c1458;margin:0}
.dash-passport-close{background:none;border:none;cursor:pointer;color:var(--lr-text-50);display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%}
.dash-passport-close:hover{background:var(--lr-border)}
.dash-passport-close svg{width:16px;height:16px}
.dash-passport-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.dash-passport-tier{background:#fff;border:1.5px solid var(--lr-border);border-radius:14px;padding:22px 20px;position:relative;transition:border-color .15s}
.dash-passport-tier.current{border-color:#E91E8C;box-shadow:0 0 0 3px rgba(233,30,140,.08)}
.dash-passport-cur-badge{position:absolute;top:-10px;left:16px;background:#E91E8C;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:20px}
.dash-pt-name{font-size:16px;font-weight:900;margin-bottom:4px}
.dash-pt-price{font-size:24px;font-weight:900;letter-spacing:-.02em;color:#1a1a1a;margin-bottom:6px}
.dash-pt-lesars{font-size:12px;font-weight:800;color:#E91E8C;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
.dash-pt-desc{font-size:13px;color:var(--lr-text-75);line-height:1.5;margin-bottom:16px}
.dash-pt-cta{display:block;text-align:center;background:#111;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:12px;border-radius:100px;text-decoration:none;transition:background .15s}
.dash-pt-cta:hover{background:#E91E8C}
@media(max-width:700px){.dash-passport-inner{padding:24px 16px}.dash-passport-tiers{grid-template-columns:1fr}}
.dash-body{max-width:1100px;margin:0 auto;padding:32px 40px 0}
@media(max-width:700px){.dash-body{padding:24px 16px 0}}
.dash-section{margin-bottom:40px}
.dash-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.dash-section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#9c1458;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid var(--lr-border)}
.dash-section-header .dash-section-title{margin-bottom:0;border-bottom:none;padding-bottom:0}
.dash-section-cta{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#9c1458;background:none;border:none;cursor:pointer;font-family:inherit;padding:0}
.dash-section-cta:hover{text-decoration:underline}
/* Affiliate */
.dash-affiliate-section{background:linear-gradient(135deg,#0d0d0d 0%,#1a0a12 100%);border-radius:16px;padding:28px 28px 24px;color:#fff;margin-bottom:40px}
.dash-affiliate-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}
.dash-affiliate-title{color:#E91E8C !important;border-bottom-color:rgba(233,30,140,.3) !important}
.dash-affiliate-sub{font-size:14px;color:rgba(255,255,255,.65);margin:8px 0 0;line-height:1.5}
.dash-affiliate-sub strong{color:#fff}
.dash-affiliate-rate-badge{flex-shrink:0;width:60px;height:60px;border-radius:50%;background:rgba(233,30,140,.2);border:2px solid #E91E8C;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#E91E8C}
.dash-link-row{display:flex;align-items:center;gap:10px;margin-bottom:20px}
.dash-link-display{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px 16px;font-size:13px;font-weight:600;color:rgba(255,255,255,.8);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-copy-btn{display:flex;align-items:center;gap:6px;flex-shrink:0;background:#E91E8C;color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:12px 18px;border-radius:100px;transition:background .15s}
.dash-copy-btn:hover{background:#c4146f}
.dash-copy-btn svg{width:14px;height:14px}
.dash-affiliate-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.dash-aff-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px}
.dash-aff-stat-num{font-size:22px;font-weight:900;letter-spacing:-.01em}
.dash-aff-stat-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.4);margin-top:3px}
/* Stats */
.dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dash-stat{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:18px 20px}
.dash-stat-num{font-size:28px;font-weight:900;letter-spacing:-.02em;color:#1a1a1a}
.dash-stat-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);margin-top:4px}
@media(max-width:700px){.dash-stats{grid-template-columns:repeat(2,1fr)}.dash-affiliate-stats{grid-template-columns:1fr}}
.dash-artist-chips{display:flex;flex-wrap:wrap;gap:10px}
.dash-artist-chip{font-size:12px;font-weight:800;text-transform:capitalize;padding:8px 16px;border-radius:100px;background:rgba(233,30,140,.1);border:1px solid rgba(233,30,140,.25);color:#9c1458;text-decoration:none;letter-spacing:.04em}
.dash-artist-chip:hover{background:rgba(233,30,140,.18)}
.dash-purchases{display:flex;flex-direction:column;gap:1px;background:var(--lr-border);border:1px solid var(--lr-border);border-radius:12px;overflow:hidden}
.dash-purchase-row{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff}
.dash-purchase-info{display:flex;flex-direction:column;gap:3px}
.dash-purchase-name{font-size:14px;font-weight:700}
.dash-purchase-date{font-size:11px;color:var(--lr-text-50);font-weight:600}
.dash-purchase-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.dash-purchase-amount{font-size:15px;font-weight:900}
.dash-purchase-status{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:2px 8px;border-radius:20px}
.dash-purchase-status.s-succeeded,.dash-purchase-status.s-complete{background:rgba(76,175,80,.12);color:#2e7d32}
.dash-purchase-status.s-pending{background:rgba(246,152,32,.14);color:#b45309}
.dash-purchase-status.s-failed{background:rgba(239,68,68,.1);color:#b91c1c}
.dash-empty{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.dash-empty p{font-size:14px;color:var(--lr-text-50);margin:0}
.dash-empty-cta{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#9c1458;background:none;border:none;cursor:pointer;font-family:inherit;padding:0}
.dash-empty-cta:hover{text-decoration:underline}
.dash-quick-links{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.dash-quick-card{display:flex;flex-direction:column;gap:4px;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:18px 18px 16px;text-decoration:none;transition:border-color .15s,box-shadow .15s;position:relative}
.dash-quick-card:hover{border-color:#E91E8C;box-shadow:0 0 0 3px rgba(233,30,140,.07)}
.dash-quick-label{font-size:15px;font-weight:900;color:#1a1a1a}
.dash-quick-desc{font-size:12px;color:var(--lr-text-50);font-weight:500}
.dash-quick-arrow{position:absolute;bottom:14px;right:14px;color:var(--lr-text-30)}
.dash-quick-arrow svg{width:16px;height:16px}
.dash-quick-card:hover .dash-quick-arrow{color:#E91E8C}
@media(max-width:700px){.dash-quick-links{grid-template-columns:repeat(2,1fr)}}
/* Admin */
.dash-admin-section{border-top:2px solid #111;padding-top:24px}
.dash-admin-title{color:#1a1a1a !important;border-bottom-color:#1a1a1a !important}
.dash-invite-btn{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#fff;background:#111;border:none;cursor:pointer;font-family:inherit;padding:9px 18px;border-radius:100px}
.dash-invite-btn:hover{background:#E91E8C}
.dash-invite-form{background:#f5f5f5;border:1px solid var(--lr-border);border-radius:12px;padding:20px 22px;margin-bottom:20px}
.dash-invite-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:10px}
@media(max-width:700px){.dash-invite-row{grid-template-columns:1fr}}
.dash-invite-label{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--lr-text-50);margin-bottom:6px}
.dash-invite-hint{font-weight:600;text-transform:none;letter-spacing:0;color:var(--lr-text-30)}
.dash-invite-input,.dash-invite-select{width:100%;padding:10px 12px;border:1px solid var(--lr-border);border-radius:8px;font-family:inherit;font-size:14px;font-weight:600;background:#fff;color:#1a1a1a;box-sizing:border-box}
.dash-invite-input:focus,.dash-invite-select:focus{outline:none;border-color:#E91E8C}
.dash-invite-tier-note{font-size:12px;color:var(--lr-text-50);margin-bottom:14px;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid var(--lr-border)}
.dash-invite-actions{display:flex;align-items:center;gap:14px}
.dash-invite-submit{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:#111;border:none;cursor:pointer;font-family:inherit;padding:11px 24px;border-radius:100px;transition:background .15s}
.dash-invite-submit:hover:not(:disabled){background:#E91E8C}
.dash-invite-submit:disabled{opacity:.5;cursor:default}
.dash-invite-error{font-size:12px;font-weight:700;color:#b91c1c}
.dash-invite-success{font-size:12px;font-weight:700;color:#2e7d32}
.dash-admin-loading{display:flex;justify-content:center;padding:32px}
.dash-admin-loading .dash-spinner{width:28px;height:28px;border-width:2.5px}
.dash-members-table-wrap{overflow-x:auto;border:1px solid var(--lr-border);border-radius:12px}
.dash-members-table{width:100%;border-collapse:collapse;font-size:13px}
.dash-members-table th{text-align:left;padding:10px 14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--lr-text-50);border-bottom:1px solid var(--lr-border);background:#fafafa}
.dash-members-table td{padding:12px 14px;border-bottom:1px solid var(--lr-border);vertical-align:middle}
.dash-members-table tr:last-child td{border-bottom:none}
.dash-members-table tr:hover td{background:#fafafa}
.dash-member-name{font-weight:700;color:#1a1a1a}
.dash-member-email{color:var(--lr-text-75);font-size:12px}
.dash-member-tier{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:20px;background:rgba(233,30,140,.1);color:#9c1458}
.dash-member-lesars{font-weight:800;color:#1a1a1a}
.dash-member-date{font-size:11px;color:var(--lr-text-50);white-space:nowrap}
`;
