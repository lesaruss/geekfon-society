import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

export async function POST(req: Request) {
  const { email, initial_lesars = 0, tier = "passport" } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Invite the user — Supabase sends a magic-link email
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://geekfon.ai/dashboard",
  });

  if (error || !data?.user) {
    return NextResponse.json({ error: error?.message || "invite failed" }, { status: 400 });
  }

  const userId = data.user.id;

  // Create gfs_members row
  await admin.from("gfs_members").upsert(
    { user_id: userId, name: email.split("@")[0], tier },
    { onConflict: "user_id" }
  );

  // Seed member_points if initial balance > 0
  if (initial_lesars > 0) {
    await admin.from("member_points").upsert(
      {
        user_id: userId,
        available_points: initial_lesars,
        total_points: initial_lesars,
        spent_points: 0,
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.json({ success: true, user_id: userId });
}
