// A signed upload URL for one New Talent song (audio only, 50 MB), in the private
// bucket gfs-new-talent. Same pattern as /api/pro-apply/upload-url. The bucket is
// created by supabase/migrations/20261115_new_talent_submissions.sql.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "gfs-new-talent";
const EXT = new Set(["mp3", "wav", "m4a", "aac", "flac"]);

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, size } = await req.json();
    if (!filename || !contentType) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!String(contentType).startsWith("audio/")) return NextResponse.json({ error: "Audio files only (MP3, WAV, M4A, AAC or FLAC)." }, { status: 400 });
    if (typeof size === "number" && size > 50 * 1024 * 1024) return NextResponse.json({ error: "Each song can be up to 50 MB." }, { status: 400 });
    const ext = String(filename).split(".").pop()?.toLowerCase() || "";
    if (!EXT.has(ext)) return NextResponse.json({ error: "Audio files only (MP3, WAV, M4A, AAC or FLAC)." }, { status: 400 });

    const sb = createClient(SUPA_URL, SUPA_SERVICE_KEY);
    const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("new-talent signed URL error:", error);
      return NextResponse.json({ error: "Could not start the upload. Try again." }, { status: 500 });
    }
    return NextResponse.json({ signedUrl: data.signedUrl, path: `${BUCKET}/${path}` });
  } catch (err) {
    console.error("new-talent upload-url error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
