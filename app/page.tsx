"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";
import { resolvePlayhead, RadioTrack as ScheduleTrack, ScheduleOverride } from "@/lib/radioSchedule";

// Display names for radio_tracks.artist_slug (this table uses full-name slugs,
// which don't always match gfs_artists.slug - e.g. "riku-hayasaka" vs "riku").
// Duplicated from app/radio/page.tsx (same small lookup, same pattern already
// used there) rather than shared, to keep this a minimal, low-risk addition.
const ARTIST_NAMES: Record<string, string> = {
  "lex-from-brixton": "Lex from Brixton",
  "likkle-bro": "Likkle Bro",
  "likkle-sis": "Likkle Sis",
  "mad-tings": "Mad Tings",
  "mr-russell": "Mr. Russell",
  "nilo-wave": "Nilo Wave",
  "riku-hayasaka": "Riku Hayasaka",
  "roxanne": "Roxanne",
  "rustblood-prophets": "Rustblood Prophets",
  "shamanic-resin": "Shamanic Resin",
  "straight-and-narrow": "Straight and Narrow",
};

function artistName(slug: string): string {
  return ARTIST_NAMES[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
// 2026-07-26 per Sean: "I just want people to hear the music at this point" -
// the hero circle now doubles as a play button for GeekFon Radio (see
// app/radio/page.tsx and lib/radioSchedule.ts for the full page/scheduler
// this borrows from). No login required here, unlike the full /radio page
// pre-2026-07-26 (that gate is also being removed in the same pass).
const RADIO_AUDIO_BASE = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";
const RADIO_RESYNC_INTERVAL_MS = 5000;
const RADIO_RESYNC_DRIFT_TOLERANCE_SEC = 2;

const CITIES = [
  {
    name: "London, UK",
    accent: "#F69820",
    desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png",
    mobile:  CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png",
  },
  {
    name: "Fort Lauderdale, FL",
    accent: "#00BCD4",
    desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png",
    mobile:  CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png",
  },
  {
    name: "Seoul, South Korea",
    accent: "#9C27B0",
    desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png",
    mobile:  CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png",
  },
  {
    name: "Tokyo, Japan",
    accent: "#E91E8C",
    desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png",
    mobile:  CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png",
  },
  {
    name: "Berlin, Germany",
    accent: "#2196F3",
    desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png",
    mobile:  CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png",
  },
  {
    name: "Johannesburg, SA",
    accent: "#F44336",
    desktop: CDN + "hf_20260619_061618_b63a68e5-ec0d-4f6a-8473-0e9652db85bf.png",
    mobile:  CDN + "hf_20260619_064547_2906c350-a205-4c96-9bb1-114dc53fc237.png",
  },
  {
    name: "Orlando, FL",
    accent: "#FF9800",
    desktop: "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/city-backgrounds/orlando-desktop-cropped.png",
    mobile:  CDN + "hf_20260619_125452_ad933e6f-0b03-43a4-b111-341e76b9efd9.jpeg",
  },
];

const FON_COLORS = [
  "#e84d1a","#ff6eb4","#e94f8a","#00cfe8",
  "#2ec4b6","#ff9f1c","#7fb069","#8e44ad","#c8922a",
];

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [fonIdx, setFonIdx] = useState(0);
  const currentRef = useRef(0);
  // Perf fix 2026-08-11 (Sean reported geekfon.ai loading slowly + background
  // not showing correctly): all 7 city panels used to render a real <img> src
  // on mount, so the browser fetched all 7 full-res backgrounds (~1.5MB each,
  // ~10MB total) up front even though only one panel is ever visible. The
  // Orlando panel is also the one background hosted on Supabase storage with
  // cache-control: no-cache (every other city is on the CloudFront CDN with
  // immutable caching) - on a slow connection that request could still be in
  // flight when the carousel rotated to it, showing a blank/broken panel.
  // Fix: only mount a real <img> src for the current panel and the one that's
  // up next; each city now gets its own ~5.2s dwell window to finish loading
  // before it's ever displayed, instead of all 7 competing for bandwidth at
  // once. `loading="lazy"` was tried first but doesn't help here - every
  // panel occupies the same full-viewport layout box (position varies only
  // via CSS transform), so the browser's viewport-based lazy-load heuristic
  // treats all 7 as already visible.
  const [loadedCities, setLoadedCities] = useState<Set<number>>(
    () => new Set([0, 1 % CITIES.length])
  );
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GeekFon Radio - inline play button on the hero circle, no account needed.
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  // 2026-07-26 per Sean: show what's playing (title + artist) inside the
  // circle, below the button, once the radio is on.
  const [radioNowPlaying, setRadioNowPlaying] = useState<{ title: string; artist: string } | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const radioRotationRef = useRef<ScheduleTrack[]>([]);
  const radioOverridesRef = useRef<ScheduleOverride[]>([]);
  const radioLoadedRef = useRef(false);
  const radioCurrentPathRef = useRef<string | null>(null);
  const radioResyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FON color cycle
  useEffect(() => {
    const t = setInterval(() => setFonIdx((i) => (i + 1) % FON_COLORS.length), 1800);
    return () => clearInterval(t);
  }, []);

  const goTo = useCallback((next: number) => {
    const prev = currentRef.current;
    if (next === prev) return;

    const prevPanel = panelRefs.current[prev];
    const nextPanel = panelRefs.current[next];
    if (!prevPanel || !nextPanel) return;

    nextPanel.style.transition = "none";
    nextPanel.style.transform = "translateX(100%)";
    void nextPanel.offsetHeight;

    const ease = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    nextPanel.style.transition = `transform 0.95s ${ease}`;
    prevPanel.style.transition = `transform 0.95s ${ease}`;
    nextPanel.style.transform = "translateX(0)";
    prevPanel.style.transform = "translateX(-105%)";

    setTimeout(() => {
      if (prevPanel) {
        prevPanel.style.transition = "none";
        prevPanel.style.transform = "translateX(100%)";
      }
    }, 980);

    currentRef.current = next;
    setCurrent(next);
    // Make sure `next` itself is loaded (covers manual dot-clicks that jump
    // ahead of the sequential preload below), and kick off the fetch for the
    // city after `next` now, so it has this whole dwell period to finish
    // loading before it's ever the active panel.
    const upcoming = (next + 1) % CITIES.length;
    setLoadedCities((prev) => {
      if (prev.has(next) && prev.has(upcoming)) return prev;
      const copy = new Set(prev);
      copy.add(next);
      copy.add(upcoming);
      return copy;
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(
      () => goTo((currentRef.current + 1) % CITIES.length),
      5200
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goTo]);

  function handleDotClick(i: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    goTo(i);
    timerRef.current = setInterval(
      () => goTo((currentRef.current + 1) % CITIES.length),
      5200
    );
  }

  useEffect(() => {
    panelRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.transition = "none";
      p.style.transform = i === 0 ? "translateX(0)" : "translateX(100%)";
    });
  }, []);

  const city = CITIES[current];

  // GeekFon Radio - fetches the same rotation/overrides the full /radio page
  // uses (public-readable tables + public storage bucket, confirmed 2026-07-26
  // - no auth needed at the data layer, only the old page-level gate blocked
  // it). Lazy-loaded on first click so anonymous homepage visitors who never
  // touch the button don't pay for the extra Supabase calls.
  async function loadRadioSchedule() {
    const nowIso = new Date().toISOString();
    const { data: trackRows } = await supabase
      .from("radio_tracks")
      .select("artist_slug, title, src_path, duration_seconds, release_date")
      .eq("is_public", true)
      .neq("src_path", "PENDING")
      .lte("release_date", nowIso)
      .order("radio_order", { ascending: true, nullsFirst: false })
      .order("artist_slug", { ascending: true })
      .order("sort_order", { ascending: true });

    radioRotationRef.current = (trackRows || []).map((r: any) => ({
      artist: r.artist_slug as string,
      title: r.title as string,
      path: r.src_path as string,
      durationSeconds: (r.duration_seconds as number | null) || 180,
    }));

    const { data: overrideRows } = await supabase
      .from("radio_schedule_overrides")
      .select("kind, label, ad_src_path, starts_at, duration_seconds, cadence_seconds, track_id, radio_tracks(artist_slug, title, src_path)")
      .eq("is_active", true);

    radioOverridesRef.current = (overrideRows || []).flatMap((o: any): ScheduleOverride[] => {
      if (o.kind === "pinned" && o.starts_at && o.radio_tracks) {
        return [{
          kind: "pinned",
          path: o.radio_tracks.src_path,
          title: o.radio_tracks.title,
          artist: o.radio_tracks.artist_slug,
          startsAtMs: new Date(o.starts_at).getTime(),
          durationSeconds: o.duration_seconds || 180,
          label: o.label || undefined,
        }];
      }
      if (o.kind === "ad_cadence") {
        return [{
          kind: "ad_cadence",
          adSrcPath: o.ad_src_path || null,
          cadenceSeconds: o.cadence_seconds || 0,
          durationSeconds: o.duration_seconds || 0,
          label: o.label || undefined,
        }];
      }
      return [];
    });
    radioLoadedRef.current = true;
  }

  // Fixed 2026-07-26 per Sean ("the song doesn't go to another song, it just
  // stalls"): this function used to only swap `a.src`/`a.currentTime` when the
  // resync poll (every 5s) noticed the resolved path had changed - it never
  // called `.play()` again. A track ending fires the browser's native `ended`
  // event, which pauses the element; with no `onended` handler here (unlike
  // app/radio/page.tsx's `tuneToNow`, which already had one), the element just
  // sat paused-and-loaded until the next poll tick, and even then nothing
  // resumed playback.
  //
  // AMENDED same day per Sean's real-device report ("it stopped playing, and
  // now it doesn't play at all"): the first version of this fix set
  // `a.currentTime` immediately after `a.src` with no safety net - some
  // browsers throw or silently ignore a seek issued before the element is
  // seekable (readyState < HAVE_METADATA), especially right after a fresh
  // `src` assignment. That threw synchronously inside the `onended` handler,
  // which happens BEFORE the `.play()` resume call below it in source order -
  // so the exception skipped the resume entirely on a track change, which is
  // exactly when it matters most. Two fixes: (1) wrapped the seek in try/catch
  // plus an `onloadedmetadata` safety net that re-applies the seek once the
  // browser is actually ready, matching the pattern app/radio/page.tsx's
  // `tuneToNow` already uses; (2) `.play()` now updates `radioPlaying` on
  // both success and failure (previously only success updated state, from the
  // one call in handleRadioToggle) - so if a resume genuinely can't recover,
  // the button honestly reverts to "Play" instead of silently going quiet
  // while still showing "playing", and the stale resync interval gets
  // cleared instead of piling up on repeated failed attempts.
  function syncRadioAudio(a: HTMLAudioElement) {
    const resolved = resolvePlayhead(Date.now(), radioRotationRef.current, radioOverridesRef.current);
    if (!resolved) return;
    setRadioNowPlaying({ title: resolved.title, artist: artistName(resolved.artist) });
    try {
      if (radioCurrentPathRef.current !== resolved.path) {
        radioCurrentPathRef.current = resolved.path;
        a.src = RADIO_AUDIO_BASE + resolved.path;
        a.onloadedmetadata = () => { try { a.currentTime = resolved.offsetSeconds; } catch {} };
        a.currentTime = resolved.offsetSeconds;
      } else if (Math.abs(a.currentTime - resolved.offsetSeconds) > RADIO_RESYNC_DRIFT_TOLERANCE_SEC) {
        a.currentTime = resolved.offsetSeconds;
      }
    } catch {
      // Not fatal - onloadedmetadata (track change) or the next resync tick
      // (drift correction) retries the seek. Must not block the resume below.
    }
    // syncRadioAudio is only ever called while the user has pressed play (the
    // initial call in handleRadioToggle, the resync interval it starts, or the
    // onended handler below) - never during an intentional pause, since pause
    // clears the resync interval. So it's always correct to attempt a resume here.
    if (a.paused) {
      a.play().then(() => setRadioPlaying(true)).catch(() => {
        setRadioPlaying(false);
        if (radioResyncTimerRef.current) { clearInterval(radioResyncTimerRef.current); radioResyncTimerRef.current = null; }
      });
    }
  }

  async function handleRadioToggle() {
    if (radioPlaying) {
      radioAudioRef.current?.pause();
      setRadioPlaying(false);
      if (radioResyncTimerRef.current) { clearInterval(radioResyncTimerRef.current); radioResyncTimerRef.current = null; }
      return;
    }
    if (!radioAudioRef.current) {
      radioAudioRef.current = new Audio();
      radioAudioRef.current.onended = () => {
        if (radioAudioRef.current) syncRadioAudio(radioAudioRef.current);
      };
      // A decode/network error on one track shouldn't wedge the player forever -
      // clearing the tracked path makes the next sync tick treat it as a fresh
      // track and retry the src assignment instead of doing nothing indefinitely.
      radioAudioRef.current.onerror = () => { radioCurrentPathRef.current = null; };
    }
    const a = radioAudioRef.current;
    setRadioLoading(true);
    try {
      if (!radioLoadedRef.current) await loadRadioSchedule();
      // syncRadioAudio now owns calling .play() and setting radioPlaying on both
      // success and failure (see the AMENDED note above) - calling it here once
      // is enough, a second explicit .play() call right after would just race it.
      syncRadioAudio(a);
      if (radioResyncTimerRef.current) clearInterval(radioResyncTimerRef.current);
      radioResyncTimerRef.current = setInterval(() => {
        if (radioAudioRef.current) syncRadioAudio(radioAudioRef.current);
      }, RADIO_RESYNC_INTERVAL_MS);
    } catch {
      setRadioPlaying(false);
    } finally {
      setRadioLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      radioAudioRef.current?.pause();
      if (radioResyncTimerRef.current) clearInterval(radioResyncTimerRef.current);
    };
  }, []);

  return (
    <SiteChrome>
      <>
        <style>{CSS}</style>

      {/* Aurora */}
      <div className="aurora" aria-hidden="true">
        <div className="stars" />
        <div className="a a1" />
        <div className="a a2" />
        <div className="a a3" />
        <div className="a a4" />
        <div className="a a5" />
        <div className="aurora-ground" />
      </div>

      {/* City stage */}
      <div className="city-stage" aria-hidden="true">
        {CITIES.map((c, i) => (
          <div
            key={c.name}
            className="city-panel"
            ref={(el) => { panelRefs.current[i] = el; }}
          >
            {loadedCities.has(i) && (
              <picture>
                <source media="(max-width: 768px)" srcSet={c.mobile} />
                <img src={c.desktop} alt="" aria-hidden="true" />
              </picture>
            )}
          </div>
        ))}
      </div>

      {/* City label */}
      <div className="city-label" aria-live="polite">
        <span className="city-dot" style={{ backgroundColor: city.accent }} />
        <span className="city-name-text">{city.name}</span>
      </div>

      {/* Progress dots */}
      <div className="progress-dots" role="tablist">
        {CITIES.map((c, i) => (
          <button
            key={c.name}
            className={"pdot" + (i === current ? " on" : "")}
            role="tab"
            aria-selected={i === current}
            aria-label={c.name}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>

      {/* Main overlay */}
      <div className="page">
        <div className="eyebrow">
          <span className="live-dot" aria-hidden="true" />
          LESARUSS Universe
        </div>

        <div className="hero-circle-wrap">
          <div className="hero-circle">
            <img
              className="hero-logo-img"
              src="https://geekfon.ai/geekfon-logo.png"
              alt=""
              aria-hidden="true"
            />
            <div className="hero-overlay" aria-hidden="true" />
          </div>
          <div className="hero-text" aria-hidden="true">
            <div className="hero-title">
              Geek
              <span
                className="hero-fon"
                style={{ color: FON_COLORS[fonIdx], transition: "color 0.7s ease" }}
              >
                Fon
              </span>
            </div>
            <div className="hero-tagline-inner">Society</div>
          </div>
          <h1 className="sr-only">GeekFon Society</h1>

          {/* 2026-07-26 per Sean: replaced the orange "GeekFon Radio" pill with
              just a translucent play/pause triangle centered over the circle -
              visible as an affordance without covering the artwork, with a
              soft pulse to invite the click. Same handleRadioToggle wiring. */}
          <button
            className={"hero-radio-btn" + (radioPlaying ? " playing" : "")}
            onClick={handleRadioToggle}
            disabled={radioLoading}
            aria-label={radioPlaying ? "Pause GeekFon Radio" : "Play GeekFon Radio - no account needed"}
          >
            {radioLoading ? (
              <span className="hero-radio-spinner" aria-hidden="true" />
            ) : radioPlaying ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4" /></svg>
            )}
          </button>

          {/* 2026-07-26 per Sean: song title + artist, inside the circle, below
              the button, once the radio is actually playing. */}
          {radioPlaying && radioNowPlaying && (
            <div className="hero-radio-now" aria-live="polite">
              <div className="hero-radio-now-title">{radioNowPlaying.title}</div>
              <div className="hero-radio-now-artist">{radioNowPlaying.artist}</div>
            </div>
          )}
        </div>

        <div className="cta-row">
          {/* 2026-07-26 per Sean: dropped "Take the Tour" (/welcome) entirely -
              it competed with the real path and diluted where people should
              land first. "Meet the Artists" is now the sole CTA and takes the
              orange primary treatment (.btn-p) that Take the Tour used to have,
              so there's exactly one obvious next step: go see the artists. */}
          <a href="/roster" className="btn-p">Meet the Artists</a>
        </div>
      </div>
    </>
    </SiteChrome>
  );
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;font-family:'Montserrat',sans-serif;background:#020c0a;color:#e8e8e8;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

/* Aurora */
.aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 9% 6%,rgba(255,255,255,.55) 0%,transparent 100%),radial-gradient(1px 1px at 24% 12%,rgba(255,255,255,.35) 0%,transparent 100%),radial-gradient(1px 1px at 44% 4%,rgba(255,255,255,.48) 0%,transparent 100%),radial-gradient(1px 1px at 60% 10%,rgba(255,255,255,.30) 0%,transparent 100%),radial-gradient(1px 1px at 76% 7%,rgba(255,255,255,.52) 0%,transparent 100%),radial-gradient(1px 1px at 90% 3%,rgba(255,255,255,.42) 0%,transparent 100%),radial-gradient(1px 1px at 15% 20%,rgba(255,255,255,.28) 0%,transparent 100%),radial-gradient(1px 1px at 38% 17%,rgba(255,255,255,.22) 0%,transparent 100%),radial-gradient(1px 1px at 56% 22%,rgba(255,255,255,.32) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 18% 4%,rgba(255,255,255,.65) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 66% 2%,rgba(255,255,255,.55) 0%,transparent 100%),radial-gradient(1px 1px at 83% 15%,rgba(200,220,255,.38) 0%,transparent 100%);}
.a{position:absolute;border-radius:50%;filter:blur(90px);}
.a1{width:85vw;height:48vh;top:-20vh;left:4vw;background:radial-gradient(ellipse at center,rgba(0,215,95,.24) 0%,transparent 70%);animation:d1 18s ease-in-out infinite alternate;}
.a2{width:62vw;height:40vh;top:-14vh;right:-6vw;background:radial-gradient(ellipse at center,rgba(0,155,255,.18) 0%,transparent 70%);animation:d2 24s ease-in-out infinite alternate;}
.a3{width:52vw;height:34vh;top:0;left:24vw;background:radial-gradient(ellipse at center,rgba(120,0,255,.13) 0%,transparent 70%);animation:d3 20s ease-in-out infinite alternate;}
.a4{width:40vw;height:24vh;top:-8vh;left:46vw;background:radial-gradient(ellipse at center,rgba(0,255,185,.15) 0%,transparent 70%);animation:d4 28s ease-in-out infinite alternate;}
.a5{width:28vw;height:20vh;top:4vh;left:62vw;background:radial-gradient(ellipse at center,rgba(190,70,255,.09) 0%,transparent 70%);animation:d5 22s ease-in-out infinite alternate;}
.aurora-ground{position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(2,12,10,.97) 0%,transparent 100%);}
@keyframes d1{from{transform:translate(0,0) scaleX(1)}to{transform:translate(4vw,5vh) scaleX(1.1)}}
@keyframes d2{from{transform:translate(0,0) scaleY(1)}to{transform:translate(-5vw,3vh) scaleY(1.18)}}
@keyframes d3{from{transform:translate(0,0) rotate(0)}to{transform:translate(3vw,-4vh) rotate(7deg)}}
@keyframes d4{from{transform:translate(0,0)}to{transform:translate(-4vw,6vh)}}
@keyframes d5{from{transform:translate(0,0) scale(1)}to{transform:translate(5vw,-5vh) scale(1.3)}}

/* City stage */
.city-stage{position:fixed;bottom:0;left:0;right:0;height:56vh;overflow:hidden;z-index:2;}
.city-stage::before{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(to bottom,rgba(2,12,10,1) 0%,transparent 100%);z-index:10;pointer-events:none;}
.city-panel{position:absolute;top:0;left:0;width:100%;height:100%;will-change:transform;}
.city-panel picture{display:block;width:100%;height:100%;}
.city-panel img{width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block;}

/* Page overlay */
.page{position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;pointer-events:none;}

/* ADA fix: eyebrow bumped to rgba(255,255,255,.65) - approx 9:1 on dark bg */
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);}
.live-dot{width:6px;height:6px;background:#4caf50;border-radius:50%;animation:pdot 1.6s ease-in-out infinite;}
@keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.65)}}

/* Hero circle */
.hero-circle-wrap{position:relative;width:min(400px,min(44vw,72vh));height:min(400px,min(44vw,72vh));}
.hero-circle-wrap::before{content:'';position:absolute;inset:-10px;border-radius:50%;box-shadow:0 0 55px rgba(246,152,32,.25),0 0 110px rgba(0,155,255,.1);pointer-events:none;}
.hero-circle{width:100%;height:100%;border-radius:50%;overflow:hidden;position:relative;}
.hero-logo-img{width:100%;height:100%;object-fit:contain;object-position:center;display:block;}
.hero-overlay{position:absolute;inset:0;background:rgba(2,12,10,.45);border-radius:50%;}
.hero-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:15%;}
.hero-title{font-size:clamp(34px,9vw,56px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;line-height:1;text-align:center;white-space:nowrap;text-shadow:0 0 30px rgba(0,0,0,1),0 0 70px rgba(0,0,0,.9),0 2px 14px rgba(0,0,0,1);}

/* GeekFon Radio play button - 2026-07-26 v2 per Sean: just a translucent
   triangle centered over the circle/logo, not a solid pill. Glassy circular
   backdrop so it reads as a button without hiding the artwork behind it, plus
   a soft pulsing ring while idle to invite the click. */
.hero-radio-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);cursor:pointer;transition:background .18s,border-color .18s,transform .15s;pointer-events:all;}
.hero-radio-btn:hover:not(:disabled){background:rgba(255,255,255,.24);border-color:rgba(255,255,255,.65);transform:translate(-50%,-50%) scale(1.06);}
.hero-radio-btn:focus-visible{outline:3px solid #F69820;outline-offset:3px;}
.hero-radio-btn:disabled{cursor:default;}
.hero-radio-btn svg{width:24px;height:24px;fill:rgba(255,255,255,.94);filter:drop-shadow(0 2px 6px rgba(0,0,0,.55));}
.hero-radio-btn.playing{background:rgba(2,12,10,.32);}
.hero-radio-btn:not(.playing):not(:disabled){animation:heroRadioPulse 2.6s ease-in-out infinite;}
@keyframes heroRadioPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.28);}50%{box-shadow:0 0 0 12px rgba(255,255,255,0);}}
.hero-radio-spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:heroRadioSpin .7s linear infinite;}
@keyframes heroRadioSpin{to{transform:rotate(360deg);}}
@media(prefers-reduced-motion:reduce){.hero-radio-spinner{animation:none;}.hero-radio-btn{animation:none!important;}}

/* Now-playing text - 2026-07-26 per Sean: title + artist, inside the circle,
   below the play button, only while actually playing. */
.hero-radio-now{position:absolute;top:calc(50% + 46px);left:50%;transform:translateX(-50%);z-index:6;width:76%;text-align:center;pointer-events:none;}
.hero-radio-now-title{font-size:11px;font-weight:800;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.95);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hero-radio-now-artist{font-size:9px;font-weight:600;color:rgba(255,255,255,.68);text-transform:uppercase;letter-spacing:.1em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* Society text: fixed size, overflow ellipsis so long words (Gesellschaft) don't break layout */
.hero-tagline-inner{
  font-size:clamp(8px,1.2vw,11px);
  font-weight:200;
  letter-spacing:.28em;
  text-transform:uppercase;
  color:rgba(255,255,255,.6);
  text-align:center;
  text-shadow:0 1px 8px rgba(0,0,0,1);
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

/* CTAs - ADA fix: use dark text on orange for AA compliance */
.cta-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;pointer-events:all;}
.btn-p{background:#F69820;color:#1a1a1a;border:none;border-radius:100px;padding:13px 30px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:background .15s,transform .1s;}
.btn-p:hover{background:#e08818;transform:translateY(-1px);}
.btn-p:focus-visible{outline:3px solid #F69820;outline-offset:3px;}
.btn-s{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:100px;padding:13px 30px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:border-color .15s,color .15s;}
.btn-s:hover{border-color:rgba(255,255,255,.3);color:#fff;}
.btn-s:focus-visible{outline:3px solid #F69820;outline-offset:3px;}

/* City label - ADA fix: bumped to rgba(255,255,255,.55) */
.city-label{position:fixed;bottom:4.5vh;right:5vw;z-index:20;display:flex;align-items:center;gap:8px;}
.city-dot{width:5px;height:5px;border-radius:50%;transition:background-color 1s ease;}
.city-name-text{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);}

/* Progress dots */
.progress-dots{position:fixed;bottom:5.2vh;left:50%;transform:translateX(-50%);z-index:20;display:flex;gap:2px;align-items:center;}
.pdot{width:24px;height:24px;min-width:24px;background:none;border:none;cursor:pointer;padding:0;position:relative;display:inline-flex;align-items:center;justify-content:center;transition:all .4s ease;}
.pdot::after{content:"";width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.18);transition:all .4s ease;}
.pdot.on::after{width:18px;border-radius:2px;background:rgba(255,255,255,.5);}
.pdot:focus-visible{outline:2px solid #F69820;outline-offset:2px;}

/* Mobile */
@media(max-width:768px){
  .city-stage{height:100vh;}
  .city-stage::before{height:30%;}
  .city-panel img{object-position:center center;}
  .hero-circle-wrap{width:min(280px,70vw);height:min(280px,70vw);}
  .hero-radio-btn{width:58px;height:58px;}
  .hero-radio-btn svg{width:20px;height:20px;}
  .hero-radio-now{top:calc(50% + 38px);width:82%;}
  .hero-radio-now-title{font-size:10px;}
}
`;
