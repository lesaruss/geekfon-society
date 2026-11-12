"use client";
// The artists' group chat on an artist page, in the Seat 2 look. Same data and
// rules as before (components/roster/Chat.tsx, app/api/roster/[artist]/chat
// and chat/engage): the crew talking day by day, read from this artist's side
// (their lines on the right), a day picker, Translate on lines first written
// in another language, drop cards, photos and videos. Every day is free to
// read for everyone (lib/chatAccess.ts); any signed-in account likes;
// supporters of this artist comment and reply, held for approval.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ARTIST_ORDER } from "@/lib/roster";
import type { ChatMessage, ChatPerson, ChatLockedDay } from "@/app/api/roster/[artist]/chat/route";
import type { EngageCan, EngageCounts, ThreadComment } from "@/app/api/roster/[artist]/chat/engage/route";
import { IcHeart, IcPlay } from "./icons";
import { IcChat, IcLock, IcComment, IcCamera, IcSpeaker, IcTranslate } from "./artistIcons";

type Data = { day: string; days: string[]; today: string; messages: ChatMessage[]; locked: ChatLockedDay | null; freeDays: string[]; supporter: boolean; people: Record<string, ChatPerson>; staff: boolean; opensOn?: string | null };

const ROSTER = new Set<string>(ARTIST_ORDER);
const LANGS: Record<string, string> = { ja: "Japanese", ko: "Korean", es: "Spanish", fr: "French", pt: "Portuguese", zh: "Chinese", de: "German", zu: "Zulu" };
const MEDIA_LABEL: Record<string, string> = { image: "View photo", video: "Watch video", audio: "Listen" };

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  const t = new Date(`${today}T12:00:00Z`).getTime();
  if (t - new Date(`${day}T12:00:00Z`).getTime() === 86400000) return "Yesterday";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
// Times show in the reader's own time zone; the story's days stay LA days.
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function groupReactions(list: { emoji: string; from: string }[]): { emoji: string; from: string[] }[] {
  const out = new Map<string, string[]>();
  for (const r of list) out.set(r.emoji, [...(out.get(r.emoji) ?? []), r.from]);
  return [...out].map(([emoji, from]) => ({ emoji, from }));
}
function signInHref(): string {
  return `/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "")}`;
}

export default function ArtistChat({ slug, artistName, onUnlock }: { slug: string; artistName: string; onUnlock: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [translated, setTranslated] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const [engage, setEngage] = useState<{ counts: EngageCounts; can: EngageCan } | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);

  const load = useCallback(async (day?: string) => {
    try {
      const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat${day ? `?day=${day}` : ""}`, { headers: await authHeaders(), cache: "no-store" });
      if (!res.ok) { setError(true); return; }
      setError(false);
      setData(await res.json());
    } catch { setError(true); }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  const loadEngage = useCallback(async (day: string) => {
    try {
      const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage?day=${day}`, { headers: await authHeaders(), cache: "no-store" });
      if (res.ok) setEngage(await res.json());
    } catch { /* counts are a nicety */ }
  }, [slug]);
  useEffect(() => { setOpenThread(null); if (data?.day) loadEngage(data.day); }, [data?.day, loadEngage]);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setViewing(null); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [viewing]);

  async function toggleLike(id: string) {
    if (!engage) return;
    if (!engage.can.signedIn) { window.location.href = signInHref(); return; }
    const cur = engage.counts[id] ?? { likes: 0, liked: false, comments: 0 };
    setEngage({ ...engage, counts: { ...engage.counts, [id]: { ...cur, liked: !cur.liked, likes: cur.likes + (cur.liked ? -1 : 1) } } });
    const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/chat/engage`, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ action: "like", kind: "message", id }) });
    if (!res.ok && data) loadEngage(data.day);
  }
  const bumpComments = (id: string, d: number) => setEngage(e => e ? { ...e, counts: { ...e.counts, [id]: { ...(e.counts[id] ?? { likes: 0, liked: false, comments: 0 }), comments: (e.counts[id]?.comments ?? 0) + d } } } : e);

  const chips = useMemo(() => (data ? [...data.days].reverse().slice(0, 3) : []), [data]);

  if (error) return <div className="empty"><IcChat /><span>The chat did not load. Try again in a moment.</span></div>;
  if (!data) return <div className="empty"><IcChat /><span>Loading the chat.</span></div>;

  const person = (s: string): ChatPerson => data.people[s] || { name: s, avatar: null, accent: null };
  const avatar = (s: string, cls = "mav") => {
    const p = person(s);
    const img = p.avatar ? <img className={cls} src={p.avatar} alt="" /> : <span className={cls + " mph"} style={{ background: p.accent || "#444" }}>{p.name.charAt(0)}</span>;
    return ROSTER.has(s) ? <Link href={`/${s}`} aria-label={p.name} className="mavl">{img}</Link> : img;
  };
  const nameOf = (s: string) => ROSTER.has(s) ? <Link href={`/${s}`}>{person(s).name}</Link> : <b>{person(s).name}</b>;
  const can = engage?.can;

  return (
    <div className="chat">
      <div className="chat-h">
        <div className="days" role="group" aria-label="Pick a day">
          {chips.map(d => (
            <button key={d} type="button" className="dchip" aria-pressed={data.day === d} onClick={() => load(d)}>{dayLabel(d, data.today)}</button>
          ))}
          {data.days.length > 3 ? (
            <label className="dsel">
              <span className="sr">Earlier days</span>
              <select value={chips.includes(data.day) ? "" : data.day} onChange={e => e.target.value && load(e.target.value)} aria-label="Earlier days">
                <option value="">Earlier days</option>
                {[...data.days].reverse().slice(3).map(d => <option key={d} value={d}>{dayLabel(d, data.today)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <p className="cnote">Every day is free to read. Times are in your time.</p>
      </div>

      {data.locked ? (
        <div className="empty" style={{ marginTop: 18 }}><IcLock /><span>{data.locked.cast.map(s => person(s).name).join(", ")} talked this day. Unlock {artistName} to read every day. <button type="button" className="lnk" onClick={onUnlock}>Unlock {artistName}, $11</button></span></div>
      ) : !data.messages.length ? (
        <div className="empty" style={{ marginTop: 18 }}><IcChat /><span>
          {data.opensOn && data.opensOn > data.today
            ? <>The story begins {new Date(`${data.opensOn}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}. Come back then.</>
            : <>Nobody has said anything yet this day.</>}
        </span></div>
      ) : (
        <ol className="msgs">
          {data.messages.map((m, i) => {
            const me = m.from === slug;
            const grouped = i > 0 && data.messages[i - 1].from === m.from && data.messages[i - 1].kind !== "drop";
            const showOriginal = !!m.original && !translated.has(m.id);
            if (m.kind === "drop") {
              const p = person(m.from);
              return (
                <li key={m.id} className="drop">
                  {m.drop?.cover ? <img src={m.drop.cover} alt={m.drop?.title ? `Cover of ${m.drop.title}` : ""} /> : <span className="dph" />}
                  <div>
                    <p className="eyebrow">{m.drop?.label || "New drop"}</p>
                    <b>{m.drop?.title || m.body}</b>
                    <span className="s">{p.name}{m.drop?.title && m.body ? `: ${m.body}` : ""}</span>
                  </div>
                </li>
              );
            }
            const c = engage?.counts[m.id] ?? { likes: 0, liked: false, comments: 0 };
            return (
              <li key={m.id} className={"msg" + (me ? " me" : "") + (grouped ? " grouped" : "")}>
                {!me ? (grouped ? <span className="mav gap" /> : avatar(m.from)) : null}
                <div className="mb">
                  {!grouped ? <span className="mw">{me ? null : nameOf(m.from)}<time>{timeLabel(m.postedAt)}{m.scheduled ? " · scheduled" : ""}</time></span> : null}
                  {m.media?.kind === "image" ? (
                    <button type="button" className="bub bph" onClick={() => setViewing(m)} aria-label={`${MEDIA_LABEL.image} from ${person(m.from).name}`}>
                      <img src={m.media.url} alt="" loading="lazy" />
                      <span>{showOriginal ? m.original : m.body}</span>
                    </button>
                  ) : (
                    <div className="brow">
                      <p className="bub">{showOriginal ? m.original : m.body}</p>
                      {m.media ? (
                        <button type="button" className="mmed" onClick={() => setViewing(m)} aria-label={`${MEDIA_LABEL[m.media.kind]} from ${person(m.from).name}`} title={MEDIA_LABEL[m.media.kind]}>
                          {m.media.kind === "video" ? <IcPlay size={15} /> : m.media.kind === "audio" ? <IcSpeaker /> : <IcCamera />}
                        </button>
                      ) : null}
                    </div>
                  )}
                  {m.reactions?.length ? (
                    <div className="reacts">
                      {groupReactions(m.reactions).map(r => (
                        <span key={r.emoji} className="react" title={r.from.map(s => person(s).name).join(", ")}>{r.emoji}<b>{r.from.length}</b></span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mops">
                    {m.original ? (
                      <button type="button" className="like" onClick={() => setTranslated(s => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}>
                        <IcTranslate />{showOriginal ? `Translate${m.originalLang && LANGS[m.originalLang] ? ` from ${LANGS[m.originalLang]}` : ""}` : "Show original"}
                      </button>
                    ) : null}
                    {engage && (!m.scheduled || data.staff) ? (
                      <>
                        <button type="button" className="like" onClick={() => toggleLike(m.id)} aria-pressed={c.liked} aria-label={c.liked ? "Unlike this line" : "Like this line"}>
                          <IcHeart size={14} on={c.liked} /><span>{c.likes > 0 ? c.likes : "Like"}</span>
                        </button>
                        <button type="button" className="like" onClick={() => setOpenThread(t => (t === m.id ? null : m.id))} aria-expanded={openThread === m.id}>
                          <IcComment /><span>{c.comments > 0 ? c.comments : "Comment"}</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                  {openThread === m.id && engage ? (
                    <Thread slug={slug} artistName={artistName} messageId={m.id} can={engage.can} onUnlock={onUnlock} onCount={d => bumpComments(m.id, d)} />
                  ) : null}
                </div>
                {me ? (grouped ? <span className="mav gap" /> : avatar(m.from)) : null}
              </li>
            );
          })}
        </ol>
      )}

      {can && !can.comment ? (
        <div className="compose">
          <IcLock />
          <p>
            {can.why === "signin" ? <>Reading is free. <a className="lnk" href={signInHref()}>Sign in</a> to like a line. Supporters of {artistName} comment and reply.</>
              : can.why === "minor" ? <>Comments are for members 18 and over. You can still like.</>
              : <>Supporters of {artistName} can comment and reply.</>}
          </p>
          {can.why !== "minor" ? <button type="button" className="pill acp" onClick={onUnlock}>Unlock {artistName}, $11</button> : null}
        </div>
      ) : null}
      <p className="cnote after">
        A scripted look inside the crew&apos;s group chat, written with AI and approved by GeekFon. New lines land every day. Anyone signed in can like a line; comments are held for approval.
        {data.staff ? <> <a className="lnk" href="/dashboard/chat-room">Edit in the Writers&apos; Room</a></> : null}
      </p>

      {viewing?.media ? (
        <div className="lbox" role="dialog" aria-modal="true" aria-label={MEDIA_LABEL[viewing.media.kind]} onClick={() => setViewing(null)}>
          <div className="lbox-in" onClick={e => e.stopPropagation()}>
            {viewing.media.kind === "video" ? <video src={viewing.media.url} controls autoPlay playsInline />
              : viewing.media.kind === "audio" ? <audio src={viewing.media.url} controls autoPlay />
              : <img src={viewing.media.url} alt={viewing.body} />}
            <div className="lbox-bar">
              <span><b>{person(viewing.from).name}</b> {viewing.body}</span>
              <button type="button" className="pill" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// The thread under one chat line: comments with one level of replies, likes,
// and a box to join in for supporters. Comments wait for approval; the author
// sees theirs marked "Waiting for approval".
function Thread({ slug, artistName, messageId, can, onUnlock, onCount }: {
  slug: string; artistName: string; messageId: string; can: EngageCan; onUnlock: () => void; onCount: (d: number) => void;
}) {
  const [list, setList] = useState<ThreadComment[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ThreadComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const api = `/api/roster/${encodeURIComponent(slug)}/chat/engage`;

  const load = useCallback(async () => {
    const res = await fetch(`${api}?message=${messageId}`, { headers: await authHeaders(), cache: "no-store" });
    setList(res.ok ? (await res.json()).comments : []);
  }, [api, messageId]);
  useEffect(() => { load(); }, [load]);

  async function like(c: ThreadComment) {
    if (!can.signedIn) { window.location.href = signInHref(); return; }
    setList(l => (l ?? []).map(x => (x.id === c.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)));
    const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ action: "like", kind: "comment", id: c.id }) });
    if (!res.ok) load();
  }
  async function remove(c: ThreadComment) {
    const kids = (list ?? []).filter(x => x.parentId === c.id).length;
    if (!window.confirm(kids ? "Delete this comment and its replies?" : "Delete this comment?")) return;
    const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ action: "delete", id: c.id }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 404) { setMsg(out.error || "Could not delete that."); return; }
    setList(l => (l ?? []).filter(x => x.id !== c.id && x.parentId !== c.id));
    if (out.removedApproved) onCount(-out.removedApproved);
  }
  async function post() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setMsg(null); setNote(null);
    const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ action: "comment", messageId, body, parentId: replyTo?.id }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(out.error || "Could not post that."); return; }
    setText(""); setReplyTo(null);
    const c = out.comment as ThreadComment;
    setList(l => [...(l ?? []), c]);
    if (c.pending) setNote("Thanks. Your comment is waiting for approval and shows here once it is approved.");
    else onCount(1);
  }

  const top = (list ?? []).filter(c => !c.parentId);
  const replies = (id: string) => (list ?? []).filter(c => c.parentId === id);
  const row = (c: ThreadComment, isReply: boolean) => (
    <div key={c.id} className={"cm" + (isReply ? " reply" : "")}>
      <div className="cm-h"><b>{c.name}</b><span>{ago(c.createdAt)}</span>{c.pending ? <em>Waiting for approval</em> : null}</div>
      <p>{c.body}</p>
      <div className="cm-ops">
        {!c.pending ? <button type="button" className="like" onClick={() => like(c)} aria-pressed={c.liked} aria-label={c.liked ? "Unlike" : "Like"}><IcHeart size={13} on={c.liked} />{c.likes > 0 ? <span>{c.likes}</span> : null}</button> : null}
        {!c.pending && can.comment && !isReply ? <button type="button" className="like" onClick={() => { setReplyTo(c); setText(""); }}>Reply</button> : null}
        {c.mine || can.staff ? <button type="button" className="like" onClick={() => remove(c)}>Delete</button> : null}
      </div>
    </div>
  );

  return (
    <div className="thread">
      {list === null ? <p className="cm-empty">Loading the comments.</p> : top.length === 0 ? <p className="cm-empty">No comments yet.</p> : null}
      {top.map(c => <div key={c.id}>{row(c, false)}{replies(c.id).map(r => row(r, true))}</div>)}
      {can.comment ? (
        <div className="cm-new">
          {replyTo ? <p className="cm-rep">Replying to {replyTo.name} <button type="button" className="lnk" onClick={() => setReplyTo(null)}>Cancel</button></p> : null}
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={500} rows={2} placeholder={replyTo ? "Write a reply" : "Add a comment"} aria-label="Comment" />
          <div className="cm-send">
            <span>{text.length}/500</span>
            <button type="button" className="pill acp" disabled={busy || !text.trim()} onClick={post}>{busy ? "Posting" : replyTo ? "Reply" : "Comment"}</button>
          </div>
          {msg ? <p className="cm-err" role="alert">{msg}</p> : null}
          {note ? <p className="cm-note">{note}</p> : null}
        </div>
      ) : can.why === "support" ? (
        <p className="cm-gate">Supporters of {artistName} comment and reply. <button type="button" className="lnk" onClick={onUnlock}>Unlock {artistName}, $11</button></p>
      ) : can.why === "signin" ? (
        <p className="cm-gate">Reading is free. <a className="lnk" href={signInHref()}>Sign in</a> to like.</p>
      ) : null}
    </div>
  );
}
