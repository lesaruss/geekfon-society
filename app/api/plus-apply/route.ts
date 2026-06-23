import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email, city, reason, videoUrl, videoType } = await req.json();
    if (!name || !email || !city || !reason || !videoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sb = createClient(SUPA_URL, SUPA_SERVICE_KEY);
    const { error } = await sb.from("gfs_plus_applications").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      city: city.trim(),
      reason: reason.trim(),
      video_url: videoUrl,
      video_type: videoType || "link",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        // Duplicate email - still treat as success so applicant isn't confused
        return NextResponse.json({ ok: true });
      }
      console.error("Plus apply insert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("plus-apply route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
