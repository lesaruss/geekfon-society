"use client";
import { useState } from "react";

type Track = { n: string; m: string; v: string };
type Stat = { v: string; l: string };
type Pill = { label: string; accent?: boolean };
type Rel = { name: string; desc: string };
export type ArtistContent = {
  name?: string; accent?: string; accentText?: string; accentTint?: string;
  heroUrl?: string; initial?: string; tagline?: string;
  crumb?: { label: string; href?: string }[]; pills?: Pill[];
  message?: { ja?: string; en?: string };
  quote?: string; bio?: string[]; stats?: Stat[]; tracks?: Track[];
  relationships?: Rel[]; identity?: Record<string, string>;
  brief?: Record<string, string>;
};

const TABS = ["about", "music", "pulse", "media", "brief"] as const;

export default function ArtistPage({ content }: { content: ArtistContent }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("about");
  const c = content || {};
  const name = c.name || "Artist";
  const vars = {
    ["--rx" as string]: c.accent || "#E91E8C",
    ["--rx-text" as string]: c.accentText || "#9c1458",
    ["--rx-tint" as string]: c.accentTint || "rgba(233,30,140,0.10)",
  } as React.CSSProperties;
  const emph = (t: string) =>
    t.replace(/\{\{(.+?)\}\}/g, '<em style="color:var(--rx-text);font-style:normal;font-weight:800">$1</em>');

  return (
    <div style={vars}>
      <style>{CSS}</style>
      <div className="apg">
        <div className="bible-head">
          <div className="crumb">
            {(c.crumb || []).map((x, i, a) => (
              <span key={i}>
                {x.href ? <a href={x.href}>{x.label}</a> : <span>{x.label}</span>}
                {i < a.length - 1 && <span className="crumb-sep"> / </span>}
              </span>
            ))}
          </div>
          <div className="head-grid">
            {c.heroUrl ? (
              <img className="head-art" src={c.heroUrl} alt={name + " hero art"} />
            ) : (
              <div className="head-art-fallback">{c.initial || name.charAt(0)}</div>
            )}
            <div className="head-meta">
              <div className="head-name">{name}</div>
              <p className="head-tagline">{c.tagline}</p>
            </div>
            <div className="pill-row">
              {(c.pills || []).map((p, i) => (
                <span key={i} className={"pill" + (p.accent ? " accent" : "")}>{p.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="tabbar" role="tablist">
          {TABS.map((t) => (
            <button key={t} className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === "brief" ? "Brief" : t[0].toUpperCase() + t.slice(1)}
              {t === "brief" && <span className="adminbadge">Admin</span>}
            </button>
          ))}
        </div>

        {tab === "about" && (
          <section className="panel">
            {c.quote && <blockquote className="about-quote">{"“" + c.quote + "”"}</blockquote>}
            <div className="card about-bio">
              {(c.bio || []).map((p, i) => (
                <p key={i} style={i ? { marginTop: 14 } : undefined} dangerouslySetInnerHTML={{ __html: emph(p) }} />
              ))}
            </div>
            <div className="about-stats">
              {(c.stats || []).map((s, i) => (
                <div key={i} className="astat"><div className="astat-v">{s.v}</div><div className="astat-l">{s.l}</div></div>
              ))}
            </div>
          </section>
        )}

        {tab === "music" && (
          <section className="panel">
            <div className="panel-intro"><span>Full catalog. What plays adapts to the viewer&apos;s permissions.</span></div>
            {(c.tracks || []).map((t, i) => (
              <div key={i} className="track">
                <span className={"vis " + t.v}>{t.v}</span>
                <div className="ti"><div className="tn">{t.n}</div><div className="tm">{t.m}</div></div>
              </div>
            ))}
          </section>
        )}

        {tab === "pulse" && (
          <section className="panel"><p className="empty-note">Pulse feed renders here (parity with the data model in progress).</p></section>
        )}
        {tab === "media" && (
          <section className="panel"><p className="empty-note">Media gallery renders here (wire to storage on rollout).</p></section>
        )}

        {tab === "brief" && (
          <section className="panel">
            <div className="adminbar"><span className="t">Admin only.</span> <span className="s">Internal World Bible.</span></div>
            {c.identity && (
              <div className="card"><div className="kv">
                {Object.entries(c.identity).map(([k, v]) => (
                  <div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
                ))}
              </div></div>
            )}
            {c.brief && (
              <div className="card">
                {c.brief.highConcept && (<><p className="mini-h">High Concept</p><p>{c.brief.highConcept}</p></>)}
                {c.brief.finalDefinition && (<><p className="mini-h">Final Definition</p><p>{c.brief.finalDefinition}</p></>)}
              </div>
            )}
            {!!(c.relationships || []).length && (
              <div className="card">
                {(c.relationships || []).map((r, i) => (
                  <div key={i} className="rel-row"><div className="rel-name">{r.name}</div><div className="rel-desc">{r.desc}</div></div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const CSS = `
.apg{max-width:1100px;margin:0 auto;padding:0 0 80px}
.bible-head{background:#111;color:#fff;padding:28px 36px 22px;border-bottom:4px solid var(--rx)}
.crumb{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.5);margin-bottom:16px}
.crumb a:hover{color:#fff}.crumb-sep{color:rgba(255,255,255,.25)}
.head-grid{display:grid;grid-template-columns:auto 1fr;grid-template-areas:"art meta" "art pills";column-gap:24px;align-items:center}
.head-art,.head-art-fallback{grid-area:art;width:192px;height:192px;border-radius:18px;border:2px solid var(--rx);object-fit:cover;background:var(--rx);display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;color:#fff}
.head-meta{grid-area:meta}.head-name{font-size:clamp(28px,5vw,44px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase;line-height:1}
.head-tagline{font-size:14px;color:rgba(255,255,255,.82);margin-top:8px;max-width:600px}
.pill-row{grid-area:pills;display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}
.pill{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;padding:4px 11px;border-radius:20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16)}
.pill.accent{background:var(--rx);border-color:var(--rx)}
.tabbar{position:sticky;top:0;z-index:6;background:#fff;border-bottom:1px solid var(--lr-border);display:flex;gap:2px;padding:0 36px}
.tab{position:relative;font-family:inherit;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);background:none;border:none;padding:16px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}
.tab[aria-selected="true"]{color:var(--rx-text)}
.tab[aria-selected="true"]::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--rx)}
.adminbadge{font-size:8px;font-weight:900;background:var(--rx-tint);color:var(--rx-text);padding:2px 5px;border-radius:3px}
.panel{padding:28px 36px 0}
.about-quote{font-size:clamp(17px,2.5vw,22px);font-weight:900;color:var(--rx-text);line-height:1.25;margin:0 0 28px;border-left:3px solid var(--rx);padding-left:16px;font-style:italic}
.card{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:22px 24px;margin-bottom:14px}
.card p{font-size:14px;color:var(--lr-text-75);line-height:1.7}
.about-bio p+p{margin-top:10px}
.about-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:4px}
.astat{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:10px;padding:16px 14px}
.astat-v{font-size:13px;font-weight:800}.astat-l{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--lr-text-50);margin-top:4px}
@media(max-width:640px){.about-stats{grid-template-columns:repeat(2,1fr)}}
.panel-intro{font-size:13px;color:var(--lr-text-50);margin-bottom:18px}
.track{display:flex;align-items:center;gap:14px;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:10px;padding:12px 16px;margin-bottom:9px}
.track .ti{flex:1}.track .tn{font-size:14px;font-weight:800}.track .tm{font-size:11px;color:var(--lr-text-50);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.vis{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:20px}
.vis.public{background:rgba(76,175,80,.14);color:#2e7d32}.vis.members{background:rgba(246,152,32,.16);color:var(--lr-orange-text)}.vis.admin{background:var(--rx-tint);color:var(--rx-text)}
.adminbar{display:flex;gap:10px;background:#111;color:#fff;border-radius:10px;padding:12px 16px;margin-bottom:22px;font-size:12px}
.adminbar .t{font-weight:800;text-transform:uppercase;letter-spacing:.08em}.adminbar .s{color:rgba(255,255,255,.7)}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px 22px}
.kv .k{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--rx-text);margin-bottom:2px}.kv .v{font-size:14px;font-weight:600}
.mini-h{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin:16px 0 6px}.mini-h:first-child{margin-top:0}
.rel-row{display:flex;gap:12px;padding:11px 0;border-top:1px solid var(--lr-border)}.rel-row:first-child{border-top:none}
.rel-name{font-size:12px;font-weight:900;text-transform:uppercase;color:var(--rx-text);min-width:120px}.rel-desc{font-size:13px;color:var(--lr-text-75)}
.empty-note{font-size:13px;color:var(--lr-text-50);font-style:italic}
`;
