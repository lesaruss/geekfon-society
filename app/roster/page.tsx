// geekfon.ai/roster: the same character-select screen as the homepage, plus a
// see-everyone grid whose cards play a 30-second preview in place (playbook
// geekfon-character-select, 2026-10-10). One experience to learn and maintain.
import CharacterSelect from "@/components/home/CharacterSelect";

export default function RosterPage() {
  return (
    <>
      <style>{`html,body{background:#020c0a;}`}</style>
      <CharacterSelect variant="roster" />
    </>
  );
}
