"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { configureRevenueCat, loginRevenueCat, logoutRevenueCat, isNative } from "@/lib/revenuecat";

// Boots the RevenueCat SDK as soon as the app shell loads, native only (a
// no-op on the regular website). Keeps the RevenueCat appUserID in sync with
// the Supabase auth session so a purchase made on one device shows up under
// the same identity everywhere.
export default function RevenueCatBootstrap() {
  useEffect(() => {
    if (!isNative()) return;

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) configureRevenueCat(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        loginRevenueCat(session.user.id);
      } else if (event === "SIGNED_OUT") {
        logoutRevenueCat();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
