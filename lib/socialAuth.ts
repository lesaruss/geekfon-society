"use client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/lib/supabase";

// Google explicitly rejects OAuth sign-in from an embedded webview
// user-agent ("disallowed_useragent"), and this whole app IS a Capacitor
// WebView displaying geekfon.ai - so the OAuth flow can never run inside the
// app's own webview. On native, we open the OAuth URL in the system browser
// via @capacitor/browser (a real Safari/Chrome Custom Tab context, distinct
// from the embedded webview), then catch the redirect back into the app via
// the custom com.lesaruss.geekfon:// URL scheme (registered in Info.plist /
// AndroidManifest.xml), and hand the returned tokens to supabase-js
// directly. On the regular website this is just the standard supabase-js
// OAuth redirect flow.
const REDIRECT_SCHEME = "com.lesaruss.geekfon://auth-callback";

function redirectWeb() {
  return typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "https://geekfon.ai/auth/callback";
}

function isNative() {
  return Capacitor.isNativePlatform();
}

async function finishNativeOAuth(url: string) {
  const fragment = url.split("#")[1] || url.split("?")[1] || "";
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    console.error("[socialAuth] no tokens in redirect URL");
    return;
  }
  await supabase.auth.setSession({ access_token, refresh_token });
  try {
    const res = await fetch("/api/auth/oauth-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    });
    const data = await res.json();
    window.location.href = data.needsProfile ? "/complete-profile" : "/dashboard";
  } catch (err) {
    console.error("[socialAuth] oauth-session failed", err);
  }
}

export async function signInWithProvider(provider: "google" | "apple") {
  if (!isNative()) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectWeb() },
    });
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: REDIRECT_SCHEME, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    console.error("[socialAuth] signInWithOAuth failed", error);
    return;
  }

  const handle = await CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(REDIRECT_SCHEME)) return;
    handle.remove();
    await Browser.close().catch(() => {});
    await finishNativeOAuth(url);
  });

  await Browser.open({ url: data.url });
}
