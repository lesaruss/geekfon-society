import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "gfs-plus-applications";
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename || !contentType) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!contentType.startsWith("video/")) return NextResponse.json({ error: "Video files only" }, { status: 400 });

    const sb = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    // Ensure bucket exists
    const { data: buckets } = await sb.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET);
    if (!exists) {
      await sb.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    }

    // Unique path so filenames never collide
    const ext = filename.split(".").pop() || "mp4";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Signed URL error:", error);
      return NextResponse.json({ error: "Could not create upload URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: `${BUCKET}/${path}` });
  } catch (err) {
    console.error("upload-url route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
