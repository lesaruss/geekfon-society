// One LESARUSS account across the brands (Sean, 2026-11-12: "if you're logged
// into the HQ, it'll automatically log you in. Can we have that for GeekFon as
// well?"). Pure helpers, no imports, so tests/lesarussSignIn.test.mjs runs
// them under plain node.
//
// HQ -> geekfon.ai: the quiet check. Once per browser tab session, a visitor
// with no Supabase session hops to hq.lesaruss.ai/connect/silent; signed in at
// HQ, they come back to /auth/lesaruss with a one-time code (traded by
// app/api/auth/lesaruss); signed out, they come straight back with
// error=login_required and nothing changes. Same pattern as Vegans Explore
// (public/ve-auth.js quietPickup) and HQ's app/connect/silent + lib/sso.ts.
//
// geekfon.ai -> HQ: staff open BrandDesk through HQ's /api/shell/sso, which
// takes a GeekFon handoff token (param `lrsso`) and sets the HQ session.

export const HQ_ORIGIN = "https://hq.lesaruss.ai";
export const SSO_CLIENT = "geekfon";
export const BRANDDESK_PATH = "/new/branddesk/geekfon-society";

export const STATE_KEY = "gf_lesaruss_state";
export const BACK_KEY = "gf_lesaruss_back";
export const MODE_KEY = "gf_lesaruss_mode";
export const QUIET_KEY = "gf_lesaruss_quiet";

/** Same shape HQ accepts (lib/sso.ts validState). */
export function validState(s: unknown): s is string {
  return typeof s === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(s);
}

/** The answer belongs to this tab's request only when its state matches the one we saved. */
export function stateMatches(got: string | null | undefined, saved: string | null | undefined): boolean {
  return !!got && !!saved && validState(got) && got === saved;
}

/** 24 random bytes, base64url: a valid HQ state. */
export function newState(rand: (a: Uint8Array) => Uint8Array = a => crypto.getRandomValues(a)): string {
  const a = rand(new Uint8Array(24));
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Where HQ sends the browser back: this origin's /auth/lesaruss, exactly as registered. */
export function redirectUriFor(origin: string): string {
  return origin.replace(/\/+$/, "") + "/auth/lesaruss";
}

/** The hosts registered on lesaruss_sso_clients for client geekfon. */
export function isRegisteredHost(hostname: string): boolean {
  return /^(www\.)?geekfon\.ai$/.test(hostname) || /^geekfon-society-[a-z0-9-]+-contact-2245s-projects\.vercel\.app$/.test(hostname);
}

/** A redirect_uri the route accepts: https, a registered host, path /auth/lesaruss, nothing else. */
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" && isRegisteredHost(u.hostname) && !u.port && u.pathname === "/auth/lesaruss" && !u.search && !u.hash;
  } catch {
    return false;
  }
}

export function silentUrl(origin: string, state: string): string {
  return HQ_ORIGIN + "/connect/silent?" + new URLSearchParams({ client: SSO_CLIENT, redirect_uri: redirectUriFor(origin), state }).toString();
}

export function connectUrl(origin: string, state: string): string {
  return HQ_ORIGIN + "/connect?" + new URLSearchParams({ client: SSO_CLIENT, redirect_uri: redirectUriFor(origin), state }).toString();
}

/** HQ's handoff destination (lesaruss-hq app/api/shell/sso: lrsso + next). */
export function hqHandoffUrl(token: string, next: string = BRANDDESK_PATH): string {
  return HQ_ORIGIN + "/api/shell/sso?" + new URLSearchParams({ lrsso: token, next }).toString();
}

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|prerender|phantom|puppeteer|playwright|vercel|whatsapp|telegram|discord|slack|skype|bingpreview|google-inspectiontool|chrome-lighthouse/i;

export function isBotAgent(ua: string | null | undefined): boolean {
  return !ua || BOT_UA.test(ua);
}

/** Every condition for the quiet hop, so it can be tested without a browser. */
export function shouldQuietCheck(o: {
  hasSession: boolean;
  pathname: string;
  quietFlag: string | null;
  userAgent: string | null | undefined;
  hostname: string;
  inFrame: boolean;
}): boolean {
  if (o.hasSession || o.quietFlag || o.inFrame) return false;
  if (o.pathname === "/auth" || o.pathname.startsWith("/auth/")) return false;
  if (!isRegisteredHost(o.hostname)) return false;
  return !isBotAgent(o.userAgent);
}

/** A same-site path to return to, or null. */
export function safeBack(v: string | null | undefined): string | null {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  if (v === "/auth" || v.startsWith("/auth/")) return null;
  return v;
}
