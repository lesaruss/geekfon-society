// GET /api/you   (Authorization: Bearer <supabase token>)
//
// Your GeekFon (/you) and the new site's rail: who is signed in, whether they
// are staff (they land on BrandDesk in HQ), and which artists they can hear in
// full: their own unlocks (gfs_artist_unlocks), or every artist with Lifetime,
// the grandfathered All Access, or Pro. Same rules as lib/server/entitlements.
// No points, no LESARs. Signed out: { signedIn: false }.
//
// Only the Bearer token is read (not the auth_token cookie), so signing out in
// the browser signs the page out at once.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { isStaffAccount } from "@/lib/postAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const ALL_ARTIST_TIERS: Record<string, string> = { lifetime: "Lifetime", "all-access": "All Access" };

export type YouData =
  | { signedIn: false }
  | {
      signedIn: true;
      name: string;
      firstName: string;
      email: string | null;
      avatar: string | null;
      staff: boolean;
      /** Every artist in full (Lifetime, All Access, Pro or staff). */
      allArtists: boolean;
      /** The plan behind allArtists, in plain words, or null. */
      plan: string | null;
      /** Artist slugs unlocked one by one (page slugs, Riku as "riku"). */
      unlocked: string[];
    };

export async function GET(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const sb = serviceClient();
  if (!token || !sb) return NextResponse.json({ signedIn: false } satisfies YouData, { headers: NO_STORE });

  const { data: auth, error } = await sb.auth.getUser(token);
  const user = auth?.user;
  if (error || !user) return NextResponse.json({ signedIn: false } satisfies YouData, { headers: NO_STORE });

  const [{ data: member }, { data: unlocks }] = await Promise.all([
    sb.from("gfs_members").select("name, tier, role, is_pro").eq("user_id", user.id).maybeSingle(),
    sb.from("gfs_artist_unlocks").select("artist_slug").eq("user_id", user.id),
  ]);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const name = str(member?.name) || str(meta.full_name) || str(meta.name) || (user.email ? user.email.split("@")[0] : "Member");
  const staff = isStaffAccount(user.email, member?.role ?? null);
  const tierPlan = member?.tier ? ALL_ARTIST_TIERS[member.tier] ?? null : null;
  const plan = staff ? "Staff" : tierPlan ?? (member?.is_pro ? "Pro" : null);
  const unlocked = [...new Set(((unlocks ?? []) as { artist_slug: string }[]).map(u => (u.artist_slug === "riku-hayasaka" ? "riku" : u.artist_slug)))];

  const body: YouData = {
    signedIn: true,
    name,
    firstName: name.split(/\s+/)[0] || name,
    email: user.email ?? null,
    avatar: str(meta.avatar_url) || str(meta.picture),
    staff,
    allArtists: !!plan,
    plan,
    unlocked,
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
