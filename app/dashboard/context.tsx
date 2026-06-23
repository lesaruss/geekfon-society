// app/dashboard/context.tsx
"use client";
import { createContext, useContext } from "react";

export type GfsMember = {
  id: string; user_id: string; name: string | null; tier: string | null;
  passport_artists: string[] | null;
};
export type MemberPoints = { available_points: number; total_points: number; spent_points: number };
export type Purchase = { id: string; amount_cents: number; status: string; created_at: string };
export type Referral = {
  id: string; ref_code: string; commission_rate: number;
  window_expires_at: string | null; total_earned_cents: number; pending_earned_cents: number;
};

export type DashboardCtx = {
  userId: string | null;
  userEmail: string | null;
  member: GfsMember | null;
  points: MemberPoints | null;
  purchases: Purchase[];
  referral: Referral | null;
  memberCount: number;
  loading: boolean;
};

export const DashboardContext = createContext<DashboardCtx>({
  userId: null, userEmail: null, member: null, points: null,
  purchases: [], referral: null, memberCount: 0, loading: true,
});

export function useDashboard() { return useContext(DashboardContext); }

export const TIER_MONTHLY: Record<string, number> = { passport: 1000, promoter: 2500, pro: 6000 };
export const TIER_LABEL: Record<string, string> = { passport: "Passport", promoter: "Promoter", pro: "Community Manager" };
export const TIER_RATE: Record<string, number> = { promoter: 0.10, pro: 0.25 };
export const ADMIN_EMAIL = "contact@lesaruss.com";
export const GOAL = 1_000_000;
