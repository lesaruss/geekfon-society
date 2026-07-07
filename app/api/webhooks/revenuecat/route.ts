// @ts-nocheck
// RevenueCat webhook, the native-app counterpart to the Stripe webhook.
// RevenueCat normalizes Apple App Store Server Notifications and Google
// Play real-time developer notifications into one event shape, so this is
// the only server-side integration point needed for native purchases, no
// separate Apple/Google receipt handling required.
//
// Configure this URL in RevenueCat > Project Settings > Integrations >
// Webhooks, and set the same value there and in REVENUECAT_WEBHOOK_SECRET
// as the Authorization header.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { creditLesars } from "@/lib/ledger";
import { ALL_ACCESS_ENTITLEMENT, LESARS_PACK_PRODUCTS } from "@/lib/revenuecat";

function mapStore(store: string | undefined): "apple" | "google" | "stripe" | null {
  switch (store) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "apple";
    case "PLAY_STORE":
      return "google";
    case "STRIPE":
      return "stripe";
    default:
      return null; // PROMOTIONAL, AMAZON, ROKU, etc. - not wired up
  }
}

const GRANT_EVENTS = ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "TRANSFER"];
const REVOKE_EVENTS = ["EXPIRATION"];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.REVENUECAT_WEBHOOK_SECRET || auth !== process.env.REVENUECAT_WEBHOOK_SECRET) {
    console.error("[revenuecat webhook] auth mismatch");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const event = body?.event;
  if (!event) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (event.type === "TEST") {
    return NextResponse.json({ received: true });
  }

  const userId: string | undefined = event.app_user_id;
  const source = mapStore(event.store);
  const entitlementIds: string[] = event.entitlement_ids || (event.entitlement_id ? [event.entitlement_id] : []);

  // All-Access grant/renew/etc.
  if (userId && source && entitlementIds.includes(ALL_ACCESS_ENTITLEMENT) && GRANT_EVENTS.includes(event.type)) {
    await supabase
      .from("gfs_members")
      .update({
        tier: "all-access",
        tier_source: source,
        ...(source === "apple" && event.original_transaction_id
          ? { apple_original_transaction_id: String(event.original_transaction_id) }
          : {}),
        ...(source === "google" && event.original_transaction_id
          ? { google_purchase_token: String(event.original_transaction_id) }
          : {}),
      })
      .eq("user_id", userId);
  }

  // All-Access actually ended (not just auto-renew turned off, CANCELLATION
  // alone keeps access until period end and is intentionally not handled here).
  if (userId && source && entitlementIds.includes(ALL_ACCESS_ENTITLEMENT) && REVOKE_EVENTS.includes(event.type)) {
    // Only downgrade if this same store granted it, never let an expiring
    // Apple/Google entitlement clobber an active Stripe-web subscription
    // for the same user.
    await supabase
      .from("gfs_members")
      .update({ tier: "free" })
      .eq("user_id", userId)
      .eq("tier_source", source);
  }

  // LESARs top-up packs, consumable, no entitlement involved.
  if (userId && event.type === "NON_RENEWING_PURCHASE" && event.product_id in LESARS_PACK_PRODUCTS) {
    const amount = LESARS_PACK_PRODUCTS[event.product_id as keyof typeof LESARS_PACK_PRODUCTS];
    await creditLesars(supabase, userId, amount, event.product_id, event.transaction_id || event.id);
  }

  return NextResponse.json({ received: true });
}
