import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_MAP: Record<string, string | undefined> = {
  "pack-starter":  process.env.STRIPE_PRICE_LESARS_STARTER,
  "pack-standard": process.env.STRIPE_PRICE_LESARS_STANDARD,
  "pack-power":    process.env.STRIPE_PRICE_LESARS_POWER,
  "all-access":    process.env.STRIPE_PRICE_ALL_ACCESS,
  "passport":      process.env.STRIPE_PRICE_PASSPORT,
};

const LESARS_MAP: Record<string, number> = {
  "pack-starter":  500,
  "pack-standard": 1000,
  "pack-power":    5000,
  "all-access":    1500,
  "passport":      111,
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { plan, userId, returnUrl } = await req.json();

    if (!plan || !PRICE_MAP[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
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
      },
      ...(userId && { client_reference_id: userId }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
