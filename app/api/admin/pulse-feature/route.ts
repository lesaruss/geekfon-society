import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 2026-07-27 per Sean/V: manual "featured" toggle for the Social grid, same
// pattern as the pin-icon flag but producer-controlled from the page itself
// instead of set directly in Supabase. Same account-only admin gate as
// /api/admin/members and /api/admin/pro-applications.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
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

export async function PATCH(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null) as { slug?: string; postId?: string; featured?: boolean } | null;
  if (!body?.slug || !body?.postId || typeof body.featured !== "boolean") {
    return NextResponse.json({ error: "slug, postId, and featured are required" }, { status: 400 });
  }

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: artist, error: fetchErr } = await admin
    .from("gfs_artists")
    .select("profile")
    .eq("slug", body.slug)
    .maybeSingle();

  if (fetchErr || !artist) {
    return NextResponse.json({ error: fetchErr?.message || "Artist not found" }, { status: 404 });
  }

  const profile = (artist.profile || {}) as { pulse?: Array<Record<string, unknown>> };
  const pulse = profile.pulse || [];
  const idx = pulse.findIndex((p) => p.id === body.postId);
  if (idx === -1) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  pulse[idx] = { ...pulse[idx], featured: body.featured };
  const nextProfile = { ...profile, pulse };

  const { error: updateErr } = await admin
    .from("gfs_artists")
    .update({ profile: nextProfile })
    .eq("slug", body.slug);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pulse });
}
