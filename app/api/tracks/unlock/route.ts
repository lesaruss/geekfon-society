import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { debitLesars } from "@/lib/ledger";

// Added 2026-08-14: per-song LESARs unlock (111 LESARs/song), replacing the
// flat $11 per-artist Season Pass as GeekFon's only paid mechanic (Sean,
// 2026-08-14 - locked pricing spec). Calls the existing Postgres
// debit_lesars() RPC via lib/ledger.ts's debitLesars() wrapper, which does
// the balance check, ledger row, and gfs_track_purchases insert atomically
// and idempotently (ON CONFLICT DO NOTHING on user_id+artist_slug+track_name,
// so a double-click or retry never double-charges).
const TRACK_UNLOCK_COST_LESARS = 111;

export async function POST(req: NextRequest) {
  const supabase = createClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { artistSlug, trackName, trackUrl } = await req.json();
    if (!artistSlug || !trackName) {
      return NextResponse.json({ error: "artistSlug and trackName are required" }, { status: 400 });
    }

    const result = await debitLesars(
      supabase,
      userId,
      artistSlug,
      trackName,
      TRACK_UNLOCK_COST_LESARS,
      trackUrl || null
    );

    if (!result.ok) {
      if (result.error === "insufficient_balance") {
        return NextResponse.json(
          { success: false, error: "insufficient_balance", balance_after: result.balance },
          { status: 402 }
        );
      }
      if (result.error === "no_account") {
        return NextResponse.json({ success: false, error: "no_account" }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: result.error || "Unlock failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      owned: true,
      already_owned: !!result.alreadyOwned,
      balance_after: result.balance,
    });
  } catch (err) {
    console.error("[tracks/unlock]", err);
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }
}
