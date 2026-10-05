"use client";
import { useEffect, useRef } from "react";

// One ad slot's creative (Sean, 2026-10-04). The LESARUSS ad console serves either an image,
// shown as a link, or an HTML5 ad (a .html file), loaded in a sandboxed frame with the tracked
// link passed as ?clickTag=. An HTML5 ad runs its own story and opens the link itself; it posts
// { veAd: 'click' } here so the click is counted like an image click. Same contract as
// vegansexplore.com/public/ve-ad-creative.js.
export function isRichAd(url?: string) {
  return /\.html?(\?|#|$)/i.test(url || "");
}

export default function AdCreative({ src, link, tall, imgClassName, onClick }: {
  src: string;
  link?: string;
  tall?: boolean;
  imgClassName: string;
  onClick: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const rich = isRichAd(src);

  useEffect(() => {
    if (!rich) return;
    function onMessage(e: MessageEvent) {
      if (e.data?.veAd === "click" && e.source === frameRef.current?.contentWindow) onClick();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [rich, onClick]);

  if (rich) {
    const frameSrc = src + (src.includes("?") ? "&" : "?") + "clickTag=" + encodeURIComponent(link || "");
    return (
      <iframe
        ref={frameRef}
        src={frameSrc}
        title="Advertisement"
        loading="lazy"
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className={imgClassName}
        style={{ width: "100%", aspectRatio: tall ? "1 / 2" : "6 / 5", border: 0, overflow: "hidden" }}
      />
    );
  }
  return (
    <a href={link || "#"} target="_blank" rel="noopener noreferrer sponsored" className="bb-ad-link" onClick={onClick}>
      <img src={src} alt="Advertisement" className={imgClassName} />
    </a>
  );
}
