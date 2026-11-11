// geekfon.ai: the character-select homepage (playbook geekfon-character-select,
// Sean and V 2026-10-05 and 2026-10-10). The artists are the first thing a
// visitor meets; the radio, the group chat and LoLA's intro live on the same
// screen. Built in components/home/CharacterSelect.tsx; the radio itself is
// components/radio/RadioProvider (app/layout.tsx) so it keeps playing on every page.
//
// Theme follows the visitor's clock (Sean, 2026-10-10): light with day
// skylines from 6am to 7pm, dark with night skylines otherwise. Set before
// paint so there is no flash; ?theme=light or ?theme=dark forces one.
import SiteChrome from "@/components/SiteChrome";
import CharacterSelect from "@/components/home/CharacterSelect";
import { loadHomeData } from "@/lib/server/homeData";

// The roster and chat are loaded here on the server (refreshed every 5 minutes, as /api/home
// is cached) so the first artist is in the HTML. If the database is out of reach the page
// falls back to loading them in the browser, as before.
export const revalidate = 300;

const THEME = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var h=new Date().getHours();var t=(q==='light'||q==='dark')?q:(h>=6&&h<19?'light':'dark');document.documentElement.setAttribute('data-gfs-theme',t);}catch(e){}})();`;

export default async function HomePage() {
  const initial = await loadHomeData().catch(() => null);
  return (
    <SiteChrome>
      <script dangerouslySetInnerHTML={{ __html: THEME }} />
      <style>{`html,body{overflow:hidden;background:#020c0a;}html[data-gfs-theme="light"],html[data-gfs-theme="light"] body{background:#fff;}`}</style>
      <CharacterSelect initial={initial} />
    </SiteChrome>
  );
}
