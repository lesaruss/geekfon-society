// geekfon.ai/roster: Artists, in the Seat 2 shell (Sean, 2026-11-12). Every artist on the roster with their
// picture, genre and city, their station, and a play button for their own artist radio.
import type { Metadata } from "next";
import ArtistsView from "@/components/radio2/ArtistsView";
import { loadRoster } from "@/lib/server/artistPage";

export const dynamic = "force-dynamic";

const TITLE = "Artists, GeekFon Society";
const DESCRIPTION = "Every artist on GeekFon Society. Play any artist's own radio, live and free, and meet them on their page.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "https://geekfon.ai/roster" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://geekfon.ai/roster", siteName: "GeekFon Society", type: "website", images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }] },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default async function RosterPage() {
  const initial = await loadRoster();
  return <ArtistsView initial={initial} />;
}
