import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 2026-07-28 per Sean/V: real like/unlike on GeekFon Social posts
// (gfs_pulse_likes), replacing the old static post.engagement.likes count.
// Same env-var service-role pattern as /api/referral/claim and
// /api/admin/pulse-feature (2026-07-27) - no hardcoded keys.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function admin() {
  return createClient(SB_URL, SB_SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getCaller(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await admin().auth.getUser(token);
  return user;
}

// Public read: post like count + a handful of liker display names, plus
// whether the requesting caller (if any, via optional bearer token) has
// already liked it - mirrors the aggregate-read pattern used by
// /api/admin/artist-likers, just not admin-gated since likes are meant to be
// visible to any member viewing the post.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artistSlug = searchParams.get("artistSlug");
  const postId = searchParams.get("postId");
  if (!artistSlug || !postId) {
    return NextResponse.json({ error: "artistSlug and postId are required" }, { status: 400 });
  }

  const sb = admin();
  const [{ data: likes, error }, caller] = await Promise.all([
    sb.from("gfs_pulse_likes").select("user_id, created_at").eq("artist_slug", artistSlug).eq("post_id", postId).order("created_at", { ascending: false }),
    getCaller(req),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (likes || []).map((l) => l.user_id);
  let nameMap: Record<string, string | null> = {};
  if (userIds.length) {
    const { data: members } = await sb.from("gfs_members").select("user_id, name").in("user_id", userIds);
    (members || []).forEach((m: { user_id: string; name: string | null }) => { nameMap[m.user_id] = m.name; });
  }

  const likers = (likes || []).slice(0, 5).map((l) => ({ userId: l.user_id, name: nameMap[l.user_id] || null }));
  const likedByMe = !!(caller && (likes || []).some((l) => l.user_id === caller.id));

  return NextResponse.json({ count: likes?.length || 0, likers, likedByMe });
}

// Toggle like/unlike for the authenticated caller.
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { artistSlug?: string; postId?: string } | null;
  if (!body?.artistSlug || !body?.postId) {
    return NextResponse.json({ error: "artistSlug and postId are required" }, { status: 400 });
  }

  const sb = admin();
  const { data: existing } = await sb
    .from("gfs_pulse_likes")
    .select("id")
    .eq("artist_slug", body.artistSlug)
    .eq("post_id", body.postId)
    .eq("user_id", caller.id)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("gfs_pulse_likes").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await sb.from("gfs_pulse_likes").insert({
      artist_slug: body.artistSlug,
      post_id: body.postId,
      user_id: caller.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count } = await sb
    .from("gfs_pulse_likes")
    .select("id", { count: "exact", head: true })
    .eq("artist_slug", body.artistSlug)
    .eq("post_id", body.postId);

  return NextResponse.json({ liked: !existing, count: count || 0 });
}
