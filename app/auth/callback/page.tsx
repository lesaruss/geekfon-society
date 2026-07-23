"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";

// Landing page for the web-side Google/Apple OAuth redirect. supabase-js
// auto-detects the session from the URL fragment on load (detectSessionInUrl
// defaults to true), so this just waits for that, bridges the session into
// our auth_token cookie via /api/auth/oauth-session, and routes to
// /complete-profile (first-time sign-in) or /dashboard. The native flow
// (lib/socialAuth.ts) never lands here - it resolves directly.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function finish(session: { access_token: string; refresh_token: string }) {
      try {
        const res = await fetch("/api/auth/oauth-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sign-in failed");
        if (cancelled) return;
        router.replace(data.needsProfile ? "/complete-profile" : "/dashboard");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        finish(session);
        return;
      }
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          sub.subscription.unsubscribe();
          finish(session);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <SiteChrome>
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.8)" }}>
        {error ? <p role="alert">{error}</p> : <p>Signing you in...</p>}
      </div>
    </SiteChrome>
  );
}
