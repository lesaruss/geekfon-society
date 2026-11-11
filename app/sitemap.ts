// geekfon.ai/sitemap.xml (site health 2026-11-11: Search Console reported no sitemap).
// The public pages only: the homepage, each roster artist's page (lib/roster.ts ARTIST_ORDER),
// the radio, the story, the Pro program and the privacy policy. Sign-up, sign-in, the dashboard,
// the Passport and the referral door stay out.
import type { MetadataRoute } from "next";
import { ARTIST_ORDER } from "@/lib/roster";

const BASE = "https://geekfon.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/radio", "/story", "/pro", "/privacy"];
  return [
    ...pages.map(p => ({ url: BASE + p, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...ARTIST_ORDER.map(slug => ({ url: `${BASE}/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
