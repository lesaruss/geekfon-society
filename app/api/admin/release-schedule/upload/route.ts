import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
// Service key from the Vercel env, never in the repo (this repo is public; the literal that used to sit here was exposed and is being rotated, 2026-10-05).
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Release Schedule audio upload is part of the same admin-only tool - locked 2026-07-07.
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

  if (!file || !artistSlug) {
    return NextResponse.json({ error: "Missing file or artistSlug" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${artistSlug}/${safeName}`;

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.storage
    .from("geekfon-radio-audio")
    .upload(path, buffer, { contentType: "audio/mpeg", upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path });
}
