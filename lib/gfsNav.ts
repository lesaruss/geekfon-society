// The GeekFon navigation registry: which destinations a member sees, by tier
// and by account. Shared by the public chrome (components/SiteChrome.tsx) and
// the dashboard's universal shell (components/shell/GfsShell.tsx) so the two
// can never disagree about what a member is allowed to see (universal
// dashboard playbook, 2026-10-04). Moved here verbatim from SiteChrome.

export type Tier = "public" | "passport" | "plus" | "pro";
export type NavItem = { label: string; href: string };

// GeekFon Radio added 2026-07-26 per Sean: the /radio page (and the homepage
// hero-circle play button) no longer require an account, so the nav should
// surface it to anonymous visitors too, not just logged-in tiers below.
const NAV_PUBLIC: NavItem[] = [
  { label: "Overview",      href: "/#overview" },
  { label: "Roster",        href: "/roster" },
  { label: "GeekFon Radio", href: "/radio" },
];

// "Pro" here (nav label + /pro href) is the invite-only ambassador application
// program (renamed from "Plus" 2026-07-27 per Sean - see app/pro/page.tsx).
// Included on all three signed-in nav variants since app/pro/page.tsx's own
// access gate accepts any member with a tier at all, not just Plus/Pro
// product-tier holders - Passport members had no nav path to discover it
// before this fix, despite already being eligible to apply.
const NAV_PASSPORT: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Playlist",        href: "/dashboard/library" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Pro",             href: "/pro" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const NAV_PLUS: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Playlist",        href: "/dashboard/library" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Pro",             href: "/pro" },
  { label: "GeekFon Radio",   href: "/radio" },
];

const NAV_PRO: NavItem[] = [
  { label: "Overview",        href: "/dashboard" },
  { label: "Roster",          href: "/roster" },
  { label: "Playlist",        href: "/dashboard/library" },
  { label: "Artist Rankings", href: "/dashboard/top10" },
  { label: "Pro",             href: "/pro" },
  { label: "GeekFon Radio",   href: "/radio" },
];



export function navForTier(tier: Tier, isAdmin = false, canSeeReleaseSchedule = false, canSeeRadioSchedule = false, canSeeMembers = false, canSeeOutreach = false, canSeeProApplications = false): NavItem[] {
  let base: NavItem[];
  if (tier === "plus")          base = NAV_PLUS;
  else if (tier === "pro")      base = NAV_PRO;
  else if (tier === "passport") base = NAV_PASSPORT;
  else                          base = NAV_PUBLIC;
  // Release Schedule is restricted to Sean's account (ADMIN_EMAIL) only - not a tier
  // perk, not a role perk. isAdmin alone used to be enough (any super_admin/admin
  // role), which is broader than intended. See navForTier caller for the exact check.
  if (canSeeReleaseSchedule) {
    base = [...base, { label: "Song Manager", href: "/dashboard/release-schedule" }];
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
  // Outreach List - segmented/exportable member list for marketing (feeds
  // Resend/Beehiiv, doesn't send anything itself). Same account-only admin
  // gate, added 2026-07-26 per Sean.
  if (canSeeOutreach) {
    base = [...base, { label: "Outreach List", href: "/dashboard/outreach" }];
  }
  // Pro Applications review (added 2026-07-27 alongside app/pro/page.tsx) -
  // same account-only gate, since this is where accepting an applicant grants
  // real catalog access + a live affiliate code, not something to expose to
  // every admin/super_admin broadly.
  if (canSeeProApplications) {
    base = [...base, { label: "Pro Applications", href: "/dashboard/pro-applications" }];
  }
  return base;
}


export function parseTier(raw: string): Tier {
  const r = (raw || "").toLowerCase();
  if (r === "all-access") return "plus";
  if (r === "lifetime")   return "pro";
  if (r === "passport")   return "passport";
  // Fixed 2026-07-27: gfs_members.tier also carries the separate ambassador/
  // affiliate vocabulary (see app/dashboard/context.tsx - "promoter"/"pro" are
  // legacy DB values distinct from this function's product-tier axis). Those
  // two raw values fell through to "public" here, which meant a real signed-in
  // ambassador member rendered as logged-out in the top nav (wrong tier badge,
  // "Log in / Get Passport" buttons shown instead of their account). Accepted
  // GeekFon Pro ambassadors (raw tier "pro") get full-catalog product access,
  // so they map to the "pro" product tier; "promoter" maps to "plus" as the
  // nearest equivalent until/unless it needs its own nav variant.
  if (r === "pro")      return "pro";
  if (r === "promoter") return "plus";
  return "public";
}
