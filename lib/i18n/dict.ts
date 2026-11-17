import type { Locale } from "./locales";
import en from "./en";

export type Dict = { [area: string]: { [key: string]: string } };
export const EN = en as unknown as Dict;

// Translations load on demand so English visitors download none of them.
const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Dict }>> = {
  es: () => import("./es"),
  "pt-BR": () => import("./pt-BR"),
  de: () => import("./de"),
  ja: () => import("./ja"),
  ko: () => import("./ko"),
};
const cache = new Map<Locale, Dict>([["en", EN]]);
export async function loadDict(locale: Locale): Promise<Dict> {
  const hit = cache.get(locale);
  if (hit) return hit;
  const d = (await loaders[locale as Exclude<Locale, "en">]()).default;
  cache.set(locale, d);
  return d;
}

/** Look up "area.key" (with count plurals), fill {vars}, fall back to English, then the key. */
export function translate(dict: Dict, locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dot = key.indexOf(".");
  const area = key.slice(0, dot), k = key.slice(dot + 1);
  let id = k;
  if (vars && typeof vars.count === "number") {
    const form = new Intl.PluralRules(locale).select(vars.count);
    const cands = [`${k}_${form}`, `${k}_other`];
    id = cands.find(c => dict[area]?.[c] != null || EN[area]?.[c] != null) ?? k;
  }
  const s = dict[area]?.[id] ?? EN[area]?.[id] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] != null ? String(vars[v]) : m)) : s;
}
