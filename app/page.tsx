// geekfon.ai: the character-select homepage (playbook geekfon-character-select,
// Sean and V 2026-10-05 and 2026-10-10). The artists are the first thing a
// visitor meets; the radio, the group chat and LoLA's intro live on the same
// screen. Built in components/home/CharacterSelect.tsx; the radio itself is
// components/radio/RadioProvider (app/layout.tsx) so it keeps playing on every page.
import SiteChrome from "@/components/SiteChrome";
import CharacterSelect from "@/components/home/CharacterSelect";

export default function HomePage() {
  return (
    <SiteChrome>
      <style>{`html,body{overflow:hidden;background:#020c0a;}`}</style>
      <CharacterSelect variant="home" />
    </SiteChrome>
  );
}
