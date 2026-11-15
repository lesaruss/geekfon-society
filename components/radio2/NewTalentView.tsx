"use client";
// New Talent (/new-talent): artists send their music to GeekFon Radio (Sean, 2026-11-15,
// playbook geekfon-radio Phase 2). In the Seat 2 shell so the radio keeps playing.
// How it works on top, then the form in steps (one step per view, ?step= in the address,
// Back / Step N of M / Next, Next checks the step, the last step holds the terms and Send).
// Songs upload straight to the private bucket (signed URL), then /api/new-talent saves the row.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useShell } from "./RadioShell";
import { NEW_TALENT } from "./radioData";

const TITLE = "New Talent, GeekFon Society";
const STEPS = ["You", "Your music", "About you", "Send"] as const;
const GENRES = ["Hip-Hop / Rap", "R&B / Soul", "Pop", "J-Pop / K-Pop", "Rock", "Reggae / Dancehall / Riddim", "Afrobeats", "Latin / Reggaeton", "Electronic", "Country", "Gospel", "Other"];
const MAX_MB = 50;

type Song = { title: string; kind: "file" | "link"; file: File | null; url: string };
const blankSong = (): Song => ({ title: "", kind: "file", file: null, url: "" });

function readStep(): number {
  try { const n = parseInt(new URLSearchParams(window.location.search).get("step") || "1", 10); return n >= 1 && n <= STEPS.length ? n : 1; } catch { return 1; }
}
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const isUrl = (v: string) => { try { const u = new URL(v.trim()); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; } };

export default function NewTalentView() {
  const { setBaseTitle } = useShell();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ artistName: "", contactName: "", email: "", city: "", genre: "", bio: "", links: "", website: "" });
  const [songs, setSongs] = useState<Song[]>([blankSong()]);
  const [owns, setOwns] = useState(false);
  const [perm, setPerm] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => { setBaseTitle(TITLE); }, [setBaseTitle]);
  useEffect(() => {
    setStep(readStep());
    const onPop = () => { setStep(readStep()); setErr(""); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goStep = useCallback((n: number) => {
    setErr("");
    setStep(n);
    try {
      const url = new URL(window.location.href);
      if (n === 1) url.searchParams.delete("step"); else url.searchParams.set("step", String(n));
      window.history.pushState(window.history.state, "", url.toString());
      document.getElementById("ntForm")?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch { /* ignore */ }
  }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setErr(""); setF(p => ({ ...p, [k]: e.target.value })); };
  const setSong = (i: number, patch: Partial<Song>) => { setErr(""); setSongs(list => list.map((s, j) => (j === i ? { ...s, ...patch } : s))); };

  const check = (n: number): string => {
    if (n === 1) {
      if (!f.artistName.trim()) return "Add your artist name.";
      if (!f.contactName.trim()) return "Add your name.";
      if (!isEmail(f.email)) return "Check your email address.";
    }
    if (n === 2) {
      if (!f.genre) return "Pick the genre that fits best.";
      for (const [i, s] of songs.entries()) {
        const which = songs.length > 1 ? `Song ${i + 1}: ` : "";
        if (!s.title.trim()) return which + "add the song title.";
        if (s.kind === "file" && !s.file) return which + "choose the audio file, or switch to a link.";
        if (s.kind === "file" && s.file && s.file.size > MAX_MB * 1024 * 1024) return which + `the file is over ${MAX_MB} MB.`;
        if (s.kind === "link" && !isUrl(s.url)) return which + "paste the full link, starting with https://";
      }
    }
    if (n === 4 && !(owns && perm)) return "Tick both boxes to send.";
    return "";
  };

  const next = () => { const e = check(step); if (e) { setErr(e); return; } goStep(step + 1); };

  const send = async () => {
    for (const n of [1, 2, 4]) { const e = check(n); if (e) { if (n !== step) goStep(n); setErr(e); return; } }
    setErr("");
    try {
      const out: { title: string; kind: "file" | "link"; path?: string; url?: string }[] = [];
      for (const [i, s] of songs.entries()) {
        if (s.kind === "link") { out.push({ title: s.title.trim(), kind: "link", url: s.url.trim() }); continue; }
        const file = s.file!;
        setBusy(`Uploading ${songs.length > 1 ? `song ${i + 1} of ${songs.length}` : "your song"}...`);
        const r = await fetch("/api/new-talent/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type || "audio/mpeg", size: file.size }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.signedUrl) throw new Error(d.error || "Could not start the upload.");
        const up = await fetch(d.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "audio/mpeg" }, body: file });
        if (!up.ok) throw new Error("The upload did not finish. Try again.");
        out.push({ title: s.title.trim(), kind: "file", path: d.path });
      }
      setBusy("Sending...");
      const r = await fetch("/api/new-talent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, songs: out, ownsRights: owns, permissionToPlay: perm }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "We could not send that. Try again.");
      setDone(true);
      document.getElementById("ntForm")?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const field = (k: keyof typeof f, label: string, opts: { req?: boolean; type?: string; ph?: string; auto?: string } = {}) => (
    <label className="ntf">
      <span>{label}{opts.req ? <i aria-hidden="true"> *</i> : <em> (optional)</em>}</span>
      <input type={opts.type || "text"} value={f[k]} onChange={set(k)} placeholder={opts.ph} autoComplete={opts.auto} required={opts.req} />
    </label>
  );

  return (
    <div className="nt" style={{ "--c": NEW_TALENT.color, "--i": NEW_TALENT.ink } as React.CSSProperties}>
      <div className="vhead">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">GeekFon Society</Link><span aria-hidden="true">›</span><span aria-current="page">New Talent</span></nav>
        <h1>New Talent</h1>
        <p>Make music? Send it to GeekFon Radio. New Talent is the station for brand new artists, and it is free to be heard.</p>
      </div>

      <section className="nthow" aria-label="How it works">
        <div><b>Free</b><span>No fee to send your music, now or later.</span></div>
        <div><b>You keep your rights</b><span>Your songs stay yours. You only give us permission to play them.</span></div>
        <div><b>We listen to every song</b><span>The GeekFon team listens to everything that comes in.</span></div>
        <div><b>When it plays</b><span>Songs we pick play on New Talent when the station opens. Sending does not promise a spot.</span></div>
      </section>

      <section id="ntForm" className="ntcard" aria-live="polite">
        {done ? (
          <div className="ntdone">
            <span className="ntok" aria-hidden="true">✓</span>
            <h2>Got it. Thank you, {f.artistName.trim() || "artist"}.</h2>
            <p>The GeekFon team will listen to {songs.length > 1 ? "your songs" : "your song"}. If we pick {songs.length > 1 ? "one" : "it"} for New Talent, we will write to {f.email.trim()}.</p>
            <Link className="pill" href="/">Back to the radio</Link>
          </div>
        ) : (
          <>
            <ol className="ntsteps" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={step > i + 1 ? "done" : ""}><span>{i + 1}</span>{s}</li>
              ))}
            </ol>

            <input className="nthp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set("website")} />

            {step === 1 ? (
              <div className="ntgrid">
                {field("artistName", "Artist or band name", { req: true, auto: "off" })}
                {field("contactName", "Your name", { req: true, auto: "name" })}
                {field("email", "Email", { req: true, type: "email", auto: "email" })}
                {field("city", "City", { ph: "Where you make your music", auto: "address-level2" })}
              </div>
            ) : null}

            {step === 2 ? (
              <>
                <label className="ntf ntgenre">
                  <span>Genre<i aria-hidden="true"> *</i></span>
                  <select value={f.genre} onChange={set("genre")} required>
                    <option value="">Pick the closest fit</option>
                    {GENRES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </label>
                <div className="ntsongs">
                  {songs.map((s, i) => (
                    <div key={i} className="ntsong">
                      <div className="ntsong-h">
                        <b>Song {i + 1}</b>
                        {songs.length > 1 ? <button type="button" className="ntx" onClick={() => setSongs(l => l.filter((_, j) => j !== i))}>Remove</button> : null}
                      </div>
                      <label className="ntf"><span>Title<i aria-hidden="true"> *</i></span><input type="text" value={s.title} onChange={e => setSong(i, { title: e.target.value })} /></label>
                      <div className="ntseg" role="group" aria-label={`How to send song ${i + 1}`}>
                        <button type="button" aria-pressed={s.kind === "file"} onClick={() => setSong(i, { kind: "file" })}>Upload a file</button>
                        <button type="button" aria-pressed={s.kind === "link"} onClick={() => setSong(i, { kind: "link" })}>Paste a link</button>
                      </div>
                      {s.kind === "file" ? (
                        <label className="ntfile">
                          <input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,audio/flac,.mp3,.wav,.m4a,.aac,.flac" onChange={e => setSong(i, { file: e.target.files?.[0] || null })} />
                          <span className="ntfile-b">{s.file ? "Change file" : "Choose audio file"}</span>
                          <span className="ntfile-n">{s.file ? `${s.file.name} · ${(s.file.size / 1048576).toFixed(1)} MB` : `MP3, WAV, M4A, AAC or FLAC, up to ${MAX_MB} MB`}</span>
                        </label>
                      ) : (
                        <label className="ntf"><span>Link<i aria-hidden="true"> *</i></span><input type="url" inputMode="url" value={s.url} onChange={e => setSong(i, { url: e.target.value })} placeholder="https:// (SoundCloud, Dropbox, Google Drive, YouTube...)" /></label>
                      )}
                    </div>
                  ))}
                </div>
                {songs.length < 3 ? <button type="button" className="pill ghost ntadd" onClick={() => setSongs(l => [...l, blankSong()])}>Add another song</button> : null}
                <p className="ntnote">Up to three songs. Send your best first.</p>
              </>
            ) : null}

            {step === 3 ? (
              <div className="ntgrid one">
                <label className="ntf"><span>About you<em> (optional)</em></span><textarea rows={5} value={f.bio} onChange={set("bio")} placeholder="Who you are, your sound, and what you are working on." /></label>
                <label className="ntf"><span>Where to find you<em> (optional)</em></span><textarea rows={3} value={f.links} onChange={set("links")} placeholder="Instagram, TikTok, YouTube, Spotify or your website, one per line" /></label>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="ntsend">
                <div className="ntsum">
                  <div><small>Artist</small><b>{f.artistName}</b></div>
                  <div><small>Genre</small><b>{f.genre}</b></div>
                  <div><small>{songs.length > 1 ? "Songs" : "Song"}</small><b>{songs.map(s => s.title).join(", ")}</b></div>
                  <div><small>We will write to</small><b>{f.email}</b></div>
                </div>
                <label className="ntchk"><input type="checkbox" checked={owns} onChange={e => setOwns(e.target.checked)} /><span>I wrote and own these songs, or I have permission from everyone who does.</span></label>
                <label className="ntchk"><input type="checkbox" checked={perm} onChange={e => setPerm(e.target.checked)} /><span>GeekFon Society may play these songs on GeekFon Radio and show my artist name, picture and lyrics with them. I keep all my rights, and I can ask for a song to be taken down at any time.</span></label>
              </div>
            ) : null}

            {err ? <p className="nterr" role="alert">{err}</p> : null}

            <div className="ntnav">
              {step > 1 ? <button type="button" className="pill ghost" onClick={() => goStep(step - 1)} disabled={!!busy}>Back</button> : <span />}
              <span className="ntcount">Step {step} of {STEPS.length}</span>
              {step < STEPS.length
                ? <button type="button" className="pill ntgo" onClick={next}>Next</button>
                : <button type="button" className="pill ntgo" onClick={send} disabled={!!busy}>{busy || "Send my music"}</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
