import { redirect } from "next/navigation";

// Points/LESARs economy retired 2026-07-23 (see components/ArtistPage.tsx playback
// gating rewrite) and reconfirmed by Sean 2026-07-26 ("I don't think we need points
// anymore, we can retire the points... they weren't the right fit"). This page's
// entire mechanic (member_rankings ordered by a Points-derived total_score, "Earn
// Points" copy throughout) had no non-Points meaning left, so it is retired rather
// than left live with dead currency. Nav entry removed in components/SiteChrome.tsx
// in the same pass. Redirect (not a hard 404) so any existing bookmark/link still
// lands somewhere useful instead of breaking.
export default function LeaderboardPage() {
  redirect("/dashboard");
}
