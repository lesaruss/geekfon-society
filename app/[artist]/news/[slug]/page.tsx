"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SiteChrome from "@/components/SiteChrome";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

type NewsItem = {
  slug?: string;
  tag?: string;
  date?: string;
  title?: string;
  blurb?: string;
  content?: string;
  href?: string;
  thumb?: string;
};

const ARTICLE_CSS = `
.art-page{max-width:720px;margin:0 auto;padding:0 20px 80px}
.art-crumb{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--lr-text-30);padding:20px 0 32px;flex-wrap:wrap}
.art-crumb a{color:var(--lr-text-30);text-decoration:none;transition:color .15s}
.art-crumb a:hover{color:var(--lr-text)}
.art-crumb-sep{opacity:.4}
.art-crumb-current{color:var(--lr-text-50)}
.art-hero{width:100%;border-radius:16px;overflow:hidden;margin-bottom:32px;aspect-ratio:16/9;background:var(--lr-surface)}
.art-hero img{width:100%;height:100%;object-fit:cover;display:block}
.art-meta{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.art-tag{display:inline-block;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;background:var(--rx,#c084fc);color:#fff;padding:4px 10px;border-radius:99px}
.art-date{font-size:12px;font-weight:600;color:var(--lr-text-30);letter-spacing:.04em}
.art-title{font-size:clamp(22px,4vw,36px);font-weight:900;line-height:1.2;letter-spacing:-.01em;color:var(--lr-text);margin-bottom:28px}
.art-body{font-size:16px;line-height:1.75;color:var(--lr-text-70)}
.art-body p{margin:0 0 20px}
.art-body p:last-child{margin-bottom:0}
.art-body .art-quote{font-style:italic;font-size:18px;line-height:1.6;color:var(--lr-text);border-left:3px solid var(--rx,#c084fc);padding-left:20px;margin:28px 0}
.art-back{display:inline-flex;align-items:center;gap:8px;margin-top:48px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--rx,#c084fc);text-decoration:none;transition:opacity .15s}
.art-back:hover{opacity:.7}
.art-back svg{width:16px;height:16px}
.art-loading{padding:80px 20px;text-align:center;color:var(--lr-text-30);font-size:14px}
@media(max-width:600px){.art-page{padding:0 16px 60px}.art-title{font-size:22px}}
`;

export default function ArticleDetailPage() {
  const params = useParams();
  const artist = params.artist as string;
  const slug   = params.slug   as string;

  const [article, setArticle] = useState<NewsItem | null>(null);
  const [artistName, setArtistName] = useState<string>("");
  const [accent, setAccent] = useState<string>("#c084fc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artist || !slug) return;
    fetch(
      `${SUPA_URL}/rest/v1/gfs_artists?slug=eq.${encodeURIComponent(artist)}&select=profile`,
      { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` } }
    )
      .then((r) => r.json())
      .then((rows) => {
        if (!rows.length) { setLoading(false); return; }
        const profile = rows[0].profile || {};
        setArtistName(profile.name || artist);
        if (profile.accent) setAccent(profile.accent);
        const found = (profile.news || []).find((n: NewsItem) => n.slug === slug);
        setArticle(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [artist, slug]);

  const crumb = [
    { label: "GeekFon Society", href: "/" },
    { label: artistName || artist, href: `/${artist}` },
    { label: article?.title || "Article" },
  ];

  if (loading) {
    return (
      <SiteChrome>
        <div className="art-loading">Loading...</div>
      </SiteChrome>
    );
  }

  if (!article) {
    return (
      <SiteChrome>
        <div className="art-loading">Article not found.</div>
      </SiteChrome>
    );
  }

  const paragraphs = (article.content || "").split(/\n\n+/).filter(Boolean);

  return (
    <SiteChrome crumb={crumb}>
      <style>{ARTICLE_CSS}</style>
      <style>{`:root{--rx:${accent}}`}</style>
      <div className="art-page">
        <nav className="art-crumb" aria-label="Breadcrumb">
          {crumb.map((c, i) => (
            <span key={i} style={{ display: "contents" }}>
              {i > 0 && <span className="art-crumb-sep">›</span>}
              {c.href
                ? <a href={c.href}>{c.label}</a>
                : <span className="art-crumb-current">{c.label}</span>}
            </span>
          ))}
        </nav>

        {article.thumb && (
          <div className="art-hero">
            <img src={article.thumb} alt={article.title || ""} />
          </div>
        )}

        <div className="art-meta">
          {article.tag  && <span className="art-tag">{article.tag}</span>}
          {article.date && <span className="art-date">{article.date}</span>}
        </div>

        {article.title && <h1 className="art-title">{article.title}</h1>}

        <div className="art-body">
          {paragraphs.map((block, i) => {
            const t = block.trim();
            if (t.startsWith('"') && t.endsWith('"')) {
              return <p key={i} className="art-quote">{t}</p>;
            }
            const lines = t.split("\n").filter(Boolean);
            return (
              <p key={i}>
                {lines.map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            );
          })}
        </div>

        <a href={`/${artist}`} className="art-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to {artistName || artist}
        </a>
      </div>
    </SiteChrome>
  );
}
