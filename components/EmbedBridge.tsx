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
import { useEffect } from "react";

export const EMBED_PREPAINT = `try{if(window.self!==window.top&&/[?&]embed=1(&|$)/.test(location.search))document.documentElement.classList.add('gfs-embed')}catch(e){}`;
export const EMBED_CSS = `html.gfs-embed .gtop,html.gfs-embed .gdrawer,html.gfs-embed .gscrim,html.gfs-embed .gfr-mini{display:none!important}html.gfs-embed .gbody{padding-top:0!important}`;

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
    let last = 0;
    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      if (Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: "gfs-embed-height", height }, "*");
    };
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    ro.observe(document.body);
    post();
    const t = window.setInterval(post, 1000);
    return () => { document.removeEventListener("click", onClick, true); ro.disconnect(); window.clearInterval(t); };
  }, []);
  return null;
}
