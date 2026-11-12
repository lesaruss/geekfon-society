// GeekFon Radio (/radio and the /radio/pop pop-out): the Seat 2 fonts, and the
// radio's own install manifest, linked only from these two pages (the site's
// main manifest.json is untouched).
//
// Fonts are self-hosted in public/fonts (SIL Open Font License), as the site
// does for Montserrat: Bricolage Grotesque and Figtree, the latin variable
// files Google serves. next/font/google cannot load Bricolage Grotesque (its
// optical-size axis comes back as an extensionless URL and the build fails).
import type { Metadata, Viewport } from "next";

const FONTS = `@font-face{font-family:'Bricolage Grotesque';font-style:normal;font-weight:500 800;font-stretch:100%;font-display:swap;src:url(/fonts/bricolage-grotesque-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Figtree';font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/figtree-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}.gfr-fonts{--gfr-display:'Bricolage Grotesque';--gfr-body:'Figtree'}`;

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
  return (
    <div className="gfr-fonts">
      <link rel="preload" href="/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <style>{FONTS}</style>
      {children}
    </div>
  );
}
