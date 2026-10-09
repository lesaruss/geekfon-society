"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import SiteChrome from "@/components/SiteChrome";

// GeekFon Society case studies (playbook case-study-publishing, Sean
// 2026-10-08): every case study is one case_studies row, written once and
// kept on lesaruss.com. This page reads the rows for this brand live through
// the shared lesaruss.com/embed/case-studies.js; each card opens the full
// story on lesaruss.com and nothing is copied here.
export default function CaseStudiesPage() {
  const section = useRef<HTMLElement>(null);
  const [hasCards, setHasCards] = useState(false);

  // The embed un-hides the section once at least one card exists.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const obs = new MutationObserver(() => setHasCards(!el.hidden));
    obs.observe(el, { attributes: true, attributeFilter: ["hidden"] });
    return () => obs.disconnect();
  }, []);

  return (
    <SiteChrome>
      <main style={{ minHeight: "100dvh", background: "#070712", color: "#fff", fontFamily: "'Montserrat', sans-serif", padding: "48px clamp(16px, 4vw, 28px) 80px" }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.24em", textTransform: "uppercase", color: "#F69820" }}>GeekFon Society</p>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1, margin: "10px 0 16px" }}>Case Studies</h1>
        <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,0.75)", maxWidth: "62ch", marginBottom: 32 }}>
          Stories from GeekFon Society, written once and kept on lesaruss.com. Each card opens the full story.
        </p>
        <section ref={section} data-lr-cs-section="" hidden aria-label="GeekFon Society case studies">
          <div data-lr-case-studies="" data-brand="geekfon-society" data-theme="dark" data-accent="#F69820" />
        </section>
        {!hasCards && (
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
            The first GeekFon Society story is on the way. Until then,{" "}
            <a href="https://lesaruss.com/case-studies" style={{ color: "#F69820", fontWeight: 800 }}>read the case studies on lesaruss.com</a>.
          </p>
        )}
      </main>
      <Script src="https://lesaruss.com/embed/case-studies.js" strategy="afterInteractive" />
    </SiteChrome>
  );
}
