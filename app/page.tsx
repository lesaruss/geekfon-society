// geekfon.ai: the new GeekFon (Sean, 2026-11-12: "This is the website... when people go to geekfon.ai, this is
// where they're gonna land. And then we're gonna remove the other site."). The Seat 2: Discovery design, live
// radio first (components/radio2/RadioApp). The previous homepage is at /classic on the preview until it is retired.
import type { Metadata, Viewport } from "next";
import RadioApp from "@/components/radio2/RadioApp";
import SiteFonts from "@/components/radio2/SiteFonts";

const TITLE = "GeekFon Society";
const DESCRIPTION = "Original artists. Real music. Free, live GeekFon Radio with no sign up: hear something you like, tap What is this? to meet the artist and read the lyrics.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "https://geekfon.ai/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://geekfon.ai/", siteName: "GeekFon Society", type: "website", images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }] },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#09090A", viewportFit: "cover", colorScheme: "dark" };

export default function HomePage() {
  return (
    <SiteFonts>
      <RadioApp />
    </SiteFonts>
  );
}
