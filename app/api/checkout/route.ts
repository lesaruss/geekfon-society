import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_MAP: Record<string, string | undefined> = {
  "pack-starter":  process.env.STRIPE_PRICE_LESARS_STARTER,
  "pack-standard": process.env.STRIPE_PRICE_LESARS_STANDARD,
  "pack-power":    process.env.STRIPE_PRICE_LESARS_POWER,
  "all-access":    process.env.STRIPE_PRICE_ALL_ACCESS,
  "passport":      process.env.STRIPE_PRICE_PASSPORT,
  // Added 2026-07-23: one-time $11 per-artist "Full Experience" unlock,
  // the only paid mechanic going forward - see gfs_artist_unlocks. The
  // Points packs and All-Access rows above are left in place (no longer
  // reachable from any UI) rather than deleted, since the RevenueCat
  // webhook still references them and ripping them out isn't needed to
  // ship this.
  "artist-unlock": process.env.STRIPE_PRICE_ARTIST_UNLOCK,
};

const LESARS_MAP: Record<string, number> = {
  "pack-starter":  500,
  "pack-standard": 1000,
  "pack-power":    5000,
  // 2026-09-06 (Sean, direct correction, geekfon-society-blueprint canon):
  // All Access grants 1,500 points/month, not the 1,100 the universal $1=100
  // convention would imply. This is a locked exception for the monthly
  // subscription specifically -- one-off LESARs packs below still follow the
  // strict 100:1 rate. See public.briefings slug geekfon-society-blueprint.
  "all-access":    1500,
  "passport":      111,
  "artist-unlock": 0,
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const supabase = createClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { plan, userId, returnUrl, artistSlug, season, packAmount: rawPackAmount } = await req.json();

    // Season Pass (added 2026-07-30, Sean-approved rebuild): replaces the flat
    // artist-unlock model above for now. artist-unlock is left in place, not
    // deleted, same "leave it, don't rip it out" pattern already used for the
    // retired Points/All-Access rows below. Price is computed server-side per
    // user via gfs_calc_season_price (loyalty rate: $5.50 if they already own
    // any prior season, $11 if not), so there is no fixed Stripe Price ID for
    // this plan - price_data is built inline on every request instead.
    if (plan === "season-pass") {
      if (!artistSlug || !season) {
        return NextResponse.json({ error: "artistSlug and season are required for season-pass" }, { status: 400 });
      }

      let priceCents = 1100;
      let discountPct = 0;
      if (userId) {
        const { data: priceRow, error: priceErr } = await supabase
          .rpc("gfs_calc_season_price", { p_user_id: userId })
          .single();
        if (priceErr) {
          console.error("[checkout] gfs_calc_season_price failed", priceErr);
        } else if (priceRow) {
          const row = priceRow as { price_cents: number; discount_pct: number };
          priceCents = row.price_cents;
          discountPct = row.discount_pct;
        }
      }

      const origin = req.headers.get("origin") || "https://geekfon.ai";
      const successUrl = returnUrl
        ? `${origin}${returnUrl}?checkout=success&plan=season-pass&season=${encodeURIComponent(season)}`
        : `${origin}/dashboard?checkout=success&plan=season-pass`;
      const cancelUrl = returnUrl
        ? `${origin}${returnUrl}?checkout=cancelled`
        : `${origin}/passport?checkout=cancelled`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: priceCents,
            product_data: {
              name: `GeekFon Society - ${artistSlug} - ${season} Pass`,
              description: "Own this season forever. Download every track.",
            },
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId || "",
          plan,
          artist_slug: artistSlug,
          season,
          discount_pct_applied: String(discountPct),
        },
        ...(userId && { client_reference_id: userId }),
      });

      return NextResponse.json({ url: session.url });
    }

    // LESARs pack (added 2026-08-14, Sean-locked pricing spec; generalized
    // 2026-08-14 to a tiered lookup table per Sean's "different increments"
    // direction). Fixed dollar tiers, each mapping to a fixed LESARs amount
    // - not a derived multiplier, since 1110/11 is not a clean scalar. The
    // bulk top-up that funds per-song unlocks (150 LESARs unlocks one song,
    // locked 2026-09-06 - see app/api/tracks/unlock/route.ts). Built inline like season-pass
    // above instead of via PRICE_MAP/STRIPE_PRICE_* env vars, since these are
    // fixed prices with no server-side pricing logic needed. The webhook's
    // existing generic `if (userId && plan && lesars > 0) creditLesars(...)`
    // branch (app/api/webhooks/stripe/route.ts) already credits any plan
    // that carries a `lesars` metadata value, so no webhook change was
    // needed to ship this or the tier generalization.
    if (plan === "lesars-pack") {
      if (!userId) {
        return NextResponse.json({ error: "Sign in required to buy a LESARs pack" }, { status: 400 });
      }

      const LESARS_PACKS: Record<number, number> = {
        11: 1110,
        22: 2220,
        55: 5550,
        111: 11100,
      };
      const packAmount = Number(rawPackAmount) || 11;
      const lesarsForPack = LESARS_PACKS[packAmount];
      if (!lesarsForPack) {
        return NextResponse.json({ error: "Invalid LESARs pack amount" }, { status: 400 });
      }
      const priceCents = packAmount * 100;

      const origin = req.headers.get("origin") || "https://geekfon.ai";
      const successUrl = returnUrl
        ? `${origin}${returnUrl}?checkout=success&plan=lesars-pack`
        : `${origin}/dashboard?checkout=success&plan=lesars-pack`;
      const cancelUrl = returnUrl
        ? `${origin}${returnUrl}?checkout=cancelled`
        : `${origin}/passport?checkout=cancelled`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: priceCents,
            product_data: {
              name: `GeekFon Society - ${lesarsForPack.toLocaleString()} LESARs`,
              description: `${lesarsForPack.toLocaleString()} LESARs to spend unlocking songs (150 LESARs unlocks one song).`,
            },
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          plan,
          lesars: String(lesarsForPack),
        },
        client_reference_id: userId,
      });

      return NextResponse.json({ url: session.url });
    }

    if (!plan || !PRICE_MAP[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan === "artist-unlock" && !artistSlug) {
      return NextResponse.json({ error: "artistSlug is required for artist-unlock" }, { status: 400 });
    }

    if (userId) {
      const { data: member } = await supabase
        .from("gfs_members")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
    }

    const origin = req.headers.get("origin") || "https://geekfon.ai";
    const successUrl = returnUrl
      ? `${origin}${returnUrl}?checkout=success&plan=${plan}`
      : `${origin}/dashboard?checkout=success&plan=${plan}`;
    const cancelUrl = returnUrl
      ? `${origin}${returnUrl}?checkout=cancelled`
      : `${origin}/passport?checkout=cancelled`;

    const isSubscription = plan === "all-access";

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: PRICE_MAP[plan]!, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId || "",
        plan,
        lesars: String(LESARS_MAP[plan] || 0),
        ...(plan === "artist-unlock" ? { artist_slug: artistSlug } : {}),
      },
      ...(userId && { client_reference_id: userId }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
// redeploy-nudge: 2026-07-30 all-access price rotated
// redeploy-nudge: 2026-08-16 checkout + webhook Stripe account moved VE -> LESARUSS (Sean-approved)
