// POST /api/radio/claim  { device, team }  (Bearer token required)
// Radio listener tracking v2 (Sean, 2026-11-27): a signed-in visit on a browser
// that listened to the radio before links that device to the account, so the
// Command Center can count listeners who signed up after listening.

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";

const TEAM_EMAIL = /@lesaruss\.com$/i;

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const sb = serviceClient();
  if (!token || !sb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { device?: unknown; team?: unknown } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  const device = typeof body.device === "string" && body.device.length <= 100 ? body.device : null;
  if (!device) return NextResponse.json({ error: "Missing device" }, { status: 400 });
  const team = body.team === true || (!!user.email && TEAM_EMAIL.test(user.email));
  const { error } = await sb.rpc("radio_claim_device", { p_device: device, p_user: user.id, p_team: team });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
