// app/dashboard/context.tsx
"use client";
import { createContext, useContext } from "react";

export type GfsMember = {
  id: string; user_id: string; name: string | null; tier: string | null;
  passport_artists: string[] | null;
  // 2026-07-27 per Sean: invite-only VIP flag for the Playlist feature - full
  // catalog access, no payment involved, granted by admin only. See
  // app/dashboard/library/page.tsx and app/api/admin/members/[id]/route.ts.
  is_pro?: boolean;
};
export type MemberPoints = { available_points: number; total_points: number; spent_points: number };
export type Purchase = { id: string; amount_cents: number; status: string; created_at: string };
export type Referral = {
  id: string; ref_code: string; commission_rate: number;
  window_expires_at: string | null; total_earned_cents: number; pending_earned_cents: number;
};

// Tier here is the product-facing membership tier used by View As and
// ArtistPage's simulation logic (public/passport/plus/pro) - distinct from the
// legacy gfs_members.tier DB vocabulary (passport/promoter/pro) still used by
// the affiliate program below. See components/SiteChrome.tsx for the same type.
export type Tier = "public" | "passport" | "plus" | "pro";

export type DashboardCtx = {
  userId: string | null;
  userEmail: string | null;
  member: GfsMember | null;
  points: MemberPoints | null;
  purchases: Purchase[];
  referral: Referral | null;
  memberCount: number;
  loading: boolean;
  // 2026-07-27 per Sean: the dashboard home page always rendered the real
  // gfs_members.tier ("passport" for his own account) with zero admin
  // awareness, and never read the "gfs-view-as" simulation SiteChrome already
  // supports elsewhere. isAdmin + viewAs let /dashboard/page.tsx branch to a
  // real Admin Command Center when not simulating, and correctly reflect the
  // simulated tier's experience when it is.
  isAdmin: boolean;
  viewAs: Tier | null;
};

export const DashboardContext = createContext<DashboardCtx>({
  userId: null, userEmail: null, member: null, points: null,
  purchases: [], referral: null, memberCount: 0, loading: true,
  isAdmin: false, viewAs: null,
});

export function useDashboard() { return useContext(DashboardContext); }

export const TIER_MONTHLY: Record<string, number> = { passport: 1500, promoter: 2500, pro: 6000 };
export const TIER_LABEL: Record<string, string> = { passport: "Passport", promoter: "Promoter", pro: "Community Manager" };
export const TIER_RATE: Record<string, number> = { promoter: 0.10, pro: 0.25 };
export const ADMIN_EMAIL = "contact@lesaruss.com";
export const GOAL = 1_000_000;

