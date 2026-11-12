"use client";
// Browser side of Continue with LESARUSS (lib/lesarussSignIn has the pure
// rules). startLesaruss saves a random state, the page to come back to and
// the mode in this tab, then leaves for HQ; /auth/lesaruss finishes.
import { BACK_KEY, MODE_KEY, QUIET_KEY, STATE_KEY, connectUrl, newState, safeBack, shouldQuietCheck, silentUrl } from "@/lib/lesarussSignIn";

export type LesarussMode = "quiet" | "explicit";

function save(mode: LesarussMode, back: string | null): string {
  const state = newState();
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(MODE_KEY, mode);
  const b = safeBack(back);
  if (b) sessionStorage.setItem(BACK_KEY, b); else sessionStorage.removeItem(BACK_KEY);
  return state;
}

/** The button: sign in at HQ (or pick up the HQ session), then come back. `back` null lets lib/postAuth decide. */
export function startLesaruss(back: string | null): void {
  let state: string;
  try { state = save("explicit", back); } catch { state = newState(); }
  window.location.assign(connectUrl(window.location.origin, state));
}

/** The quiet check: hop once per tab session when nobody is signed in here. Returns true when it left. */
export function quietCheck(hasSession: boolean): boolean {
  try {
    const ok = shouldQuietCheck({
      hasSession,
      pathname: window.location.pathname,
      quietFlag: sessionStorage.getItem(QUIET_KEY),
      userAgent: navigator.userAgent,
      hostname: window.location.hostname,
      inFrame: window.top !== window,
    });
    if (!ok) return false;
    sessionStorage.setItem(QUIET_KEY, "1");
    const state = save("quiet", window.location.pathname + window.location.search + window.location.hash);
    window.location.replace(silentUrl(window.location.origin, state));
    return true;
  } catch {
    return false;
  }
}
