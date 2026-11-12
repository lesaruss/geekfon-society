"use client";
// /auth/sso?lrsso=<handoff>&next=<path>
// Lands a member arriving from another LESARUSS brand's universal bar already
// signed in: trades the handoff for a one-time hash (app/api/shell/sso) and
// verifies it with the browser client, then goes to `next`, or by default
// (lib/postAuth) staff to BrandDesk in HQ and fans to /you. Any failure goes
// to the sign-in page.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { goAfterSignIn, safeReturnPath } from "@/lib/postAuth";

export default function SsoLanding() {
  const [msg, setMsg] = useState("Signing you in…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = safeReturnPath(params.get("next"));
    const token = params.get("lrsso");
    (async () => {
      try {
        if (!token) throw new Error("missing");
        const res = await fetch("/api/shell/sso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lrsso: token }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.token_hash) throw new Error(body.error || "failed");
        const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: body.token_hash });
        if (error) throw error;
        await goAfterSignIn(next);
      } catch {
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
