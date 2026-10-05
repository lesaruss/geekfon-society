import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";

// Radio spots (Sean, 2026-10-05): sponsor reads that play BETWEEN songs on a
// station (see lib/server/radio.ts). The Radio Schedule page lists them, turns
// them on or off and sets how often they play. Locked to Sean's account,
// checked here on the server.
const ADMIN_EMAIL = "contact@lesaruss.com";

async function admin(req: Request) {
  const sb = serviceClient();
  if (!sb) return { error: NextResponse.json({ error: "Server not configured" }, { status: 500 }) };
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: { user } } = await sb.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { sb };
}

export async function GET(req: Request) {
  const { sb, error } = await admin(req);
  if (error) return error;
  const [{ data: spots, error: e1 }, { data: stations }, { data: artists }] = await Promise.all([
    sb.from("radio_spots")
      .select("id, label, sponsor_name, voiced_by, station_slugs, src_url, duration_seconds, click_url, every_n_songs, is_active, starts_at, ends_at")
      .order("sort_order", { ascending: true }),
    sb.from("gfs_radio_stations").select("slug, name").order("sort_order", { ascending: true }),
    sb.from("gfs_artists").select("slug, name"),
  ]);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  return NextResponse.json({
    spots: spots ?? [],
    stations: [{ slug: "main", name: "GeekFon Radio" }, ...(stations ?? [])],
    artists: artists ?? [],
  });
}

export async function PATCH(req: Request) {
  const { sb, error } = await admin(req);
  if (error) return error;
  const { id, is_active, every_n_songs } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof is_active === "boolean") fields.is_active = is_active;
  if (every_n_songs !== undefined) {
    const n = Number(every_n_songs);
    if (!Number.isInteger(n) || n < 1 || n > 50) return NextResponse.json({ error: "every_n_songs must be 1 to 50" }, { status: 400 });
    fields.every_n_songs = n;
  }
  const { error: e } = await sb.from("radio_spots").update(fields).eq("id", id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
