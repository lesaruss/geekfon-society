import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email, city } = await req.json();
    if (!name || !email || !city) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const sb = createClient(SUPA_URL, SUPA_SERVICE_KEY);
    const { error } = await sb.from("gfs_plus_waitlist").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      city: city.trim(),
      created_at: new Date().toISOString(),
      status: "pending",
    });

    if (error) {
      // Duplicate email is acceptable - still return success
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error("Plus waitlist insert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Plus waitlist route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
