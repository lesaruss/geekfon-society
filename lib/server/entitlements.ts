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
  // Which of the artist's albums the vault covers: null means every song
  // (staff, Lifetime, Pro, or an artist-wide unlock); otherwise only the
  // songs on these albums (Sean, 2026-10-05: the $11 buys an album, and a
  // new album is a new release of its own).
  albumIds: Set<string> | null;
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

// The group chat is one chat for the whole roster, so it opens for a
// supporter of ANY artist (Sean, 2026-10-10): an album or pre-order of any
// artist, Lifetime, grandfathered All Access, Pro, or staff.
export async function chatSupporter(viewer: Viewer | null): Promise<{ supporter: boolean; staff: boolean }> {
  if (!viewer) return { supporter: false, staff: false };
  const sb = serviceClient();
  if (!sb) return { supporter: false, staff: false };
  const [{ data: member }, { count }] = await Promise.all([
    sb.from("gfs_members").select("tier, is_pro, role").eq("user_id", viewer.id).maybeSingle(),
    sb.from("gfs_artist_unlocks").select("id", { count: "exact", head: true }).eq("user_id", viewer.id),
  ]);
  const staff = viewer.email === ADMIN_EMAIL || member?.role === "super_admin";
  const supporter = staff || (!!member?.tier && ALL_ARTIST_TIERS.has(member.tier)) || !!member?.is_pro || (count ?? 0) > 0;
  return { supporter, staff };
}

export async function entitlementFor(viewer: Viewer | null, artistSlug: string): Promise<Entitlement> {
  const none: Entitlement = { supporter: false, allArtists: false, download: false, ownedTitles: new Set(), albumIds: null, reason: "none" };
  if (!viewer) return none;
  const sb = serviceClient();
  if (!sb) return none;

  // Unlock rows may carry either Riku slug, so match both spellings.
  const slug = depotSlug(artistSlug);
  const slugs = slug === "riku" ? ["riku", "riku-hayasaka"] : [slug];

  const [{ data: member }, { data: unlocks }, { data: owned }] = await Promise.all([
    sb.from("gfs_members").select("tier, is_pro, role").eq("user_id", viewer.id).maybeSingle(),
    sb.from("gfs_artist_unlocks").select("id, download_enabled, album_id").eq("user_id", viewer.id).in("artist_slug", slugs),
    sb.from("gfs_track_purchases").select("track_name").eq("user_id", viewer.id).in("artist_slug", slugs),
  ]);

  const ownedTitles = new Set((owned ?? []).map((r: { track_name: string }) => r.track_name));
  const isStaff = viewer.email === ADMIN_EMAIL || member?.role === "super_admin";
  if (isStaff) return { supporter: true, allArtists: true, download: true, ownedTitles, albumIds: null, reason: "staff" };
  if (member?.tier && ALL_ARTIST_TIERS.has(member.tier)) return { supporter: true, allArtists: true, download: true, ownedTitles, albumIds: null, reason: "lifetime" };
  if (member?.is_pro) return { supporter: true, allArtists: true, download: false, ownedTitles, albumIds: null, reason: "pro" };
  if (unlocks && unlocks.length > 0) {
    type Unlock = { download_enabled: boolean | null; album_id: string | null };
    const rows = unlocks as Unlock[];
    const download = rows.some(u => u.download_enabled !== false);
    // An unlock with no album (the older season pass) covers every song.
    const albumIds = rows.some(u => !u.album_id) ? null : new Set(rows.map(u => u.album_id!));
    return { supporter: true, allArtists: false, download, ownedTitles, albumIds, reason: "support" };
  }
  return { ...none, ownedTitles };
}
