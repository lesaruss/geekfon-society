// GET /api/admin/radio-listeners?days=30
// Radio listener tracking v2 (Sean, 2026-11-27): the Command Center's listener
// panel, from radio_listener_report() (migration 20261127c_radio_listeners).
// Same account-only gate as the other admin routes; team devices excluded.

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
const ADMIN_EMAIL = "contact@lesaruss.com";

export async function GET(req: Request) {
  const sb = serviceClient();
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!sb || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await sb.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const { data, error } = await sb.rpc("radio_listener_report", { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
