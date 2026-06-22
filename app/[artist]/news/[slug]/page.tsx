import { notFound } from "next/navigation";
import SiteChrome from "@/components/SiteChrome";

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
@media(max-width:600px){.art-page{padding:0 16px 60px}.art-title{font-size:22px}}
`;

async function getArticle(artistSlug: string, newsSlug: string) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/gfs_artists?slug=eq.${encodeURIComponent(artistSlug)}&select=profile&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows?.length) return null;

  const profile = rows[0].profile || {};
  const news: NewsItem[] = profile.news || [];
  const article = news.find((n) => n.slug === newsSlug);
  if (!article) return null;

  return {
    article,
    artistName: (profile.name as string) || artistSlug,
    accent: (profile.accent as string) || "#c084fc",
  };
}

type Props = { params: Promise<{ artist: string; slug: string }> };

export default async function ArticleDetailPage({ params }: Props) {
  const { artist, slug } = await params;
  const result = await getArticle(artist, slug);
  if (!result) return notFound();

  const { article, artistName, accent } = result;

  const crumb = [
    { label: "GeekFon Society", href: "/" },
    { label: artistName, href: `/${artist}` },
    { label: article.title || "Article" },
  ];

  const paragraphs = (article.content || "").split(/\n\n+/).filter(Boolean);

  return (
    <SiteChrome crumb={crumb}>
      <style>{ARTICLE_CSS}</style>
      <style>{`:root{--rx:${accent}}`}</style>
      <div className="art-page">
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
          Back to {artistName}
        </a>
      </div>
    </SiteChrome>
  );
}
