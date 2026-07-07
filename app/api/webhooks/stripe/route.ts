// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { creditLesars } from "@/lib/ledger";

export const config = { api: { bodyParser: false } };

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
      await creditLesars(supabase, userId, 1500, "all-access-renewal", invoice.id);
    }
  }

  return NextResponse.json({ received: true });
}
