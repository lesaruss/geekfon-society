"use client";
// /auth/lesaruss?code=&state=  or  ?error=login_required&state=
// Where HQ (hq.lesaruss.ai/connect and /connect/silent) sends the browser
// back. The state must match the one this tab saved (lib/lesarussClient).
// A code is traded for a one-time hash (app/api/auth/lesaruss), verified with
// the browser client, and bridged to the auth_token cookie like Google sign-in
// (/api/auth/oauth-session). Quiet mode returns to the page the visitor was on;
// an explicit sign-in goes on through lib/postAuth (staff to BrandDesk, fans to
// /you or the saved page), or to /complete-profile for a first-time member.
// error=login_required (nobody signed in at HQ) goes back quietly.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { goAfterSignIn } from "@/lib/postAuth";
import { BACK_KEY, MODE_KEY, STATE_KEY, redirectUriFor, safeBack, stateMatches } from "@/lib/lesarussSignIn";

function take(key: string): string | null {
  try { const v = sessionStorage.getItem(key); sessionStorage.removeItem(key); return v; } catch { return null; }
}

export default function LesarussLanding() {
  const [msg, setMsg] = useState("Signing you in…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const saved = take(STATE_KEY);
    const quiet = take(MODE_KEY) === "quiet";
    const back = safeBack(take(BACK_KEY));
    const home = back || "/";

    if (!stateMatches(state, saved)) {
      if (quiet) { window.location.replace(home); return; }
      setMsg("That sign-in did not start in this tab. Taking you to sign in…");
      setTimeout(() => window.location.replace("/login"), 1400);
      return;
    }
    if (error || !code) {
      if (quiet) { window.location.replace(home); return; }
      window.location.replace(back ? `/login?redirect=${encodeURIComponent(back)}` : "/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/lesaruss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri: redirectUriFor(window.location.origin) }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.token_hash) throw new Error("failed");
        const { data, error: vErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: body.token_hash });
        if (vErr) throw vErr;
        let needsProfile = false;
        const s = data.session;
        if (s) {
          const r = await fetch("/api/auth/oauth-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token }),
          }).catch(() => null);
          const d = r && r.ok ? await r.json().catch(() => null) : null;
          needsProfile = !!d?.needsProfile;
        }
        if (quiet) { window.location.replace(home); return; }
        if (needsProfile) { window.location.replace("/complete-profile"); return; }
        await goAfterSignIn(back);
      } catch {
        if (quiet) { window.location.replace(home); return; }
        setMsg("Couldn't sign you in automatically. Taking you to sign in…");
        setTimeout(() => window.location.replace("/login"), 1200);
      }
    })();
  }, []);
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020c0a", color: "rgba(255,255,255,.75)", fontFamily: "Montserrat, sans-serif", fontSize: 14 }}>
      {msg}
    </main>
  );
}
