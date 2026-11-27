"use client";
// Radio Listeners (Sean, 2026-11-27): who is really listening to GeekFon Radio,
// for how long, to what, from where, and whether they sign up. Data from
// /api/admin/radio-listeners (radio_listener_report). Team devices excluded.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = Record<string, string | number>;
type Report = {
  days: number; listening_now: number; listeners: number; sessions: number; minutes: number;
  avg_minutes_per_listener: number; returning: number; anonymous: number; signed_in: number; converted: number;
  team_excluded: number; by_station: Row[]; top_songs: Row[]; sources: Row[]; devices: Row[]; daily: Row[];
};

const RANGES = [7, 30, 90];
const title = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const stationName = (s: string) => s === "main" ? "GeekFon Radio" : `${title(s.startsWith("artist:") ? s.slice(7) : s)} Radio`;

export default function RadioListenersPanel() {
  const [days, setDays] = useState(30);
  const [r, setR] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/admin/radio-listeners?days=${days}`, { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Report;
        if (!cancelled) { setR(json); setState("ok"); }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [days]);

  const maxDaily = Math.max(1, ...(r?.daily ?? []).map(d => Number(d.listeners)));

  return (
    <div className="rl">
      <style>{CSS}</style>
      <div className="rl-head">
        <h3 className="rl-title">Radio Listeners</h3>
        <div className="rl-range" role="group" aria-label="Date range">
          {RANGES.map(d => (
            <button key={d} className={d === days ? "on" : ""} onClick={() => setDays(d)}>{d} days</button>
          ))}
        </div>
      </div>
      {state === "loading" && !r ? <div className="rl-empty">Loading…</div> : state === "error" ? <div className="rl-empty">Could not load listener numbers.</div> : r && (
        <>
          <div className="rl-stats">
            <Stat n={r.listening_now} l="Listening now" />
            <Stat n={r.listeners} l="Listeners" />
            <Stat n={r.minutes} l="Minutes played" />
            <Stat n={r.avg_minutes_per_listener} l="Avg min / listener" />
            <Stat n={r.returning} l="Came back" />
            <Stat n={r.anonymous} l="Never signed in" />
            <Stat n={r.signed_in} l="Signed in" />
            <Stat n={r.converted} l="Signed up after listening" />
          </div>
          {r.listeners === 0 ? (
            <div className="rl-empty">No listening recorded in this range yet. Tracking started November 27, 2026.</div>
          ) : (
            <>
              <div className="rl-daily" aria-label="Listeners per day">
                {r.daily.map(d => (
                  <div key={String(d.date)} className="rl-bar" title={`${d.date}: ${d.listeners} listeners, ${d.minutes} min`}>
                    <span style={{ height: `${(Number(d.listeners) / maxDaily) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="rl-cols">
                <List title="Stations" rows={r.by_station.map(s => [stationName(String(s.station)), `${s.listeners} · ${s.minutes} min`])} />
                <List title="Top songs" rows={r.top_songs.map(s => [`${s.title} · ${s.artist}`, `${s.minutes} min`])} />
                <List title="Where they came from" rows={r.sources.map(s => [String(s.source), String(s.listeners)])} />
                <List title="Device" rows={r.devices.map(s => [String(s.device), String(s.listeners)])} />
              </div>
            </>
          )}
          <div className="rl-note">A listener is one browser. Team devices are left out ({r.team_excluded}); open the radio with ?team=1 to leave yours out.</div>
        </>
      )}
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return <div className="rl-stat"><div className="rl-num">{n ?? 0}</div><div className="rl-lbl">{l}</div></div>;
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div>
      <div className="rl-sub">{title}</div>
      {rows.length === 0 ? <div className="rl-empty">None yet.</div> : rows.map(([a, b], i) => (
        <div key={i} className="rl-row"><span>{a}</span><span>{b}</span></div>
      ))}
    </div>
  );
}

const CSS = `
.rl{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:20px;margin-bottom:24px;}
.rl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rl-title{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.7);margin:0;}
.rl-range{display:flex;gap:6px;}
.rl-range button{font:inherit;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:5px 10px;border-radius:100px;border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;}
.rl-range button.on{background:rgba(0,215,95,.15);border-color:rgba(0,215,95,.5);color:rgba(0,215,95,.95);}
.rl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
@media(max-width:700px){.rl-stats{grid-template-columns:1fr 1fr;}}
.rl-num{font-size:24px;font-weight:900;color:#fff;line-height:1;}
.rl-lbl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin-top:4px;}
.rl-daily{display:flex;align-items:flex-end;gap:3px;height:70px;margin:4px 0 18px;}
.rl-bar{flex:1;height:100%;display:flex;align-items:flex-end;}
.rl-bar span{display:block;width:100%;min-height:2px;background:rgba(0,215,95,.6);border-radius:3px 3px 0 0;}
.rl-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
@media(max-width:900px){.rl-cols{grid-template-columns:1fr 1fr;}}
@media(max-width:560px){.rl-cols{grid-template-columns:1fr;}}
.rl-sub{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#F69820;margin-bottom:6px;}
.rl-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#fff;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.rl-row span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rl-row span:last-child{color:rgba(255,255,255,.45);flex-shrink:0;}
.rl-empty{font-size:12px;color:rgba(255,255,255,.35);}
.rl-note{font-size:10px;color:rgba(255,255,255,.3);margin-top:14px;}
`;
