import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SB_URL = "https://fwbhwfxpncrsfhttimna.supabase.co";
const SB_SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY2MDEzOSwiZXhwIjoyMDkwMjM2MTM5fQ.Ux3OKsH_ESG8bm2ZiFHtVUb8DPsjuAn8XRYjMVjcmjI";

export async function GET() {
  const admin = createClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: members }, { data: pointsRows }, { data: { users } }] =
    await Promise.all([
      admin.from("gfs_members").select("*").order("created_at", { ascending: false }),
      admin.from("member_points").select("user_id,available_points,total_points,spent_points"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const result = (members || []).map((m) => {
    const u = users.find((x) => x.id === m.user_id);
    const pts = (pointsRows || []).find((p) => p.user_id === m.user_id);
    return {
      ...m,
      email: u?.email ?? null,
      last_sign_in: u?.last_sign_in_at ?? null,
      available_points: pts?.available_points ?? 0,
    };
  });

  return NextResponse.json({ members: result });
}
