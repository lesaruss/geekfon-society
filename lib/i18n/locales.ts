// Site languages (Sean, 2026-11-17: Spanish, Japanese, Korean, Portuguese (Brazil), German; Zulu on hold).
// English is the source and the fallback for any missing string.
export const LOCALES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "gf_lang";

/** Best site language for a browser's list ("pt-PT" -> "pt-BR", "de-AT" -> "de"). */
export function matchLocale(prefs: readonly string[] | undefined | null): Locale {
  const codes = LOCALES.map(l => l.code as string);
  for (const raw of prefs ?? []) {
    const p = raw.trim();
    if (!p) continue;
    const exact = codes.find(c => c.toLowerCase() === p.toLowerCase());
    if (exact) return exact as Locale;
    const base = p.split("-")[0].toLowerCase();
    const byBase = codes.find(c => c.split("-")[0].toLowerCase() === base);
    if (byBase) return byBase as Locale;
  }
  return DEFAULT_LOCALE;
}
export const isLocale = (v: unknown): v is Locale => LOCALES.some(l => l.code === v);
