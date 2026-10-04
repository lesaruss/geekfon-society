// The fan Bible: a curated, public-safe slice of gfs_artist_bible.
//
// HQ's Character Profile tab is staff-only and carries working material
// (prompt libraries, producer notes, canon rules, visual-kit corrections,
// voice-model notes). None of that belongs on geekfon.ai. This file is the
// whitelist: only the story modules below, only rows Sean has marked
// official_canon (proposed_canon is unapproved and can still change), and
// never a field whose key looks like working material.
//
// Free visitors see the Identity card. Supporters see every module.

import { serviceClient } from "./supabaseAdmin";

export type FanBibleModule = {
  key: string;
  label: string;
  free: boolean;
  fields: { key: string; label: string; value: unknown }[];
};

type ModuleSpec = { key: string; label: string; free?: boolean; only?: string[] };

const FAN_MODULES: ModuleSpec[] = [
  {
    key: "identity",
    label: "Identity",
    free: true,
    only: ["stage_name", "full_name", "aliases", "role", "occupation", "hometown", "current_base", "nationality", "cultural_identity", "languages", "birthday", "zodiac_sign", "age_range"],
  },
  { key: "backstory", label: "Story" },
  {
    key: "personality",
    label: "Personality",
    only: ["core_archetype", "traits", "values", "dream", "fear", "motivations", "greatest_strength", "comfort_habits", "pet_peeves", "emotional_role_in_universe"],
  },
  { key: "lore", label: "Lore" },
  { key: "relationships", label: "Relationships" },
  { key: "timeline", label: "Timeline" },
  { key: "musical_dna", label: "Sound", only: ["primary_genres", "secondary_genres", "musical_influences", "instrumentation", "favorite_hooks"] },
];

// Working-material keys never leave HQ, even inside an allowed module.
const DENY = /(^|_)(notes?|correction|corrections|prompt|prompts|url|urls|source|lesson|elevenlabs|generated|generation|last_updated_by|kit)($|_)|_20\d\d/;

function isEmpty(v: unknown): boolean {
  return v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);
}

// Nested objects get the same treatment, so a denied key cannot ride along
// inside an allowed one (e.g. a "notes" entry inside relationships).
function sanitize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sanitize).filter(x => !isEmpty(x));
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (DENY.test(k)) continue;
      const c = sanitize(x);
      if (!isEmpty(c)) o[k] = c;
    }
    return o;
  }
  return v;
}

function humanize(key: string): string {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Bible rows use 'riku-hayasaka' while the site uses 'riku'.
function bibleSlug(slug: string): string {
  return slug === "riku" ? "riku-hayasaka" : slug;
}

export async function loadFanBible(artistSlug: string, opts: { full: boolean }): Promise<FanBibleModule[]> {
  const sb = serviceClient();
  if (!sb) return [];
  const wanted = FAN_MODULES.filter(m => opts.full || m.free);
  const { data, error } = await sb
    .from("gfs_artist_bible")
    .select("module, data, canon_status")
    .eq("artist_slug", bibleSlug(artistSlug))
    .eq("canon_status", "official_canon")
    .in("module", wanted.map(m => m.key));
  if (error) {
    console.error("fan bible", artistSlug, error.message);
    return [];
  }
  const byModule = new Map((data ?? []).map((r: { module: string; data: Record<string, unknown> }) => [r.module, r.data]));
  const out: FanBibleModule[] = [];
  for (const spec of wanted) {
    const d = byModule.get(spec.key);
    if (!d) continue;
    const keys = spec.only ?? Object.keys(d);
    const fields = keys
      .filter(k => !DENY.test(k))
      .map(k => ({ key: k, label: humanize(k), value: sanitize(d[k]) }))
      .filter(f => !isEmpty(f.value));
    if (fields.length) out.push({ key: spec.key, label: spec.label, free: !!spec.free, fields });
  }
  return out;
}

// Module names a supporter would unlock, so the free view can say what is
// behind the prompt without sending the content.
export async function lockedBibleLabels(artistSlug: string): Promise<string[]> {
  const sb = serviceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("gfs_artist_bible")
    .select("module")
    .eq("artist_slug", bibleSlug(artistSlug))
    .eq("canon_status", "official_canon")
    .in("module", FAN_MODULES.filter(m => !m.free).map(m => m.key));
  const have = new Set((data ?? []).map((r: { module: string }) => r.module));
  return FAN_MODULES.filter(m => !m.free && have.has(m.key)).map(m => m.label);
}
