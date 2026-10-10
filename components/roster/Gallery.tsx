"use client";
// Gallery tab of the public roster (2026-10-04, Sean): wallpapers and art made
// for fans. Public items show to everyone; supporter items come back from the
// access route as signed URLs once the server confirms the viewer; staff also
// see admin-only items. lib/server/gallery.ts decides what each level may see.
// New art is added by the team straight to storage, so there is no upload
// form on the site (Sean, 2026-10-10).
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GalleryItem } from "@/lib/server/gallery";
import "./roster.css";

type Props = {
  artistName: string;
  slug: string;
  publicItems: GalleryItem[];
  featured?: GalleryItem[];       // the artist's current portraits and covers, first
  lockedCount: number;
  supporterItems?: GalleryItem[]; // from the access route (supporters, staff)
  supporter: boolean;             // as this viewer is shown the page (respects View As)
  staff: boolean;
  onSupport: () => void;
  onChanged: () => void;
};

const LEVEL_LABEL: Record<string, string> = { public: "Everyone", supporter: "Supporters", admin: "Admin only" };

export default function Gallery({ artistName, publicItems, featured = [], lockedCount, supporterItems, supporter, staff, onSupport, onChanged }: Props) {
  // Current art first (big tile = the music portrait), then the gallery rows.
  const items = [...featured, ...(supporter && supporterItems ? supporterItems : publicItems)];
  const [open, setOpen] = useState<GalleryItem | null>(null);

  return (
    <section className="rs-wrap">
      <div className="rs-head">
        <h2 className="rs-title">Gallery</h2>
        <span className="rs-count">Wallpapers and art made for {artistName}&apos;s supporters</span>
      </div>

      {!supporter && (
        <div className="rs-banner">
          <div>
            <strong>{featured.length ? "Downloads and every wallpaper are for supporters." : "The Gallery is for supporters."}</strong>{" "}
            {lockedCount > 0
              ? `${lockedCount} ${lockedCount === 1 ? "wallpaper is" : "wallpapers are"} waiting, with new ones as they're made.`
              : `Phone and desktop wallpapers and art made just for ${artistName}'s supporters, starting soon.`}
          </div>
          <button className="rs-cta" onClick={onSupport}>Support {artistName}</button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rs-empty">{supporter ? `The first ${artistName} wallpapers land here soon.` : ""}</p>
      ) : (
        <div className="rs-gallery">
          {items.map(it => (
            <button key={it.id} className="rs-tile" onClick={() => setOpen(it)} aria-label={`Open ${it.title || "image"}`}>
              <img src={it.thumb || it.url} alt={it.title || ""} loading="lazy" />
              {staff && !it.featured && <span className={"rs-tile-level rs-level-" + it.visibility}>{LEVEL_LABEL[it.visibility]}</span>}
              {it.title && <span className="rs-tile-title">{it.title}</span>}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="rs-modal-overlay" onClick={() => setOpen(null)}>
          <div className="rs-lightbox" role="dialog" aria-modal="true" aria-label={open.title || "Image"} onClick={e => e.stopPropagation()}>
            <img src={open.url} alt={open.title || ""} />
            <div className="rs-lightbox-bar">
              <span>{open.title}</span>
              <span className="rs-lightbox-actions">
                {supporter
                  ? <a className="rs-cta" href={open.download}>Download</a>
                  : <button className="rs-cta" onClick={() => { setOpen(null); onSupport(); }}>Support to download</button>}
                {staff && !open.featured && <DeleteButton id={open.id} onDone={() => { setOpen(null); onChanged(); }} />}
                <button className="rs-dismiss" onClick={() => setOpen(null)}>Close</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm("Remove this image from the gallery?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE", headers: await authHeader() });
    setBusy(false);
    if (res.ok) onDone();
  }
  return <button className="rs-dismiss" onClick={del} disabled={busy}>{busy ? "Removing..." : "Remove"}</button>;
}
