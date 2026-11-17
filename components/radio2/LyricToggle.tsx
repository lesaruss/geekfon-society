"use client";
// English / original-language switch for lyrics (Sean, 2026-11-17).
import { setLyricShow, type LyricShow } from "./radioData";

export function LyricToggle({ showing, native, lang, code, className }: { showing: LyricShow; native: string | null; lang: string | null; code: string | null; className?: string }) {
  return (
    <div className={"lytg" + (className ? " " + className : "")} role="group" aria-label="Lyrics language">
      <button type="button" aria-pressed={showing === "en"} onClick={() => setLyricShow("en")}>English</button>
      <button type="button" aria-pressed={showing === "orig"} onClick={() => setLyricShow("orig")} lang={code || undefined} title={lang ? `Show the lyrics in ${lang}, as sung` : undefined}>{native || lang}</button>
    </div>
  );
}
