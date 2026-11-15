// geekfon.ai/new-talent: artists send their music to New Talent on GeekFon Radio (Sean, 2026-11-15).
// In the new site's shell so the radio keeps playing. The form lives in components/radio2/NewTalentView.
import type { Metadata } from "next";
import NewTalentView from "@/components/radio2/NewTalentView";

export const metadata: Metadata = {
  title: { absolute: "New Talent, GeekFon Society" },
  description: "Make music? Send it to GeekFon Radio. New Talent is the station for brand new artists, and it is free to be heard.",
  alternates: { canonical: "https://geekfon.ai/new-talent" },
  openGraph: { title: "New Talent, GeekFon Society", description: "Send your music to GeekFon Radio. Free to be heard.", url: "https://geekfon.ai/new-talent" },
};

export default function NewTalentPage() {
  return <NewTalentView />;
}
