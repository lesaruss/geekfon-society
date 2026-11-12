// geekfon.ai: the new GeekFon (Sean, 2026-11-12: "This is the website... when people go to geekfon.ai, this is
// where they're gonna land. And then we're gonna remove the other site."). The Seat 2: Discovery design, live
// radio first. The shell (rail, player, panel) is app/(site)/layout.tsx; this page draws Home, Stations and
// Hearted songs. The previous homepage is at /classic on the preview until it is retired.
import type { Metadata } from "next";
import HomeView from "@/components/radio2/HomeView";

const TITLE = "GeekFon Society";
const DESCRIPTION = "Original artists. Real music. Free, live GeekFon Radio with no sign up: hear something you like, tap What is this? to meet the artist and read the lyrics.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "https://geekfon.ai/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://geekfon.ai/", siteName: "GeekFon Society", type: "website", images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }] },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function HomePage() {
  return <HomeView />;
}
