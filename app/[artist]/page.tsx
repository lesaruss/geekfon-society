import { notFound } from "next/navigation";
import ArtistPage, { ArtistContent } from "@/components/ArtistPage";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

async function getPage(slug: string): Promise<ArtistContent | null> {
  const res = await fetch(`${SUPA}/rest/v1/rpc/get_published_page`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_brand: "geekfon", p_slug: slug }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows || !rows[0]) return null;
  return rows[0].content as ArtistContent;
}

export default async function Page({ params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const content = await getPage(artist);
  if (!content) notFound();
  return <ArtistPage content={content} />;
}
