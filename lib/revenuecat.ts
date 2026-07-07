"use client";
// RevenueCat entitlement + purchase service, Capacitor-only.
//
// This SDK only exists inside the native app shell (Capacitor). On the
// regular website (Vercel, any browser) Capacitor.isNativePlatform() is
// false and every function here becomes a safe no-op, the web keeps using
// Stripe Checkout via /api/checkout exactly as it does today. This file is
// the ONLY place that talks to RevenueCat, so the identifier strings below
// stay in one spot.

import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { RevenueCatUI, PAYWALL_RESULT } from "@revenuecat/purchases-capacitor-ui";

// The RevenueCat *identifier* (not the display name "Geekfon Society All
// Access"), confirm this on the Entitlements page in the RevenueCat
// dashboard. Overridable so a mismatch is a one-line env change, not a
// redeploy of logic.
export const ALL_ACCESS_ENTITLEMENT =
  process.env.NEXT_PUBLIC_RC_ENTITLEMENT_ALL_ACCESS || "all_access";

// Product identifiers for the three LESARs top-up packs. Match these exactly
// to what's configured as non-subscription products in RevenueCat AND to the
// PRICE_MAP/LESARS_MAP keys in app/api/checkout/route.ts, so both purchase
// paths (Stripe web, RevenueCat native) credit the same amounts.
export const LESARS_PACK_PRODUCTS: Record<string, number> = {
  "pack-starter": 500,
  "pack-standard": 1000,
  "pack-power": 5000,
};

let configured = false;

export function isNative() {
  return Capacitor.isNativePlatform();
}

/**
 * Configure the SDK once per app session. Call this as early as possible
 * after you know the logged-in Supabase user id, ideally right after login
 * and again on cold start if a session already exists. Safe to call
 * multiple times, it's a no-op after the first successful call for the same
 * user.
 */
export async function configureRevenueCat(appUserId: string | null) {
  if (!isNative() || configured) return;

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) {
    console.error("[revenuecat] NEXT_PUBLIC_REVENUECAT_API_KEY is not set, skipping configure");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }

  await Purchases.configure({
    apiKey,
    appUserID: appUserId || undefined, // undefined -> RevenueCat assigns an anonymous id
  });

  configured = true;
}

/**
 * Call this once you know the real Supabase user id (e.g. right after
 * login), so an anonymous RevenueCat user gets aliased to the real account
 * instead of leaving two disconnected purchase histories.
 */
export async function loginRevenueCat(appUserId: string) {
  if (!isNative()) return;
  if (!configured) {
    await configureRevenueCat(appUserId);
    return;
  }
  await Purchases.logIn({ appUserID: appUserId });
}

export async function logoutRevenueCat() {
  if (!isNative() || !configured) return;
  await Purchases.logOut();
}

/** Current customer info, entitlements + active subscriptions + purchase history. */
export async function getCustomerInfo() {
  if (!isNative()) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (err) {
    console.error("[revenuecat] getCustomerInfo failed", err);
    return null;
  }
}

/** True if the signed-in user currently has an active All-Access entitlement. */
export async function hasAllAccess(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return Boolean(info.entitlements.active[ALL_ACCESS_ENTITLEMENT]);
}

/** Fetch the current offerings (packages) configured in RevenueCat. */
export async function getOfferings() {
  if (!isNative()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (err) {
    console.error("[revenuecat] getOfferings failed", err);
    return null;
  }
}

/**
 * Present RevenueCat's built-in paywall UI, gated to the All-Access
 * entitlement. Returns true if the user ends up entitled (purchased,
 * restored, or already had it), false otherwise. Use this from the "Get All
 * Access" button instead of hitting /api/checkout when running natively.
 */
export async function presentAllAccessPaywall(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ALL_ACCESS_ENTITLEMENT,
    });
    return (
      result.result === PAYWALL_RESULT.PURCHASED ||
      result.result === PAYWALL_RESULT.RESTORED ||
      result.result === PAYWALL_RESULT.NOT_PRESENTED // already entitled
    );
  } catch (err) {
    console.error("[revenuecat] presentAllAccessPaywall failed", err);
    return false;
  }
}

/** Purchase one of the LESARs top-up packs directly (no paywall UI needed for consumables). */
export async function purchaseLesarsPack(productId: keyof typeof LESARS_PACK_PRODUCTS) {
  if (!isNative()) return { success: false, error: "not-native" as const };
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === productId
    );
    if (!pkg) {
      return { success: false, error: `product ${productId} not found in current offering` };
    }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true, customerInfo };
  } catch (err: any) {
    if (err?.userCancelled) {
      return { success: false, error: "cancelled" as const };
    }
    console.error("[revenuecat] purchaseLesarsPack failed", err);
    return { success: false, error: String(err) };
  }
}

/** Restore prior purchases, e.g. after a reinstall or a new device. */
export async function restorePurchases() {
  if (!isNative()) return null;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (err) {
    console.error("[revenuecat] restorePurchases failed", err);
    return null;
  }
}

/** Open RevenueCat's Customer Center (manage/cancel subscription, view purchase history). */
export async function presentCustomerCenter() {
  if (!isNative()) return;
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    console.error("[revenuecat] presentCustomerCenter failed", err);
  }
}
