// The new GeekFon site (Sean, 2026-11-12: "This is the website"). One shared
// client shell (components/radio2/RadioShell) for the home page, /roster and
// every artist page, so the live radio, the rail, the "What is this?" panel
// and the now playing bar stay mounted and the music keeps playing between
// pages. LesarussQuietCheck signs in anyone already signed in at HQ
// (lib/lesarussClient, 2026-11-12). Article pages (/<artist>/news/<slug>) keep their own layout.
import type { Viewport } from "next";
import SiteFonts from "@/components/radio2/SiteFonts";
import RadioShell from "@/components/radio2/RadioShell";
import LesarussQuietCheck from "@/components/LesarussQuietCheck";

export const viewport: Viewport = { themeColor: "#09090A", viewportFit: "cover", colorScheme: "dark" };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteFonts>
      <LesarussQuietCheck />
      <RadioShell>{children}</RadioShell>
    </SiteFonts>
  );
}
