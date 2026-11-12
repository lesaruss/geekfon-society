"use client";
// Unlock <artist>: $11, one time, through the live checkout
// (components/roster/checkout.ts: the artist's album when they have one on
// sale, otherwise that artist's $11 season pass; both write the same
// gfs_artist_unlocks row the entitlement check reads). Lifetime ($111, every
// artist) has no checkout yet, so it is one honest line, "opening soon".
// Radio stays free and live for everyone.

import { useEffect, useRef, useState } from "react";
import { useArtist } from "./radioData";
import { startSupportCheckout } from "@/components/roster/checkout";
import { IcX } from "./icons";
import { IcFull, IcPic, IcTalk, IcSpark, IcLock } from "./artistIcons";

type Album = { id: string; title: string } | null;

export default function UnlockSheet({ slug, album, onClose }: { slug: string; album?: Album; onClose: () => void }) {
  const A = useArtist(slug);
  const [sell, setSell] = useState<Album | undefined>(album);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const back = useRef<Element | null>(null);

  // What the $11 buys, when the page that opened the sheet did not say.
  useEffect(() => {
    if (album !== undefined) return;
    let on = true;
    fetch(`/api/radio/artist-page?slug=${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (on) setSell(d?.album ?? null); })
      .catch(() => { if (on) setSell(null); });
    return () => { on = false; };
  }, [slug, album]);

  useEffect(() => {
    back.current = document.activeElement;
    box.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    return () => { (back.current as HTMLElement | null)?.focus?.(); };
  }, []);

  // Keep Tab inside the sheet.
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const f = Array.from(box.current.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]"));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  async function buy() {
    if (sell === undefined) return;
    setBusy(true);
    setError(null);
    setError(await startSupportCheckout(sell ? sell.id : null, slug));
    setBusy(false);
  }

  const name = A?.name || "";
  const accent = A?.accent || "#ECE22D";
  const ink = A?.ink || "#0B0B0C";
  const art = A?.cutout || A?.portrait || A?.avatar || null;
  const cut = !!A?.cutout;
  const perks: [React.ReactNode, string][] = [
    [<IcFull key="f" />, "Every song in full, on demand. Play any song, any time, and move around in it."],
    [<IcPic key="p" />, "The Gallery: the photos and wallpapers made for supporters."],
    [<IcTalk key="t" />, "Join the Chat: comment and reply."],
    [<IcSpark key="s" />, "New songs as they are released."],
  ];

  return (
    <div className="sheet" onKeyDown={trap}>
      <div className="sh-back" onClick={onClose} aria-hidden="true" />
      <div className="sh-box" ref={box} role="dialog" aria-modal="true" aria-labelledby="ukTitle">
        <div className="sh-in uk" style={{ "--ac": accent, "--ac-ink": ink } as React.CSSProperties}>
          <div className={"uk-art " + (cut ? "cut" : "sq")}>{art ? <img src={art} alt="" /> : null}</div>
          <div className="uk-body">
            <button type="button" className="sh-x" data-close onClick={onClose} aria-label="Close"><IcX /></button>
            <p className="eyebrow">One artist, yours to keep</p>
            <h2 className="uk-h" id="ukTitle">{name ? `Unlock ${name}` : "Unlock"}</h2>
            <p className="uk-price"><b>$11</b>, one time.{sell ? ` Includes ${sell.title}.` : ""}</p>
            <ul className="perks">
              {perks.map(([ic, t]) => <li key={t}><span className="pk">{ic}</span><span>{t}</span></li>)}
            </ul>
            <div className="uk-cta">
              <button type="button" className="pill uk-go" onClick={buy} disabled={busy || sell === undefined || !A}>
                {busy ? "Starting checkout" : <><IcLock />Unlock for $11</>}
              </button>
              {error ? <p className="uk-err" role="alert">{error}</p> : null}
              <p className="uk-life">Every artist with Lifetime, $111: opening soon.</p>
            </div>
            <p className="uk-fine">Radio stays free and live for everyone. Lyrics are free for every song.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
