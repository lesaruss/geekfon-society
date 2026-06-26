import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

async function creditLesars(userId: string, amount: number, plan: string, referenceId: string) {
  // Upsert member_points
  const { data: existing } = await supabase
    .from("member_points")
    .select("available_points, total_points")
    .eq("user_id", userId)
    .maybeSingle();

  const newAvailable = (existing?.available_points || 0) + amount;
  const newTotal = (existing?.total_points || 0) + amount;

  await supabase
    .from("member_points")
    .upsert({ user_id: userId, available_points: newAvailable, total_points: newTotal, locked_points: 0, spent_points: existing ? undefined : 0 }, { onConflict: "user_id" });

  // Log to ledger
  await supabase.from("lesars_ledger").insert({
    user_id: userId,
    brand_slug: "geekfon",
    event_type: "purchase",
    amount,
    balance_after: newAvailable,
    description: `LESARs purchase — ${plan}`,
    reference_id: referenceId,
  });
}

export async function POST(req: NextRequest) {
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
      await creditLesars(userId, lesars, plan, session.id);

      // For passport (free tier), update member tier to 'passport' if still 'public'
      if (plan === "passport") {
        await supabase
          .from("gfs_members")
          .update({ tier: "passport" })
          .eq("user_id", userId)
          .eq("tier", "public");
      }

      // For all-access, update to plus tier
      if (plan === "all-access") {
        await supabase
          .from("gfs_members")
          .update({ tier: "all-access" })
          .eq("user_id", userId);
      }
    }
  }

  // Handle subscription renewals for All Access
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const userId = invoice.metadata?.user_id || (invoice as any).subscription_details?.metadata?.user_id;
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

    if (userId && subId && invoice.billing_reason === "subscription_cycle") {
      // Monthly renewal — grant 1,500 LESARs
      await creditLesars(userId, 1500, "all-access-renewal", invoice.id);
    }
  }

  return NextResponse.json({ received: true });
}
