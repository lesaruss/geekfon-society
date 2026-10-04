// Server-only Supabase clients. Never import this from a "use client" file:
// the service-role key bypasses RLS, which is the point (pulse_songs returns
// zero rows to the anon key) and also why it must stay on the server.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";

let admin: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  if (!admin) admin = createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export const SUPABASE_URL = URL;
