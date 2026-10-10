// geekfon.ai: the character-select homepage (playbook geekfon-character-select,
// Sean and V 2026-10-05 and 2026-10-10). The artists are the first thing a
// visitor meets; the radio, the group chat and LoLA's intro live on the same
// screen. Built in components/home/CharacterSelect.tsx; the radio itself is
// components/radio/RadioProvider (app/layout.tsx) so it keeps playing on every page.
// ?theme=light shows the white version Sean asked to compare (2026-10-10).
import SiteChrome from "@/components/SiteChrome";
import CharacterSelect from "@/components/home/CharacterSelect";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const light = (await searchParams).theme === "light";
  return (
    <SiteChrome>
      <style>{`html,body{overflow:hidden;background:${light ? "#fff" : "#020c0a"};}`}</style>
      <CharacterSelect theme={light ? "light" : "dark"} />
    </SiteChrome>
  );
}
