// POST /api/auth/lesaruss { code, redirect_uri } -> { token_hash }
//
// Continue with LESARUSS on geekfon.ai (Sean, 2026-11-12). HQ's /connect and
// /connect/silent send the browser back to /auth/lesaruss with a one-time
// code; that page posts it here. This spends the code for client 'geekfon'
// (lesaruss_sso_consume: sha256 hex of the code, two minutes, once, and only
// for the exact redirect_uri it was issued to), then mints a one-time
// magic-link hash for that email with no email sent, the same way
// app/api/shell/sso does. The page verifies it with the browser client
// (supabase.auth.verifyOtp), because geekfon.ai keeps its session in the
// browser. The account is the shared auth pool's, so it already exists; a
// first-time GeekFon member still finishes /complete-profile (date of birth
// and Terms) before a gfs_members row is made, as with Google sign-in.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";
import { SSO_CLIENT, isAllowedRedirectUri } from "@/lib/lesarussSignIn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(req: NextRequest) {
  try {
    let body: { code?: unknown; redirect_uri?: unknown } = {};
    try { body = await req.json(); } catch { /* empty */ }
    const code = typeof body.code === "string" ? body.code : "";
    const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : "";
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(code)) return fail("invalid_code", 400);

    // The redirect must be this site's own /auth/lesaruss, on a registered host.
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim().toLowerCase();
    let sameHost = false;
    try { sameHost = !!host && new URL(redirectUri).host === host; } catch { /* bad uri */ }
    if (!sameHost || !isAllowedRedirectUri(redirectUri)) return fail("invalid_redirect", 400);

    const sb = serviceClient();
    if (!sb) return fail("unavailable", 503);

    const hash = crypto.createHash("sha256").update(code).digest("hex");
    const { data: rows, error: consumeErr } = await sb.rpc("lesaruss_sso_consume", {
      p_code_hash: hash, p_client: SSO_CLIENT, p_redirect: redirectUri,
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    const email = typeof row?.email === "string" ? row.email.toLowerCase() : "";
    if (consumeErr || !email) return fail("code_used_or_expired", 401);

    const { data: link, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) return fail("no_account", 404);

    return NextResponse.json({ token_hash: tokenHash }, { headers: NO_STORE });
  } catch {
    return fail("failed", 500);
  }
}
