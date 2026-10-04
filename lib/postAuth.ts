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
