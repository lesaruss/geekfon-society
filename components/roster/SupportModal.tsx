"use client";
// "Support <artist>" prompt for the public roster.
//
// The purchase behind it is the $11 album / pre-order checkout that is
// already live (app/api/checkout, plan "album"); its webhook writes the
// gfs_artist_unlocks row the entitlement check reads. Only artists with an
// album on the HQ roster can be bought today, so everyone else gets an
// honest "opening soon" with free signup instead of a dead button. The
// per-artist support plan and Lifetime ($111, every artist) are the next
// Commerce items in the geekfon-launch playbook.
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PublicAlbum, PublicSong } from "@/lib/server/depot";
import type { RadioStation } from "@/lib/server/radio";
import "./roster.css";

type Props = {
  artistName: string;
  slug: string;
  albums: PublicAlbum[];
  signedIn: boolean;
  onClose: () => void;
  // Label-model artists: what to show in the "what you get" showcase.
  showcase?: { heroUrl?: string; songs: PublicSong[]; stations: RadioStation[]; bibleLabels: string[]; galleryCount: number };
};

export default function SupportModal({ artistName, slug, albums, signedIn, onClose, showcase }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sell the album that is building now if there is one (a pre-order makes
  // the buyer a Founding Fan), otherwise the newest released album.
  // Label-model artists sell the album that is coming (or the latest out).
  const labelAlbums = albums.filter(a => a.label);
  const album = labelAlbums.length
    ? labelAlbums.find(a => !a.out) ?? labelAlbums[labelAlbums.length - 1]
    : albums.find(a => a.status !== "released") ?? [...albums].reverse().find(a => a.status === "released") ?? null;

  async function checkout() {
    if (!album) return;
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "album", albumId: album.id, userId: session?.user?.id || null, returnUrl: `/${slug}` }),
      });
      const body = await res.json();
      if (body.url) { window.location.href = body.url; return; }
      setError(body.error || "Checkout could not start. Please try again.");
    } catch {
      setError("Checkout could not start. Please try again.");
    }
    setBusy(false);
  }

  const redirect = typeof window !== "undefined" ? window.location.pathname : `/${slug}`;

  return (
    <div className="rs-modal-overlay" onClick={onClose}>
      <div className={"rs-modal" + (album?.label ? " rs-modal-wide" : "")} role="dialog" aria-modal="true" aria-labelledby="rs-modal-title" onClick={e => e.stopPropagation()}>
        <h3 id="rs-modal-title" className="rs-modal-title">Support {artistName}</h3>
        {album?.label ? (
          <Showcase artistName={artistName} album={album} showcase={showcase} />        ) : (
          <ul className="rs-modal-list">
            <li>Every song in the vault, streamed in full: unreleased and in development</li>
            <li>Lyrics and the full Bible</li>
            <li>New songs as they land, one or two a month</li>
          </ul>
        )}
        {album ? (
          <>
            <p className="rs-modal-note">
              $11, one time.{album.label
                ? (album.out ? "" : ` Counts as your ${album.title} pre-order, with a Founding Fan badge.`)
                : album.status !== "released" ? ` Includes the ${album.title} pre-order and a Founding Fan badge.` : ` Includes ${album.title}.`}
            </p>
            <button className="rs-cta rs-cta-wide" onClick={checkout} disabled={busy}>{busy ? "Starting checkout..." : "Support for $11"}</button>
          </>
        ) : (
          <>
            <p className="rs-modal-note">Supporting {artistName} opens soon. Create a free account and you&apos;ll be first to know.</p>
            {!signedIn && <a className="rs-cta rs-cta-wide" href={`/register?redirect=${encodeURIComponent(redirect)}`}>Sign up free</a>}
          </>
        )}
        {error && <p className="rs-error">{error}</p>}
        <button className="rs-dismiss" onClick={onClose}>Not now</button>
      </div>
    </div>
  );
}

// "What you get", as things to look at rather than a list (2026-10-04, Sean:
// Support Roxanne should preview everything that comes with the album).
function Showcase({ artistName, album, showcase }: { artistName: string; album: PublicAlbum; showcase?: Props["showcase"] }) {
  const ids = new Set(album.tracks.map(t => t.songId));
  const songs = (showcase?.songs || []).filter(s => ids.has(s.id));
  const mains = songs.filter(s => !s.isRemix).length;
  const remixes = songs.filter(s => s.isRemix).length;
  const stations = showcase?.stations || [];
  const labels = (showcase?.bibleLabels || []).slice(0, 4);
  const gallery = showcase?.galleryCount || 0;
  return (
    <>
      <p className="rs-modal-lead">One purchase opens up everything {artistName} has here.</p>
      <div className="rs-show">
        <div className="rs-show-tile rs-show-album">
          <div className="rs-show-art">{album.coverUrl ? <img src={album.coverUrl} alt="" /> : null}</div>
          <div className="rs-show-cap">
            <strong>{album.title}</strong>
            <span>
              {mains} {mains === 1 ? "song" : "songs"}{remixes ? ` + ${remixes} remixes` : ""}, in full
              {album.out ? ", with downloads" : ", before it's out everywhere"}
            </span>
          </div>
        </div>
        <div className="rs-show-tile">
          <div className="rs-show-art rs-show-blur">
            {showcase?.heroUrl ? <img src={showcase.heroUrl} alt="" /> : null}
            <span className="rs-show-lock" aria-hidden="true">🔒</span>
          </div>
          <div className="rs-show-cap">
            <strong>Gallery</strong>
            <span>{gallery ? `${gallery} wallpapers and art pieces` : "Wallpapers and art"} made for supporters</span>
          </div>
        </div>
        <div className="rs-show-tile">
          <div className="rs-show-art rs-show-chat" aria-hidden="true">
            <span className="b1" /><span className="b2" /><span className="b3" />
          </div>
          <div className="rs-show-cap">
            <strong>Chat</strong>
            <span>With {artistName} and other supporters (opening soon)</span>
          </div>
        </div>
        <div className="rs-show-tile">
          <div className="rs-show-art rs-show-radio">
            {stations.slice(0, 3).map(st => <span key={st.slug}>{st.name}</span>)}
          </div>
          <div className="rs-show-cap">
            <strong>Radio</strong>
            <span>Every GeekFon station {artistName} is on</span>
          </div>
        </div>
        <div className="rs-show-tile">
          <div className="rs-show-art rs-show-story">
            {labels.length ? labels.map(l => <span key={l}>{l}</span>) : <span>Her story</span>}
          </div>
          <div className="rs-show-cap">
            <strong>{artistName}&apos;s full story</strong>
            <span>The whole Bible, plus the lyrics to every song</span>
          </div>
        </div>
      </div>
    </>
  );
}
