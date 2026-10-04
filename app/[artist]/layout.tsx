import ArtistChrome from "@/components/roster/ArtistChrome";
import { LABEL_ARTISTS } from "@/lib/server/depot";

// Label artists open inside the universal frame once signed in; everyone
// else (and every signed-out visitor) keeps the public SiteChrome.
export default async function RosterLayout({ children, params }: { children: React.ReactNode; params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const title = artist.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return (
    <ArtistChrome framed={LABEL_ARTISTS.has(artist)} title={title}>
      {children}
    </ArtistChrome>
  );
}
