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
import type { PublicAlbum } from "@/lib/server/depot";
import "./roster.css";

type Props = {
  artistName: string;
  slug: string;
  albums: PublicAlbum[];
  signedIn: boolean;
  onClose: () => void;
};

export default function SupportModal({ artistName, slug, albums, signedIn, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sell the album that is building now if there is one (a pre-order makes
  // the buyer a Founding Fan), otherwise the newest released album.
  const album = albums.find(a => a.status !== "released") ?? [...albums].reverse().find(a => a.status === "released") ?? null;

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
      <div className="rs-modal" role="dialog" aria-modal="true" aria-labelledby="rs-modal-title" onClick={e => e.stopPropagation()}>
        <h3 id="rs-modal-title" className="rs-modal-title">Support {artistName}</h3>
        <ul className="rs-modal-list">
          <li>Every song in the vault, streamed in full: unreleased and in development</li>
          <li>Lyrics and the full Bible</li>
          <li>New songs as they land, one or two a month</li>
        </ul>
        {album ? (
          <>
            <p className="rs-modal-note">
              $11, one time.{album.status !== "released" ? ` Includes the ${album.title} pre-order and a Founding Fan badge.` : ` Includes ${album.title}.`}
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
