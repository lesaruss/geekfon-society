"use client";
// The release, up top (2026-10-04, Sean: "my ultimate goal is to keep
// everything above the fold" and give a visitor something to do besides
// scroll). For label-model artists the header's right side carries:
//   - a plain line a stranger understands (genre + where the album stands),
//     written from release state so it updates itself on release day;
//   - status pills (genre, what's out);
//   - the album card: cover, Play <the single out now>, Support <artist>.
// Supporters get "Play the album" instead of the buy button.
import { useEffect, useRef, useState } from "react";
import type { PublicAlbum, PublicSong } from "@/lib/server/depot";
import "./roster.css";

type Props = {
  artistName: string;
  genre: string | null;
  album: PublicAlbum;
  debut: boolean;
  songs: PublicSong[];        // the album's own tracks, in order
  supporter: boolean;
  onSupport: () => void;
  onOpenAlbum: () => void;
};

export default function ReleaseHero({ artistName, genre, album, debut, songs, supporter, onSupport, onOpenAlbum }: Props) {
  const out = songs.filter(s => s.access === "single");
  const lead = out[out.length - 1] ?? null; // newest single out
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  function togglePlay() {
    const a = audioRef.current;
    if (!a || !lead) return;
    if (!a.paused) { a.pause(); return; }
    document.querySelectorAll("audio").forEach(el => { if (el !== a) el.pause(); });
    if (!a.src) a.src = lead.playUrl;
    a.play().catch(() => setPlaying(false));
  }

  const albumWord = debut ? "debut album" : "new album";
  const line = album.out
    ? <>{genre ? `${genre} · ` : ""}{albumWord[0].toUpperCase() + albumWord.slice(1)} <em>{album.title}</em> out now</>
    : <>{genre ? `${genre} · ` : ""}{albumWord[0].toUpperCase() + albumWord.slice(1)} <em>{album.title}</em> coming soon</>;
  const status = album.out ? "Album out now" : out.length ? `${out.length} ${out.length === 1 ? "single" : "singles"} out` : "Coming soon";

  return (
    <div className="rh">
      <p className="rh-line">{line}</p>
      <div className="pill-row">
        {genre && <span className="pill">{genre}</span>}
        <span className="pill accent">{status}</span>
      </div>

      <div className="rh-card">
        <button className="rh-cover" onClick={onOpenAlbum} aria-label={`See ${album.title}`}>
          {album.coverUrl ? <img src={album.coverUrl} alt="" /> : <span className="rs-cover-blank" />}
        </button>
        <div className="rh-card-main">
          <div className="rh-kicker">{album.out ? "Album · Out now" : "Album · Coming soon"}</div>
          <div className="rh-title">{album.title}</div>
          <div className="rh-actions">
            {lead && !supporter && (
              <button className="rh-btn rh-btn-play" onClick={togglePlay} aria-label={`${playing ? "Pause" : "Play"} ${lead.title}`}>
                {playing
                  ? <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  : <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
                {playing ? "Pause" : "Play"} {lead.title}
              </button>
            )}
            {supporter ? (
              <button className="rh-btn rh-btn-go" onClick={onOpenAlbum}>Play the album</button>
            ) : (
              <button className="rh-btn rh-btn-go" onClick={onSupport}>Support {artistName}</button>
            )}
          </div>
          {supporter && <div className="rh-note">You&apos;re a supporter. All of it is unlocked.</div>}
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
