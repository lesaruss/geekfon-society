"use client";
// The artists' group chat on an artist's page (2026-10-04, Sean: "start
// building the chat, going back to what we used to have back in the day").
// Like the original GFS Chat: the crew talking day by day, a day picker,
// Translate on lines first written in another language, and drop cards for
// upcoming releases. Read from this artist's side: their lines sit on the
// right. Supporters read; staff post as any artist (and can schedule a line
// for later). Data and gating: app/api/roster/[artist]/chat.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, ChatPerson } from "@/app/api/roster/[artist]/chat/route";
import "./chat.css";

type Data = { day: string; days: string[]; today: string; messages: ChatMessage[]; people: Record<string, ChatPerson>; staff: boolean };

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

const LANGS: Record<string, string> = { ja: "Japanese", ko: "Korean", es: "Spanish", fr: "French", pt: "Portuguese", zh: "Chinese" };

export default function Chat({ slug, artistName }: { slug: string; artistName: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translated, setTranslated] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (day?: string) => {
    try {
      const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat${day ? `?day=${day}` : ""}`, { headers: await authHeaders(), cache: "no-store" });
      if (!res.ok) { setError(res.status === 403 ? "locked" : "error"); return; }
      setError(null);
      setData(await res.json());
    } catch { setError("error"); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  // Open on the latest line of the day, like any chat.
  useEffect(() => { const f = feedRef.current; if (f) f.scrollTop = f.scrollHeight; }, [data?.day, data?.messages.length]);

  const idx = data ? data.days.indexOf(data.day) : -1;
  const prev = data && idx > 0 ? data.days[idx - 1] : null;
  const next = data && idx >= 0 && idx < data.days.length - 1 ? data.days[idx + 1] : null;
  const cast = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>([slug]);
    data.messages.forEach(m => seen.add(m.from));
    return [...seen].filter(s => data.people[s]);
  }, [data, slug]);

  if (error === "locked") return null;
  if (error) return <div className="ch-empty">The chat didn&apos;t load. Try again in a moment.</div>;
  if (!data) return <div className="ch-shell ch-loading" aria-busy="true"><div className="ch-spin" /></div>;

  const person = (s: string): ChatPerson => data.people[s] || { name: s, avatar: null, accent: null };

  return (
    <div className="ch-shell">
      <header className="ch-head">
        <div className="ch-room">
          <strong>GeekFon crew</strong>
          <span>Group chat · {artistName}&apos;s side</span>
        </div>
        <div className="ch-cast" aria-label="In this chat">
          {cast.slice(0, 6).map(s => {
            const p = person(s);
            return p.avatar
              ? <img key={s} src={p.avatar} alt={p.name} title={p.name} style={{ borderColor: p.accent || undefined }} />
              : <span key={s} className="ch-av-ph" title={p.name} style={{ background: p.accent || "#999" }}>{p.name.charAt(0)}</span>;
          })}
        </div>
      </header>

      <nav className="ch-days" aria-label="Chat days">
        <button type="button" className="ch-day-arrow" disabled={!prev} onClick={() => prev && load(prev)} aria-label="Previous day">‹</button>
        <label className="ch-day-pick">
          <span className="ch-day-label">{dayLabel(data.day, data.today)}</span>
          <select value={data.day} onChange={e => load(e.target.value)} aria-label="Pick a day">
            {[...data.days].reverse().map(d => <option key={d} value={d}>{dayLabel(d, data.today)}{d > data.today ? " (scheduled)" : ""}</option>)}
          </select>
        </label>
        <button type="button" className="ch-day-arrow" disabled={!next} onClick={() => next && load(next)} aria-label="Next day">›</button>
      </nav>

      <div className="ch-feed" ref={feedRef}>
        {data.messages.length === 0 && <div className="ch-empty">Nobody&apos;s said anything yet today.</div>}
        {data.messages.map((m, i) => {
          const p = person(m.from);
          const me = m.from === slug;
          const grouped = i > 0 && data.messages[i - 1].from === m.from;
          const showOriginal = !!m.original && !translated.has(m.id);
          return (
            <div key={m.id} className={"ch-msg" + (me ? " me" : "") + (grouped ? " grouped" : "") + (m.scheduled ? " scheduled" : "")}>
              {!me && (grouped ? <span className="ch-av-gap" /> : p.avatar
                ? <img className="ch-av" src={p.avatar} alt="" style={{ borderColor: p.accent || undefined }} />
                : <span className="ch-av ch-av-ph" style={{ background: p.accent || "#999" }}>{p.name.charAt(0)}</span>)}
              <div className="ch-col">
                {!grouped && (
                  <div className="ch-meta">
                    {!me && <span className="ch-name" style={{ color: p.accent || undefined }}>{p.name}</span>}
                    <span className="ch-time">{timeLabel(m.postedAt)}{m.scheduled ? " · scheduled" : ""}</span>
                  </div>
                )}
                {m.kind === "drop" ? (
                  <div className="ch-drop">
                    {m.drop?.cover ? <img src={m.drop.cover} alt="" /> : <span className="ch-drop-ph" style={{ background: p.accent || "#222" }} />}
                    <div>
                      <span className="ch-drop-label">{m.drop?.label || "New drop"}</span>
                      <strong>{m.drop?.title || m.body}</strong>
                      <em>{p.name}</em>
                      {m.drop?.title && <p>{m.body}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="ch-bubble" style={me ? { background: p.accent || undefined } : undefined}>
                    {showOriginal ? m.original : m.body}
                  </div>
                )}
                {m.original && (
                  <button type="button" className="ch-tr" onClick={() => setTranslated(s => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}>
                    {showOriginal ? `↻ Translate${m.originalLang && LANGS[m.originalLang] ? ` from ${LANGS[m.originalLang]}` : ""}` : "↺ Show original"}
                  </button>
                )}
                {data.staff && <DeleteLine slug={slug} id={m.id} onDone={() => load(data.day)} />}
              </div>
            </div>
          );
        })}
      </div>

      {data.staff
        ? <Composer slug={slug} people={data.people} onPosted={day => load(day)} />
        : <div className="ch-foot">You&apos;re reading the crew&apos;s group chat. New lines land here every day.</div>}
    </div>
  );
}

function DeleteLine({ slug, id, onDone }: { slug: string; id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="ch-del" disabled={busy} onClick={async () => {
      if (!confirm("Delete this line?")) return;
      setBusy(true);
      await fetch(`/api/roster/${encodeURIComponent(slug)}/chat?id=${id}`, { method: "DELETE", headers: await authHeaders() });
      setBusy(false);
      onDone();
    }}>Delete</button>
  );
}

// Staff only: post a line as any artist, now or scheduled.
function Composer({ slug, people, onPosted }: { slug: string; people: Record<string, ChatPerson>; onPosted: (day: string) => void }) {
  const [from, setFrom] = useState(slug);
  const [body, setBody] = useState("");
  const [original, setOriginal] = useState("");
  const [lang, setLang] = useState("ja");
  const [when, setWhen] = useState("");
  const [drop, setDrop] = useState(false);
  const [dropTitle, setDropTitle] = useState("");
  const [dropLabel, setDropLabel] = useState("");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function post() {
    if (!body.trim()) return;
    setBusy(true); setErr(null);
    const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        from, body,
        ...(original.trim() ? { original, originalLang: lang } : {}),
        ...(when ? { postedAt: new Date(when).toISOString() } : {}),
        ...(drop ? { kind: "drop", drop: { title: dropTitle, label: dropLabel } } : {}),
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || "Couldn't post."); return; }
    const { day } = await res.json();
    setBody(""); setOriginal(""); setDropTitle(""); setDropLabel("");
    onPosted(day);
  }

  return (
    <form className="ch-compose" onSubmit={e => { e.preventDefault(); post(); }}>
      <div className="ch-compose-row">
        <select value={from} onChange={e => setFrom(e.target.value)} aria-label="Post as">
          {Object.entries(people).map(([s, p]) => <option key={s} value={s}>{p.name}</option>)}
        </select>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder={drop ? "What they say about it" : "Write a line (English)"} aria-label="Line" />
        <button type="submit" className="ch-send" disabled={busy || !body.trim()}>{busy ? "…" : when ? "Schedule" : "Post"}</button>
      </div>
      <button type="button" className="ch-more" onClick={() => setMore(m => !m)}>{more ? "Fewer options" : "Original language, drop card, schedule"}</button>
      {more && (
        <div className="ch-compose-more">
          <label>Original
            <span className="ch-inline">
              <select value={lang} onChange={e => setLang(e.target.value)} aria-label="Original language">
                {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={original} onChange={e => setOriginal(e.target.value)} placeholder="Optional: the line as they wrote it" />
            </span>
          </label>
          <label className="ch-check"><input type="checkbox" checked={drop} onChange={e => setDrop(e.target.checked)} /> Drop card</label>
          {drop && (
            <span className="ch-inline">
              <input value={dropTitle} onChange={e => setDropTitle(e.target.value)} placeholder="Song title" />
              <input value={dropLabel} onChange={e => setDropLabel(e.target.value)} placeholder="Label, e.g. Dropping Friday" />
            </span>
          )}
          <label>Post at (your local time; blank posts now)
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
          </label>
        </div>
      )}
      {err && <p className="ch-err">{err}</p>}
    </form>
  );
}
