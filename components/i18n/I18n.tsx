"use client";
// Site language (Sean, 2026-11-17). The page renders in English first (same as the server), then switches
// to the visitor's pick (cookie) or browser language. The picker sets the cookie for a year.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, matchLocale, type Locale } from "@/lib/i18n/locales";
import { EN, loadDict, translate, type Dict } from "@/lib/i18n/dict";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: T };
const I18nCtx = createContext<Ctx>({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k, v) => translate(EN, "en", k, v) });

function readCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLoc] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Dict>(EN);

  const apply = useCallback(async (l: Locale) => {
    const d = l === "en" ? EN : await loadDict(l).catch(() => EN);
    setDict(d);
    setLoc(l);
    try { document.documentElement.lang = l; } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const saved = readCookie();
    const l = isLocale(saved) ? saved : matchLocale(typeof navigator !== "undefined" ? navigator.languages : []);
    if (l !== "en") void apply(l);
  }, [apply]);

  const setLocale = useCallback((l: Locale) => {
    try { document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(l)}; path=/; max-age=31536000; samesite=lax`; } catch { /* ignore */ }
    void apply(l);
  }, [apply]);

  const value = useMemo<Ctx>(() => ({ locale, setLocale, t: (k, v) => translate(dict, locale, k, v) }), [locale, dict, setLocale]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;

const SHORT: Record<Locale, string> = { en: "EN", es: "ES", "pt-BR": "PT", de: "DE", ja: "日本語", ko: "한국어" };

/** Language picker: a compact native select, labelled with each language's own name. */
export function LanguagePicker({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={"langpick" + (className ? " " + className : "")} title={t("common.language")}>
      <span className="sr">{t("common.language")}</span>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
      <span className="lpcode" aria-hidden="true">{SHORT[locale]}</span>
      <select value={locale} onChange={e => setLocale(e.target.value as Locale)} aria-label={t("common.language")}>
        {LOCALES.map(l => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}
