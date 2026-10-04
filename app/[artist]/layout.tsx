import SiteChrome from "@/components/SiteChrome";
import ArtistPlayerProvider from "@/components/roster/ArtistPlayer";

// SiteChrome frames the page in the universal shell once signed in; artist
// pages then swap their header and tabs for a section nav (ArtistPage). The
// player lives here so it keeps playing across the artist's sections and
// articles, and is gone on another artist.
export default function RosterLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome>
      <ArtistPlayerProvider>{children}</ArtistPlayerProvider>
    </SiteChrome>
  );
}
