import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 2026-07-28 per Sean/V: real comments on GeekFon Social posts
// (gfs_pulse_comments), typed or a recorded voice note - per V, voice
// commenting is meant to become the standard pattern everywhere, not just
// here. Audio is uploaded server-side into the existing public
// `voice-messages` bucket (already provisioned, unused elsewhere in this
// repo) rather than opening up client-side storage policies.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB - a few minutes of webm/opus voice, generous for a comment
// Same admin account used by every other admin-gated route in this repo
// (/api/admin/pulse-feature, /api/admin/artist-likers) - lets admin delete
// any comment, not just their own.
const ADMIN_EMAIL = "contact@lesaruss.com";

function admin() {
  return createClient(SB_URL, SB_SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getCaller(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await admin().auth.getUser(token);
  return user;
}

// Public read: comment list for a post, joined with member display names.
// Flagged comments are excluded, same moderation shape as ve_pulse_comments.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artistSlug = searchParams.get("artistSlug");
  const postId = searchParams.get("postId");
  if (!artistSlug || !postId) {
    return NextResponse.json({ error: "artistSlug and postId are required" }, { status: 400 });
  }

  const sb = admin();
  const { data: comments, error } = await sb
    .from("gfs_pulse_comments")
    .select("id, user_id, body, audio_url, created_at")
    .eq("artist_slug", artistSlug)
    .eq("post_id", postId)
    .eq("is_flagged", false)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((comments || []).map((c) => c.user_id))];
  let nameMap: Record<string, string | null> = {};
  if (userIds.length) {
    const { data: members } = await sb.from("gfs_members").select("user_id, name").in("user_id", userIds);
    (members || []).forEach((m: { user_id: string; name: string | null }) => { nameMap[m.user_id] = m.name; });
  }

  const shaped = (comments || []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    name: nameMap[c.user_id] || "Member",
    body: c.body,
    audioUrl: c.audio_url,
    createdAt: c.created_at,
  }));

  return NextResponse.json({ comments: shaped });
}

// Create a comment: typed text OR a recorded voice note, sent as
// multipart/form-data so the audio blob can ride alongside the other fields
// in one request. Exactly one of `body` / `audio` is expected (the DB check
// constraint enforces this server-side too).
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const artistSlug = form.get("artistSlug");
  const postId = form.get("postId");
  const bodyText = form.get("body");
  const audio = form.get("audio");

  if (typeof artistSlug !== "string" || typeof postId !== "string") {
    return NextResponse.json({ error: "artistSlug and postId are required" }, { status: 400 });
  }

  const hasText = typeof bodyText === "string" && bodyText.trim().length > 0;
  const hasAudio = audio instanceof File && audio.size > 0;
  if (!hasText && !hasAudio) {
    return NextResponse.json({ error: "A comment needs text or a voice note" }, { status: 400 });
  }
  if (hasAudio && (audio as File).size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Voice note is too long" }, { status: 400 });
  }

  const sb = admin();
  let audioUrl: string | null = null;

  if (hasAudio) {
    const file = audio as File;
    const ext = file.type.includes("mp4") ? "m4a" : file.type.includes("wav") ? "wav" : file.type.includes("ogg") ? "ogg" : "webm";
    const path = `gfs-pulse/${artistSlug}/${postId}/${caller.id}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    // BUG FIXED 2026-07-29: the voice-messages bucket's allowed_mime_types
    // only lists bare types (audio/webm, audio/ogg, audio/mp4, audio/mpeg,
    // audio/wav) - no codec-qualified variants. MediaRecorder now correctly
    // reports its real mimeType (e.g. "audio/webm;codecs=opus"), which was
    // passed straight through as contentType and got rejected by Storage
    // with a 415, surfacing as a silent 500 to the client. Strip any
    // ";codecs=..." suffix before handing it to Storage.
    const contentType = (file.type || "audio/webm").split(";")[0].trim() || "audio/webm";
    const { error: uploadErr } = await sb.storage.from("voice-messages").upload(path, buf, {
      contentType,
      upsert: false,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    const { data: pub } = sb.storage.from("voice-messages").getPublicUrl(path);
    audioUrl = pub.publicUrl;
  }

  const { data: created, error: insertErr } = await sb
    .from("gfs_pulse_comments")
    .insert({
      artist_slug: artistSlug,
      post_id: postId,
      user_id: caller.id,
      body: hasText ? (bodyText as string).trim().slice(0, 2000) : null,
      audio_url: audioUrl,
    })
    .select("id, created_at")
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { data: member } = await sb.from("gfs_members").select("name").eq("user_id", caller.id).maybeSingle();

  return NextResponse.json({
    comment: {
      id: created.id,
      userId: caller.id,
      name: member?.name || "You",
      body: hasText ? (bodyText as string).trim().slice(0, 2000) : null,
      audioUrl,
      createdAt: created.created_at,
    },
  });
}

// Delete a comment. Per Sean/V 2026-07-28: a member can delete their own
// comment, and admin can delete any comment. Same admin-bypass shape as the
// rest of this repo's admin routes - service role already sees every row,
// this just adds the ownership-or-admin check before allowing the delete.
export async function DELETE(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const sb = admin();
  const { data: comment, error: fetchErr } = await sb
    .from("gfs_pulse_comments")
    .select("id, user_id, audio_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const isOwner = comment.user_id === caller.id;
  const isAdmin = caller.email === ADMIN_EMAIL;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteErr } = await sb.from("gfs_pulse_comments").delete().eq("id", id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  // Best-effort cleanup of the underlying audio file - not fatal if it fails
  // or if there was never a file (typed comments have no audio_url).
  if (comment.audio_url) {
    const marker = "/public/voice-messages/";
    const idx = comment.audio_url.indexOf(marker);
    if (idx !== -1) {
      const path = comment.audio_url.slice(idx + marker.length);
      await sb.storage.from("voice-messages").remove([path]).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
