// The universal shell's data on geekfon.ai. Server-only.
//
// Same contract HQ serves from its /api/shell routes and the lr-shell edge
// function serves to static brand sites (canon-universal-shell-contract):
//   { member, dock: [slug], brands: [UniverseBrand], current }
// The one shared bar (https://hq.lesaruss.ai/shell/universal-bar.js) renders
// from it, so the bar, the dock and the member icon match on every brand.
//
// Identity: geekfon.ai signs people in with the shared Supabase Auth pool.
// public.members.id is the cross-brand identity, and it is NOT the auth uid;
// the two are linked by email (lesaruss-hq lib/memberContext.ts documents
// the same join). The dock is keyed on members.id.

import crypto from "node:crypto";
import { serviceClient } from "./supabaseAdmin";
import type { Viewer } from "./entitlements";

export const CURRENT_SLUG = "geekfon-society";
export const HUB_SLUG = "lesaruss-hq";

export type UniverseBrand = {
  slug: string; name: string; mono: string; color: string;
  domain: string | null; dashboardPath: string | null; ssoPath: string | null;
  iconUrl: string | null; isHub: boolean; isLive: boolean;
};

export type ShellMember = {
  name: string | null; firstName: string | null; avatarUrl: string | null;
  initials: string | null; color: string | null; points: number | null; level: number | null;
};

export type ShellContext = { memberId: string | null; member: ShellMember; dock: string[] };

function firstNameOf(name: string | null, email: string | null): string | null {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  if (email && email.includes("@")) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return null;
}

function initialsOf(name: string | null, email: string | null): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return null;
}

export async function getUniverseBrands(): Promise<UniverseBrand[]> {
  const sb = serviceClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("universe_brands")
    .select("slug, name, mono, color, domain, dashboard_path, sso_path, icon_url, is_hub, is_live")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map(r => ({
    slug: r.slug, name: r.name, mono: r.mono, color: r.color,
    domain: r.domain ?? null, dashboardPath: r.dashboard_path ?? null, ssoPath: r.sso_path ?? null,
    iconUrl: r.icon_url ?? null, isHub: !!r.is_hub, isLive: !!r.is_live,
  }));
}

export async function getShellContext(viewer: Viewer): Promise<ShellContext> {
  const empty: ShellContext = {
    memberId: null,
    member: { name: null, firstName: firstNameOf(null, viewer.email), avatarUrl: null, initials: initialsOf(null, viewer.email), color: null, points: null, level: null },
    dock: [],
  };
  const sb = serviceClient();
  if (!sb || !viewer.email) return empty;

  const { data: m } = await sb
    .from("members")
    .select("id, name, initials, color, avatar_url, profile_image_url")
    .eq("email", viewer.email)
    .maybeSingle();

  // GeekFon's own LESARs balance is the points this surface shows.
  const { data: pts } = await sb.from("member_points").select("available_points").eq("user_id", viewer.id).maybeSingle();

  if (!m) {
    return { ...empty, member: { ...empty.member, points: typeof pts?.available_points === "number" ? pts.available_points : null } };
  }

  const name = (m.name as string | null) ?? null;
  const { data: dockRow } = await sb.from("member_dock").select("brand_slugs").eq("member_id", m.id).maybeSingle();
  return {
    memberId: m.id as string,
    member: {
      name,
      firstName: firstNameOf(name, viewer.email),
      avatarUrl: (m.profile_image_url as string | null) ?? (m.avatar_url as string | null) ?? null,
      initials: (m.initials as string | null) ?? initialsOf(name, viewer.email),
      color: (m.color as string | null) ?? null,
      points: typeof pts?.available_points === "number" ? pts.available_points : null,
      level: null,
    },
    dock: Array.isArray(dockRow?.brand_slugs) ? (dockRow!.brand_slugs as string[]) : [],
  };
}

// --- Cross-brand SSO handoff (same tokens as lesaruss-hq lib/ssoToken.ts) ---
// Signed with lesaruss_secrets.LR_SSO_SECRET, 2-minute expiry, single-use via
// public.sso_handoffs. Security-sensitive: verify checks signature (constant
// time), kind and expiry; the caller spends the jti.

const TTL_SECONDS = 120;
let cachedSecret: Buffer | null = null;

async function secretKey(): Promise<Buffer | null> {
  if (cachedSecret) return cachedSecret;
  const sb = serviceClient();
  if (!sb) return null;
  const { data } = await sb.from("lesaruss_secrets").select("value").eq("key", "LR_SSO_SECRET").maybeSingle();
  if (typeof data?.value !== "string" || !data.value) return null;
  cachedSecret = Buffer.from(data.value, "utf8");
  return cachedSecret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function mintHandoff(memberId: string, email: string | null): Promise<{ token: string; jti: string } | null> {
  const key = await secretKey();
  if (!key) return null;
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: memberId, email, kind: "lrsso", iat: now, exp: now + TTL_SECONDS, jti }));
  const sig = b64url(crypto.createHmac("sha256", key).update(`${header}.${payload}`).digest());
  return { token: `${header}.${payload}.${sig}`, jti };
}

export async function verifyHandoff(token: string | null | undefined): Promise<{ sub: string; email: string | null; jti: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const key = await secretKey();
  if (!key) return null;
  const expected = b64url(crypto.createHmac("sha256", key).update(`${header}.${payload}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (claims.kind !== "lrsso" || typeof claims.sub !== "string" || typeof claims.jti !== "string") return null;
    if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: claims.sub, email: typeof claims.email === "string" ? claims.email : null, jti: claims.jti };
  } catch {
    return null;
  }
}
