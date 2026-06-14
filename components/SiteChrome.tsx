"use client";
import { useState, useEffect } from "react";

const NAV = [
  { label: "Roster", href: "/roster" },
  { label: "GeekFon Radio", href: "/radio" },
  { label: "Library", href: "/library" },
  { label: "Passport", href: "/passport" },
];

type Crumb = { label: string; href?: string };

// Logo: circle icon + GEEKFON wordmark
// "GEEK" = black (topbar) or white (drawer)
// "FON" = all one color, slowly hue-cycling via CSS animation
function GeekFonLogo() {
  return (
    <span className="gfs-logo" aria-label="GeekFon Society">
      <img src="/geekfon-logo.png" alt="" className="gfs-icon" aria-hidden="true" />
      <span className="gfs-geek">GEEK</span>
      <span className="gfs-fon">FON</span>
    </span>
  );
}

export default function SiteChrome({ children, crumb }: { children: React.ReactNode; crumb?: Crumb[] }) {
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
        <a href="/" className="glogo" aria-label="GeekFon Society home">
          <GeekFonLogo />
        </a>
        {crumb && crumb.length > 0 && (
          <nav className="gcrumb" aria-label="Breadcrumb">
            {crumb.map((x, i, a) => (
              <span key={i}>
                {x.href ? <a href={x.href}>{x.label}</a> : <span className="gcrumb-cur">{x.label}</span>}
                {i < a.length - 1 && <span className="gcrumb-sep">/</span>}
              </span>
            ))}
          </nav>
        )}
        <a href="/passport" className="gcta">Get Passport</a>
      </header>

      <div className={"gscrim" + (open ? " open" : "")} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={"gdrawer" + (open ? " open" : "")} aria-hidden={!open} aria-label="Site navigation">
        <div className="gdrawer-head">
          <GeekFonLogo />
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
/* ── Topbar ── */
.gtop{
  position:sticky;top:0;z-index:40;height:60px;
  display:flex;align-items:center;gap:8px;
  padding:0 18px;background:#fff;border-bottom:1px solid var(--lr-border)
}
.gham{
  width:40px;height:40px;border:none;background:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  border-radius:8px;color:var(--lr-text);flex-shrink:0
}
.gham:hover{background:var(--lr-bg)}
.gham svg{width:23px;height:23px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}

/* ── GEEKFON logo ── */
@keyframes fonHue {
  0%   { color: #E91E8C; }
  25%  { color: #00B4FF; }
  50%  { color: #AAFF00; }
  75%  { color: #F69820; }
  100% { color: #E91E8C; }
}
.gfs-logo{
  font-family:'Montserrat',-apple-system,sans-serif;
  font-size:20px;
  font-weight:900;
  letter-spacing:-.01em;
  line-height:1;
  text-transform:uppercase;
  display:inline-flex;
  align-items:center;
  gap:6px;
  user-select:none;
  text-decoration:none;
}
.gfs-icon{
  height:28px;
  width:28px;
  object-fit:contain;
  display:block;
  flex-shrink:0;
}
.gfs-geek{ color:#1a1a1a; }
.gfs-fon{
  animation: fonHue 6s ease-in-out infinite;
}

/* Drawer version — GEEK goes white */
.gdrawer .gfs-geek{ color:#fff; }

.glogo{
  display:flex;align-items:center;
  flex-shrink:0;
  text-decoration:none;
  /* tight gap to hamburger is handled by gap:8px on .gtop */
}

/* Breadcrumb — only shown when explicitly passed */
.gcrumb{display:flex;align-items:center;gap:9px;min-width:0;overflow:hidden;font-family:'Montserrat',sans-serif}
.gcrumb a,.gcrumb .gcrumb-cur{font-size:14px;font-weight:800;letter-spacing:.01em;color:var(--lr-text);white-space:nowrap}
.gcrumb a:hover{color:var(--rx-text,#9c1458)}
.gcrumb .gcrumb-cur{color:var(--rx-text,#9c1458)}
.gcrumb-sep{color:var(--lr-text-30);font-weight:600}

/* CTA */
.gcta{
  margin-left:auto;flex-shrink:0;
  font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
  color:var(--rx-text,#9c1458);
  border:1px solid var(--rx,#E91E8C);
  border-radius:20px;padding:8px 17px;background:#fff;
  text-decoration:none;
}
.gcta:hover{background:var(--rx-tint,rgba(233,30,140,.1))}

/* Scrim */
.gscrim{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .25s;z-index:50}
.gscrim.open{opacity:1;pointer-events:auto}

/* Drawer */
.gdrawer{position:fixed;top:0;left:0;bottom:0;width:280px;background:#111;color:#fff;z-index:60;transform:translateX(-100%);transition:transform .26s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;overflow-y:auto}
.gdrawer.open{transform:translateX(0)}
.gdrawer-head{display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 14px 0 18px;border-bottom:1px solid rgba(255,255,255,.08)}
.gx{width:34px;height:34px;border:none;background:none;cursor:pointer;color:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;border-radius:7px}
.gx:hover{background:rgba(255,255,255,.08);color:#fff}
.gx svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.gnav{padding:10px 8px;display:flex;flex-direction:column;gap:2px}
.gitem{display:block;padding:12px 14px;border-radius:8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.7);text-decoration:none}
.gitem:hover{background:rgba(255,255,255,.07);color:#fff}
`;
