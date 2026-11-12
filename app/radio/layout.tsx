// GeekFon Radio (/radio and the /radio/pop pop-out): the Seat 2 fonts, and the
// radio's own install manifest, linked only from these two pages (the site's
// main manifest.json is untouched).
//
// Fonts are self-hosted in public/fonts (SIL Open Font License), as the site
// does for Montserrat: Bricolage Grotesque and Figtree, the latin variable
// files Google serves. next/font/google cannot load Bricolage Grotesque (its
// optical-size axis comes back as an extensionless URL and the build fails).
import type { Metadata, Viewport } from "next";
import SiteFonts from "@/components/radio2/SiteFonts";



export const metadata: Metadata = {
  manifest: "/radio-manifest.json",
  appleWebApp: { capable: true, title: "GeekFon Radio", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#09090A",
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RadioLayout({ children }: { children: React.ReactNode }) {
  return <SiteFonts>{children}</SiteFonts>;
}
