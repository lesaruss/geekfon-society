"use client";
// The character-select homepage (playbook geekfon-character-select:
// Sean and V locked it 2026-10-05, extended 2026-10-10 "throw visitors
// straight into the characters").
//
//   Rails       the 12 artists line up left and right, small, like a
//               character-select screen. Phones get one swipeable strip.
//   Stage       the chosen artist stands in the center circle, full body,
//               with their line, their single and their page. Before anyone
//               picks, the stage follows the radio: whoever is on air is on
//               stage, and changes when the song does.
//   Sound       the artist is already moving, muted; a tap anywhere turns the
//               radio on (browsers block sound until a tap).
//   Chat        lines from the free days of the group chat drift in at the
//               edge; a name puts that artist on stage.
//   LoLA        a prompt under the buttons with a short written intro (her animated tour
//               is phase 2).
//   Roster      retired 2026-10-10 (Sean: it did the same as the homepage);
//               /roster redirects here.
//
// Art: transparent cutouts of the existing portraits (profile.cutoutUrl), no
// new renders (Sean, 2026-10-10). Sound: components/radio/RadioProvider, so
// the music keeps going between pages.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRadio } from "@/components/radio/RadioProvider";
import { CHAT_TO_ROSTER, sized, titleKey, type HomeChatLine, type StageArtist } from "@/lib/roster";
import type { RadioTrack } from "@/lib/radioSchedule";
import { track } from "@/lib/track";
import "./characterSelect.css";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
// The city skylines the homepage has always had (2026-06-19 set).
const CITIES = [
  { name: "London", desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  { name: "Fort Lauderdale", desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  { name: "Seoul", desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  { name: "Tokyo", desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  { name: "Berlin", desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  { name: "Johannesburg", desktop: CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png", mobile: CDN + "hf_20260619_064547_2906c350-a205-4c96-9bb1-114dc53fc237.png" },
];
const CITY_MS = 9000;
const CHAT_MS = 6500;

type HomeData = { artists: StageArtist[]; chat: HomeChatLine[]; lola: { avatar: string | null } };


export default function CharacterSelect() {
  const variant = "home";
  const router = useRouter();
  const radio = useRadio();
  const [data, setData] = useState<HomeData | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [city, setCity] = useState(0);
  const [chatAt, setChatAt] = useState(0);
  const [lolaOpen, setLolaOpen] = useState(false);
  const gestured = useRef(false);

  useEffect(() => {
    fetch("/api/home").then(r => (r.ok ? r.json() : null)).then(setData).catch(() => {});
    void radio.loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCity(c => (c + 1) % CITIES.length), CITY_MS);
    return () => clearInterval(t);
  }, []);

  const chatLines = data?.chat ?? [];
  useEffect(() => {
    if (!chatLines.length) return;
    const t = setInterval(() => setChatAt(i => (i + 1) % chatLines.length), CHAT_MS);
    return () => clearInterval(t);
  }, [chatLines.length]);

  const artists = useMemo(() => data?.artists ?? [], [data]);
  const bySlug = useMemo(() => new Map(artists.map(a => [a.slug, a])), [artists]);
  const onAirSlug = radio.onAir?.slug && bySlug.has(radio.onAir.slug) ? radio.onAir.slug : null;
  const stageSlug = picked ?? onAirSlug ?? artists[0]?.slug ?? null;
  const stage = stageSlug ? bySlug.get(stageSlug) ?? null : null;

  // Each artist's single for the stage button and the grid preview: their
  // first released single that is on the radio, else their first original
  // (not a remix), else whatever the radio has of theirs.
  const songOf = useMemo(() => {
    const songs = new Map<string, RadioTrack[]>();
    for (const t of radio.rotation) {
      if (!t.slug || t.kind === "spot") continue;
      songs.set(t.slug, [...(songs.get(t.slug) ?? []), t]);
    }
    const m = new Map<string, RadioTrack>();
    for (const [slug, list] of songs) {
      const keys = (bySlug.get(slug)?.singles ?? []).map(titleKey);
      const single = keys.map(k => list.find(t => titleKey(t.title) === k)).find(Boolean);
      m.set(slug, single ?? list.find(t => !/remix/i.test(t.title)) ?? list[0]);
    }
    return m;
  }, [radio.rotation, bySlug]);

  // A tap anywhere turns the radio on, once. Buttons that make their own
  // sound (a single, a preview, the radio toggle) opt out with data-own-sound.
  const onAnyTap = useCallback((e: React.PointerEvent) => {
    if (gestured.current) return;
    gestured.current = true;
    if ((e.target as HTMLElement).closest("[data-own-sound]")) return;
    if (!radio.playing) {
      track("gfs_tap_listen", { page: variant });
      void radio.startRadio();
    }
  }, [radio]);


  const pick = useCallback((slug: string, from: string) => {
    if (picked === slug) {
      track("gfs_artist_open", { artist: slug, from, page: variant });
      router.push(`/${slug}`);
      return;
    }
    setPicked(slug);
    track("gfs_artist_pick", { artist: slug, from, page: variant });
  }, [picked, router]);

  const playSingle = useCallback((slug: string) => {
    const s = songOf.get(slug);
    if (!s) return;
    gestured.current = true;
    if (radio.mode === "clip" && radio.now?.slug === slug && radio.playing) { radio.stop(); return; }
    track("gfs_play_single", { artist: slug, page: variant });
    void radio.playClip({ slug, title: s.title, artist: s.artist, path: s.path, coverUrl: s.coverUrl });
  }, [radio, songOf]);



  const left = artists.slice(0, Math.ceil(artists.length / 2));
  const right = artists.slice(Math.ceil(artists.length / 2));
  const line = chatLines.length ? chatLines[chatAt % chatLines.length] : null;
  const lineSlug = line ? (CHAT_TO_ROSTER[line.from] ?? line.from) : null;
  const stageSong = stageSlug ? songOf.get(stageSlug) : undefined;
  const singlePlaying = radio.mode === "clip" && radio.playing && radio.now?.slug === stageSlug;
  const stageOnAir = !!stageSlug && stageSlug === onAirSlug;

  const tile = (a: StageArtist, where: string) => (
    <button
      key={a.slug}
      type="button"
      className={"cs-tile" + (a.slug === stageSlug ? " on" : "") + (a.slug === onAirSlug ? " air" : "")}
      style={{ ["--accent" as string]: a.accent }}
      onClick={() => pick(a.slug, where)}
      aria-pressed={a.slug === stageSlug}
      aria-label={`${a.name}${a.slug === onAirSlug ? ", on the radio now" : ""}${picked === a.slug ? ". Tap again to open their page" : ""}`}
    >
      {a.cutout ? (
        <img
          src={sized(a.cutout, 260) ?? ""}
          alt=""
          loading="lazy"
          // Bands and duos are wide: show everyone, not a crop of the middle member.
          onLoad={e => { const i = e.currentTarget; if (i.naturalWidth / i.naturalHeight > 0.55) i.classList.add("wide"); }}
        />
      ) : <span className="cs-tile-initial">{a.name[0]}</span>}
      <span className="cs-tile-name">{a.name}</span>
      {a.slug === onAirSlug ? <span className="cs-tile-air">On air</span> : null}
    </button>
  );

  return (
    <div className="cs cs-home" onPointerDownCapture={onAnyTap}>
      <h1 className="cs-sr">GeekFon Society</h1>

      {/* Background: aurora and the city skylines, as before. */}
      <div className="cs-bg" aria-hidden="true">
        <div className="cs-aurora" />
        {CITIES.map((c, i) => (
          <picture key={c.name} className={"cs-city" + (i === city ? " on" : "")}>
            {i === city || i === (city + 1) % CITIES.length ? (
              <>
                <source media="(max-width: 899px)" srcSet={c.mobile} />
                <img src={c.desktop} alt="" />
              </>
            ) : null}
          </picture>
        ))}
        <div className="cs-fade" />
      </div>

      <div className="cs-screen">
        <nav className="cs-rail cs-rail-l" aria-label="Artists">{left.map(a => tile(a, "rail"))}</nav>

        <main className="cs-center">
          <div className="cs-head">
            <div className="cs-eyebrow"><span className="cs-live" aria-hidden="true" />LESARUSS Universe</div>
            <p className="cs-pitch">A record label of animated artists. <strong>Pick one.</strong></p>
          </div>

          <div className="cs-stage" style={{ ["--accent" as string]: stage?.accent ?? "#F69820" }}>
            <div className="cs-circle" aria-hidden="true">
              <img src="/geekfon-logo.png" alt="" />
            </div>
            {stage?.cutout ? (
              <img key={stage.slug} className="cs-hero" src={sized(stage.cutout, 900) ?? ""} alt={stage.name} />
            ) : null}
            {!radio.playing ? (
              <button type="button" className="cs-sound" data-own-sound onClick={() => { gestured.current = true; track("gfs_tap_listen", { page: variant, via: "button" }); void radio.startRadio(); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" strokeWidth="2" strokeLinecap="round" /></svg>
                {radio.loading ? "Tuning in" : "Tap anywhere to listen"}
              </button>
            ) : null}
          </div>

          {stage ? (
            <section className="cs-info" aria-live="polite" style={{ ["--accent" as string]: stage.accent }}>
              {stageOnAir && radio.onAir ? (
                <div className="cs-onair"><span className="cs-onair-dot" aria-hidden="true" />On the radio now: {radio.onAir.title}</div>
              ) : onAirSlug && radio.onAir ? (
                <button type="button" className="cs-onair cs-onair-back" onClick={() => setPicked(null)}>
                  <span className="cs-onair-dot" aria-hidden="true" />On air: {bySlug.get(onAirSlug)?.name}
                </button>
              ) : null}
              <h2 className="cs-name">{stage.name}</h2>
              {stage.tagline ? <p className="cs-tagline">{stage.tagline}</p> : null}
              <div className="cs-actions">
                {stageSong ? (
                  <button type="button" className="cs-btn cs-btn-play" data-own-sound onClick={() => playSingle(stage.slug)}>
                    {singlePlaying ? (
                      <><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>Pause</>
                    ) : (
                      <><svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7 4 20 12 7 20" /></svg><span className="cs-btn-label">Play &ldquo;{stageSong.title}&rdquo;</span></>
                    )}
                  </button>
                ) : null}
                <Link className="cs-btn cs-btn-go" href={`/${stage.slug}`} onClick={() => track("gfs_artist_open", { artist: stage.slug, from: "stage", page: variant })}>
                  Meet<span className="cs-long">&nbsp;{stage.name}</span> <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              {/* LoLA's intro, under the buttons (Sean, 2026-10-10). Her animated tour is phase 2. */}
              <div className={"cs-lola" + (lolaOpen ? " open" : "")}>
                {lolaOpen ? (
                  <div className="cs-lola-card" role="dialog" aria-label="LoLA's intro">
                    <button type="button" className="cs-lola-x" onClick={() => setLolaOpen(false)} aria-label="Close">&times;</button>
                    <p className="cs-lola-hi">Hi, I&rsquo;m LoLA.</p>
                    <p>GeekFon Society is a record label where every artist is animated and every song is real.</p>
                    <ul>
                      <li>Tap anyone on the sides to meet them. Tap again to visit their page.</li>
                      <li>The radio plays the whole roster. Tap anywhere to turn it on.</li>
                      <li>They all live in one house in LA, and their group chat is open. October 1 to 3 are free to read.</li>
                      <li>Love someone? Support them for $11 and you get their album, their side of the chat and everything on their page.</li>
                    </ul>
                  </div>
                ) : null}
                <button type="button" className="cs-lola-badge" onClick={() => { setLolaOpen(o => !o); if (!lolaOpen) track("gfs_lola_intro", { page: variant }); }} aria-expanded={lolaOpen}>
                  {data?.lola.avatar ? <img src={data.lola.avatar} alt="" /> : <span className="cs-lola-dot" aria-hidden="true">L</span>}
                  <span>New here? <strong>LoLA will show you around.</strong></span>
                </button>
              </div>
            </section>
          ) : (
            <div className="cs-info cs-loading" aria-hidden="true" />
          )}

          <nav className="cs-strip" aria-label="Artists">{artists.map(a => tile(a, "strip"))}</nav>

        </main>

        <nav className="cs-rail cs-rail-r" aria-label="More artists">{right.map(a => tile(a, "rail"))}</nav>
      </div>

      {/* The group chat, free days only, drifting in at the edge. */}
      {line ? (
        <div className="cs-chat" key={line.id} style={{ ["--accent" as string]: line.accent ?? "#F69820" }}>
          {line.avatar ? <img src={line.avatar} alt="" className="cs-chat-face" /> : null}
          <div className="cs-chat-text">
            {lineSlug && bySlug.has(lineSlug) ? (
              <button type="button" className="cs-chat-name" onClick={() => pick(lineSlug, "chat")}>{line.name}</button>
            ) : (
              <span className="cs-chat-name">{line.name}</span>
            )}
            <span className="cs-chat-body">{line.body}</span>
          </div>
          <span className="cs-chat-tag">Group chat</span>
        </div>
      ) : null}


    </div>
  );
}

