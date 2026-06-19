import { notFound } from "next/navigation";
import ArtistPage from "@/components/ArtistPage";
import type { ArtistContent } from "@/components/ArtistPage";

// CDN base for city background images (same as homepage CITIES)
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";

// Artist slug -> city background images
// NYC and Orlando images pending generation - those artists fall back to aurora-only
const ARTIST_CITY: Record<string, { desktop: string; mobile: string }> = {
  // Tokyo
  "roxanne":          { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  "riku-hayasaka":    { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  // Berlin
  "rustblood-prophets": { desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  // London
  "lex-from-brixton": { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "lickle-sis":       { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "lickle-bro":       { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "mad-tings":        { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  // Seoul
  "shamanic-resin":   { desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  // Fort Lauderdale
  "straight-and-narrow": { desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  // NYC + Orlando: images TBD - will auto-add once generated
  // "mr-russell":    { ... }
  // "nilo-wave":     { ... }
};

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

  const cityBg = ARTIST_CITY[slug] ?? null;

  return <ArtistPage content={content} cityBg={cityBg} />;
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
