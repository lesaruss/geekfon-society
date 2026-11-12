"use client";
// Who is signed in, for the new site's shell (the rail, the phone top bar and
// Your GeekFon at /you). Reads the browser's Supabase session, then asks
// /api/you for the name, staff flag and unlocked artists. Follows sign in and
// sign out in this tab and in others.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isStaffAccount } from "@/lib/postAuth";
import type { YouData } from "@/app/api/you/route";

export type SignedIn = Extract<YouData, { signedIn: true }>;
export type Me = { state: "loading" } | { state: "out" } | ({ state: "in" } & SignedIn);

// A pending referral (dropped by /join?ref=CODE) is claimed for the signed-in
// member once. This ran on /dashboard before; fans now land on the new site.
function claimReferral(token: string) {
  try {
    const code = localStorage.getItem("gfs_ref_code");
    if (!code) return;
    localStorage.removeItem("gfs_ref_code");
    localStorage.removeItem("gfs_ref_code_at");
    fetch("/api/referral/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ref_code: code }),
    }).catch(() => { /* best effort, as before */ });
  } catch { /* storage blocked */ }
}

export function useMe(): { me: Me; signOut: () => Promise<void> } {
  const [me, setMe] = useState<Me>({ state: "loading" });

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setMe({ state: "out" }); return; }
      const u = session.user;
      claimReferral(session.access_token);
      const res = await fetch("/api/you", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" }).catch(() => null);
      const d = (res && res.ok ? await res.json().catch(() => null) : null) as YouData | null;
      if (d?.signedIn) { setMe({ state: "in", ...d }); return; }
      // The server could not say (no service key): what the session knows.
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const name = (typeof meta.full_name === "string" && meta.full_name) || (u.email ? u.email.split("@")[0] : "Member");
      const staff = isStaffAccount(u.email, null);
      setMe({
        state: "in", signedIn: true, name, firstName: name.split(/\s+/)[0] || name, email: u.email ?? null,
        avatar: (typeof meta.avatar_url === "string" && meta.avatar_url) || null,
        staff, allArtists: staff, plan: staff ? "Staff" : null, unlocked: [],
      });
    } catch {
      setMe({ state: "out" });
    }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(ev => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* signed out below regardless */ }
    try { await fetch("/api/auth/session", { method: "DELETE" }); } catch { /* ignore */ }
    setMe({ state: "out" });
  }, []);

  return { me, signOut };
}
