"use client";
// English / original-language switch for lyrics (Sean, 2026-11-17).
import { setLyricShow, type LyricShow } from "./radioData";
import { useT } from "@/components/i18n/I18n";

export function LyricToggle({ showing, native, lang, code, className }: { showing: LyricShow; native: string | null; lang: string | null; code: string | null; className?: string }) {
  const t = useT();
  return (
    <div className={"lytg" + (className ? " " + className : "")} role="group" aria-label={t("shell.lyricsLanguage")}>
      <button type="button" aria-pressed={showing === "en"} onClick={() => setLyricShow("en")}>{t("shell.english")}</button>
      <button type="button" aria-pressed={showing === "orig"} onClick={() => setLyricShow("orig")} lang={code || undefined} title={lang ? t("shell.showLyricsIn", { lang }) : undefined}>{native || lang}</button>
    </div>
  );
}
