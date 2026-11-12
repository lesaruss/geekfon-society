import SiteChrome from "@/components/SiteChrome";
import ArtistPlayerProvider from "@/components/roster/ArtistPlayer";

// Article pages (/<artist>/news/<slug>) keep the previous artist page's frame:
// SiteChrome, and the artist player across the article and its sections. The
// artist page itself (/<artist>) is the new Seat 2 page in app/(site)/[artist].
export default function RosterLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome>
      <ArtistPlayerProvider>{children}</ArtistPlayerProvider>
    </SiteChrome>
  );
}
