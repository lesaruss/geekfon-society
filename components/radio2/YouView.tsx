"use client";
// Your GeekFon (/you) in the Seat 2 shell (Sean, 2026-11-12: fans sign in and
// stay on the new site). Signed out: a short sign-in card. Signed in: name and
// email, the artists they can hear in full (each card opens the artist page,
// where full songs play on demand), Hearted songs (saved on this device), and
// Sign out. No points, no LESARs. On phones this is also where Hearts live.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShell } from "./RadioShell";
import { HeartRow } from "./HomeView";
import { IcHeart, IcUser, IcOut, IcArrow } from "./icons";
import { signInWithProvider } from "@/lib/socialAuth";
import { startLesaruss } from "@/lib/lesarussClient";
import { STAFF_HOME, onStaffHomeClick } from "@/lib/postAuth";
import type { RosterData, RosterArtist } from "@/lib/artistPage";

const TITLE = "Your GeekFon, GeekFon Society";

function titleCase(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function YouView({ roster: initial }: { roster: RosterData }) {
  const { R, me, signOut, setBaseTitle, showToast } = useShell();
  const [roster, setRoster] = useState<RosterData>(initial);
  const [busy, setBusy] = useState<"google" | "out" | null>(null);

  useEffect(() => { setBaseTitle(TITLE); }, [setBaseTitle]);
  // The server could not reach the catalog (no service key): ask the API.
  useEffect(() => {
    if (initial.complete) return;
    let on = true;
    fetch("/api/radio/roster").then(r => (r.ok ? r.json() : null)).then((d: RosterData | null) => { if (on && d?.artists?.length) setRoster(d); }).catch(() => {});
    return () => { on = false; };
  }, [initial.complete]);

  const mine: RosterArtist[] = useMemo(() => {
    if (me.state !== "in") return [];
    if (me.allArtists) return roster.artists;
    const bySlug = new Map(roster.artists.map(a => [a.slug, a]));
    return me.unlocked.map(slug => bySlug.get(slug) ?? {
      slug, name: titleCase(slug), genre: null, location: null, picture: null, accent: "#ECE22D", ink: "#0B0B0C", stations: [], songCount: 0,
    });
  }, [me, roster.artists]);

  const google = async () => {
    setBusy("google");
    try { await signInWithProvider("google"); } finally { setBusy(null); }
  };
  const out = async () => {
    setBusy("out");
    await signOut();
    setBusy(null);
    showToast("Signed out");
  };

  const n = R.hearts.length;
  const hearted = (
    <section className="ysec" aria-labelledby="yHearts">
      <div className="ysec-h">
        <h2 id="yHearts">Hearted songs</h2>
        <span className="ycount">{n} {n === 1 ? "song" : "songs"}, saved on this device</span>
      </div>
      {n ? (
        <div className="slist">{R.hearts.map(h => <HeartRow key={h.songId} h={h} />)}</div>
      ) : (
        <div className="empty"><IcHeart size={26} /><span>Tap the heart on any song while it plays. It saves here, on this device, with a 30-second preview.</span></div>
      )}
    </section>
  );

  return (
    <div className="you">
      <div className="vhead">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">GeekFon Society</Link><span aria-hidden="true">›</span><span aria-current="page">You</span></nav>
        <h1>Your GeekFon</h1>
      </div>

      {me.state === "loading" ? (
        <p className="yload" role="status">Loading your GeekFon.</p>
      ) : me.state === "out" ? (
        <section className="ycard" aria-labelledby="ySign">
          <span className="yic" aria-hidden="true"><IcUser size={28} /></span>
          <div className="ybody">
            <h2 id="ySign">Sign in</h2>
            <p>See the artists you have unlocked and play their full songs. Radio and lyrics stay free, no sign in needed.</p>
            <div className="yact">
              <button type="button" className="pill" onClick={google} disabled={busy !== null}>
                <GoogleMark />{busy === "google" ? "Connecting" : "Continue with Google"}
              </button>
              <button type="button" className="pill ghost" onClick={() => startLesaruss("/you")} disabled={busy !== null}>Continue with LESARUSS</button>
              <a className="pill ghost" href="/login">Sign in with email</a>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="ycard yme" aria-label="Your account">
            <span className="yface" aria-hidden="true">
              {me.avatar ? <img src={me.avatar} alt="" referrerPolicy="no-referrer" /> : me.firstName.charAt(0).toUpperCase()}
            </span>
            <div className="ybody">
              <h2>{me.name}</h2>
              {me.email ? <p className="ymail">{me.email}</p> : null}
              {me.plan ? <span className="ytag">{me.plan === "Staff" ? "Staff" : `${me.plan}: every artist in full`}</span> : null}
            </div>
            <div className="yact">
              {me.staff ? <a className="pill" href={STAFF_HOME} onClick={onStaffHomeClick}>Open BrandDesk<IcOut size={14} /></a> : null}
              <button type="button" className="pill ghost" onClick={out} disabled={busy !== null}>{busy === "out" ? "Signing out" : "Sign out"}</button>
            </div>
          </section>

          <section className="ysec" aria-labelledby="yArtists">
            <div className="ysec-h">
              <h2 id="yArtists">Your artists</h2>
              <span className="ycount">{me.allArtists ? "Every artist, every song in full" : mine.length ? "Full songs on demand on each artist's page" : ""}</span>
            </div>
            {mine.length ? (
              <div className="agrid">
                {mine.map(a => (
                  <article key={a.slug} className="acard" style={{ "--ac": a.accent, "--ac-ink": a.ink } as React.CSSProperties}>
                    <div className="apw">
                      <Link className="apic" href={`/${a.slug}`} aria-label={a.name}>
                        {a.picture ? <img src={a.picture} alt="" loading="lazy" /> : <span className="ini" aria-hidden="true">{a.name.charAt(0)}</span>}
                      </Link>
                    </div>
                    <div className="ameta">
                      <Link href={`/${a.slug}`} className="an">{a.name}</Link>
                      <span className="ag">{[a.genre, a.location].filter(Boolean).join(" · ") || "GeekFon Society"}</span>
                      <Link href={`/${a.slug}`} className="ygo">Play full songs<IcArrow size={14} /></Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <span>No artists unlocked yet. Open any artist and press Unlock: $11, one time, and every song plays in full.</span>
                <Link className="pill ghost" href="/roster">See the artists</Link>
              </div>
            )}
          </section>
        </>
      )}

      {hearted}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
