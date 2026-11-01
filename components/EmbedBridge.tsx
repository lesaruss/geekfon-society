"use client";
// Embedded mode (Sean, 2026-11-01): seanarussell.com/media shows a GeekFon artist's own page inside a frame ("I basically want
// that page on here, because you can listen to their music and then you can join and support them. And if you decide to join
// and support them from this page, it should take you to the Geek Fun Society page"). One page, two places; nothing is copied.
//
// Turned on by ?embed=1, and only when the page really is inside a frame:
//   - the GeekFon header, menu and mini radio are hidden (the host site has its own)
//   - every link opens on geekfon.ai in the whole window (join, log in, Passport, news...), never inside the frame
//   - Support on an artist opens that artist's Support tour on geekfon.ai (ArtistPage openSupport, isEmbedded)
//   - the page tells the host its height ({type:"gfs-embed-height", height}) so the frame grows instead of scrolling
//   - the host tells the page how tall the visitor's screen is ({type:"gfs-host-viewport", height}). Inside a frame, 100vh is the
//     frame, and the frame grows to fit the page, so screen-height layouts (the storefront portrait) grew without end (Sean,
//     2026-11-01: "it continues to grow and grow"). Embedded, those rules use the host's screen height (--hvh) instead.
import { useEffect } from "react";

export const EMBED_PREPAINT = `try{if(window.self!==window.top&&/[?&]embed=1(&|$)/.test(location.search))document.documentElement.classList.add('gfs-embed')}catch(e){}`;
const HVH = "var(--hvh,7.6px)"; // one hundredth of the host's screen height (760px until the host says)
export const EMBED_CSS = `html.gfs-embed .gtop,html.gfs-embed .gdrawer,html.gfs-embed .gscrim,html.gfs-embed .gfr-mini{display:none!important}html.gfs-embed .gbody{padding-top:0!important}` +
  `@media(min-width:901px){html.gfs-embed .sf{height:calc(${HVH} * 100)!important;min-height:0!important;grid-template-columns:minmax(0,min(46%,calc((${HVH} * 100 - 48px) * .743))) minmax(0,1fr)!important}` +
  `html.gfs-embed .sf-portrait{position:relative!important;top:0!important;height:100%!important}` +
  `html.gfs-embed .sf-name{font-size:clamp(40px,min(5.6vw,calc(${HVH} * 10)),96px)!important}` +
  `html.gfs-embed .tour-panel .tour-visual{min-height:clamp(180px,calc(${HVH} * 38),420px)!important}}` +
  `@media(max-width:900px){html.gfs-embed .sf-portrait{max-height:calc(${HVH} * 70)!important}}` +
  `html.gfs-embed .ch-shell{height:min(720px,calc(${HVH} * 100 - 120px))!important}` +
  // The frame ends just under the page (Sean, 2026-11-01: "the bottom border should stay flush with just a little bit of gap").
  `html.gfs-embed .sf{padding-bottom:24px!important}html.gfs-embed .gbody{padding-bottom:0!important}`;

export function isEmbedded(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("gfs-embed");
}

/** Open a geekfon.ai address in the whole window (out of the host's frame). */
export function openTop(href: string) {
  try { window.open(new URL(href, window.location.origin).href, "_top"); } catch { window.location.href = href; }
}

export default function EmbedBridge() {
  useEffect(() => {
    if (!isEmbedded()) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const h = a.getAttribute("href") || "";
      if (!h || h.startsWith("#") || h.startsWith("javascript:") || a.target === "_blank" || a.hasAttribute("download")) return;
      e.preventDefault();
      e.stopPropagation();
      openTop(a.href);
    };
    document.addEventListener("click", onClick, true);
    const onHost = (e: MessageEvent) => {
      const d = e.data as { type?: string; height?: number } | null;
      if (!d || d.type !== "gfs-host-viewport" || e.source !== window.parent) return;
      const h = Math.round(Number(d.height));
      if (h >= 320 && h <= 4000) document.documentElement.style.setProperty("--hvh", h / 100 + "px");
    };
    window.addEventListener("message", onHost);
    window.parent.postMessage({ type: "gfs-embed-ready" }, "*");
    let last = 0;
    // The page's own height: the bottom of its content, not the document's scroll height, which never drops below the frame's
    // current height (so after a resize the frame kept its biggest size and left an empty band under the page).
    const contentHeight = () => {
      const body = document.querySelector(".gbody") as HTMLElement | null;
      if (body) return body.getBoundingClientRect().bottom + window.scrollY;
      let b = 0;
      for (const el of Array.from(document.body.children) as HTMLElement[]) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.display === "none") continue;
        b = Math.max(b, el.getBoundingClientRect().bottom + window.scrollY);
      }
      return b || document.documentElement.scrollHeight;
    };
    const post = () => {
      const height = Math.ceil(contentHeight());
      if (Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: "gfs-embed-height", height }, "*");
    };
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    ro.observe(document.body);
    const gb = document.querySelector(".gbody"); if (gb) ro.observe(gb);
    post();
    const t = window.setInterval(post, 1000);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("message", onHost); ro.disconnect(); window.clearInterval(t); };
  }, []);
  return null;
}
