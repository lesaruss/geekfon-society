import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

// 2026-07-27 per Sean: "can we tell how many people are actively listening to
// GeekFon Radio, even if they're not logged in?" Radio needs no login (removed
// 2026-07-26) and never logged a single play/listen event of any kind - this is
// a lightweight anonymous heartbeat, intentionally public (no auth, no PII, just
// a random per-tab session id) so an anonymous listener can still be counted.
export async function POST(req: Request) {
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    sessionId = body?.session_id;
  } catch {
    // ignore - handled by the check below
  }
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const anon = createClient(SB_URL, SB_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await anon
    .from("radio_presence")
    .upsert({ session_id: sessionId, last_ping_at: new Date().toISOString() }, { onConflict: "session_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
