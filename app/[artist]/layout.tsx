import SiteChrome from "@/components/SiteChrome";

// SiteChrome frames the page in the universal shell once signed in; artist
// pages then swap their header and tabs for a section nav (ArtistPage).
export default function RosterLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
