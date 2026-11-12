"use client";
// The home page's three views (Home, Stations, Hearted songs), unchanged from
// GeekFon Radio v1 (Sean, 2026-11-12: Seat 2: Discovery, locked). The view
// lives in the address (?view=home|stations|hearted); the shell
// (RadioShell) owns it, the rail and the player, so this only draws.

import Link from "next/link";
import { useShell, songsOf, coversOf, artistHref } from "./RadioShell";
import { fmtTime, PREVIEW_SECONDS, type Station, type Heart } from "./useLiveRadio";
import { NEW_TALENT, stColor, stInk } from "./radioData";
import { IcPlay, IcPause, IcHeart, IcHeartSolid, IcLyrics, IcRadio, Eq } from "./icons";

export default function HomeView() {
  const S = useShell();
  const { R, view, go, tuneTo, openPanel, openLyrics, heart, openUnlock, homeStationOf, hello } = S;
  const pv = R.preview;
  const regular = R.stations.filter(s => !s.seasonal);
  const seasonal = R.stations.filter(s => s.seasonal);

  const stationCard = (s: Station, wide = false) => {
    const on = s.slug === R.station && !pv;
    const playing = on && R.live;
    const covers = coversOf(R.schedules[s.slug]?.rotation, 3);
    return (
      <button
        key={s.slug}
        type="button"
        className={"card" + (wide ? " wide" : "") + (on ? " on" : "")}
        style={{ "--c": stColor(s), "--i": stInk(s) } as React.CSSProperties}
        onClick={() => tuneTo(s.slug)}
        aria-label={s.name + (on ? (playing ? ", playing, press to pause" : ", tuned in, press to play") : ", press to listen")}
      >
        <span className="name">{s.name}</span>
        {s.tagline ? <span className="line">{s.tagline}</span> : null}
        <span className="collage">{covers.map(c => <img key={c} src={c} alt="" loading="lazy" />)}</span>
        <span className="go">{playing ? <IcPause /> : <IcPlay />}</span>
        <span className="air"><Eq still={!playing} />{playing ? "On air" : "Tuned in"}</span>
      </button>
    );
  };

  const comingCard = (
    <div key={NEW_TALENT.slug} className="card coming" style={{ "--c": NEW_TALENT.color, "--i": NEW_TALENT.ink } as React.CSSProperties} aria-label={`${NEW_TALENT.name}, coming soon`}>
      <span className="ring" />
      <span className="name">{NEW_TALENT.name}</span>
      <span className="line">{NEW_TALENT.tagline}</span>
      <span className="tag">Coming</span>
    </div>
  );

  const renderHome = () => (
    <>
      <section className="hero">
        <h1 className="hello">{hello}</h1>
        <p className="lede">Pick a station and let it play. Hear something you like? Tap <b>What is this?</b> to meet the artist and read the lyrics.</p>
        <div className="quick">
          {R.stations.map(s => {
            const cover = coversOf(R.schedules[s.slug]?.rotation, 1)[0];
            const on = s.slug === R.station && !pv;
            return (
              <button key={s.slug} type="button" className="qt" onClick={() => tuneTo(s.slug)}>
                <span className="sq" style={{ background: stColor(s) }}>{cover ? <img src={cover} alt="" /> : null}</span>
                <b>{s.name}</b>
                {on ? <span className="eqw" style={{ color: stColor(s) }}><Eq still={!R.live} /></span> : null}
              </button>
            );
          })}
          <button type="button" className="qt" onClick={() => go("hearted")}>
            <span className="sq hsq"><IcHeartSolid /></span><b>Hearted songs</b>
          </button>
        </div>
      </section>
      <section className="shelf">
        <div className="shelf-h"><h2>Stations</h2><button type="button" className="more" onClick={() => go("stations")}>Show all</button></div>
        <div className="grid">{regular.map(s => stationCard(s))}</div>
      </section>
      <section className="shelf">
        <div className="shelf-h"><h2>{seasonal.length ? "Holiday shelf" : "Coming to the dial"}</h2>{seasonal.length ? <span className="tag">Seasonal</span> : null}</div>
        <div className="grid">{seasonal.map(s => stationCard(s, true))}{comingCard}</div>
      </section>
      <section className="shelf">
        <div className="shelf-h"><h2>Recently played</h2></div>
        {R.recent.length ? (
          <div className="recent">
            {R.recent.map(x => (
              <button type="button" key={(x.songId || x.title) + x.artist} className="rc" onClick={() => openPanel(x)}>
                {x.coverUrl ? <img src={x.coverUrl} alt="" /> : <span className="ph" style={{ display: "block" }} />}
                <b>{x.title}</b><span>{x.artist}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty"><IcRadio size={26} /><span>Songs you hear show up here, so you can always find who sang them. Press Play on any station to start.</span></div>
        )}
      </section>
    </>
  );

  const renderStations = () => (
    <>
      <div className="vhead"><h1>Stations</h1><p>Live and free. Every station is already on air when you tune in.</p></div>
      <div className="rows">
        {R.stations.map(s => {
          const on = s.slug === R.station && !pv;
          const songs = songsOf(R.schedules[s.slug]?.rotation);
          const covers = coversOf(R.schedules[s.slug]?.rotation, 2);
          return (
            <div key={s.slug} className="srow">
              <div className="art" style={{ "--c": stColor(s) } as React.CSSProperties}>{covers.map(c => <img key={c} src={c} alt="" />)}</div>
              <div>
                <h2>{s.name} {s.seasonal ? <span className="tag">Seasonal</span> : null}</h2>
                <p>{s.tagline}{songs.length ? ` · ${songs.length} songs in rotation` : ""}</p>
              </div>
              <div className="act">
                <button type="button" className={"pill" + (on ? "" : " ghost")} onClick={() => tuneTo(s.slug)}>
                  {on && R.live ? <><IcPause size={18} />Pause</> : <><IcPlay size={18} />{on ? "Play" : "Listen"}</>}
                </button>
              </div>
            </div>
          );
        })}
        <div className="srow dim">
          <div className="art" style={{ "--c": NEW_TALENT.color } as React.CSSProperties} />
          <div><h2>{NEW_TALENT.name} <span className="tag">Coming</span></h2><p>{NEW_TALENT.tagline}</p></div>
          <div className="act" />
        </div>
      </div>
    </>
  );

  const songRow = (h: Heart) => <HeartRow key={h.songId} h={h} />;

  const renderHearted = () => {
    const groups: { slug: string; artist: string; items: Heart[] }[] = [];
    for (const h of R.hearts) {
      const key = h.slug || h.artist;
      let g = groups.find(x => x.slug === key);
      if (!g) { g = { slug: key, artist: h.artist, items: [] }; groups.push(g); }
      g.items.push(h);
    }
    const multi = groups.length > 1;
    const n = R.hearts.length;
    return (
      <>
        <section className="hhero">
          <div className="big"><IcHeart on size={56} /></div>
          <div>
            <small>Saved on this device</small>
            <h1>Hearted songs</h1>
            <p>{n} {n === 1 ? "song" : "songs"}. Radio is live, so there is no rewind and no skip. Heart a song and it waits here with a 30-second preview.</p>
          </div>
        </section>
        {n ? groups.map(g => (
          <section key={g.slug} className="hg">
            {multi ? (
              <div className="hg-h">
                {g.items[0].coverUrl ? (g.items[0].slug ? <Link href={artistHref(g.items[0].slug)} aria-label={g.artist}><img src={g.items[0].coverUrl} alt="" /></Link> : <img src={g.items[0].coverUrl} alt="" />) : null}
                <div>
                  {g.items[0].slug ? <Link href={artistHref(g.items[0].slug)}>{g.artist}</Link> : <b>{g.artist}</b>}
                  <span className="s">{g.items.length} {g.items.length === 1 ? "hearted song" : "hearted songs"}</span>
                </div>
              </div>
            ) : null}
            <div className="slist">{g.items.map(songRow)}</div>
          </section>
        )) : (
          <div className="empty" style={{ marginTop: 20 }}><IcHeart size={26} /><span>Tap the heart on any song while it plays. It saves here, on this device, with a 30-second preview.</span></div>
        )}
        <p className="foot">Want the full song, on demand? Unlock that artist, $11 one time. Your hearts stay on this device until then.</p>
      </>
    );
  };

  return view === "home" ? renderHome() : view === "stations" ? renderStations() : renderHearted();
}

/** One hearted song: a 30-second preview, the artist, the $11 unlock, the heart and the lyrics. Shared by Hearted songs and Your GeekFon. */
export function HeartRow({ h }: { h: Heart }) {
  const { R, openLyrics, heart, openUnlock, homeStationOf, me } = useShell();
  const pv = R.preview;
  // Unlocked already (one by one, or every artist): the full song is on the artist's page.
  const full = !!h.slug && me.state === "in" && (me.allArtists || me.unlocked.includes(h.slug));
    const home = homeStationOf(h.slug);
  const on = !!pv && pv.song.songId === h.songId;
  const playing = on && pv!.playing && !pv!.ended;
  const len = h.durationSeconds ? fmtTime(h.durationSeconds) : "";
  const t = on ? pv!.time : 0;
  return (
    <div className={"sng" + (on ? " on" : "")} style={{ "--ac": stColor(home), "--ac-ink": stInk(home) } as React.CSSProperties}>
      <button type="button" className="pvb" onClick={() => R.startPreview(h)} aria-label={`${playing ? "Pause" : "Play"} 30-second preview of ${h.title}`}>
        {playing ? <IcPause /> : <IcPlay />}
      </button>
      {h.coverUrl ? <img src={h.coverUrl} alt="" loading="lazy" /> : <span className="ph" />}
      <div className="st">
        <div className="tl"><b>{h.title}</b><span className="ptag">Preview</span></div>
        <span className="sub">
          {h.slug ? <Link className="alink" href={artistHref(h.slug)}>{h.artist}</Link> : <span>{h.artist}</span>}
          {len ? <span className="mlen">{on ? `${fmtTime(t)} / 0:30` : len}</span> : null}
        </span>
      </div>
      <span className="sx">{h.slug ? (full
    ? <Link className="unl" href={artistHref(h.slug)}>Full song on {h.artist}&apos;s page</Link>
    : <button type="button" className="unl" onClick={() => openUnlock(h.slug!)}>Hear the full song: unlock {h.artist}, $11</button>) : null}</span>
      <span className="len">{on ? `${fmtTime(t)} / 0:30` : len}</span>
      <span className="ops">
        <button type="button" className="ib hearted" onClick={() => heart(h)} aria-pressed="true" aria-label={`Remove heart from ${h.title}`}><IcHeart on /></button>
        <button type="button" className="ib" onClick={() => openLyrics(h)} aria-label={`Lyrics for ${h.title}, free`}><IcLyrics size={18} /></button>
      </span>
      <i className="rp" aria-hidden="true"><i style={{ width: on ? `${(t / PREVIEW_SECONDS) * 100}%` : 0 }} /></i>
    </div>
  );
}
