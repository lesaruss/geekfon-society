import SiteChrome from "@/components/SiteChrome";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA";

type ArtistRow = {
  slug: string;
  name: string;
  profile: {
    heroUrl?: string;
    initial?: string;
    tagline?: string;
    pills?: { label: string; accent?: boolean }[];
    accent?: string;
    accentText?: string;
    accentTint?: string;
    // visibility tier: "public" | "members" | "admin" — defaults to public if absent
    visibility?: string;
  };
};

async function getArtists(): Promise<ArtistRow[]> {
  const res = await fetch(
    `${SUPA}/rest/v1/gfs_artists?select=slug,name,profile&order=created_at.asc`,
    {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function RosterPage() {
  const artists = await getArtists();

  return (
    <SiteChrome crumb={[{ label: "GeekFon", href: "/" }, { label: "Roster" }]}>
      <style>{CSS}</style>
      <div className="rost-wrap">
        <div className="rost-head">
          <h1 className="rost-title">The Roster</h1>
          <p className="rost-sub">
            {artists.length} artist{artists.length !== 1 ? "s" : ""} in the GeekFon Society universe.
            Members and admins unlock additional profiles.
          </p>
        </div>

        <div className="rost-grid">
          {artists.map((a) => {
            const p = a.profile || {};
            const accent = p.accent || "#E91E8C";
            const accentText = p.accentText || "#9c1458";
            const accentTint = p.accentTint || "rgba(233,30,140,0.10)";
            return (
              <a
                key={a.slug}
                href={`/${a.slug}`}
                className="acard"
                style={
                  {
                    "--rx": accent,
                    "--rx-text": accentText,
                    "--rx-tint": accentTint,
                  } as React.CSSProperties
                }
              >
                <div className="acard-img-wrap">
                  {p.heroUrl ? (
                    <img className="acard-img" src={p.heroUrl} alt={a.name} />
                  ) : (
                    <div className="acard-fallback">{p.initial || a.name.charAt(0)}</div>
                  )}
                  <div className="acard-gradient" />
                </div>
                <div className="acard-body">
                  <div className="acard-name">{a.name}</div>
                  {p.tagline && <p className="acard-tagline">{p.tagline}</p>}
                  {!!(p.pills || []).length && (
                    <div className="acard-pills">
                      {(p.pills || []).slice(0, 3).map((pill, i) => (
                        <span key={i} className={"acard-pill" + (pill.accent ? " accent" : "")}>
                          {pill.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="acard-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </a>
            );
          })}

          {/* Coming soon placeholder */}
          <div className="acard acard-locked">
            <div className="acard-img-wrap">
              <div className="acard-fallback locked-fallback">?</div>
            </div>
            <div className="acard-body">
              <div className="acard-name" style={{ opacity: 0.45 }}>More Coming</div>
              <p className="acard-tagline" style={{ opacity: 0.4 }}>New artists drop each season.</p>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}

const CSS = `
.rost-wrap { max-width: 1180px; margin: 0 auto; padding: 40px 40px 80px; }
.rost-head { margin-bottom: 36px; }
.rost-title { font-size: clamp(32px, 5vw, 52px); font-weight: 900; letter-spacing: -.02em; line-height: .98; margin: 0 0 12px; }
.rost-sub { font-size: 15px; color: var(--lr-text-50); margin: 0; max-width: 520px; }

.rost-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.acard {
  position: relative;
  background: var(--lr-surface);
  border: 1px solid var(--lr-border);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--lr-text);
  transition: border-color .18s, box-shadow .18s, transform .18s;
}
.acard:hover {
  border-color: var(--rx, #E91E8C);
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  transform: translateY(-2px);
}
.acard.acard-locked {
  opacity: .55;
  pointer-events: none;
  border-style: dashed;
}

.acard-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #111;
}
.acard-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .3s;
}
.acard:hover .acard-img { transform: scale(1.03); }
.acard-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  font-weight: 900;
  background: var(--rx, #E91E8C);
  color: #fff;
}
.locked-fallback { background: #222; color: rgba(255,255,255,.2); }
.acard-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 50%);
  pointer-events: none;
}

.acard-body {
  padding: 18px 18px 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.acard-name {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -.01em;
  line-height: 1.1;
}
.acard-tagline {
  font-size: 13px;
  color: var(--lr-text-75);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.acard-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.acard-pill {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .1em;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--lr-bg);
  border: 1px solid var(--lr-border);
  color: var(--lr-text-50);
}
.acard-pill.accent {
  background: var(--rx-tint, rgba(233,30,140,.1));
  border-color: transparent;
  color: var(--rx-text, #9c1458);
}

.acard-arrow {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255,255,255,.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity .18s;
}
.acard-arrow svg { width: 16px; height: 16px; color: var(--rx, #E91E8C); }
.acard:hover .acard-arrow { opacity: 1; }

@media (max-width: 600px) {
  .rost-wrap { padding: 24px 16px 60px; }
  .rost-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
}
`;
