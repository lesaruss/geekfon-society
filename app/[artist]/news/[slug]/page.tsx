import { notFound } from "next/navigation";
import ArtistPage from "@/components/ArtistPage";
import type { ArtistContent } from "@/components/ArtistPage";

// force-dynamic: prevents stale full-route-cache serving pre-fix breadcrumb output (2026-07-12)
export const dynamic = "force-dynamic";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";

const ARTIST_CITY: Record<string, { desktop: string; mobile: string }> = {
  "roxanne":             { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  "riku-hayasaka":       { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  "rustblood-prophets":  { desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  "lex-from-brixton":    { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "lickle-sis":          { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "lickle-bro":          { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "shamanic-resin":      { desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  "straight-and-narrow": { desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  "nilo-wave":           { desktop: CDN + "hf_20260619_125302_4c4f6747-3bcb-45b2-a743-610912078942.png", mobile: CDN + "hf_20260619_125452_ad933e6f-0b03-43a4-b111-341e76b9efd9.jpeg" },
  "lord-zorlot":         { desktop: CDN + "hf_20260620_234313_10dea700-d199-4e4a-bc73-0b276a46d266.png", mobile: CDN + "hf_20260620_234318_0c97a0f3-1396-4f24-9de7-327ccec5d0bf.png" },
};

async function getArtistAndArticle(artistSlug: string, newsSlug: string) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/gfs_artists?slug=eq.${encodeURIComponent(artistSlug)}&select=profile&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows?.length) return null;

  const profile: ArtistContent = rows[0].profile || {};
  const news = (profile.news || []) as Array<{ slug?: string; [k: string]: unknown }>;
  const article = news.find((n) => n.slug === newsSlug);
  if (!article) return null;

  return { content: profile, article };
}

type Props = { params: Promise<{ artist: string; slug: string }> };

export default async function ArticleDetailPage({ params }: Props) {
  const { artist, slug } = await params;
  const result = await getArtistAndArticle(artist, slug);
  if (!result) return notFound();

  const cityBg = ARTIST_CITY[artist] ?? null;

  return (
    <ArtistPage
      content={result.content}
      cityBg={cityBg}
      activeArticle={result.article as Parameters<typeof ArtistPage>[0]["activeArticle"]}
      slug={artist}
    />
  );
}
