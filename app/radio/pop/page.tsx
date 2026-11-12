// /radio/pop: the GeekFon Radio pop-out player (Sean, 2026-11-12). Its own
// small window (about 380 by 672), full screen on phones, no site chrome.
// Installable on its own through /radio-manifest.json (start_url here).
import type { Metadata } from "next";
import PopPlayer from "@/components/radio2/PopPlayer";

export const metadata: Metadata = {
  title: "GeekFon Radio",
  description: "GeekFon Radio in its own window. Free, live, no sign up.",
  alternates: { canonical: "https://geekfon.ai/radio" },
  robots: { index: false, follow: true },
};

export default function RadioPopPage() {
  return <PopPlayer />;
}
