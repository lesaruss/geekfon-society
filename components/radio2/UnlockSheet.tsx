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
import { useT } from "@/components/i18n/I18n";

const PRICE = "$11";
const LIFETIME_PRICE = "$111";

type Album = { id: string; title: string; inProgress?: boolean } | null;

export default function UnlockSheet({ slug, album, onClose }: { slug: string; album?: Album; onClose: () => void }) {
  const t = useT();
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
    [<IcFull key="f" />, sell ? t("unlock.perkSongsAlbum", { title: sell.title }) : t("unlock.perkSongs")],
    [<IcPic key="p" />, t("unlock.perkGallery")],
    [<IcTalk key="t" />, t("unlock.perkChat")],
    [<IcSpark key="s" />, sell?.inProgress ? t("unlock.perkInProgress", { title: sell.title }) : t("unlock.perkNewSongs")],
  ];
  // The price sits in bold inside the sentence: split the translated line around it.
  const [pricePre, pricePost = ""] = t("unlock.priceOneTime", { price: "{price}" }).split("{price}");

  return (
    <div className="sheet" onKeyDown={trap}>
      <div className="sh-back" onClick={onClose} aria-hidden="true" />
      <div className="sh-box" ref={box} role="dialog" aria-modal="true" aria-labelledby="ukTitle">
        <div className="sh-in uk" style={{ "--ac": accent, "--ac-ink": ink } as React.CSSProperties}>
          <div className={"uk-art " + (cut ? "cut" : "sq")}>{art ? <img src={art} alt="" /> : null}</div>
          <div className="uk-body">
            <button type="button" className="sh-x" data-close onClick={onClose} aria-label={t("unlock.close")}><IcX /></button>
            <p className="eyebrow">{t("unlock.eyebrow")}</p>
            <h2 className="uk-h" id="ukTitle">{name ? t("unlock.title", { name }) : t("unlock.titleNoName")}</h2>
            <p className="uk-price">{pricePre}<b>{PRICE}</b>{pricePost}{sell ? ` ${t("unlock.includes", { title: sell.title })}` : ""}</p>
            <ul className="perks">
              {perks.map(([ic, txt]) => <li key={txt}><span className="pk">{ic}</span><span>{txt}</span></li>)}
            </ul>
            <div className="uk-cta">
              <button type="button" className="pill uk-go" onClick={buy} disabled={busy || sell === undefined || !A}>
                {busy ? t("unlock.startingCheckout") : <><IcLock />{t("unlock.unlockFor", { price: PRICE })}</>}
              </button>
              {error ? <p className="uk-err" role="alert">{error}</p> : null}
              <p className="uk-life">{t("unlock.lifetime", { price: LIFETIME_PRICE })}</p>
            </div>
            <p className="uk-fine">{t("unlock.fine")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
