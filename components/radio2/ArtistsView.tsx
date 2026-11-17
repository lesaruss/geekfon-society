"use client";
// Artists (/roster) in the Seat 2 shell: every artist on the roster, each card
// with their picture (a link to their page), name, genre and city, their
// station, and a play button for their own artist radio. Filter by station;
// the filter is in the address (?group=<station>|geekfon) so it can be shared.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShell, artistStation } from "./RadioShell";
import { IcPlay, IcPause, Eq } from "./icons";
import { useT } from "@/components/i18n/I18n";
import type { RosterData, RosterArtist } from "@/lib/artistPage";

const MAIN_GROUP = "geekfon";

function readGroup(): string {
  try { return new URLSearchParams(window.location.search).get("group") || "all"; } catch { return "all"; }
}

export default function ArtistsView({ initial }: { initial: RosterData }) {
  const { setBaseTitle } = useShell();
  const t = useT();
  const [data, setData] = useState<RosterData>(initial);
  const [group, setGroup] = useState("all");

  useEffect(() => { setBaseTitle(t("artists.title")); }, [setBaseTitle, t]);
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
    { slug: "all", name: t("artists.all") },
    ...data.groups.map(g => ({ slug: g.slug, name: g.name.replace(/ Radio$/, "") })),
    ...(anyMainOnly ? [{ slug: MAIN_GROUP, name: t("artists.onGeekfonRadio") }] : []),
  ];

  return (
    <>
      <div className="vhead">
        <nav className="crumbs" aria-label={t("artists.breadcrumb")}><Link href="/">GeekFon Society</Link><span aria-hidden="true">›</span><span aria-current="page">{t("artists.heading")}</span></nav>
        <h1>{t("artists.heading")}</h1>
        <p>{t("artists.intro")}</p>
      </div>
      <div className="filters" role="group" aria-label={t("artists.filterLabel")}>
        {chips.map(c => (
          <button key={c.slug} type="button" className="fchip" aria-pressed={group === c.slug} onClick={() => pick(c.slug)}>{c.name}</button>
        ))}
      </div>
      {shown.length ? (
        <div className="agrid">
          {shown.map(a => <ArtistCard key={a.slug} a={a} />)}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 18 }}><span>{t("artists.empty")}</span></div>
      )}
      <p className="foot">{t("artists.foot")}</p>
    </>
  );
}

/** One artist card (picture to their page, play for their artist radio, name, genre and city, home station).
 *  Shared by Artists (/roster) and Meet the artists on the home page. */
export function ArtistCard({ a }: { a: RosterArtist }) {
  const { R, tuneTo } = useShell();
  const t = useT();
  const st = artistStation(a.slug);
  const on = R.station === st && !R.preview;
  const playing = on && R.live;
  const home = a.stations[0];
  return (
    <article className={"acard" + (on ? " on" : "")} style={{ "--ac": a.accent, "--ac-ink": a.ink } as React.CSSProperties}>
      <div className="apw">
        <Link className="apic" href={`/${a.slug}`} aria-label={a.name}>
          {a.picture ? <img src={a.picture} alt="" loading="lazy" /> : <span className="ini" aria-hidden="true">{a.name.charAt(0)}</span>}
        </Link>
        <button type="button" className="aplay" onClick={() => tuneTo(st)} aria-label={playing ? t("artists.pauseRadio", { name: a.name }) : t("artists.playRadio", { name: a.name })}>
          {playing ? <IcPause size={20} /> : <IcPlay size={20} />}
        </button>
        {on ? <span className="aair"><Eq still={!R.live} />{R.live ? t("artists.onAir") : t("artists.tunedIn")}</span> : null}
      </div>
      <div className="ameta">
        <Link href={`/${a.slug}`} className="an">{a.name}</Link>
        <span className="ag">{[a.genre, a.location].filter(Boolean).join(" · ") || "GeekFon Society"}</span>
        <span className="schip" style={{ "--c": home?.color || "#ECE22D", "--i": home?.ink || "#0B0B0C" } as React.CSSProperties}>{home ? home.name : "GeekFon Radio"}</span>
      </div>
    </article>
  );
}
