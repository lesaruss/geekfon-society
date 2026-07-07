import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

// Radio Schedule audio upload - part of the same admin-only tool as ./route.ts.
const ADMIN_EMAIL = "contact@lesaruss.com";

export async function POST(req: Request) {
  const admin0 = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await admin0.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const artistSlug = formData.get("artistSlug") as string | null;
  const title = (formData.get("title") as string | null) || "Untitled";
  const replaceId = formData.get("replaceId") as string | null;

  if (!file || !artistSlug) {
    return NextResponse.json({ error: "Missing file or artistSlug" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${artistSlug}/${Date.now()}-${safeName}`;

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: upErr } = await admin.storage
    .from("geekfon-radio-audio")
    .upload(path, buffer, { contentType: "audio/mpeg", upsert: true });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Replacing audio on an existing row - just hand back the new storage path, the
  // Radio Schedule page sets src_path locally and saves it through the normal PUT/save
  // flow along with any other pending edits (same dirty-tracking pattern as everywhere
  // else in this tool), rather than writing the DB row directly from here.
  if (replaceId) {
    return NextResponse.json({ path });
  }

  // New tracks are appended to the end of the on-air rotation by default. Sean drags
  // them into position afterward from the Radio Schedule page - never guess an order.
  const { data: maxRow } = await admin
    .from("radio_tracks")
    .select("radio_order")
    .order("radio_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.radio_order as number | null) ?? -1) + 1;

  const { data: inserted, error: insErr } = await admin
    .from("radio_tracks")
    .insert({
      artist_slug: artistSlug,
      title,
      src_path: path,
      is_public: true,
      release_date: new Date().toISOString(),
      sort_order: 0,
      radio_order: nextOrder,
    })
    .select("id, artist_slug, title, src_path, duration_seconds, release_date, is_public, required_tier, radio_order, sort_order")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ path, track: inserted });
}
