"use client";
import { useEffect, useState } from "react";

// Spots panel on the admin Radio Schedule page (Sean, 2026-10-05): every
// sponsor read on GeekFon Radio, which stations play it, how often (a spot
// after every N songs), and one action to put it on or take it off air.

type Spot = {
  id: string; label: string; sponsor_name: string; voiced_by: string | null; station_slugs: string[];
  src_url: string; duration_seconds: number; click_url: string | null; every_n_songs: number;
  is_active: boolean; starts_at: string | null; ends_at: string | null;
};
type Named = { slug: string; name: string };

const AVG_SONG_MIN = 3.4; // average song length on the radio, 2026-10-05

export default function RadioSpots({ authHeaders }: { authHeaders: () => Promise<HeadersInit> }) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [stations, setStations] = useState<Named[]>([]);
  const [artists, setArtists] = useState<Named[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/admin/radio-spots", { headers: await authHeaders() });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || "Could not load spots"); return; }
    setSpots(j.spots); setStations(j.stations); setArtists(j.artists);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(id: string, fields: Record<string, unknown>) {
    setBusy(id); setErr(null);
    const r = await fetch("/api/admin/radio-spots", {
      method: "PATCH",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    const j = await r.json();
    if (!r.ok) setErr(j.error || "Could not save");
    await load();
    setBusy(null);
  }

  const nameOf = (list: Named[], slug: string) => list.find((x) => x.slug === slug)?.name || slug;
  const now = Date.now();
  const live = (s: Spot) => s.is_active && (!s.starts_at || Date.parse(s.starts_at) <= now) && (!s.ends_at || Date.parse(s.ends_at) > now);

  if (!spots.length && !err) return null;
  return (
    <section className="rsp">
      <div className="rdc-section-hdr">Spots <span className="rsp-sub">sponsor reads between songs</span></div>
      {err && <div className="rsp-err">{err}</div>}
      <div className="rsp-grid">
        {spots.map((s) => (
          <div key={s.id} className="rsp-card">
            <div className="rsp-top">
              <span className={"rsp-tag " + (live(s) ? "on" : "off")}>{live(s) ? "Live" : "Off air"}</span>
              <span className="rsp-len">{Math.round(Number(s.duration_seconds))}s</span>
            </div>
            <div className="rsp-label">{s.label}</div>
            <div className="rsp-meta">
              {s.sponsor_name}{s.voiced_by ? ` · read by ${nameOf(artists, s.voiced_by)}` : ""}
            </div>
            <div className="rsp-meta">{s.station_slugs.map((st) => nameOf(stations, st)).join(", ")}</div>
            <audio className="rsp-audio" src={s.src_url} controls preload="none" />
            <label className="rsp-freq">
              Plays after every
              <select value={s.every_n_songs} disabled={busy === s.id} onChange={(e) => patch(s.id, { every_n_songs: Number(e.target.value) })}>
                {[2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} songs</option>)}
              </select>
              <span className="rsp-hint">about every {Math.round(s.every_n_songs * AVG_SONG_MIN)} min</span>
            </label>
            <button className="rsp-btn" disabled={busy === s.id} onClick={() => patch(s.id, { is_active: !s.is_active })}>
              {busy === s.id ? "Saving..." : s.is_active ? "Take off air" : "Put on air"}
            </button>
          </div>
        ))}
      </div>
      <style>{`
.rsp { margin: 0 0 24px; }
.rsp-sub { font-weight: 600; letter-spacing: .04em; text-transform: none; color: rgba(255,255,255,.3); }
.rsp-err { color: #ff8a8a; font-size: 12px; margin-bottom: 10px; }
.rsp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 12px; }
.rsp-card { display: flex; flex-direction: column; gap: 6px; padding: 14px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; }
.rsp-top { display: flex; justify-content: space-between; align-items: center; }
.rsp-tag { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 3px 9px; border-radius: 100px; }
.rsp-tag.on { background: rgba(0,215,95,.15); color: #00D75F; }
.rsp-tag.off { background: rgba(255,255,255,.08); color: rgba(255,255,255,.5); }
.rsp-len { font-size: 11px; color: rgba(255,255,255,.4); }
.rsp-label { font-size: 14px; font-weight: 800; color: #fff; }
.rsp-meta { font-size: 12px; color: rgba(255,255,255,.55); }
.rsp-audio { width: 100%; height: 32px; margin: 4px 0; }
.rsp-freq { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12px; color: rgba(255,255,255,.6); }
.rsp-freq select { background: rgba(255,255,255,.06); color: #fff; border: 1px solid rgba(255,255,255,.15); border-radius: 8px; padding: 4px 8px; font-family: inherit; font-size: 12px; }
.rsp-hint { color: rgba(255,255,255,.35); }
.rsp-btn { margin-top: 6px; align-self: flex-start; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: #fff; font-family: inherit; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 8px 14px; border-radius: 100px; cursor: pointer; }
.rsp-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </section>
  );
}
