// Supporter entitlement, checked on the server. Never trust a client flag.
//
// A viewer can hear an artist's vault in full when ANY of these hold:
//   - they own a gfs_artist_unlocks row for that artist (the $11 one-time
//     support / album / pre-order purchases all write here, see the Stripe
//     webhook), or
//   - their gfs_members.tier is 'lifetime' ($111, every artist) or the
//     retired 'all-access' (grandfathered, canon-geekfon-album-model), or
//     they are an invite-only Pro (is_pro), or
//   - they are staff (the super-admin account).
// Separately, a song bought on its own with LESARs (gfs_track_purchases)
// stays fully playable for its owner even without supporting the artist.

import type { NextRequest } from "next/server";
import { serviceClient } from "./supabaseAdmin";
import { depotSlug } from "./depot";

const ADMIN_EMAIL = "contact@lesaruss.com";
const ALL_ARTIST_TIERS = new Set(["lifetime", "all-access"]);

export type Viewer = { id: string; email: string | null };

export type Entitlement = {
  supporter: boolean; // full vault for this artist
  allArtists: boolean; // Lifetime / grandfathered All Access / Pro / staff
  download: boolean;
  ownedTitles: Set<string>;
  reason: "staff" | "lifetime" | "pro" | "support" | "none";
};

// The app's session lives in the Supabase JS client (localStorage), so API
// calls carry it as a Bearer token. The httpOnly auth_token cookie set by the
// email-code login is accepted as a fallback.
export async function viewerFromRequest(req: NextRequest): Promise<Viewer | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : req.cookies.get("auth_token")?.value;
  if (!token) return null;
  const sb = serviceClient();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function entitlementFor(viewer: Viewer | null, artistSlug: string): Promise<Entitlement> {
  const none: Entitlement = { supporter: false, allArtists: false, download: false, ownedTitles: new Set(), reason: "none" };
  if (!viewer) return none;
  const sb = serviceClient();
  if (!sb) return none;

  // Unlock rows may carry either Riku slug, so match both spellings.
  const slug = depotSlug(artistSlug);
  const slugs = slug === "riku" ? ["riku", "riku-hayasaka"] : [slug];

  const [{ data: member }, { data: unlocks }, { data: owned }] = await Promise.all([
    sb.from("gfs_members").select("tier, is_pro, role").eq("user_id", viewer.id).maybeSingle(),
    sb.from("gfs_artist_unlocks").select("id, download_enabled").eq("user_id", viewer.id).in("artist_slug", slugs),
    sb.from("gfs_track_purchases").select("track_name").eq("user_id", viewer.id).in("artist_slug", slugs),
  ]);

  const ownedTitles = new Set((owned ?? []).map((r: { track_name: string }) => r.track_name));
  const isStaff = viewer.email === ADMIN_EMAIL || member?.role === "super_admin";
  if (isStaff) return { supporter: true, allArtists: true, download: true, ownedTitles, reason: "staff" };
  if (member?.tier && ALL_ARTIST_TIERS.has(member.tier)) return { supporter: true, allArtists: true, download: true, ownedTitles, reason: "lifetime" };
  if (member?.is_pro) return { supporter: true, allArtists: true, download: false, ownedTitles, reason: "pro" };
  if (unlocks && unlocks.length > 0) {
    const download = unlocks.some((u: { download_enabled: boolean | null }) => u.download_enabled !== false);
    return { supporter: true, allArtists: false, download, ownedTitles, reason: "support" };
  }
  return { ...none, ownedTitles };
}

// Staff = the super-admin account or a member with role super_admin.
export async function isStaff(viewer: Viewer | null): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.email === ADMIN_EMAIL) return true;
  const sb = serviceClient();
  if (!sb) return false;
  const { data } = await sb.from("gfs_members").select("role").eq("user_id", viewer.id).maybeSingle();
  return data?.role === "super_admin";
}
