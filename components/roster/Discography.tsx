"use client";
// Discography tab of the public roster: the fan version of HQ's Discography.
// Albums first (with their in-progress state), then every song not yet on an
// album, then remixes. Cover art, duration and lyrics come from the depot.
//
// Free view: public singles play in full; vault songs play a 30-second
// preview served by /api/songs/<id>/preview (the server cuts the audio, the
// player's own cap is only cosmetic). Supporter view: the access route hands
// back signed full streams, lyrics and downloads, and the rows upgrade.
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicAlbum, PublicSong } from "@/lib/server/depot";
import type { RosterAccess } from "./useRosterAccess";
import "./roster.css";

const PREVIEW_SECONDS = 30;

type Props = {
  artistName: string;
  songs: PublicSong[];
  albums: PublicAlbum[];
  access: RosterAccess;
  onSupport: () => void;
};

function fmt(s: number | null | undefined): string {
  if (!s || !isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function albumLabel(a: PublicAlbum, count: number): string {
  if (a.status === "released") return `Album · ${count} tracks`;
  return `In progress · ${count} of ${a.trackTarget}`;
}

type Section = { key: string; title: string; sub?: string; songs: PublicSong[]; inProgress?: boolean; album?: PublicAlbum; remixes?: PublicSong[] };

export default function Discography({ artistName, songs, albums, access, onSupport }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<string | null>(null); // song id loaded in the player
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState<string | null>(null);
  const [lyricsLang, setLyricsLang] = useState<"en" | "original">("en");

  const byId = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs]);

  const sections: Section[] = useMemo(() => {
    const placed = new Set<string>();
    const out: Section[] = [];
    for (const a of albums) {
      const list = a.tracks.map(t => byId.get(t.songId)).filter((s): s is PublicSong => !!s);
      if (!list.length) continue;
      list.forEach(s => placed.add(s.id));
      if (a.label) {
        // Label model: the album leads with its own tracks; its remixes follow.
        out.push({ key: a.id, title: a.title, songs: list.filter(s => !s.isRemix), remixes: list.filter(s => s.isRemix), album: a });
        continue;
      }
      out.push({ key: a.id, title: a.title, sub: albumLabel(a, list.filter(s => !s.isRemix).length), songs: list, inProgress: a.status !== "released" });
    }
    const rest = songs.filter(s => !placed.has(s.id));
    const originals = rest.filter(s => !s.isRemix);
    const remixes = rest.filter(s => s.isRemix);
    if (originals.length) out.push({ key: "songs", title: albums.length ? "More songs" : "Songs", songs: originals });
    if (remixes.length) out.push({ key: "remixes", title: "Remixes", sub: "GeekFon exclusives", songs: remixes });
    return out;
  }, [albums, songs, byId]);

  const singles = songs.filter(s => s.access === "single").length;
  const vault = songs.length - singles;
  const labelAlbum = albums.find(a => a.label) ?? null;
  const outNow = songs.filter(s => s.access === "single" && !s.isRemix);

  // Which URL a row plays, and whether it is capped, for THIS viewer.
  function sourceFor(s: PublicSong): { url: string; capped: boolean } {
    if (s.access === "single") return { url: s.playUrl, capped: false };
    const grant = access.songs[s.id];
    if (grant) return { url: grant.stream, capped: false };
    return { url: s.playUrl, capped: true };
  }

  // A supporter's grants can arrive while a preview is loaded; reload the
  // current song on its full stream so the upgrade is immediate.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    const s = byId.get(current);
    if (!s) return;
    const { url } = sourceFor(s);
    if (a.src && a.src !== new URL(url, window.location.href).href) {
      const wasPlaying = !a.paused;
      a.src = url;
      if (wasPlaying) a.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.songs]);

  function toggle(s: PublicSong) {
    const a = audioRef.current;
    if (!a) return;
    if (current === s.id) {
      if (a.paused) a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      else { a.pause(); setPlaying(false); }
      return;
    }
    // One player on the page: stop anything else (voice notes, other tabs).
    document.querySelectorAll("audio").forEach(el => { if (el !== a) el.pause(); });
    const { url } = sourceFor(s);
    a.src = url;
    setCurrent(s.id);
    setTime(0);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function onTime() {
    const a = audioRef.current;
    if (!a || !current) return;
    const s = byId.get(current);
    if (s && sourceFor(s).capped && a.currentTime >= PREVIEW_SECONDS) {
      a.pause();
      a.currentTime = 0;
      setPlaying(false);
      setTime(0);
      return;
    }
    setTime(a.currentTime);
  }

  function seek(e: React.PointerEvent<HTMLDivElement>, s: PublicSong, max: number) {
    const a = audioRef.current;
    if (!a || current !== s.id || !max) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * max;
  }

  function lyricsFor(s: PublicSong): { en: string | null; original: string | null; lang: string | null } {
    const g = access.songs[s.id];
    if (g) return { en: g.lyricsEn, original: g.lyricsOriginal, lang: g.lyricsOriginalLang };
    return { en: s.lyricsEn, original: s.lyricsOriginal, lang: s.lyricsOriginalLang };
  }

  function renderRow(s: PublicSong) {
              const { capped } = sourceFor(s);
              const isCur = current === s.id;
              const max = capped ? Math.min(PREVIEW_SECONDS, s.durationSeconds || PREVIEW_SECONDS) : (s.durationSeconds || 0);
              const t = isCur ? time : 0;
              const pct = max ? Math.min(100, (t / max) * 100) : 0;
              const lyr = lyricsFor(s);
              const lyricsLocked = !lyr.en && !lyr.original && s.hasLyrics;
              const dl = access.songs[s.id]?.download || access.downloads[s.id];
              const open = lyricsOpen === s.id;
              return (
                <div key={s.id} className={"rs-row" + (isCur ? " rs-row-cur" : "")}>
                  <div className="rs-row-main">
                    <button
                      className="rs-cover"
                      onClick={() => toggle(s)}
                      aria-label={(isCur && playing ? "Pause " : "Play ") + s.title + (capped ? " (30-second preview)" : "")}
                    >
                      {s.coverUrl ? <img src={s.coverUrl} alt="" loading="lazy" /> : <span className="rs-cover-blank" />}
                      <span className="rs-cover-icon" aria-hidden="true">
                        {isCur && playing
                          ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                          : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
                      </span>
                    </button>
                    <div className="rs-mid">
                      <div className="rs-line">
                        <span className="rs-song">{s.title}</span>
                        {s.access === "single"
                          ? <span className={"rs-tag " + (labelAlbum ? "rs-tag-out" : "rs-tag-single")}>{labelAlbum ? "Out now" : "Single"}</span>
                          : capped
                            ? <span className="rs-tag rs-tag-preview">Preview</span>
                            : <span className="rs-tag rs-tag-vault">{labelAlbum ? "Unlocked" : "Vault"}</span>}
                      </div>
                      <div className="rs-scrub">
                        <span className="rs-time">{fmt(t)}</span>
                        <div
                          className="rs-bar"
                          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seek(e, s, max); }}
                          onPointerMove={e => { if (e.buttons === 1) seek(e, s, max); }}
                        >
                          <div className="rs-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="rs-time">{fmt(max)}</span>
                      </div>
                    </div>
                    <div className="rs-actions">
                      {dl && <a className="rs-act" href={dl} aria-label={`Download ${s.title}`}>Download</a>}
                      {(lyr.en || lyr.original || lyricsLocked) && (
                        <button
                          className={"rs-act" + (open ? " rs-act-on" : "")}
                          onClick={() => (lyricsLocked ? onSupport() : setLyricsOpen(open ? null : s.id))}
                          aria-label={lyricsLocked ? `Support ${artistName} to read the lyrics to ${s.title}` : `${open ? "Hide" : "Show"} lyrics for ${s.title}`}
                        >
                          {lyricsLocked ? "Lyrics 🔒" : "Lyrics"}
                        </button>
                      )}
                    </div>
                  </div>
                  {capped && isCur && (
                    <div className="rs-capnote">
                      30-second preview. <button className="rs-link" onClick={onSupport}>Support {artistName}</button> for the full song.
                    </div>
                  )}
                  {open && (lyr.en || lyr.original) && (
                    <div className="rs-lyrics">
                      {lyr.en && lyr.original && (
                        <div className="rs-lang">
                          <button className={lyricsLang === "original" ? "on" : ""} onClick={() => setLyricsLang("original")}>{(lyr.lang || "orig").toUpperCase()}</button>
                          <button className={lyricsLang === "en" ? "on" : ""} onClick={() => setLyricsLang("en")}>EN</button>
                        </div>
                      )}
                      <p>{(lyricsLang === "original" && lyr.original) ? lyr.original : (lyr.en || lyr.original)}</p>
                    </div>
                  )}
                </div>
              );
  }

  if (!songs.length) {
    return (
      <section className="rs-wrap">
        <p className="rs-empty">{artistName}&apos;s songs are on their way.</p>
      </section>
    );
  }

  return (
    <section className="rs-wrap">
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={onTime}
        onEnded={() => { setPlaying(false); setTime(0); }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      <div className="rs-head">
        <h2 className="rs-title">Discography</h2>
        <span className="rs-count">
          {labelAlbum
            ? `${outNow.length} out now${labelAlbum.out ? "" : ` · ${labelAlbum.title} coming`}`
            : `${songs.length} songs · ${singles} free ${singles === 1 ? "single" : "singles"} · ${vault} in the vault`}
        </span>
      </div>

      {access.supporter ? (
        <div className="rs-banner rs-banner-on">
          <strong>You&apos;re a supporter.</strong>{" "}
          {labelAlbum
            ? `All of ${labelAlbum.title} is unlocked for you${labelAlbum.out ? "" : " ahead of release"}${access.download ? ", with downloads" : ""}, along with the Gallery, Chat and ${artistName}'s full Bible.`
            : `Every ${artistName} song is unlocked, including the vault${access.download ? ", with downloads" : ""}.`}
        </div>
      ) : labelAlbum ? (
        <div className="rs-banner">
          <div>
            <strong>Support {artistName}.</strong>{" "}
            {labelAlbum.out
              ? `Hear all of ${labelAlbum.title} in full`
              : `Hear all of ${labelAlbum.title} in full before it's out everywhere`}
            , plus the Gallery, Chat, lyrics and {artistName}&apos;s full story. Everything else plays as a 30-second preview.
          </div>
          <button className="rs-cta" onClick={onSupport}>Support {artistName}</button>
        </div>
      ) : (
        <div className="rs-banner">
          <div>
            <strong>The vault is for supporters.</strong> Singles play free. Support {artistName} to hear every unreleased and
            in-development song in full, read the lyrics and the full Bible, and get each new song as it lands.
          </div>
          <button className="rs-cta" onClick={onSupport}>Support {artistName}</button>
        </div>
      )}

      {sections.map(sec => (
        <div key={sec.key} className="rs-section">
          {sec.album ? (
            <AlbumHero
              album={sec.album}
              songs={sec.songs}
              playing={playing && !!current && sec.songs.some(x => x.id === current)}
              onPlay={() => { const first = sec.songs.find(x => x.access === "single") ?? sec.songs[0]; if (first) toggle(first); }}
            />
          ) : (
            <div className="rs-section-head">
              <h3 className="rs-section-title">{sec.title}</h3>
              {sec.sub && <span className={"rs-section-sub" + (sec.inProgress ? " rs-progress" : "")}>{sec.sub}</span>}
            </div>
          )}
          <div className="rs-rows">
            {sec.songs.map(renderRow)}
          </div>
          {sec.remixes && sec.remixes.length > 0 && (
            <>
              <h4 className="rs-subhead">Remixes · GeekFon exclusives</h4>
              <div className="rs-rows">{sec.remixes.map(renderRow)}</div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

// The album as a release: cover (tap to play the first single), where it
// stands, and what is out now.
function AlbumHero({ album, songs, playing, onPlay }: { album: PublicAlbum; songs: PublicSong[]; playing: boolean; onPlay: () => void }) {
  const out = songs.filter(s => s.access === "single");
  const year = (album.geekfonReleaseDate || "").slice(0, 4);
  return (
    <div className="rs-album">
      <button className="rs-album-cover" onClick={onPlay} aria-label={`${playing ? "Pause" : "Play"} ${album.title}`}>
        {album.coverUrl ? <img src={album.coverUrl} alt="" /> : <span className="rs-cover-blank" />}
        <span className="rs-cover-icon" aria-hidden="true">
          {playing
            ? <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
        </span>
      </button>
      <div>
        <div className="rs-album-kicker">{album.out ? "Album · Out now" : "Album · Coming soon"}</div>
        <h3 className="rs-album-title">{album.title}</h3>
        <p className="rs-album-meta">{songs.length} {songs.length === 1 ? "song" : "songs"}{year ? ` · ${year}` : ""}</p>
        {!album.out && (
          <p className="rs-album-out">
            {out.length
              ? <>Out now: <strong>{out.map(s => s.title).join(", ")}</strong>. The rest preview here until release day.</>
              : <>Every song previews here until release day.</>}
          </p>
        )}
      </div>
    </div>
  );
}
