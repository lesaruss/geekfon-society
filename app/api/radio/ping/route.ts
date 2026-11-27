import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server/supabaseAdmin";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

// 2026-07-27 per Sean: "can we tell how many people are actively listening to
// GeekFon Radio, even if they're not logged in?" Radio needs no login (removed
// 2026-07-26) and never logged a single play/listen event of any kind - this is
// a lightweight anonymous heartbeat, intentionally public (no auth, no PII, just
// a random per-tab session id) so an anonymous listener can still be counted.
//
// v2 (Sean, 2026-11-27, lib/radioListen.ts): the body may also carry `listen`,
// the real seconds played, station, song, source and device id, written to
// radio_listen_sessions / radio_listen_songs through radio_listen_ping(). A
// bearer token, when sent, attaches the signed-in account. Still no PII.

const TEAM_EMAIL = /@lesaruss\.com$/i;
const str = (v: unknown, max: number): string | null => (typeof v === "string" && v ? v.slice(0, max) : null);

function deviceType(ua: string): string {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "phone";
  return "computer";
}

export async function POST(req: Request) {
  let body: { session_id?: unknown; listen?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  const sessionId = body?.session_id;
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const anon = createClient(SB_URL, SB_ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const presence = anon
    .from("radio_presence")
    .upsert({ session_id: sessionId, last_ping_at: new Date().toISOString() }, { onConflict: "session_id" });

  const l = body.listen;
  const sb = serviceClient();
  if (l && sb && str(l.session, 100) && str(l.device, 100)) {
    let userId: string | null = null;
    let team = l.team === true;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) { userId = user.id; if (user.email && TEAM_EMAIL.test(user.email)) team = true; }
    }
    const { error } = await sb.rpc("radio_listen_ping", {
      p_session: str(l.session, 100), p_device: str(l.device, 100), p_user: userId, p_team: team,
      p_seconds: typeof l.seconds === "number" ? Math.round(l.seconds) : 0,
      p_station: str(l.station, 80), p_song_key: str(l.song_key, 200), p_title: str(l.title, 200), p_artist: str(l.artist, 120),
      p_referrer_host: str(l.referrer_host, 120), p_landing: str(l.landing, 200), p_utm: str(l.utm_source, 60),
      p_device_type: deviceType(req.headers.get("user-agent") || ""), p_surface: l.surface === "mini" ? "mini" : "radio",
    });
    if (error) console.error("radio_listen_ping", error.message);
  }

  const { error } = await presence;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
