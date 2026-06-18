import { notFound } from "next/navigation";
import ArtistPage from "@/components/ArtistPage";
import type { ArtistContent } from "@/components/ArtistPage";

async function getArtist(slug: string): Promise<ArtistContent | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/gfs_artists?slug=eq.${encodeURIComponent(slug)}&select=name,profile&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 300 }, // cache 5 min
    }
  );

  if (!res.ok) return null;

  const rows = await res.json();
  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  const profile: ArtistContent = row.profile || {};

  // Always ensure the name from the DB row is set
  if (!profile.name) profile.name = row.name;

  return profile;
}

type Props = { params: Promise<{ artist: string }> };

export default async function ArtistPageRoute({ params }: Props) {
  const { artist: slug } = await params;
  const content = await getArtist(slug);

  if (!content) {
    notFound();
  }

  return <ArtistPage content={content} />;
}

export async function generateMetadata({ params }: Props) {
  const { artist: slug } = await params;
  const content = await getArtist(slug);
  const name = content?.name || slug;
  return {
    title: `${name} - GeekFon Society`,
    description: content?.tagline || `${name} is an original artist on GeekFon Society.`,
  };
}
