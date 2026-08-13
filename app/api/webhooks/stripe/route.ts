// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { creditLesars, creditReferralCommission } from "@/lib/ledger";

export const config = { api: { bodyParser: false } };

// Finds an existing Supabase auth user by email, or creates one if none
// exists yet. Used for guest (no prior account) artist-unlock and
// season-pass purchases - see the branches below. Uses the Auth Admin
// listUsers/createUser API rather than querying auth.users directly, since
// the auth schema isn't exposed over PostgREST. Scans the first page of
// users, which is fine at GeekFon's current member volume; if the member
// base grows past ~1000, this needs pagination or a dedicated email index.
async function findOrCreateUserIdByEmail(supabase: ReturnType<typeof createClient>, email: string): Promise<string> {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createErr || !created?.user) throw createErr || new Error("createUser returned no user");
  return created.user.id;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const supabase = createClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[webhook] sig verify failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    const lesars = parseInt(session.metadata?.lesars || "0", 10);

    if (userId && plan && lesars > 0) {
      await creditLesars(supabase, userId, lesars, plan, session.id);

      // Cross-platform entitlement: tier is the single source of truth read by
      // both web and the native app. tier_source records which purchase surface
      // last set it (stripe here; the RevenueCat webhook sets apple/google).
      if (plan === "passport") {
        await supabase
          .from("gfs_members")
          .update({ tier: "passport", tier_source: "stripe" })
          .eq("user_id", userId)
          .eq("tier", "free");
      }

      if (plan === "all-access") {
        await supabase
          .from("gfs_members")
          .update({ tier: "all-access", tier_source: "stripe" })
          .eq("user_id", userId);
      }

      // Affiliate commission (added 2026-07-27, see lib/ledger.ts) - no-ops
      // silently if this purchaser wasn't referred by anyone.
      await creditReferralCommission(supabase, userId, session.amount_total ?? 0);
    }

    // Per-artist "Full Experience" unlock (added 2026-07-23). Separate branch
    // from the lesars>0 block above since this plan intentionally carries
    // 0 lesars - it is not a Points purchase, it just grants permanent
    // playback access to one artist's full catalog, released or not.
    //
    // Fixed 2026-07-26 per Sean: the unlock button used to force sign-in
    // before checkout, purely so this webhook would have a userId to write.
    // That's backwards - the fix is here, not a login wall on the button.
    // Guests now check out with no account at all; Stripe Checkout always
    // collects an email for one-time payments, so on a guest purchase we
    // find-or-create a Supabase auth user for that email, give them a free
    // gfs_members row, and grant the unlock against that user_id. If they
    // ever log in with the same email (existing email-code login flow),
    // their unlock is already there under the account matched by email.
    if (plan === "artist-unlock" && session.metadata?.artist_slug) {
      let unlockUserId = userId || null;

      if (!unlockUserId) {
        const guestEmail = session.customer_details?.email || (session as any).customer_email;
        if (guestEmail) {
          try {
            unlockUserId = await findOrCreateUserIdByEmail(supabase, guestEmail);
            await supabase
              .from("gfs_members")
              .upsert(
                { user_id: unlockUserId, tier: "free", tier_source: "stripe" },
                { onConflict: "user_id", ignoreDuplicates: true }
              );
          } catch (e) {
            console.error("[webhook] guest artist-unlock provisioning failed", e);
          }
        } else {
          console.error("[webhook] guest artist-unlock with no email on session", session.id);
        }
      }

      if (unlockUserId) {
        await supabase
          .from("gfs_artist_unlocks")
          .upsert(
            {
              user_id: unlockUserId,
              artist_slug: session.metadata.artist_slug,
              source: "stripe",
              amount_cents: session.amount_total ?? 1100,
              external_id: session.id,
            },
            { onConflict: "user_id,artist_slug" }
          );

        // Affiliate commission (added 2026-07-27, see lib/ledger.ts) - covers
        // the guest-checkout path too, since unlockUserId is set either way.
        await creditReferralCommission(supabase, unlockUserId, session.amount_total ?? 1100);
      }
    }

    // Season Pass (added 2026-07-30, Sean-approved rebuild): the new default
    // purchase mechanic, replacing artist-unlock above for now without
    // deleting it. Same guest-checkout pattern as artist-unlock - find or
    // create a Supabase user by email so no one has to log in before paying.
    // Unlike artist-unlock, this writes season + purchase_type + a permanent
    // download_enabled=true flag, and is keyed unique on
    // (user_id, artist_slug, season) so a second season for the same artist
    // creates a new row instead of overwriting the first one's flags.
    if (plan === "season-pass" && session.metadata?.artist_slug && session.metadata?.season) {
      let seasonUserId = userId || null;

      if (!seasonUserId) {
        const guestEmail = session.customer_details?.email || (session as any).customer_email;
        if (guestEmail) {
          try {
            seasonUserId = await findOrCreateUserIdByEmail(supabase, guestEmail);
            await supabase
              .from("gfs_members")
              .upsert(
                { user_id: seasonUserId, tier: "free", tier_source: "stripe" },
                { onConflict: "user_id", ignoreDuplicates: true }
              );
          } catch (e) {
            console.error("[webhook] guest season-pass provisioning failed", e);
          }
        } else {
          console.error("[webhook] guest season-pass with no email on session", session.id);
        }
      }

      if (seasonUserId) {
        await supabase
          .from("gfs_artist_unlocks")
          .upsert(
            {
              user_id: seasonUserId,
              artist_slug: session.metadata.artist_slug,
              season: session.metadata.season,
              purchase_type: "season_pass",
              download_enabled: true,
              discount_pct_applied: Number(session.metadata.discount_pct_applied || 0),
              source: "stripe",
              amount_cents: session.amount_total ?? 1100,
              external_id: session.id,
            },
            { onConflict: "user_id,artist_slug,season" }
          );

        await creditReferralCommission(supabase, seasonUserId, session.amount_total ?? 1100);
      }
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const userId =
      invoice.metadata?.user_id ||
      (invoice as any).subscription_details?.metadata?.user_id;
    const subId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : (invoice.subscription as any)?.id;

    if (userId && subId && invoice.billing_reason === "subscription_cycle") {
      // Universal points convention (locked 2026-08-13): $1 = 100 points, so the
      // $11/mo renewal grants 1,100 points, not the old placeholder 500.
      await creditLesars(supabase, userId, 1100, "all-access-renewal", invoice.id);
    }
  }

  return NextResponse.json({ received: true });
}
