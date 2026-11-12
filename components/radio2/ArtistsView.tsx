"use client";
// Artists (/roster) in the Seat 2 shell: every artist on the roster, each card
// with their picture (a link to their page), name, genre and city, their
// station, and a play button for their own artist radio. Filter by station;
// the filter is in the address (?group=<station>|geekfon) so it can be shared.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShell, artistStation } from "./RadioShell";
import { IcPlay, IcPause, Eq } from "./icons";
import type { RosterData, RosterArtist } from "@/lib/artistPage";

const MAIN_GROUP = "geekfon";

function readGroup(): string {
  try { return new URLSearchParams(window.location.search).get("group") || "all"; } catch { return "all"; }
}

export default function ArtistsView({ initial }: { initial: RosterData }) {
  const { R, tuneTo, setBaseTitle } = useShell();
  const [data, setData] = useState<RosterData>(initial);
  const [group, setGroup] = useState("all");

  useEffect(() => { setBaseTitle("Artists, GeekFon Society"); }, [setBaseTitle]);
  useEffect(() => { setGroup(readGroup()); }, []);
  // The server could not reach the catalog (no service key): ask the API.
  useEffect(() => {
    if (initial.complete) return;
    let on = true;
    fetch("/api/radio/roster").then(r => (r.ok ? r.json() : null)).then((d: RosterData | null) => { if (on && d?.artists?.length) setData(d); }).catch(() => {});
    return () => { on = false; };
  }, [initial.complete]);

  const pick = (g: string) => {
    setGroup(g);
    try {
      const url = new URL(window.location.href);
      if (g === "all") url.searchParams.delete("group"); else url.searchParams.set("group", g);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch { /* ignore */ }
  };

  const onMainOnly = (a: RosterArtist) => a.stations.length === 0;
  const shown = useMemo(() => data.artists.filter(a =>
    group === "all" ? true : group === MAIN_GROUP ? onMainOnly(a) : a.stations.some(s => s.slug === group)), [data.artists, group]);
  const anyMainOnly = data.artists.some(onMainOnly);
  const chips = [
    { slug: "all", name: "All" },
    ...data.groups.map(g => ({ slug: g.slug, name: g.name.replace(/ Radio$/, "") })),
    ...(anyMainOnly ? [{ slug: MAIN_GROUP, name: "On GeekFon Radio" }] : []),
  ];

  return (
    <>
      <div className="vhead">
        <h1>Artists</h1>
        <p>Every artist on GeekFon Society. Press play for their own radio: their songs first, then the station they call home. Live and free.</p>
      </div>
      <div className="filters" role="group" aria-label="Filter by station">
        {chips.map(c => (
          <button key={c.slug} type="button" className="fchip" aria-pressed={group === c.slug} onClick={() => pick(c.slug)}>{c.name}</button>
        ))}
      </div>
      {shown.length ? (
        <div className="agrid">
          {shown.map(a => {
            const st = artistStation(a.slug);
            const on = R.station === st && !R.preview;
            const playing = on && R.live;
            const home = a.stations[0];
            return (
              <article key={a.slug} className={"acard" + (on ? " on" : "")} style={{ "--ac": a.accent, "--ac-ink": a.ink } as React.CSSProperties}>
                <div className="apw">
                  <Link className="apic" href={`/${a.slug}`} aria-label={a.name}>
                    {a.picture ? <img src={a.picture} alt="" loading="lazy" /> : <span className="ini" aria-hidden="true">{a.name.charAt(0)}</span>}
                  </Link>
                  <button type="button" className="aplay" onClick={() => tuneTo(st)} aria-label={playing ? `Pause ${a.name} Radio` : `Play ${a.name} Radio`}>
                    {playing ? <IcPause size={20} /> : <IcPlay size={20} />}
                  </button>
                  {on ? <span className="aair"><Eq still={!R.live} />{R.live ? "On air" : "Tuned in"}</span> : null}
                </div>
                <div className="ameta">
                  <Link href={`/${a.slug}`} className="an">{a.name}</Link>
                  <span className="ag">{[a.genre, a.location].filter(Boolean).join(" · ") || "GeekFon Society"}</span>
                  <span className="schip" style={{ "--c": home?.color || "#ECE22D", "--i": home?.ink || "#0B0B0C" } as React.CSSProperties}>{home ? home.name : "GeekFon Radio"}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 18 }}><span>No artists on this station yet.</span></div>
      )}
      <p className="foot">Every artist is on GeekFon Radio too. Artist radio is live, like every station: no skip and no rewind.</p>
    </>
  );
}
