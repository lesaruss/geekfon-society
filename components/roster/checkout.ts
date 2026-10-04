"use client";
// Starts the $11 support checkout (the live "album" plan in app/api/checkout;
// its Stripe webhook writes the gfs_artist_unlocks row the entitlement check
// reads). Returns an error message, or null once the browser is redirecting.
import { supabase } from "@/lib/supabase";

export async function startSupportCheckout(albumId: string, slug: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "album", albumId, userId: session?.user?.id || null, returnUrl: `/${slug}` }),
    });
    const body = await res.json();
    if (body.url) { window.location.href = body.url; return null; }
    return body.error || "Checkout could not start. Please try again.";
  } catch {
    return "Checkout could not start. Please try again.";
  }
}
