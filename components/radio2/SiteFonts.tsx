// The Seat 2 fonts (Bricolage Grotesque and Figtree), self-hosted in public/fonts (SIL Open Font License).
// next/font/google cannot load Bricolage Grotesque (its optical-size axis comes back as an extensionless URL
// and the build fails), so the faces are declared here and shared by the homepage, /radio/pop and later pages.
export const FONTS = `@font-face{font-family:'Bricolage Grotesque';font-style:normal;font-weight:500 800;font-stretch:100%;font-display:swap;src:url(/fonts/bricolage-grotesque-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Figtree';font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/figtree-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}.gfr-fonts{--gfr-display:'Bricolage Grotesque';--gfr-body:'Figtree'}`;

export default function SiteFonts({ children }: { children: React.ReactNode }) {
  return (
    <div className="gfr-fonts">
      <link rel="preload" href="/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <style>{FONTS}</style>
      {children}
    </div>
  );
}
