// /radio: GeekFon Radio v1 (Seat 2: Discovery, locked by Sean 2026-11-12).
// The app itself is a client component; this file keeps the page's search
// and share details on the server.
import type { Metadata } from "next";
import RadioApp from "@/components/radio2/RadioApp";

const TITLE = "GeekFon Radio";
const DESCRIPTION = "Free, live radio from the GeekFon Society artists. No sign up. Hear something you like? Tap What is this? to meet the artist and read the lyrics.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://geekfon.ai/radio" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://geekfon.ai/radio", siteName: "GeekFon Society", type: "website", images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }] },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function RadioPage() {
  return <RadioApp />;
}
