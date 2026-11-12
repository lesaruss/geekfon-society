// Where to send someone after they sign up or sign in (2026-10-04): an artist
// page links to /register?redirect=/roxanne so a fan sent to Roxanne's page
// lands back on it, not on /welcome. Google/Apple sign-in leaves the site and
// returns through /auth/callback, so the target is kept in sessionStorage.
// Only same-site paths are accepted.
const KEY = "gfs_post_auth_redirect";

export function safeReturnPath(v: string | null | undefined): string | null {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  return v;
}

export function rememberReturn(v: string | null | undefined): void {
  const p = safeReturnPath(v);
  try { if (p) sessionStorage.setItem(KEY, p); } catch { /* storage blocked */ }
}

export function takeReturn(): string | null {
  try {
    const p = safeReturnPath(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    return p;
  } catch {
    return null;
  }
}

// Where a signed-in person belongs (Sean, 2026-11-12: "when you're logged in,
// it's still the old website"). Staff (the admin account, or a gfs_members
// role of admin or super_admin) land on the GeekFon BrandDesk in HQ, where
// the staff tools are moving. Fans stay on geekfon.ai in the new site, on
// Your GeekFon (/you), or on the same-site page they were sent from.
export const STAFF_HOME = "https://hq.lesaruss.ai/new/branddesk/geekfon-society";
export const FAN_HOME = "/you";
export const STAFF_EMAIL = "contact@lesaruss.com";
const STAFF_ROLES = new Set(["admin", "super_admin"]);

export function isStaffAccount(email: string | null | undefined, role: string | null | undefined): boolean {
  return (!!email && email.toLowerCase() === STAFF_EMAIL) || (!!role && STAFF_ROLES.has(role));
}

/** The old dashboard and the old tour are retired for fans. */
function retiredForFans(p: string): boolean {
  return p === "/dashboard" || p.startsWith("/dashboard/") || p.startsWith("/dashboard?") || p === "/welcome" || p.startsWith("/welcome?");
}

/**
 * The page to open after sign in or sign up. A saved same-site return path
 * (?redirect= or the one kept across Google/Apple sign-in) wins, except that
 * fans are never sent back into the retired dashboard or tour. Otherwise
 * staff go to BrandDesk in HQ and fans go to /you.
 */
export function postAuthDestination(opts: { staff: boolean; saved?: string | null }): string {
  const saved = safeReturnPath(opts.saved);
  if (saved && (opts.staff || !retiredForFans(saved))) return saved;
  return opts.staff ? STAFF_HOME : FAN_HOME;
}

/**
 * Ask the server who just signed in (/api/you checks the role), then go to
 * the right place. A full page load, so the new site picks up the session.
 */
export async function goAfterSignIn(saved?: string | null): Promise<void> {
  let staff = false;
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    staff = isStaffAccount(session?.user?.email, null);
    if (session?.access_token && !staff) {
      const res = await fetch("/api/you", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const me = res.ok ? await res.json() : null;
      staff = !!me?.staff;
    }
  } catch { /* fall back to the fan home */ }
  const dest = postAuthDestination({ staff, saved });
  if (dest === STAFF_HOME) { await goStaffHome(); return; }
  window.location.assign(dest);
}

/**
 * Open BrandDesk in HQ already signed in (Sean, 2026-11-12: he had to sign in
 * on geekfon.ai and then again on HQ). Mints a one-time handoff
 * (app/api/shell/handoff) and goes through HQ's /api/shell/sso, which sets the
 * HQ session and lands on BrandDesk. Any failure opens the plain BrandDesk
 * address, where HQ asks for sign in as before.
 */
export async function staffHomeUrl(): Promise<string> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return STAFF_HOME;
    const res = await fetch("/api/shell/handoff", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const body = res.ok ? await res.json().catch(() => null) : null;
    if (typeof body?.token !== "string" || !body.token) return STAFF_HOME;
    const { hqHandoffUrl, BRANDDESK_PATH } = await import("@/lib/lesarussSignIn");
    return hqHandoffUrl(body.token, BRANDDESK_PATH);
  } catch {
    return STAFF_HOME;
  }
}

export async function goStaffHome(): Promise<void> {
  window.location.assign(await staffHomeUrl());
}

/**
 * Click handler for a BrandDesk link (href STAFF_HOME). A plain click goes
 * through the handoff; a modified click (new tab or window) keeps the plain
 * link, since a handoff token is single use and short lived.
 */
export function onStaffHomeClick(e: { preventDefault(): void; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  void goStaffHome();
}
