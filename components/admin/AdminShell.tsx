"use client";
// The admin back end's frame in the November 2026 look (Sean, 2026-11-27:
// "not every page on GeekFon has been updated to the new look... especially on
// the back end... the dashboard is unusable for me right now").
//
// Replaces the October window-in-a-window (GfsShell: a fixed-height box the
// page could not scroll past) for the owner account only. Same system as the
// public site's radio2 shell: Bricolage Grotesque and Figtree, neutral greys,
// a left rail. The page scrolls normally; on a phone the rail becomes a top
// bar with a scrolling row of links. HQ links (Brand Desk, Revenue) open HQ.

import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteFonts from "@/components/radio2/SiteFonts";
import { supabase } from "@/lib/supabase";

const WORDMARK = "/brands/geekfon-society/geekfon-wordmark-reverse.svg";
export const BRANDDESK_URL = "https://hq.lesaruss.ai/new/branddesk/geekfon-society";
export const REVENUE_URL = "https://hq.lesaruss.ai/revenue/brands/geekfon-society";

type Item = { label: string; href: string; external?: boolean };
const GROUPS: { title: string | null; items: Item[] }[] = [
  { title: null, items: [{ label: "Home", href: "/dashboard" }] },
  { title: "Music", items: [
    { label: "Song Manager", href: "/dashboard/release-schedule" },
    { label: "Radio Schedule", href: "/dashboard/radio-schedule" },
    { label: "Artist Rankings", href: "/dashboard/top10" },
    { label: "Chat Writers' Room", href: "/dashboard/chat-room" },
  ] },
  { title: "People", items: [
    { label: "Members", href: "/dashboard/members" },
    { label: "Outreach List", href: "/dashboard/outreach" },
    { label: "Pro Applications", href: "/dashboard/pro-applications" },
  ] },
  { title: "Site", items: [{ label: "Health Reports", href: "/dashboard/reports" }] },
  { title: "In HQ", items: [
    { label: "Brand Desk", href: BRANDDESK_URL, external: true },
    { label: "Revenue", href: REVENUE_URL, external: true },
  ] },
];

const Ext = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

export default function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const isCurrent = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href));

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <SiteFonts>
      <style>{CSS}</style>
      <div className="gfa">
        <aside className="gfa-rail" aria-label="Admin">
          <Link href="/dashboard" className="gfa-brand">
            <img src={WORDMARK} alt="GeekFon Society" />
            <small>Admin</small>
          </Link>
          <nav className="gfa-nav">
            {GROUPS.map(g => (
              <div key={g.title ?? "top"} className="gfa-group">
                {g.title ? <h3>{g.title}</h3> : null}
                {g.items.map(it => it.external ? (
                  <a key={it.href} href={it.href} target="_blank" rel="noreferrer">{it.label} <Ext /></a>
                ) : (
                  <Link key={it.href} href={it.href} aria-current={isCurrent(it.href) ? "page" : undefined}>{it.label}</Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="gfa-foot">
            <a href="/" target="_blank" rel="noreferrer">View the site <Ext /></a>
            <button type="button" onClick={signOut}>Sign out</button>
            <span className="gfa-who">{name}</span>
          </div>
        </aside>
        <main className="gfa-main" id="main">{children}</main>
      </div>
    </SiteFonts>
  );
}

const CSS = `
html,body{background:#09090a}
.gfa{
  color-scheme:dark;
  --bg:#09090a; --rail:#000; --surface:#131315; --surface-2:#1b1b1e; --surface-3:#26262a;
  --line:#2a2a2f; --text:#f5f5f6; --muted:#a3a3ab; --faint:#6e6e77; --accent:#ECE22D; --accent-ink:#0B0B0C; --good:#3ddc84; --bad:#ff6b6b;
  --display:var(--gfr-display),'Bricolage Grotesque','Arial Black',system-ui,sans-serif;
  --body:var(--gfr-body),'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif;
  display:grid;grid-template-columns:240px minmax(0,1fr);gap:8px;padding:8px;min-height:100vh;
  background:var(--bg);color:var(--text);font-family:var(--body);font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased;
}
.gfa *{box-sizing:border-box}
.gfa a{color:inherit;text-decoration:none}
.gfa :focus-visible{outline:3px solid #fff;outline-offset:2px;border-radius:6px}
.gfa-rail{position:sticky;top:8px;align-self:start;height:calc(100vh - 16px);background:var(--rail);border-radius:10px;padding:18px 12px 14px;display:flex;flex-direction:column;min-height:0}
.gfa-brand{display:flex;flex-direction:column;gap:4px;padding:2px 8px 14px}
.gfa-brand img{width:100%;max-width:170px;height:auto}
.gfa-brand small{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.gfa-nav{display:flex;flex-direction:column;overflow-y:auto;min-height:0}
.gfa-group h3{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:18px 10px 6px;font-weight:700}
.gfa-nav a{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:6px;font-weight:600;color:var(--muted);font-size:14.5px}
.gfa-nav a:hover{color:var(--text);background:var(--surface-2)}
.gfa-nav a[aria-current="page"]{color:var(--text);background:var(--surface-2);box-shadow:inset 3px 0 0 var(--accent)}
.gfa-foot{margin-top:auto;padding:12px 10px 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--faint)}
.gfa-foot a,.gfa-foot button{display:flex;align-items:center;gap:6px;color:var(--muted);background:none;border:0;padding:0;font:inherit;cursor:pointer;text-align:left}
.gfa-foot a:hover,.gfa-foot button:hover{color:var(--text)}
.gfa-who{font-size:12px;color:var(--faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gfa-main{background:var(--surface);border-radius:10px;padding:28px 32px 64px;min-width:0}
@media(max-width:860px){
  .gfa{grid-template-columns:minmax(0,1fr);padding:0;gap:0}
  .gfa-rail{position:sticky;top:0;z-index:20;height:auto;border-radius:0;padding:10px 16px;flex-direction:row;align-items:center;gap:12px;min-width:0}
  .gfa-brand{padding:0;flex:none}
  .gfa-brand img{max-width:110px}
  .gfa-brand small{display:none}
  .gfa-nav{flex-direction:row;overflow-x:auto;overflow-y:hidden;gap:2px;scrollbar-width:none;min-width:0;flex:1}
  .gfa-nav::-webkit-scrollbar{display:none}
  .gfa-group{display:flex;gap:2px}
  .gfa-group h3{display:none}
  .gfa-nav a{white-space:nowrap;padding:8px 10px;font-size:14px}
  .gfa-foot{display:none}
  .gfa-main{border-radius:0;padding:20px 16px 56px}
}
`;
