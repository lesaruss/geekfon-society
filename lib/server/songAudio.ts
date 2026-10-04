// Replacing a depot song's audio from the browser (2026-10-04, Sean: "just
// provide me with the link to upload"). Server-only.
//
// Song files are far over the 4.5MB serverless body limit, so the browser
// uploads straight to Supabase Storage with a one-time signed upload URL;
// the server then points pulse_songs at the new object and checks it has
// vocals by transcribing it (the existing lyrics-transcribe function).
// Songs found to be instrumentals in the 2026-10-04 depot check are flagged.
import { STREAM_BUCKET } from "./depot";

export const AUDIO_BUCKET = STREAM_BUCKET;

export const FLAGGED_INSTRUMENTALS: Record<string, string> = {
  "b955121e-2448-4c90-882d-d2319ce0c47f": "Roxanne - Moments Pass You By",
  "25377808-8513-4d0d-b731-52d4e2184ed2": "Shamanic Resin - It's Okay!",
  "efcffd9e-a136-4b97-8de9-9fb4e141b8e5": "Straight and Narrow - Chains of the System",
};

export type AudioKind = "stream" | "master";

export function objectPathFor(artist: string, slug: string, kind: AudioKind): string {
  const ext = kind === "stream" ? "mp3" : "wav";
  const dir = kind === "stream" ? "stream" : "masters";
  return `${artist}/${dir}/${slug}-${Date.now()}.${ext}`;
}
