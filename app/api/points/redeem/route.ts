import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Points economy redeem endpoint.
// Spends a member's existing points balance (member_points.available_points)
// on a season pass or a single track, in place of a Stripe checkout.
// Season pricing mirrors cash pricing 1:1 (100 points = $1, so cents == points):
//   first season pass  -> 1100 pts
//   any season after owning one -> 550 pts (loyalty rate)
// Single track is a fixed 150 pts.
//
// Entitlement is written to the same tables a cash purchase would use
// (gfs_artist_unlocks / gfs_track_purchases), source="points", so downstream
// access checks (gfs_check_season_access, gfs_can_download) don't need to
// know or care how the item was paid for.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, kind, artistSlug, season, trackName, trackUrl } = body || {};

    if (!userId || !kind || !artistSlug) {
      return NextResponse.json(
        { error: "userId, kind, and artistSlug are required" },
        { status: 400 }
      );
    }

    if (kind === "season_pass") {
      if (!season) {
        return NextResponse.json({ error: "season is required" }, { status: 400 });
      }
      const { data, error } = await supabase
        .rpc("gfs_redeem_points_for_season", {
          p_user_id: userId,
          p_artist_slug: artistSlug,
          p_season: season,
        })
        .single();

      if (error) {
        return NextResponse.json(
          { error: mapRedeemError(error.message) },
          { status: statusForError(error.message) }
        );
      }

      const row = data as { points_spent: number; discount_pct: number; new_balance: number };
      return NextResponse.json({
        ok: true,
        kind: "season_pass",
        pointsSpent: row.points_spent,
        discountPct: row.discount_pct,
        newBalance: row.new_balance,
      });
    }

    if (kind === "single_track") {
      if (!trackName) {
        return NextResponse.json({ error: "trackName is required" }, { status: 400 });
      }
      const { data, error } = await supabase
        .rpc("gfs_redeem_points_for_track", {
          p_user_id: userId,
          p_artist_slug: artistSlug,
          p_track_name: trackName,
          p_track_url: trackUrl || null,
        })
        .single();

      if (error) {
        return NextResponse.json(
          { error: mapRedeemError(error.message) },
          { status: statusForError(error.message) }
        );
      }

      const row = data as { points_spent: number; new_balance: number };
      return NextResponse.json({
        ok: true,
        kind: "single_track",
        pointsSpent: row.points_spent,
        newBalance: row.new_balance,
      });
    }

    return NextResponse.json(
      { error: 'kind must be "season_pass" or "single_track"' },
      { status: 400 }
    );
  } catch (err) {
    console.error("points/redeem error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function mapRedeemError(message) {
  if (message.includes("insufficient points")) return "Not enough points for this purchase.";
  if (message.includes("already owned")) return "You already own this.";
  if (message.includes("not authorized")) return "Not authorized.";
  return "Unable to complete redemption.";
}

function statusForError(message) {
  if (message.includes("insufficient points")) return 402;
  if (message.includes("already owned")) return 409;
  if (message.includes("not authorized")) return 403;
  return 500;
}
