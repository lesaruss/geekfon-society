"use client";
import { useState, useEffect } from "react";

const NAV = [
  { label: "Roster", href: "/roster" },
  { label: "GeekFon Radio", href: "/radio" },
  { label: "Library", href: "/library" },
  { label: "Passport", href: "/passport" },
];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <style>{CHROME_CSS}</style>
      <header className="gtop">
        <button className="gham" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <a href="/" className="glogo"><img src="/geekfon-logo.png" alt="GeekFon Society" /></a>
        <a href="/passport" className="gcta">Get Passport</a>
      </header>

      <div className={"gscrim" + (open ? " open" : "")} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={"gdrawer" + (open ? " open" : "")} aria-hidden={!open} aria-label="Site navigation">
        <div className="gdrawer-head">
          <span className="gdrawer-title">GeekFon Society</span>
          <button className="gx" aria-label="Close menu" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <nav className="gnav">
          {NAV.map((n) => (<a key={n.href} href={n.href} className="gitem" onClick={() => setOpen(false)}>{n.label}</a>))}
        </nav>
      </aside>

      <div className="gbody">{children}</div>
    </>
  );
}

const CHROME_CSS = `
.gtop{position:sticky;top:0;z-index:40;height:56px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#fff;border-bottom:1px solid var(--lr-border)}
.gham{width:40px;height:40px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;color:var(--lr-text)}
.gham:hover{background:var(--lr-bg)}
.gham svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}
.glogo{display:flex;align-items:center}
.glogo img{height:26px;width:auto;display:block}
.gcta{margin-left:auto;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--rx-text);border:1px solid var(--rx);border-radius:20px;padding:7px 16px;background:#fff}
.gcta:hover{background:var(--rx-tint)}
.gscrim{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .25s;z-index:50}
.gscrim.open{opacity:1;pointer-events:auto}
.gdrawer{position:fixed;top:0;left:0;bottom:0;width:280px;background:#111;color:#fff;z-index:60;transform:translateX(-100%);transition:transform .26s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;overflow-y:auto}
.gdrawer.open{transform:translateX(0)}
.gdrawer-head{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 14px 0 18px;border-bottom:1px solid rgba(255,255,255,.08)}
.gdrawer-title{font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.gx{width:34px;height:34px;border:none;background:none;cursor:pointer;color:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;border-radius:7px}
.gx:hover{background:rgba(255,255,255,.08);color:#fff}
.gx svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.gnav{padding:10px 8px;display:flex;flex-direction:column;gap:2px}
.gitem{display:block;padding:11px 14px;border-radius:8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.7)}
.gitem:hover{background:rgba(255,255,255,.07);color:#fff}
`;
