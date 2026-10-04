"use client";
// The chrome around an artist page (2026-10-04, Sean: "When they're logged in,
// they should be using the universal framing and selectors for GeekFon as
// well"). Signed out, a label artist page is the storefront under the public
// SiteChrome. Signed in, the same page sits inside the universal frame
// (GfsShell: window, GeekFon nav, Apps, universal bar), and ArtistPage swaps
// its own header and tabs for a section nav (Music, Press, Social, Gallery,
// Chat) so every section opens inside the frame.
//
// Server render is always the SiteChrome version. A pre-paint script hides it
// when a Supabase session is stored, so a signed-in visitor does not see the
// public page flash before the frame mounts; it is shown again if the session
// turns out to be gone.
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SiteChrome from "@/components/SiteChrome";
import GfsShell from "@/components/shell/GfsShell";

const FramedContext = createContext(false);

/** True when the page is inside the universal frame (signed in). */
export function useArtistFramed(): boolean {
  return useContext(FramedContext);
}

type Viewer = { email: string | null; tier: string | null; name: string };

const PREPAINT = `try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&/^sb-.+-auth-token$/.test(k)){document.documentElement.classList.add('af-authed');break}}}catch(e){}`;

export function FramedArtistShell({ viewer, title, children }: { viewer: Viewer; title: string; children: React.ReactNode }) {
  return (
    <FramedContext.Provider value={true}>
      <style>{FRAME_CSS}</style>
      <div className="af-bg" aria-hidden="true" />
      <div className="af-framed">
        <GfsShell email={viewer.email} rawTier={viewer.tier} fallbackName={viewer.name} title={title} activeHref="/roster">
          {children}
        </GfsShell>
      </div>
    </FramedContext.Provider>
  );
}

export default function ArtistChrome({ framed, title, children }: { framed: boolean; title: string; children: React.ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [checked, setChecked] = useState(!framed);

  useEffect(() => {
    if (!framed) return;
    let live = true;
    const show = () => { document.documentElement.classList.remove("af-authed"); if (live) setChecked(true); };
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user;
      if (!u) return show();
      const { data: m } = await supabase.from("gfs_members").select("tier,name").eq("user_id", u.id).maybeSingle();
      if (!live) return;
      setViewer({ email: u.email || null, tier: (m?.tier as string | undefined) ?? null, name: (m?.name as string | undefined) || u.email || "Member" });
      setChecked(true);
      document.documentElement.classList.remove("af-authed");
    }).catch(show);
    return () => { live = false; };
  }, [framed]);

  if (framed && viewer) return <FramedArtistShell viewer={viewer} title={title}>{children}</FramedArtistShell>;

  return (
    <>
      {framed && !checked && <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />}
      {framed && <style>{`html.af-authed .af-public{visibility:hidden}`}</style>}
      <div className="af-public">
        <SiteChrome>{children}</SiteChrome>
      </div>
    </>
  );
}

const FRAME_CSS = `
body { background: #020c0a; }
.af-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(60vw 40vh at 20% -6%, rgba(0,215,95,.20), transparent 70%),
    radial-gradient(50vw 36vh at 92% 0%, rgba(0,155,255,.16), transparent 70%),
    radial-gradient(44vw 30vh at 50% 8%, rgba(120,0,255,.12), transparent 70%),
    #020c0a; }
/* Artist pages are white inside the dark window, like the storefront. */
.af-framed .gw-body { background: #fff; color: #141414; }

/* Section nav: the artist's own nav inside the frame (Music, Press, Social,
   Gallery, Chat), under the GeekFon nav. */
.af-sections { position: relative; z-index: 6; display: flex; align-items: center; gap: 22px; min-height: 54px; padding: 0 28px; background: #fff; border-bottom: 1px solid rgba(20,20,20,.1); }
.af-artist { display: flex; align-items: center; gap: 10px; flex-shrink: 0; font-size: 13px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: #141414; }
.af-artist img, .af-artist-ph { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; object-position: 50% 0; border: 2px solid var(--rx, #e91e8c); background: #f4f4f4; }
.af-artist-ph { display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
.af-tabs { display: flex; align-items: stretch; gap: 4px; min-width: 0; overflow-x: auto; scrollbar-width: none; align-self: stretch; }
.af-tabs::-webkit-scrollbar { display: none; }
.af-tab { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; border: none; background: none; font: inherit; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(20,20,20,.55); cursor: pointer; white-space: nowrap; }
.af-tab:hover { color: #141414; }
.af-tab.on { color: #141414; }
.af-tab.on::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--rx, #e91e8c); }
.af-tab:focus:not(:focus-visible) { outline: none; }
.af-tab:focus-visible { outline: 2px solid var(--rx, #e91e8c); outline-offset: -4px; border-radius: 6px; }
.af-lock { display: inline-flex; width: 12px; height: 12px; color: rgba(20,20,20,.4); }
.af-lock svg { width: 12px; height: 12px; }

/* Music fills the window under the section nav, as the storefront fills the
   screen under the public bar: only the song list scrolls. */
.af-root .apg { padding-bottom: 40px; }
@media (min-width: 901px) {
  .af-root.is-music, .af-root.is-music > .apg { height: 100%; }
  .af-root.is-music > .apg { display: flex; flex-direction: column; padding-bottom: 0; }
  .af-root.is-music .af-stage { flex: 1; min-height: 0; container-type: size; }
  .af-stage .sf { height: 100cqh; min-height: 0; grid-template-columns: minmax(0, min(46%, calc((100cqh - 48px) * .743))) minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .af-sections { padding: 0 12px; gap: 12px; }
  .af-artist span { display: none; }
  .af-tab { padding: 0 9px; font-size: 11px; letter-spacing: .08em; }
  .af-tab.on::after { left: 9px; right: 9px; }
}
@media (max-width: 420px) {
  .af-artist { display: none; }
  .af-tabs { flex: 1; justify-content: space-between; }
  .af-tab { padding: 0 6px; font-size: 10.5px; letter-spacing: .06em; }
  .af-tab.on::after { left: 6px; right: 6px; }
}
@media (max-width: 760px) {
  /* backdrop-filter makes the window the containing block for fixed
     children; on phones the window scrolls with the page, so the docked
     player would land at the end of the page instead of the screen. */
  .af-framed .gw-window { backdrop-filter: none; -webkit-backdrop-filter: none; background: #0b1513; }
  .af-framed .am-player { bottom: calc(100px + env(safe-area-inset-bottom, 0px)); }
}
`;
