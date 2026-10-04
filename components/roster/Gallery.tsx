"use client";
// Gallery tab of the public roster (2026-10-04, Sean): wallpapers and art made
// for fans. Public items show to everyone; supporter items come back from the
// access route as signed URLs once the server confirms the viewer; staff also
// see admin-only items and get an upload form. lib/server/gallery.ts decides
// what each level may see.
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GalleryItem } from "@/lib/server/gallery";
import "./roster.css";

type Props = {
  artistName: string;
  slug: string;
  publicItems: GalleryItem[];
  lockedCount: number;
  supporterItems?: GalleryItem[]; // from the access route (supporters, staff)
  supporter: boolean;             // as this viewer is shown the page (respects View As)
  staff: boolean;
  onSupport: () => void;
  onChanged: () => void;
};

const LEVEL_LABEL: Record<string, string> = { public: "Everyone", supporter: "Supporters", admin: "Admin only" };

export default function Gallery({ artistName, slug, publicItems, lockedCount, supporterItems, supporter, staff, onSupport, onChanged }: Props) {
  const items = supporter && supporterItems ? supporterItems : publicItems;
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
            <strong>The Gallery is for supporters.</strong>{" "}
            {lockedCount > 0
              ? `${lockedCount} ${lockedCount === 1 ? "wallpaper is" : "wallpapers are"} waiting, with new ones as they're made.`
              : `Phone and desktop wallpapers and art made just for ${artistName}'s supporters, starting soon.`}
          </div>
          <button className="rs-cta" onClick={onSupport}>Support {artistName}</button>
        </div>
      )}

      {staff && supporter && <UploadForm slug={slug} onDone={onChanged} />}

      {items.length === 0 ? (
        <p className="rs-empty">{supporter ? `The first ${artistName} wallpapers land here soon.` : ""}</p>
      ) : (
        <div className="rs-gallery">
          {items.map(it => (
            <button key={it.id} className="rs-tile" onClick={() => setOpen(it)} aria-label={`Open ${it.title || "image"}`}>
              <img src={it.url} alt={it.title || ""} loading="lazy" />
              {staff && <span className={"rs-tile-level rs-level-" + it.visibility}>{LEVEL_LABEL[it.visibility]}</span>}
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
                <a className="rs-cta" href={open.download}>Download</a>
                {staff && <DeleteButton id={open.id} onDone={() => { setOpen(null); onChanged(); }} />}
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

function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function UploadForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("supporter");
  const [kind, setKind] = useState("wallpaper");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const size = await imageSize(file);
    const fd = new FormData();
    fd.set("artist", slug);
    fd.set("file", file);
    fd.set("title", title);
    fd.set("visibility", visibility);
    fd.set("kind", kind);
    if (size) { fd.set("width", String(size.w)); fd.set("height", String(size.h)); }
    try {
      const res = await fetch("/api/admin/gallery", { method: "POST", headers: await authHeader(), body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(body.error || "Upload failed.");
      else { setFile(null); setTitle(""); setMsg("Added."); onDone(); }
    } catch {
      setMsg("Upload failed.");
    }
    setBusy(false);
  }

  return (
    <form className="rs-upload" onSubmit={submit}>
      <strong className="rs-upload-head">Add to the gallery <span>(only you see this)</span></strong>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} />
      <input type="text" placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
      <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Kind">
        <option value="wallpaper">Wallpaper</option>
        <option value="art">Art</option>
        <option value="photo">Photo</option>
      </select>
      <select value={visibility} onChange={e => setVisibility(e.target.value)} aria-label="Who sees it">
        <option value="supporter">Supporters</option>
        <option value="public">Everyone</option>
        <option value="admin">Admin only</option>
      </select>
      <button className="rs-cta" type="submit" disabled={!file || busy}>{busy ? "Uploading..." : "Upload"}</button>
      {msg && <span className="rs-upload-msg">{msg}</span>}
    </form>
  );
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
