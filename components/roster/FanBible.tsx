"use client";
// Bible tab of the public roster: the fan slice of the character Bible
// (lib/server/bible.ts decides what is public-safe). Free visitors get the
// Identity card and see which chapters supporters unlock; supporters get
// every chapter from the access route.
import type { FanBibleModule } from "@/lib/server/bible";
import "./roster.css";

type Props = {
  artistName: string;
  freeModules: FanBibleModule[];
  lockedLabels: string[];
  fullModules?: FanBibleModule[]; // present only for supporters
  onSupport: () => void;
};

function Value({ v }: { v: unknown }) {
  if (Array.isArray(v)) {
    const flat = v.every(x => typeof x !== "object" || x === null);
    if (flat) return <span>{v.join(", ")}</span>;
    return <ul className="rb-list">{v.map((x, i) => <li key={i}><Value v={x} /></li>)}</ul>;
  }
  if (v && typeof v === "object") {
    return (
      <dl className="rb-dl">
        {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
          <div key={k}><dt>{k.replace(/_/g, " ")}</dt><dd><Value v={x} /></dd></div>
        ))}
      </dl>
    );
  }
  return <span>{String(v)}</span>;
}

function ModuleCard({ m }: { m: FanBibleModule }) {
  return (
    <section className="rb-card">
      <h3 className="rb-card-title">{m.label}</h3>
      <dl className="rb-fields">
        {m.fields.map(f => (
          <div key={f.key} className="rb-field">
            <dt>{f.label}</dt>
            <dd><Value v={f.value} /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function FanBible({ artistName, freeModules, lockedLabels, fullModules, onSupport }: Props) {
  const modules = fullModules ?? freeModules;
  if (!modules.length && !lockedLabels.length) {
    return (
      <section className="rs-wrap">
        <p className="rs-empty">{artistName}&apos;s Bible is still being written.</p>
      </section>
    );
  }
  return (
    <section className="rs-wrap">
      <div className="rs-head">
        <h2 className="rs-title">Bible</h2>
        <span className="rs-count">The story behind {artistName}</span>
      </div>
      {modules.map(m => <ModuleCard key={m.key} m={m} />)}
      {!fullModules && lockedLabels.length > 0 && (
        <div className="rs-banner">
          <div>
            <strong>More of the story is for supporters.</strong> Support {artistName} to unlock {lockedLabels.join(", ")}.
          </div>
          <button className="rs-cta" onClick={onSupport}>Support {artistName}</button>
        </div>
      )}
    </section>
  );
}
