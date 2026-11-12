// geekfon.ai/you: Your GeekFon, in the new site's shell (Sean, 2026-11-12). Fans land here after signing in:
// who they are, the artists they can hear in full (each opens the artist page, where full songs play on
// demand), their hearted songs on this device, and Sign out. Signed out, a short sign-in card. Staff land on
// BrandDesk in HQ instead (lib/postAuth). Personal, so not indexed.
import type { Metadata } from "next";
import YouView from "@/components/radio2/YouView";
import { loadRoster } from "@/lib/server/artistPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Your GeekFon, GeekFon Society" },
  description: "Your artists and your hearted songs on GeekFon Society.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://geekfon.ai/you" },
};

export default async function YouPage() {
  const roster = await loadRoster();
  return <YouView roster={roster} />;
}
