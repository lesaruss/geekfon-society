// geekfon.ai/<artist>: the artist page in the Seat 2 shell (Sean, 2026-11-12), one template for every artist
// (components/radio2/ArtistView), with ?tab=music|chat|press|gallery|about in the address. The free view is
// rendered here; supporter content (full streams, supporter gallery) comes per viewer from
// /api/roster/<artist>/access. The previous artist page is at /classic/<artist> (noindex) for comparison.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArtistView from "@/components/radio2/ArtistView";
import { loadArtistPage, loadArtistMeta } from "@/lib/server/artistPage";

// Fresh per request, as the old artist page was (stale route cache on the custom domain, 2026-07-24).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ artist: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist } = await params;
  const m = await loadArtistMeta(artist);
  if (!m) return { title: { absolute: "GeekFon Society" } };
  const title = `${m.name}, GeekFon Society`;
  const url = `https://geekfon.ai/${m.slug}`;
  const images = m.image ? [{ url: m.image }] : [{ url: "/icons/icon-512.png", width: 512, height: 512 }];
  return {
    title: { absolute: title },
    description: m.description,
    alternates: { canonical: url },
    openGraph: { title, description: m.description, url, siteName: "GeekFon Society", type: "profile", images },
    twitter: { card: m.image ? "summary_large_image" : "summary", title, description: m.description, images: images.map(i => i.url) },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { artist } = await params;
  const data = await loadArtistPage(artist);
  if (!data) notFound();
  return <ArtistView initial={data} />;
}
