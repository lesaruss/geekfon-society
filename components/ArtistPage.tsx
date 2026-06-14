"use client";
import { useState, useRef } from "react";
import SiteChrome from "@/components/SiteChrome";

const AUDIO = "https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-radio-audio/";

type Track = { n: string; m: string; v: string; url?: string };
type Stat = { v: string; l: string };
type Pill = { label: string; accent?: boolean };
type Rel = { name: string; desc: string };
type News = { tag?: string; date?: string; title?: string; blurb?: string; href?: string };
type Audit = { title: string; status?: string; pillar?: string; theme?: string; emotion?: string; scores?: Record<string, number> };
export type ArtistContent = {
  name?: string; accent?: string; accentText?: string; accentTint?: string;
  heroUrl?: string; initial?: string; tagline?: string;
  crumb?: { label: string; href?: string }[]; pills?: Pill[];
  message?: { ja?: string; en?: string; audio?: string };
  quote?: string; bio?: string[]; stats?: Stat[]; tracks?: Track[]; news?: News[];
  relationships?: Rel[]; identity?: Record<string, string>;
  brief?: Record<string, string>; universe?: Record<string, string>;
  sonic?: { primaryGenre?: string; secondaryGenre?: string; vocalAge?: string; tone?: string; delivery?: string; songPrompt?: string; songPromptNote?: string };
  visual?: { visualIdentity?: string; houseStyle?: string; imagePrompt?: string; imagePromptNote?: string };
  songAudits?: Audit[];
};

const TABS: { key: string; label: string; admin?: boolean }[] = [
  { key: "news", label: "News" },
  { key: "music", label: "Music" },
  { key: "pulse", label: "Pulse" },
  { key: "media", label: "Media" },
  { key: "brief", label: "Brief", admin: true },
];

const PLAY = <svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20 7 4" /></svg>;
const PAUSE = <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>;
const LOCK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;

export default function ArtistPage({ content }: { content: ArtistContent }) {
  const [tab, setTab] = useState("news");
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const c = content || {};
  const name = c.name || "Artist";
  const vars = {
    ["--rx" as string]: c.accent || "#E91E8C",
    ["--rx-text" as string]: c.accentText || "#9c1458",
    ["--rx-tint" as string]: c.accentTint || "rgba(233,30,140,0.10)",
  } as React.CSSProperties;
  const emph = (t: string) => t.replace(/\{\{(.+?)\}\}/g, '<em style="color:var(--rx-text);font-style:normal;font-weight:800">$1</em>');
  function copy(e: React.MouseEvent<HTMLButtonElement>, text: string) {
    const b = e.currentTarget; const prev = b.textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    b.textContent = "Copied"; setTimeout(() => { b.textContent = prev; }, 1400);
  }
  function togglePlay(url: string) {
    const a = audioRef.current; if (!a) return;
    if (playing === url) { a.pause(); setPlaying(null); return; }
    a.src = url; a.play().then(() => setPlaying(url)).catch(() => setPlaying(null));
  }
  const msg = c.message || {};
  const hasMsg = !!(msg.ja || msg.en);

  // Build breadcrumb: always GeekFon > Roster > Artist Name
  const crumb = [
    { label: "GeekFon", href: "/" },
    { label: "Roster", href: "/roster" },
    { label: name },
  ];

  return (
    // No crumb passed to SiteChrome — breadcrumb lives in the black header now
    <SiteChrome>
      <div style={vars}>
        <style>{CSS}</style>
        <audio ref={audioRef} onEnded={() => setPlaying(null)} />
        <div className="apg">

          {/* ── Black header ── */}
          <div className="bible-head">
            {/* Logo + breadcrumb bar */}
            <div className="head-topbar">
              <nav className="head-crumb" aria-label="Breadcrumb">
                {crumb.map((x, i, a) => (
                  <span key={i} className="head-crumb-item">
                    {x.href
                      ? <a href={x.href}>{x.label}</a>
                      : <span className="cur">{x.label}</span>
                    }
                    {i < a.length - 1 && <span className="sep">/</span>}
                  </span>
                ))}
              </nav>
            </div>

            {/* Artist hero + meta */}
            <div className="head-grid">
              {c.heroUrl ? (
                <img className="head-art" src={c.heroUrl} alt={name + " portrait"} />
              ) : (
                <div className="head-art-fallback">{c.initial || name.charAt(0)}</div>
              )}
              <div className="head-meta">
                <div className="head-name">{name}</div>
                <p className="head-tagline">{c.tagline}</p>
                <div className="pill-row">
                  {(c.pills || []).map((p, i) => (<span key={i} className={"pill" + (p.accent ? " accent" : "")}>{p.label}</span>))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="tabbar" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} className="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}{t.admin && <span className="adminbadge">Admin</span>}
              </button>
            ))}
          </div>

          {/* ── Two-column body: content + billboard ── */}
          <div className="body-layout">
            <div className="body-main">

              {tab === "news" && (
                <section className="panel">
                  {hasMsg && (
                    <div className="rxp">
                      {c.heroUrl && <img className="rxp-img" src={c.heroUrl} alt="" />}
                      <div className="rxp-body">
                        <p className="rxp-label">A Message from {name}</p>
                        <div className="rxp-wave">{Array.from({ length: 22 }).map((_, i) => (<span key={i} style={{ height: 6 + Math.round(Math.abs(Math.sin(i * 1.1)) * 22) }} />))}</div>
                        <p className="rxp-cap">{lang === "ja" ? msg.ja : msg.en}</p>
                        {msg.en && msg.ja && (
                          <button className="rxp-lang" onClick={() => setLang(lang === "ja" ? "en" : "ja")}>
                            {lang === "ja" ? "🇺🇸 Listen in English" : "🇯🇵 日本語で聴く"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {c.quote && <blockquote className="about-quote">{"“" + c.quote + "”"}</blockquote>}
                  <div className="card about-bio">
                    {(c.bio || []).map((p, i) => (<p key={i} style={i ? { marginTop: 14 } : undefined} dangerouslySetInnerHTML={{ __html: emph(p) }} />))}
                  </div>
                  <div className="about-stats">
                    {(c.stats || []).map((s, i) => (<div key={i} className="astat"><div className="astat-v">{s.v}</div><div className="astat-l">{s.l}</div></div>))}
                  </div>
                  {!!(c.news || []).length && (
                    <>
                      <p className="bsec">Latest</p>
                      <div className="news-grid">
                        {(c.news || []).map((n, i) => (
                          <div key={i} className="newscard">
                            <div className="news-top">{n.tag && <span className="news-tag">{n.tag}</span>}{n.date && <span className="news-date">{n.date}</span>}</div>
                            {n.title && <div className="news-title">{n.title}</div>}
                            {n.blurb && <p className="news-blurb">{n.blurb}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}

              {tab === "music" && (
                <section className="panel">
                  <div className="panel-intro"><span>Full catalog. What plays adapts to the viewer&apos;s permissions.</span></div>
                  {(c.tracks || []).map((t, i) => {
                    const url = t.url ? AUDIO + t.url : null;
                    const locked = t.v !== "public" || !url;
                    const isPlaying = !!url && playing === url;
                    return (
                      <div key={i} className="track">
                        <button className={"tplay" + (locked ? " locked" : "") + (isPlaying ? " on" : "")} disabled={locked} aria-label={locked ? "Locked" : isPlaying ? "Pause" : "Play"} onClick={() => url && togglePlay(url)}>
                          {locked ? LOCK : isPlaying ? PAUSE : PLAY}
                        </button>
                        <div className="ti"><div className="tn">{t.n}</div><div className="tm">{t.m}</div></div>
                        <span className={"vis " + t.v}>{t.v}</span>
                      </div>
                    );
                  })}
                </section>
              )}

              {tab === "pulse" && (<section className="panel"><p className="empty-note">Pulse feed renders here (parity with the data model in progress).</p></section>)}
              {tab === "media" && (<section className="panel"><p className="empty-note">Media gallery renders here (wire to storage on rollout).</p></section>)}

              {tab === "brief" && (
                <section className="panel">
                  <div className="adminbar"><span className="t">Admin only.</span> <span className="s">The Brief tab is the internal World Bible.</span></div>
                  <p className="bsec">Identity &amp; Backstory</p>
                  {c.identity && (<div className="card"><div className="kv">{Object.entries(c.identity).map(([k, v]) => (<div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>))}</div></div>)}
                  {c.brief && (
                    <div className="card">
                      {c.brief.highConcept && (<><p className="mini-h" style={{ marginTop: 0 }}>High Concept</p><p>{c.brief.highConcept}</p></>)}
                      {(c.brief.strength || c.brief.weakness) && (<><p className="mini-h">Strength &amp; Weakness</p><p><strong>Greatest strength:</strong> {c.brief.strength} <strong>Greatest weakness:</strong> {c.brief.weakness}</p></>)}
                      {c.brief.wound && (<><p className="mini-h">Defining Wound</p><p>{c.brief.wound}</p></>)}
                      {c.brief.lostSong && (<><p className="mini-h">The Lost Song Era</p><p>{c.brief.lostSong}</p></>)}
                      {c.brief.rikuConversation && (<><p className="mini-h">The Conversation</p><p>{c.brief.rikuConversation}</p></>)}
                      {c.brief.emotionalJourney && (<><p className="mini-h">Emotional Journey</p><p>{c.brief.emotionalJourney}</p></>)}
                    </div>
                  )}
                  {c.universe && (<><p className="bsec">Universe Placement</p><div className="card"><div className="kv">{Object.entries(c.universe).map(([k, v]) => (<div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>))}</div></div></>)}
                  {!!(c.relationships || []).length && (<div className="card">{(c.relationships || []).map((r, i) => (<div key={i} className="rel-row"><div className="rel-name">{r.name}</div><div className="rel-desc">{r.desc}</div></div>))}</div>)}
                  {c.sonic && (
                    <>
                      <p className="bsec">Sonic DNA &amp; Song Prompt</p>
                      <div className="card">
                        <div className="kv">
                          {c.sonic.primaryGenre && <div><div className="k">Primary Genre</div><div className="v">{c.sonic.primaryGenre}</div></div>}
                          {c.sonic.secondaryGenre && <div><div className="k">Secondary Genre</div><div className="v">{c.sonic.secondaryGenre}</div></div>}
                          {c.sonic.vocalAge && <div><div className="k">Vocal Age</div><div className="v">{c.sonic.vocalAge}</div></div>}
                          {c.sonic.tone && <div><div className="k">Tone / Energy / Texture</div><div className="v">{c.sonic.tone}</div></div>}
                        </div>
                        {c.sonic.delivery && <p style={{ marginTop: 14 }}>{c.sonic.delivery}</p>}
                      </div>
                      {c.sonic.songPrompt && (<div className="copy-block"><div className="copy-bar"><span className="lbl">Song Prompt (paste into Suno)</span><button className="copy-btn" onClick={(e) => copy(e, c.sonic!.songPrompt!)}>Copy</button></div><pre className="copy-body">{c.sonic.songPrompt}</pre></div>)}
                      {c.sonic.songPromptNote && <p className="hint">{c.sonic.songPromptNote}</p>}
                    </>
                  )}
                  {c.visual && (
                    <>
                      <p className="bsec">Visual DNA &amp; Image Prompt</p>
                      <div className="card">
                        {c.visual.visualIdentity && <p><strong>Visual identity.</strong> {c.visual.visualIdentity}</p>}
                        {c.visual.houseStyle && <p style={{ marginTop: 10 }}><strong>House style.</strong> {c.visual.houseStyle}</p>}
                      </div>
                      {c.visual.imagePrompt && (<div className="copy-block"><div className="copy-bar"><span className="lbl">Image Prompt (zero text)</span><button className="copy-btn" onClick={(e) => copy(e, c.visual!.imagePrompt!)}>Copy</button></div><pre className="copy-body">{c.visual.imagePrompt}</pre></div>)}
                      {c.visual.imagePromptNote && <p className="hint">{c.visual.imagePromptNote}</p>}
                    </>
                  )}
                  {!!(c.songAudits || []).length && (
                    <>
                      <p className="bsec">Song Audits</p>
                      {(c.songAudits || []).map((a, i) => (
                        <div key={i} className="audit">
                          <div className="audit-title">{a.title}</div>
                          {(a.status || a.pillar) && <div className="audit-meta">{a.status}{a.status && a.pillar ? " · " : ""}{a.pillar}</div>}
                          {a.theme && <p className="audit-theme">{a.theme}</p>}
                          <div className="scores">
                            {Object.entries(a.scores || {}).map(([k, v]) => (<span key={k} className="score">{k.replace(/_/g, " ")} {v}</span>))}
                            {a.emotion && <span className="score emo">{a.emotion}</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {!!(c.tracks || []).length && (
                    <>
                      <p className="bsec">Catalog &amp; Status</p>
                      <div className="card"><table className="cat"><thead><tr><th>Song</th><th>Era / Tier</th><th>Visibility</th></tr></thead>
                      <tbody>{(c.tracks || []).map((t, i) => (<tr key={i}><td className="song">{t.n}</td><td>{t.m}</td><td><span className={"vis " + t.v}>{t.v}</span></td></tr>))}</tbody></table></div>
                    </>
                  )}
                </section>
              )}

            </div>{/* end body-main */}

            {/* ── Billboard sidebar ── */}
            <aside className="billboard">
              <div className="bb-label">Billboard</div>

              <div className="bb-slot bb-slot-primary">
                <div className="bb-placeholder">
                  <div className="bb-ph-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  </div>
                  <div className="bb-ph-text">Primary Ad</div>
                  <div className="bb-ph-dim">300 × 250</div>
                </div>
              </div>

              <div className="bb-slot">
                <div className="bb-placeholder">
                  <div className="bb-ph-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  </div>
                  <div className="bb-ph-text">Feature Ad</div>
                  <div className="bb-ph-dim">300 × 250</div>
                </div>
              </div>

              <div className="bb-slot bb-slot-tall">
                <div className="bb-placeholder">
                  <div className="bb-ph-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  </div>
                  <div className="bb-ph-text">Skyscraper</div>
                  <div className="bb-ph-dim">300 × 600</div>
                </div>
              </div>

              <div className="bb-tag">Powered by LESARUSS Advertising</div>
            </aside>

          </div>{/* end body-layout */}

        </div>{/* end apg */}
      </div>
    </SiteChrome>
  );
}

const CSS = `
.apg{max-width:none;margin:0;padding:0 0 80px}

/* ── Black header ── */
.bible-head{background:#111;color:#fff;padding:0 0 28px;border-bottom:4px solid var(--rx)}

/* Logo + breadcrumb bar inside header */
.head-topbar{
  display:flex;align-items:center;gap:14px;
  padding:16px 40px 20px;
  border-bottom:1px solid rgba(255,255,255,.07);
  margin-bottom:28px;
}
.head-crumb{display:flex;align-items:center;gap:8px}
.head-crumb-item{display:flex;align-items:center;gap:8px}
.head-crumb a{font-size:13px;font-weight:700;color:rgba(255,255,255,.55);text-decoration:none;letter-spacing:.01em}
.head-crumb a:hover{color:rgba(255,255,255,.9)}
.head-crumb .cur{font-size:13px;font-weight:800;color:var(--rx);letter-spacing:.01em}
.head-crumb .sep{color:rgba(255,255,255,.22);font-size:13px;font-weight:400}

/* Artist hero */
.head-grid{display:flex;gap:32px;align-items:flex-start;padding:0 40px}
.head-art,.head-art-fallback{width:clamp(280px,34vw,460px);aspect-ratio:1;border-radius:20px;border:2px solid var(--rx);object-fit:cover;background:var(--rx);display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:900;color:#fff;flex-shrink:0}
.head-meta{flex:1;min-width:0;padding-top:6px}
.head-name{font-size:clamp(36px,6vw,60px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase;line-height:.98}
.head-tagline{font-size:17px;color:rgba(255,255,255,.85);margin-top:14px;max-width:680px;line-height:1.55}
.pill-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.pill{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;padding:6px 14px;border-radius:20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16)}
.pill.accent{background:var(--rx);border-color:var(--rx)}

/* ── Tab bar ── */
.tabbar{position:sticky;top:60px;z-index:6;background:#fff;border-bottom:1px solid var(--lr-border);display:flex;gap:2px;padding:0 40px}
.tab{position:relative;font-family:inherit;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);background:none;border:none;padding:18px 18px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}
.tab[aria-selected="true"]{color:var(--rx-text)}
.tab[aria-selected="true"]::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--rx)}
.adminbadge{font-size:8px;font-weight:900;background:var(--rx-tint);color:var(--rx-text);padding:2px 5px;border-radius:3px}

/* ── Two-column layout ── */
.body-layout{display:flex;align-items:flex-start;gap:0;padding:0 40px;margin-top:0}
.body-main{flex:1;min-width:0;padding-top:30px;padding-right:28px}
.panel{max-width:none}

/* ── Billboard sidebar ── */
.billboard{
  width:300px;
  flex-shrink:0;
  position:sticky;
  top:120px;
  padding-top:30px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.bb-label{
  font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;
  color:var(--lr-text-30);margin-bottom:4px;
}
.bb-slot{width:100%}
.bb-placeholder{
  border:1px dashed var(--lr-border);
  border-radius:10px;
  background:var(--lr-surface);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:8px;
  padding:32px 16px;
  color:var(--lr-text-30);
  min-height:250px;
}
.bb-slot-tall .bb-placeholder{min-height:500px}
.bb-ph-icon svg{width:28px;height:28px;opacity:.4}
.bb-ph-text{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-30)}
.bb-ph-dim{font-size:10px;font-weight:600;color:var(--lr-text-30);opacity:.7}
.bb-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--lr-text-30);text-align:center;padding:8px 0}

/* ── Panel contents ── */
.rxp{display:flex;gap:18px;align-items:center;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:14px;padding:18px 22px;margin-bottom:26px}
.rxp-img{width:88px;height:88px;border-radius:12px;object-fit:cover;flex-shrink:0}
.rxp-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:9px}
.rxp-label{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--lr-text-50)}
.rxp-wave{display:flex;align-items:center;gap:3px;height:30px}
.rxp-wave span{width:3px;border-radius:2px;background:rgba(233,30,140,.32);display:block}
.rxp-cap{font-size:13px;color:var(--lr-text-50);font-style:italic}
.rxp-lang{align-self:flex-start;font-family:inherit;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--rx-text);border:1px solid var(--lr-border);background:#fff;border-radius:100px;padding:6px 13px;cursor:pointer}
.rxp-lang:hover{border-color:var(--rx)}
.about-quote{font-size:clamp(19px,2.6vw,24px);font-weight:900;color:var(--rx-text);line-height:1.25;margin:0 0 28px;border-left:3px solid var(--rx);padding-left:18px;font-style:italic}
.card{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:22px 24px;margin-bottom:14px}
.card p{font-size:15px;color:var(--lr-text-75);line-height:1.75}
.about-bio p+p{margin-top:10px}
.about-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:4px}
.astat{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:10px;padding:18px 16px}
.astat-v{font-size:14px;font-weight:800}.astat-l{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--lr-text-50);margin-top:5px}
@media(max-width:900px){
  .body-layout{flex-direction:column;padding:0 16px}
  .body-main{padding-right:0}
  .billboard{width:100%;position:static;padding-top:0}
  .bb-slot-tall{display:none}
  .about-stats{grid-template-columns:repeat(2,1fr)}
  .head-grid{flex-direction:column;padding:0 16px}
  .head-topbar{padding:14px 16px 16px}
  .tabbar{padding:0 16px}
}
.news-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.newscard{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:16px 18px}
.news-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.news-tag{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:4px 10px;border-radius:20px;background:var(--rx-tint);color:var(--rx-text)}
.news-date{font-size:11px;font-weight:700;color:var(--lr-text-50)}
.news-title{font-size:15px;font-weight:800;line-height:1.3}
.news-blurb{font-size:13px;color:var(--lr-text-75);line-height:1.55;margin-top:6px}
.panel-intro{font-size:13px;color:var(--lr-text-50);margin-bottom:18px}
.track{display:flex;align-items:center;gap:16px;background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:10px;padding:13px 18px;margin-bottom:9px}
.tplay{width:42px;height:42px;border-radius:50%;border:none;background:var(--rx);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.tplay svg{width:16px;height:16px;fill:currentColor}
.tplay.on{filter:brightness(.92)}
.tplay.locked{background:var(--lr-bg);color:var(--lr-text-30);border:1px solid var(--lr-border);cursor:not-allowed}
.tplay.locked svg{fill:none;width:15px;height:15px}
.track .ti{flex:1}.track .tn{font-size:15px;font-weight:800}.track .tm{font-size:11px;color:var(--lr-text-50);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.vis{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:20px}
.vis.public{background:rgba(76,175,80,.14);color:#2e7d32}.vis.members{background:rgba(246,152,32,.16);color:var(--lr-orange-text)}.vis.admin{background:var(--rx-tint);color:var(--rx-text)}
.adminbar{display:flex;gap:10px;background:#111;color:#fff;border-radius:10px;padding:12px 16px;margin-bottom:22px;font-size:12px}
.adminbar .t{font-weight:800;text-transform:uppercase;letter-spacing:.08em}.adminbar .s{color:rgba(255,255,255,.7)}
.bsec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:var(--rx-text);margin:26px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--lr-border)}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px 22px}
.kv .k{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--rx-text);margin-bottom:2px}.kv .v{font-size:14px;font-weight:600}
.mini-h{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin:16px 0 6px}.mini-h:first-child{margin-top:0}
.rel-row{display:flex;gap:12px;padding:11px 0;border-top:1px solid var(--lr-border)}.rel-row:first-child{border-top:none}
.rel-name{font-size:12px;font-weight:900;text-transform:uppercase;color:var(--rx-text);min-width:120px}.rel-desc{font-size:13px;color:var(--lr-text-75)}
.copy-block{border:1px solid var(--lr-border);border-radius:10px;overflow:hidden;margin-bottom:8px}
.copy-bar{display:flex;align-items:center;justify-content:space-between;background:var(--rx-tint);padding:9px 14px;border-bottom:1px solid var(--lr-border)}
.copy-bar .lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--rx-text)}
.copy-btn{font-family:inherit;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;background:var(--rx);color:#fff;border:none;border-radius:5px;padding:6px 13px;cursor:pointer}
.copy-body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.65;color:var(--lr-text);background:var(--lr-surface);padding:14px 16px;white-space:pre-wrap;word-break:break-word;margin:0}
.hint{font-size:12px;color:var(--lr-text-50);margin:6px 0 4px;font-style:italic}
.audit{background:var(--lr-surface);border:1px solid var(--lr-border);border-radius:12px;padding:16px 18px;margin-bottom:10px}
.audit-title{font-size:15px;font-weight:900}
.audit-meta{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--lr-text-50);margin-top:4px}
.audit-theme{font-size:13.5px;color:var(--lr-text-75);line-height:1.6;margin-top:9px}
.scores{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}
.score{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:3px 9px;border-radius:20px;background:var(--rx-tint);color:var(--rx-text)}
.score.emo{background:var(--lr-bg);color:var(--lr-text-50)}
.empty-note{font-size:13px;color:var(--lr-text-50);font-style:italic}
.cat{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
.cat th{text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--lr-text-50);padding:8px 10px;border-bottom:2px solid var(--lr-border)}
.cat td{padding:9px 10px;border-bottom:1px solid var(--lr-border);color:var(--lr-text-75)}
.cat td.song{font-weight:700;color:var(--lr-text)}
`;
