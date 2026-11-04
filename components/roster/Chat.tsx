"use client";
// The artists' group chat on an artist's page (2026-10-04, Sean: "start
// building the chat, going back to what we used to have back in the day").
// Like the original GFS Chat: the crew talking day by day, a day picker,
// Translate on lines first written in another language, and drop cards for
// upcoming releases. Read from this artist's side: their lines sit on the
// right. The lines come from the Chat Writers' Room (app/dashboard/chat-room),
// where staff plan, generate and approve each day. Every day is open to read
// for everyone (Sean, 2026-11-04, lib/chatAccess.ts); taking part is the
// member feature: any signed-in account likes, supporters of this artist
// comment and reply, held for approval (app/api/roster/[artist]/chat/engage).
// Data: app/api/roster/[artist]/chat.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, ChatPerson, ChatLockedDay } from "@/app/api/roster/[artist]/chat/route";
import type { EngageCan, EngageCounts, ThreadComment } from "@/app/api/roster/[artist]/chat/engage/route";
import "./chat.css";

type Data = { day: string; days: string[]; today: string; messages: ChatMessage[]; locked: ChatLockedDay | null; freeDays: string[]; supporter: boolean; people: Record<string, ChatPerson>; staff: boolean };

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

// Times show in the reader's own time zone (Sean, 2026-10-05: "show the time
// ... in relation to the time of the person that's looking"). The story's
// days stay LA days; only the clock is local. Rendered client-side only, so
// the browser's zone is the reader's.
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Cast reactions under a line, one chip per emoji with a count; hovering
// shows who reacted.
function groupReactions(list: { emoji: string; from: string }[]): { emoji: string; from: string[] }[] {
  const out = new Map<string, string[]>();
  for (const r of list) out.set(r.emoji, [...(out.get(r.emoji) ?? []), r.from]);
  return [...out].map(([emoji, from]) => ({ emoji, from }));
}

// Media rides beside a line as a small icon and opens in a lightbox, so it
// never takes over the chat (Sean, 2026-10-05).
const MEDIA_ICON: Record<string, React.ReactNode> = {
  image: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  video: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  audio: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 10v4h4l5 4V6L8 10zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>,
};
const MEDIA_LABEL: Record<string, string> = { image: "View photo", video: "Watch video", audio: "Listen" };

const LANGS: Record<string, string> = { ja: "Japanese", ko: "Korean", es: "Spanish", fr: "French", pt: "Portuguese", zh: "Chinese" };

function registerHref(): string {
  return `/register?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`;
}

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const HEART = (on: boolean) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
);

// The thread under one chat line: comments with one level of replies, likes,
// and a box to join in for members. Comments wait for approval; the author
// sees theirs marked "Awaiting approval".
function Thread({ slug, artistName, messageId, can, authed, onSupport, onCount }: {
  slug: string; artistName: string; messageId: string; can: EngageCan; authed: () => Promise<Record<string, string>>;
  onSupport?: () => void; onCount: (d: number) => void;
}) {
  const [list, setList] = useState<ThreadComment[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ThreadComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage?message=${messageId}`, { headers: await authed(), cache: "no-store" });
    if (res.ok) setList((await res.json()).comments);
    else setList([]);
  }, [slug, messageId, authed]);
  useEffect(() => { load(); }, [load]);

  async function like(c: ThreadComment) {
    if (!can.signedIn) { window.location.href = registerHref(); return; }
    setList(l => (l ?? []).map(x => x.id === c.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage`, { method: "POST", headers: { "Content-Type": "application/json", ...(await authed()) }, body: JSON.stringify({ action: "like", kind: "comment", id: c.id }) });
    if (!res.ok) load();
  }

  async function post() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setMsg(null); setNote(null);
    const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage`, { method: "POST", headers: { "Content-Type": "application/json", ...(await authed()) }, body: JSON.stringify({ action: "comment", messageId, body, parentId: replyTo?.id }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(out.error || "Couldn't post that."); return; }
    setText(""); setReplyTo(null);
    const c = out.comment as ThreadComment;
    setList(l => [...(l ?? []), c]);
    if (c.pending) setNote("Thanks! Your comment is waiting for approval and shows here once it's approved.");
    else onCount(1);
  }

  const top = (list ?? []).filter(c => !c.parentId);
  const replies = (id: string) => (list ?? []).filter(c => c.parentId === id);
  const row = (c: ThreadComment, isReply: boolean) => (
    <div key={c.id} className={"ch-cm" + (isReply ? " reply" : "") + (c.pending ? " pending" : "")}>
      <div className="ch-cm-head"><strong>{c.name}</strong><span>{ago(c.createdAt)}</span>{c.pending && <em>Awaiting approval</em>}</div>
      <p>{c.body}</p>
      {!c.pending && (
        <div className="ch-cm-acts">
          <button type="button" className={"ch-cm-btn" + (c.liked ? " on" : "")} onClick={() => like(c)} aria-pressed={c.liked} aria-label={c.liked ? "Unlike" : "Like"}>{HEART(c.liked)}{c.likes > 0 && <b>{c.likes}</b>}</button>
          {can.comment && <button type="button" className="ch-cm-btn" onClick={() => { setReplyTo(c); setText(""); }}>Reply</button>}
        </div>
      )}
    </div>
  );

  return (
    <div className="ch-thread">
      {list === null && <div className="ch-cm-empty">Loading…</div>}
      {list !== null && top.length === 0 && <div className="ch-cm-empty">No comments yet. Start the thread.</div>}
      {top.map(c => (
        <div key={c.id}>
          {row(c, false)}
          {replies(c.id).map(r => row(r, true))}
        </div>
      ))}
      {can.comment ? (
        <div className="ch-cm-compose">
          {replyTo && <div className="ch-cm-replying">Replying to {replyTo.name} <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></div>}
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={500} rows={2} placeholder={replyTo ? "Write a reply…" : "Add a comment…"} aria-label="Comment" />
          <div className="ch-cm-send">
            <span>{text.length}/500</span>
            <button type="button" disabled={busy || !text.trim()} onClick={post}>{busy ? "Posting…" : replyTo ? "Reply" : "Comment"}</button>
          </div>
          {msg && <p className="ch-err">{msg}</p>}
          {note && <p className="ch-cm-note">{note}</p>}
        </div>
      ) : (
        <div className="ch-cm-gate">
          {can.why === "signin" && <>Reading is free. <a href={registerHref()}>Sign in</a> to like, and support {artistName} to join the conversation.</>}
          {can.why === "support" && <>Support {artistName} to comment and reply. {onSupport && <button type="button" onClick={onSupport}>Support {artistName} · $11</button>}</>}
          {can.why === "minor" && <>Comments are for members 18 and over. You can still like.</>}
        </div>
      )}
    </div>
  );
}

// onSupport opens the $11 album offer (the Support tour or modal on the page).
export default function Chat({ slug, artistName, onSupport }: { slug: string; artistName: string; onSupport?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translated, setTranslated] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const [engage, setEngage] = useState<{ counts: EngageCounts; can: EngageCan } | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setViewing(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);
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
  // Likes and comment counts for the day on screen.
  const loadEngage = useCallback(async (day: string) => {
    try {
      const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage?day=${day}`, { headers: await authHeaders(), cache: "no-store" });
      if (res.ok) setEngage(await res.json());
    } catch { /* counts are a nicety; the chat still reads without them */ }
  }, [slug]);
  useEffect(() => { setOpenThread(null); if (data?.day) loadEngage(data.day); }, [data?.day, loadEngage]);

  async function toggleLike(id: string) {
    if (!engage) return;
    if (!engage.can.signedIn) { window.location.href = registerHref(); return; }
    const cur = engage.counts[id] ?? { likes: 0, liked: false, comments: 0 };
    setEngage({ ...engage, counts: { ...engage.counts, [id]: { ...cur, liked: !cur.liked, likes: cur.likes + (cur.liked ? -1 : 1) } } });
    const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage`, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ action: "like", kind: "message", id }) });
    if (!res.ok && data) loadEngage(data.day);
  }
  const bumpComments = (id: string, d: number) => setEngage(e => e ? { ...e, counts: { ...e.counts, [id]: { ...(e.counts[id] ?? { likes: 0, liked: false, comments: 0 }), comments: (e.counts[id]?.comments ?? 0) + d } } } : e);

  // Open on the latest line of the day, like any chat.
  // Each day opens at its first line and reads down, like a story (Sean,
  // 2026-10-06: switching days left the reader mid-day, scrolling up).
  useEffect(() => { const f = feedRef.current; if (f) f.scrollTop = 0; }, [data?.day]);

  const idx = data ? data.days.indexOf(data.day) : -1;
  const prev = data && idx > 0 ? data.days[idx - 1] : null;
  const next = data && idx >= 0 && idx < data.days.length - 1 ? data.days[idx + 1] : null;
  const cast = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>([slug]);
    data.messages.forEach(m => seen.add(m.from));
    data.locked?.cast.forEach(s => seen.add(s));
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
            {[...data.days].reverse().map(d => <option key={d} value={d}>{dayLabel(d, data.today)}{d > data.today ? " (scheduled)" : ""}{!data.supporter && !data.freeDays.includes(d) ? " · supporters" : ""}</option>)}
          </select>
        </label>
        <button type="button" className="ch-day-arrow" disabled={!next} onClick={() => next && load(next)} aria-label="Next day">›</button>
      </nav>

      <div className="ch-feed" ref={feedRef}>
        {data.locked && (
          <div className="ch-locked">
            <div className="ch-locked-cast" aria-hidden="true">
              {data.locked.cast.slice(0, 6).map(s => {
                const p = person(s);
                return p.avatar
                  ? <img key={s} src={p.avatar} alt="" style={{ borderColor: p.accent || undefined }} />
                  : <span key={s} className="ch-av-ph" style={{ background: p.accent || "#999" }}>{p.name.charAt(0)}</span>;
              })}
            </div>
            <p className="ch-locked-who">{data.locked.cast.map(s => person(s).name).join(", ")} {data.locked.cast.length === 1 ? "is" : "are"} talking.</p>
            {data.locked.teaser && (
              <div className="ch-locked-teaser">
                <span className="ch-name" style={{ color: person(data.locked.teaser.from).accent || undefined }}>{person(data.locked.teaser.from).name}</span>
                <div className="ch-bubble">{data.locked.teaser.body}</div>
                <div className="ch-locked-fade" aria-hidden="true" />
              </div>
            )}
            <strong className="ch-locked-title">The rest of the story is for supporters</strong>
            <p className="ch-locked-text">October 1 to 3 are free. Support {artistName} and every day of the chat opens here, from {artistName}&apos;s side.</p>
            {onSupport && <button type="button" className="ch-locked-btn" onClick={onSupport}>Support {artistName} · $11</button>}
          </div>
        )}
        {!data.locked && data.messages.length === 0 && <div className="ch-empty">Nobody&apos;s said anything yet today.</div>}
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
                  <div className="ch-bubble-row">
                    <div className="ch-bubble" style={me ? { background: p.accent || undefined } : undefined}>
                      {showOriginal ? m.original : m.body}
                    </div>
                    {m.media && (
                      <button type="button" className={"ch-media ch-media-" + m.media.kind} onClick={() => setViewing(m)} aria-label={`${MEDIA_LABEL[m.media.kind]} from ${p.name}`} title={MEDIA_LABEL[m.media.kind]}>
                        {MEDIA_ICON[m.media.kind]}
                      </button>
                    )}
                  </div>
                )}
                {m.reactions?.length ? (
                  <div className="ch-reacts">
                    {groupReactions(m.reactions).map(r => (
                      <span key={r.emoji} className="ch-react" title={r.from.map(s => person(s).name).join(", ")}>
                        {r.emoji}<b>{r.from.length}</b>
                      </span>
                    ))}
                  </div>
                ) : null}
                {m.original && (
                  <button type="button" className="ch-tr" onClick={() => setTranslated(s => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}>
                    {showOriginal ? `↻ Translate${m.originalLang && LANGS[m.originalLang] ? ` from ${LANGS[m.originalLang]}` : ""}` : "↺ Show original"}
                  </button>
                )}
                {engage && !m.scheduled && (() => {
                  const c = engage.counts[m.id] ?? { likes: 0, liked: false, comments: 0 };
                  return (
                    <div className="ch-engage">
                      <button type="button" className={"ch-cm-btn" + (c.liked ? " on" : "")} onClick={() => toggleLike(m.id)} aria-pressed={c.liked} aria-label={c.liked ? "Unlike this line" : "Like this line"}>{HEART(c.liked)}{c.likes > 0 && <b>{c.likes}</b>}</button>
                      <button type="button" className="ch-cm-btn" onClick={() => setOpenThread(t => t === m.id ? null : m.id)} aria-expanded={openThread === m.id}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-5.6A8 8 0 1 1 21 12z" /></svg>
                        {c.comments > 0 ? <b>{c.comments}</b> : <span>Comment</span>}
                      </button>
                    </div>
                  );
                })()}
                {openThread === m.id && engage && (
                  <Thread slug={slug} artistName={artistName} messageId={m.id} can={engage.can} authed={authHeaders} onSupport={onSupport} onCount={d => bumpComments(m.id, d)} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Over the whole screen, not inside the frame window (its glass
          backdrop makes it the containing block for fixed children). */}
      {viewing?.media && typeof document !== "undefined" && createPortal(
        <div className="ch-lightbox" role="dialog" aria-modal="true" aria-label={MEDIA_LABEL[viewing.media.kind]} onClick={() => setViewing(null)}>
          <div className="ch-lightbox-inner" onClick={e => e.stopPropagation()}>
            {viewing.media.kind === "video" ? <video src={viewing.media.url} controls autoPlay playsInline />
              : viewing.media.kind === "audio" ? <audio src={viewing.media.url} controls autoPlay />
              : <img src={viewing.media.url} alt={viewing.body} />}
            <div className="ch-lightbox-bar">
              <span><strong>{person(viewing.from).name}</strong> {viewing.body}</span>
              <button type="button" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Lines are written in the Chat Writers' Room, never here (Sean, 2026-10-04).
          AI attribution per the roster's content rules. */}
      <div className="ch-foot">
        A scripted look inside the crew&apos;s group chat, written with AI and approved by GeekFon. New lines land every day, and the whole story is free to read.
        {!data.supporter && <> {artistName}&apos;s supporters can comment and reply.</>}
        {data.staff && <> <a href="/dashboard/chat-room">Edit in the Writers&apos; Room</a></>}
      </div>
    </div>
  );
}
