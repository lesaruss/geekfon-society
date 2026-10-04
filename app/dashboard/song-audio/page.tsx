"use client";
// Song audio: replace a depot song's audio (staff only). 2026-10-04, Sean
// asked for an upload link after the depot check found instrumentals saved
// as the vocal versions. Files go straight from this page to storage with a
// one-time signed URL (lib/server/songAudio.ts); the server then points the
// song at the new file and, for the MP3, checks it has vocals.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "../context";
import { supabase } from "@/lib/supabase";

type Song = {
  id: string; slug: string; title: string; primary_artist_slug: string; artist_name: string;
  src_path: string | null; master_path: string | null; duration_seconds: number | null;
  uploaded_at: string | null; master_uploaded_at: string | null; is_remix: boolean | null; flagged: boolean;
};
type RowState = { busy?: string; done?: string; error?: string; vocals?: { words: number; sample: string } | null };

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function audioDuration(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => { resolve(isFinite(a.duration) ? a.duration : null); URL.revokeObjectURL(url); };
    a.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    a.src = url;
  });
}

function fmt(s: number | null) { return s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "--:--"; }
function when(iso: string | null) { return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""; }

export default function SongAudioPage() {
  const { loading } = useDashboard();
  const [songs, setSongs] = useState<Song[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/song-audio", { headers: await authHeaders(), cache: "no-store" });
    if (!res.ok) { setErr(res.status === 403 ? "This page is for staff." : "Couldn't load songs."); return; }
    setSongs((await res.json()).songs || []);
    setErr(null);
  }, []);
  useEffect(() => { if (!loading) load(); }, [loading, load]);

  const setRow = (id: string, s: RowState) => setRows(r => ({ ...r, [id]: { ...r[id], ...s } }));

  async function upload(song: Song, kind: "stream" | "master", file: File) {
    const want = kind === "stream" ? /\.mp3$/i : /\.wav$/i;
    if (!want.test(file.name)) { setRow(song.id, { error: kind === "stream" ? "Choose the MP3." : "Choose the WAV.", done: undefined }); return; }
    setRow(song.id, { busy: `Uploading ${kind === "stream" ? "MP3" : "WAV"}...`, error: undefined, done: undefined });
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const signRes = await fetch("/api/admin/song-audio/sign", { method: "POST", headers, body: JSON.stringify({ songId: song.id, kind }) });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || "Could not start the upload");
      const { error: upErr } = await supabase.storage.from(sign.bucket).uploadToSignedUrl(sign.path, sign.token, file, { contentType: kind === "stream" ? "audio/mpeg" : "audio/wav" });
      if (upErr) throw new Error(upErr.message);
      setRow(song.id, { busy: kind === "stream" ? "Saved. Checking for vocals (up to a minute)..." : "Saving..." });
      const durationSeconds = kind === "stream" ? await audioDuration(file) : null;
      const finRes = await fetch("/api/admin/song-audio/finalize", { method: "POST", headers, body: JSON.stringify({ songId: song.id, kind, path: sign.path, durationSeconds, sizeBytes: file.size }) });
      const fin = await finRes.json();
      if (!finRes.ok) throw new Error(fin.error || "Could not save");
      setRow(song.id, {
        busy: undefined,
        vocals: fin.vocals ?? null,
        done: kind === "master" ? "WAV master replaced." : fin.checkError ? `MP3 replaced. ${fin.checkError}` : "MP3 replaced.",
      });
      load();
    } catch (e) {
      setRow(song.id, { busy: undefined, error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? songs.filter(s => `${s.artist_name} ${s.title}`.toLowerCase().includes(t)) : songs;
    return [...list.filter(s => s.flagged), ...list.filter(s => !s.flagged)];
  }, [songs, q]);

  return (
    <div className="sa">
      <h1>Song audio</h1>
      <p className="sa-sub">Replace a song&apos;s audio. Upload the <strong>MP3</strong> to change what plays on the site and radio (it&apos;s checked for vocals automatically); the <strong>WAV</strong> master is optional. The old file is kept, only the song points to the new one.</p>
      <input className="sa-search" placeholder="Search artist or song" value={q} onChange={e => setQ(e.target.value)} />
      {err && <p className="sa-err">{err}</p>}
      <div className="sa-list">
        {shown.map(s => {
          const r = rows[s.id] || {};
          return (
            <div key={s.id} className={"sa-row" + (s.flagged ? " flag" : "")}>
              <div className="sa-main">
                <div className="sa-title">{s.title}{s.flagged && <span className="sa-flag">Instrumental in depot</span>}</div>
                <div className="sa-meta">{s.artist_name} · {fmt(s.duration_seconds)}{s.uploaded_at ? ` · MP3 ${when(s.uploaded_at)}` : ""}{s.master_uploaded_at ? ` · WAV ${when(s.master_uploaded_at)}` : ""}</div>
                {r.busy && <div className="sa-status">{r.busy}</div>}
                {r.error && <div className="sa-err">{r.error}</div>}
                {r.done && <div className="sa-ok">{r.done}</div>}
                {r.vocals && (
                  <div className={r.vocals.words >= 20 ? "sa-ok" : "sa-err"}>
                    {r.vocals.words >= 20 ? `Vocals found (${r.vocals.words} words): “${r.vocals.sample}…”` : `No vocals detected (${r.vocals.words} words). This looks like an instrumental.`}
                  </div>
                )}
              </div>
              <div className="sa-actions">
                <label className="sa-btn sa-btn-go">Upload MP3<input type="file" accept=".mp3,audio/mpeg" hidden disabled={!!r.busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(s, "stream", f); }} /></label>
                <label className="sa-btn">WAV<input type="file" accept=".wav,audio/wav,audio/x-wav" hidden disabled={!!r.busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(s, "master", f); }} /></label>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        .sa{max-width:900px;margin:0 auto;padding:24px 20px 60px}
        .sa h1{font-size:24px;font-weight:900;margin:0 0 6px}
        .sa-sub{font-size:14px;color:rgba(0,0,0,.6);line-height:1.55;margin:0 0 16px}
        .sa-search{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:10px 14px;border:1px solid rgba(0,0,0,.15);border-radius:10px;margin-bottom:14px}
        .sa-list{display:grid;gap:8px}
        .sa-row{display:flex;gap:14px;align-items:center;justify-content:space-between;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:12px 14px}
        .sa-row.flag{border-color:#f59e0b;background:#fffbeb}
        .sa-main{min-width:0;display:grid;gap:3px}
        .sa-title{font-weight:800;font-size:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .sa-flag{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;background:#f59e0b;color:#fff;border-radius:999px;padding:2px 8px}
        .sa-meta{font-size:12px;color:rgba(0,0,0,.55)}
        .sa-status{font-size:12px;color:#2563eb}
        .sa-ok{font-size:12px;color:#15803d}
        .sa-err{font-size:12px;color:#b91c1c}
        .sa-actions{display:flex;gap:6px;flex-shrink:0}
        .sa-btn{cursor:pointer;font-size:12px;font-weight:800;border:1px solid rgba(0,0,0,.2);border-radius:999px;padding:8px 14px;background:#fff}
        .sa-btn-go{background:#111;color:#fff;border-color:#111}
        @media(max-width:600px){.sa-row{flex-direction:column;align-items:stretch}}
      `}</style>
    </div>
  );
}
