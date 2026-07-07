import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

// Release Schedule is restricted to Sean's account only (locked 2026-07-07). The client
// nav/page already hide the tool from everyone else, but that is UI only - this route
// held the real read/write access with the service-role key and NO auth check at all.
// Enforce the same account gate here so the API can't be hit directly.
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
  const denied = await requireAdmin(req);
  if (denied) return denied;

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
