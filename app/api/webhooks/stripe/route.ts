import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

type PointsRow = { available_points: number; total_points: number } | null;

async function creditLesars(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  plan: string,
  referenceId: string
) {
  const { data } = await supabase
    .from("member_points")
    .select("available_points, total_points")
    .eq("user_id", userId)
    .maybeSingle();

  const existing = data as PointsRow;
  const newAvailable = (existing?.available_points || 0) + amount;
  const newTotal = (existing?.total_points || 0) + amount;

  await supabase
    .from("member_points")
    .upsert(
      {
        user_id: userId,
        available_points: newAvailable,
        total_points: newTotal,
        locked_points: 0,
        spent_points: existing ? undefined : 0,
      },
      { onConflict: "user_id" }
    );

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
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

      if (plan === "passport") {
        await supabase
          .from("gfs_members")
          .update({ tier: "passport" })
          .eq("user_id", userId)
          .eq("tier", "public");
      }

      if (plan === "all-access") {
        await supabase
          .from("gfs_members")
          .update({ tier: "all-access" })
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
