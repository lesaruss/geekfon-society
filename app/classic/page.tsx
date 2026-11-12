// /classic: the previous geekfon.ai homepage, kept on the preview only so it can be compared until Sean retires
// the old site (Sean, 2026-11-12: the new GeekFon is the website). Not indexed. Was app/page.tsx:
// the character-select homepage (playbook geekfon-character-select,
// Sean and V 2026-10-05 and 2026-10-10). The artists are the first thing a
// visitor meets; the radio, the group chat and LoLA's intro live on the same
// screen. Built in components/home/CharacterSelect.tsx; the radio itself is
// components/radio/RadioProvider (app/layout.tsx) so it keeps playing on every page.
//
// Theme follows the visitor's clock (Sean, 2026-10-10): light with day
// skylines from 6am to 7pm, dark with night skylines otherwise. Set before
// paint so there is no flash; ?theme=light or ?theme=dark forces one.
import type { Metadata } from "next";
import SiteChrome from "@/components/SiteChrome";
import CharacterSelect from "@/components/home/CharacterSelect";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { loadHomeData } from "@/lib/server/homeData";

// The roster and chat are loaded here on the server (cached 5 minutes, as /api/home is) so the
// first artist is in the HTML; a failed load is never cached and the page falls back to the
// browser fetch, as before. The page itself is rendered per visit because the skyline behind
// the stage depends on the visitor's clock: Vercel's x-vercel-ip-timezone gives their local hour,
// so the right day or night skyline is in the HTML too (site health 2026-11-11: the skyline was
// the largest thing on screen and showed last). The THEME script below still decides; if it
// disagrees (a VPN, say) the page switches, as it did before.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
const homeData = unstable_cache(
  async () => {
    const d = await loadHomeData();
    if (!d) throw new Error("home data unavailable");
    return d;
  },
  ["gfs-home-data-v1"],
  { revalidate: 300 },
);
function themeFor(tz: string | null, forced: string | undefined): "dark" | "light" {
  if (forced === "light" || forced === "dark") return forced;
  try {
    if (!tz) return "dark";
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
    return h >= 6 && h < 19 ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const THEME = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var h=new Date().getHours();var t=(q==='light'||q==='dark')?q:(h>=6&&h<19?'light':'dark');document.documentElement.setAttribute('data-gfs-theme',t);}catch(e){}})();`;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const [initial, h, sp] = await Promise.all([homeData().catch(() => null), headers(), searchParams]);
  const initialTheme = themeFor(h.get("x-vercel-ip-timezone"), sp?.theme);
  return (
    <SiteChrome>
      <script dangerouslySetInnerHTML={{ __html: THEME }} />
      <style>{`html,body{overflow:hidden;background:#020c0a;}html[data-gfs-theme="light"],html[data-gfs-theme="light"] body{background:#fff;}`}</style>
      <CharacterSelect initial={initial} initialTheme={initialTheme} />
    </SiteChrome>
  );
}
