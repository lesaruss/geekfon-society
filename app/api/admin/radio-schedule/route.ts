import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
// Service key from the Vercel env, never in the repo (this repo is public; the literal that used to sit here was exposed and is being rotated, 2026-10-05).
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Radio Schedule is the admin control panel for the GeekFon Radio rotation (radio_tracks
// table) - sibling to Release Schedule, same account-only gate. Locked to Sean's account,
// enforced server-side (never trust the client hiding the nav link alone).
const ADMIN_EMAIL = "contact@lesaruss.com";

async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await admin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: tracks, error: tErr }, { data: artists, error: aErr }] = await Promise.all([
    admin
      .from("radio_tracks")
      .select("id, artist_slug, title, src_path, duration_seconds, release_date, is_public, required_tier, radio_order, sort_order")
      .order("radio_order", { ascending: true, nullsFirst: false })
      .order("artist_slug", { ascending: true })
      .order("sort_order", { ascending: true }),
    admin.from("gfs_artists").select("slug, name").order("name"),
  ]);

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  return NextResponse.json({ tracks: tracks || [], artists: artists || [] });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { updates } = await req.json();
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "Missing updates" }, { status: 400 });
  }

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = await Promise.all(
    updates.map((u: Record<string, unknown>) => {
      const { id, ...fields } = u;
      if (!id) return Promise.resolve({ error: { message: "Missing id" } });
      return admin.from("radio_tracks").update(fields).eq("id", id);
    })
  );

  const failed = results.find((r) => r && "error" in r && r.error);
  if (failed && "error" in failed && failed.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
