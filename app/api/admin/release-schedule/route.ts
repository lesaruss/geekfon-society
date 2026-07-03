import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

export async function GET() {
  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("gfs_artists")
    .select("slug, name, profile")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const artists = (data || []).map((a) => ({
    slug: a.slug,
    name: a.name,
    tracks: a.profile?.tracks || [],
  }));

  return NextResponse.json({ artists });
}

export async function PUT(req: Request) {
  const { slug, tracks } = await req.json();
  if (!slug || !Array.isArray(tracks)) {
    return NextResponse.json({ error: "Missing slug or tracks" }, { status: 400 });
  }

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin
    .from("gfs_artists")
    .select("profile")
    .eq("slug", slug)
    .single();

  const profile = { ...(existing?.profile || {}), tracks };

  const { error } = await admin
    .from("gfs_artists")
    .update({ profile, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
