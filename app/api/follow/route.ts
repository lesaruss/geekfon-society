// POST /api/follow   { email, artist, source?, website? }
//
// The in-character ask on the homepage and roster: "Want me to tell you when
// the next one drops?" (playbook geekfon-character-select, 2026-10-10). One
// email field, no account. Relays to the shared LESARUSS signup endpoint
// (Supabase function email-subscribe), list geekfon-drops, which owns the
// honeypot, the per-person rate limit and review. source_detail records the
// artist. The list's brand is inactive, so nothing is mailed until Sean
// approves a sender and an email.

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/server/supabaseAdmin";
import { ARTIST_ORDER } from "@/lib/roster";

export const runtime = "nodejs";

const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string; artist?: string; source?: string; website?: string };
  const artist = (ARTIST_ORDER as readonly string[]).includes(body.artist ?? "") ? body.artist! : "geekfon";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/email-subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}`, ...(ip ? { "x-signup-ip": ip } : {}) },
    body: JSON.stringify({
      list: "geekfon-drops",
      email: body.email ?? "",
      source: body.source === "roster" ? "geekfon-roster" : "geekfon-home",
      source_detail: artist,
      website: body.website ?? "",
    }),
  }).catch(() => null);
  if (!res) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 502 });
  const out = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(out, { status: res.status });
}
