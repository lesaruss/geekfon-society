// GeekFon Radio - deterministic synced-clock scheduler.
//
// No streaming server, no third-party radio platform. Every listener's browser
// runs this same pure function against the same wall-clock time and lands on
// the same track at the same offset - the Turntable.fm / ErsatzTV pattern:
// broadcast a fixed reference point, let every client compute its own seek
// position from elapsed real time instead of relaying one shared audio pipe.
//
// Priority order when resolving "what's playing right now":
//   1. Pinned slots   - a specific track forced to a specific real-world
//                        timestamp (season premieres, announced events).
//   2. Ad cadence      - repeats on a fixed interval so an ad break lands at
//                        the same wall-clock moment for every listener
//                        worldwide. No-ops (falls through) if no creative is
//                        configured yet.
//   3. Base rotation   - the season catalog, fixed order, looped forever via
//                        elapsed-time-mod-total-duration.

export const RADIO_EPOCH_MS = new Date("2026-01-01T00:00:00Z").getTime();

export type RadioTrack = {
  path: string;
  title: string;
  artist: string;
  durationSeconds: number;
};

export type PinnedOverride = {
  kind: "pinned";
  path: string;
  title: string;
  artist: string;
  startsAtMs: number;
  durationSeconds: number;
  label?: string;
};

export type AdCadenceOverride = {
  kind: "ad_cadence";
  adSrcPath: string | null;
  cadenceSeconds: number;
  durationSeconds: number;
  label?: string;
};

export type ScheduleOverride = PinnedOverride | AdCadenceOverride;

export type ResolvedPlayhead = {
  type: "pinned" | "ad" | "rotation";
  path: string;
  title: string;
  artist: string;
  offsetSeconds: number;
  durationSeconds: number;
  label?: string;
};

/** Positive modulo - JS `%` can return negative for negative inputs. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function resolvePlayhead(
  nowMs: number,
  rotation: RadioTrack[],
  overrides: ScheduleOverride[]
): ResolvedPlayhead | null {
  for (const o of overrides) {
    if (o.kind !== "pinned") continue;
    const endMs = o.startsAtMs + o.durationSeconds * 1000;
    if (nowMs >= o.startsAtMs && nowMs < endMs) {
      return {
        type: "pinned",
        path: o.path,
        title: o.title,
        artist: o.artist,
        offsetSeconds: (nowMs - o.startsAtMs) / 1000,
        durationSeconds: o.durationSeconds,
        label: o.label,
      };
    }
  }

  for (const o of overrides) {
    if (o.kind !== "ad_cadence") continue;
    if (!o.adSrcPath || o.cadenceSeconds <= 0) continue; // no creative configured yet
    const elapsed = Math.floor((nowMs - RADIO_EPOCH_MS) / 1000);
    const posInCycle = mod(elapsed, o.cadenceSeconds);
    if (posInCycle < o.durationSeconds) {
      return {
        type: "ad",
        path: o.adSrcPath,
        title: o.label || "Advertisement",
        artist: "GeekFon Radio",
        offsetSeconds: posInCycle,
        durationSeconds: o.durationSeconds,
        label: o.label,
      };
    }
  }

  if (rotation.length === 0) return null;
  const total = rotation.reduce((s, t) => s + Math.max(t.durationSeconds, 1), 0);
  if (total <= 0) return null;

  const elapsed = mod((nowMs - RADIO_EPOCH_MS) / 1000, total);
  let acc = 0;
  for (const t of rotation) {
    const d = Math.max(t.durationSeconds, 1);
    if (elapsed < acc + d) {
      return {
        type: "rotation",
        path: t.path,
        title: t.title,
        artist: t.artist,
        offsetSeconds: elapsed - acc,
        durationSeconds: d,
      };
    }
    acc += d;
  }
  // Floating point edge case at the exact end of the loop.
  const last = rotation[rotation.length - 1];
  return {
    type: "rotation",
    path: last.path,
    title: last.title,
    artist: last.artist,
    offsetSeconds: Math.max(last.durationSeconds - 0.1, 0),
    durationSeconds: last.durationSeconds,
  };
}
