import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { resolvePlayhead } from "@/lib/radioSchedule";
import { buildRadioSchedule } from "@/lib/server/radio";
import { getGoogleAccessToken } from "@/lib/google-auth";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
// Service key from the Vercel env, never in the repo (this repo is public; the literal that used to sit here was exposed and is being rotated, 2026-10-05).
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// 2026-07-27 per Sean: the admin home page always showed him as a generic free
// member ("Passport") with no analytics, health signal, or quick-glance into any
// other tool - it was literally the member-facing portal page with zero
// admin-awareness beyond a single "Manage Members" link. This route powers the
// new Admin Command Center home: one round trip, service-role-backed (every
// table here has RLS that restricts a normal client to their own rows only -
// confirmed the same way as every other admin route this session), same
// requireAdmin gate as /api/admin/members etc.
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

// Same display-name map used by app/radio/page.tsx - radio_tracks.artist_slug uses
// full-name slugs that don't always match gfs_artists.slug (e.g. "riku-hayasaka" vs "riku").
const ARTIST_NAMES: Record<string, string> = {
  "lex-from-brixton": "Lex from Brixton",
  "likkle-bro": "Likkle Bro",
  "likkle-sis": "Likkle Sis",
  "mad-tings": "Mad Tings",
  "mr-russell": "Mr. Russell",
  "nilo-wave": "Nilo Wave",
  "riku-hayasaka": "Riku Hayasaka",
  "roxanne": "Roxanne",
  "rustblood-prophets": "Rustblood Prophets",
  "shamanic-resin": "Shamanic Resin",
  "straight-and-narrow": "Straight and Narrow",
  "vuka": "Vuka",
};
function artistName(slug: string): string {
  return ARTIST_NAMES[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// 2026-07-27 per Sean: "I wanna see actual Google Analytics for geekfon.ai."
// GA4 property "geekfon.ai" was just created (Property ID 547243255, gtag
// installed in app/layout.tsx same day) and the shared LESARUSS
// lesaruss-analytics-reader service account was granted Viewer access to it.
// Same getGoogleAccessToken()/GA4 Data API pattern lesaruss-ai's
// app/api/directory/analytics/sync/[id]/route.ts uses for GA4 connections.
type GA4Snapshot = { sessions: number; users: number; pageviews: number; available: boolean };
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID_GEEKFON;

async function fetchGA4(): Promise<GA4Snapshot> {
  const empty: GA4Snapshot = { sessions: 0, users: 0, pageviews: 0, available: false };
  if (!GA4_PROPERTY_ID) return empty;
  try {
    const token = await getGoogleAccessToken("https://www.googleapis.com/auth/analytics.readonly");
    if (!token) return empty;
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
      }),
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const vals = data.rows?.[0]?.metricValues as { value: string }[] | undefined;
    // No rows back just means the property is live but has recorded zero
    // traffic in the window yet (brand new property) - distinct from a
    // credential/access failure, which returns `empty` (available: false).
    if (!vals) return { sessions: 0, users: 0, pageviews: 0, available: true };
    return {
      sessions: parseInt(vals[0]?.value ?? "0", 10),
      users: parseInt(vals[1]?.value ?? "0", 10),
      pageviews: parseInt(vals[2]?.value ?? "0", 10),
      available: true,
    };
  } catch {
    return empty;
  }
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();

  const [
    { count: memberCount },
    { data: unlocks },
    { count: playCount },
    { count: plays7d },
    { count: likeCount },
    { count: likes7d },
    { data: healthRows },
    { data: briefRows },
    { data: artists },
    radioSchedule,
    ga4,
  ] = await Promise.all([
    admin.from("gfs_members").select("*", { count: "exact", head: true }),
    admin.from("gfs_artist_unlocks").select("amount_cents"),
    admin.from("gfs_track_plays").select("*", { count: "exact", head: true }),
    admin.from("gfs_track_plays").select("*", { count: "exact", head: true }).gte("played_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    admin.from("gfs_artist_votes").select("*", { count: "exact", head: true }),
    admin.from("gfs_artist_votes").select("*", { count: "exact", head: true }).gte("voted_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    admin.from("brand_audit_reports").select("*").ilike("brand_slug", "%geekfon%").order("audited_at", { ascending: false }).limit(3),
    admin.from("gfs_anr_audits").select("artist_slug, title, status, updated_at").eq("doc_type", "artist_brief").order("updated_at", { ascending: false }),
    admin.from("gfs_artists").select("slug, name, profile"),
    // Same depot-built schedule every listener resolves (lib/server/radio.ts).
    buildRadioSchedule("ids"),
    fetchGA4(),
  ]);

  // Live radio listeners: anonymous heartbeat rows (see app/api/radio/ping/route.ts),
  // "active" = pinged in the last 45s (heartbeat interval is 20s, so 2 missed
  // beats before we drop someone). Opportunistic cleanup of stale rows here
  // rather than a separate cron - this route is polled often enough on its own.
  await admin.from("radio_presence").delete().lt("last_ping_at", new Date(Date.now() - 86400000).toISOString());
  const { count: radioListeners } = await admin
    .from("radio_presence")
    .select("*", { count: "exact", head: true })
    .gte("last_ping_at", new Date(Date.now() - 45000).toISOString());

  const unlockRevenueCents = (unlocks || []).reduce((s, u) => s + (u.amount_cents || 0), 0);

  // Artist Briefs (A&R): dedupe to the latest brief per artist, since an artist can
  // have several historical brief rows - only the newest reflects current status.
  const seen = new Set<string>();
  const artistBriefs: { artist_slug: string; title: string; status: string; updated_at: string }[] = [];
  for (const r of briefRows || []) {
    if (seen.has(r.artist_slug)) continue;
    seen.add(r.artist_slug);
    artistBriefs.push(r);
  }

  // Song Manager snapshot: artist count + total tracks across gfs_artists.profile.tracks
  const artistCount = (artists || []).length;
  const trackCount = (artists || []).reduce((s, a: any) => s + ((a.profile?.tracks || []).length), 0);

  // Now Playing - identical algorithm to the real /radio page (lib/radioSchedule.ts),
  // computed server-side against the same rotation + overrides data every listener's
  // browser resolves independently from the synced clock.
  const { rotation, overrides } = radioSchedule;
  const nowPlaying = resolvePlayhead(Date.now(), rotation, overrides);

  return NextResponse.json({
    analytics: {
      memberCount: memberCount ?? 0,
      unlockRevenueCents,
      unlockCount: (unlocks || []).length,
      playCount: playCount ?? 0,
      plays7d: plays7d ?? 0,
      likeCount: likeCount ?? 0,
      likes7d: likes7d ?? 0,
    },
    healthReport: healthRows || [],
    artistBriefs,
    songManager: { artistCount, trackCount },
    nowPlaying,
    radioListeners: radioListeners ?? 0,
    ga4,
  });
}

