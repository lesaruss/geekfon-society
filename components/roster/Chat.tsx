"use client";
// The artists' group chat on an artist's page (2026-10-04, Sean: "start
// building the chat, going back to what we used to have back in the day").
// Like the original GFS Chat: the crew talking day by day, a day picker,
// Translate on lines first written in another language, and drop cards for
// upcoming releases. Read from this artist's side: their lines sit on the
// right. Supporters read; the lines come from the Chat Writers' Room
// (app/dashboard/chat-room), where staff plan, generate and approve each day.
// Data and gating: app/api/roster/[artist]/chat.
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
  const shellRef = useRef<HTMLDivElement | null>(null);

  // Fit the chat to the screen so the page itself never scrolls (Sean,
  // 2026-10-04: "it goes too low... it should stop a little above the
  // selector"): it ends just above the app dock on phones, or at the
  // bottom of the window on desktop; only the messages scroll.
  useEffect(() => {
    const fit = () => {
      const el = shellRef.current;
      if (!el) return;
      const phone = window.innerWidth <= 760;
      const body = el.closest(".gw-body") as HTMLElement | null;
      // Phones: the page scrolls, so measure from the top of the document;
      // the dock covers the bottom 92px (plus the safe area).
      const top = el.getBoundingClientRect().top + (phone ? window.scrollY : 0);
      const limit = phone
        ? window.innerHeight - 92 - 14
        : Math.min(window.innerHeight, body ? body.getBoundingClientRect().bottom : window.innerHeight) - 18;
      el.style.height = `${Math.max(360, Math.floor(limit - top))}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [data !== null]);

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
  if (!data) return <div ref={shellRef} className="ch-shell ch-loading" aria-busy="true"><div className="ch-spin" /></div>;

  const person = (s: string): ChatPerson => data.people[s] || { name: s, avatar: null, accent: null };

  return (
    <div ref={shellRef} className="ch-shell">
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Lines are written in the Chat Writers' Room, never here (Sean, 2026-10-04).
          AI attribution per the roster's content rules. */}
      <div className="ch-foot">
        A scripted look inside the crew&apos;s group chat, written with AI and approved by GeekFon. New lines land every day.
        {data.staff && <> <a href="/dashboard/chat-room">Edit in the Writers&apos; Room</a></>}
      </div>
    </div>
  );
}
