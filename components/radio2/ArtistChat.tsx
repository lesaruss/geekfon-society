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
import { useI18n } from "@/components/i18n/I18n";

type Data = { day: string; days: string[]; today: string; messages: ChatMessage[]; locked: ChatLockedDay | null; freeDays: string[]; supporter: boolean; people: Record<string, ChatPerson>; staff: boolean; opensOn?: string | null };

const ROSTER = new Set<string>(ARTIST_ORDER);
type T = (key: string, vars?: Record<string, string | number>) => string;
// Keys in lib/i18n/en/chat.ts for each language code and media kind.
const LANGS: Record<string, string> = { ja: "langJa", ko: "langKo", es: "langEs", fr: "langFr", pt: "langPt", zh: "langZh", de: "langDe", zu: "langZu" };
const MEDIA_LABEL: Record<string, string> = { image: "viewPhoto", video: "watchVideo", audio: "listen" };
const mediaLabel = (t: T, kind: string) => t(`chat.${MEDIA_LABEL[kind]}`);
const mediaFrom = (t: T, kind: string, name: string) => t(`chat.${MEDIA_LABEL[kind]}From`, { name });
// Splits a translated sentence at {link} so a link element can sit inside it.
function withLink(s: string, link: React.ReactNode): React.ReactNode {
  const i = s.indexOf("{link}");
  return i < 0 ? s : <>{s.slice(0, i)}{link}{s.slice(i + 6)}</>;
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

function dayLabel(t: T, locale: string, day: string, today: string): string {
  if (day === today) return t("chat.today");
  const now = new Date(`${today}T12:00:00Z`).getTime();
  if (now - new Date(`${day}T12:00:00Z`).getTime() === 86400000) return t("chat.yesterday");
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}
// Times show in the reader's own time zone; the story's days stay LA days.
const timeLabel = (locale: string, iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
function ago(t: T, iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t("chat.justNow");
  if (s < 3600) return t("chat.minutesAgo", { n: Math.floor(s / 60) });
  if (s < 86400) return t("chat.hoursAgo", { n: Math.floor(s / 3600) });
  return t("chat.daysAgo", { n: Math.floor(s / 86400) });
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
  const { t, locale } = useI18n();
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

  if (error) return <div className="empty"><IcChat /><span>{t("chat.loadError")}</span></div>;
  if (!data) return <div className="empty"><IcChat /><span>{t("chat.loading")}</span></div>;

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
        <div className="days" role="group" aria-label={t("chat.pickDay")}>
          {chips.map(d => (
            <button key={d} type="button" className="dchip" aria-pressed={data.day === d} onClick={() => load(d)}>{dayLabel(t, locale, d, data.today)}</button>
          ))}
          {data.days.length > 3 ? (
            <label className="dsel">
              <span className="sr">{t("chat.earlierDays")}</span>
              <select value={chips.includes(data.day) ? "" : data.day} onChange={e => e.target.value && load(e.target.value)} aria-label={t("chat.earlierDays")}>
                <option value="">{t("chat.earlierDays")}</option>
                {[...data.days].reverse().slice(3).map(d => <option key={d} value={d}>{!data.supporter && !data.freeDays.includes(d) ? "🔒 " : ""}{dayLabel(t, locale, d, data.today)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <p className="cnote">{t("chat.freeNote")}</p>
      </div>

      {data.locked ? (
        <div className="empty" style={{ marginTop: 18 }}><IcLock /><span>{t("chat.lockedDay", { cast: data.locked.cast.map(s => person(s).name).join(", "), name: artistName })} <button type="button" className="lnk" onClick={onUnlock}>{t("chat.unlockPrice", { name: artistName })}</button></span></div>
      ) : !data.messages.length ? (
        <div className="empty" style={{ marginTop: 18 }}><IcChat /><span>
          {data.opensOn && data.opensOn > data.today
            ? <>{t("chat.storyBegins", { date: new Date(`${data.opensOn}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }) })}</>
            : <>{t("chat.nothingYet")}</>}
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
                  {m.drop?.cover ? <img src={m.drop.cover} alt={m.drop?.title ? t("chat.coverOf", { title: m.drop.title }) : ""} /> : <span className="dph" />}
                  <div>
                    <p className="eyebrow">{m.drop?.label || t("chat.newDrop")}</p>
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
                  {!grouped ? <span className="mw">{me ? null : nameOf(m.from)}<time>{timeLabel(locale, m.postedAt)}{m.scheduled ? ` · ${t("chat.scheduled")}` : ""}</time></span> : null}
                  {m.media?.kind === "image" ? (
                    <button type="button" className="bub bph" onClick={() => setViewing(m)} aria-label={mediaFrom(t, "image", person(m.from).name)}>
                      <img src={m.media.url} alt="" loading="lazy" />
                      <span>{showOriginal ? m.original : m.body}</span>
                    </button>
                  ) : (
                    <div className="brow">
                      <p className="bub">{showOriginal ? m.original : m.body}</p>
                      {m.media ? (
                        <button type="button" className="mmed" onClick={() => setViewing(m)} aria-label={mediaFrom(t, m.media.kind, person(m.from).name)} title={mediaLabel(t, m.media.kind)}>
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
                        <IcTranslate />{showOriginal ? (m.originalLang && LANGS[m.originalLang] ? t("chat.translateFrom", { lang: t(`chat.${LANGS[m.originalLang]}`) }) : t("chat.translate")) : t("chat.showOriginal")}
                      </button>
                    ) : null}
                    {engage && (!m.scheduled || data.staff) ? (
                      <>
                        <button type="button" className="like" onClick={() => toggleLike(m.id)} aria-pressed={c.liked} aria-label={c.liked ? t("chat.unlikeLine") : t("chat.likeLine")}>
                          <IcHeart size={14} on={c.liked} /><span>{c.likes > 0 ? c.likes : t("chat.like")}</span>
                        </button>
                        <button type="button" className="like" onClick={() => setOpenThread(t => (t === m.id ? null : m.id))} aria-expanded={openThread === m.id}>
                          <IcComment /><span>{c.comments > 0 ? c.comments : t("chat.comment")}</span>
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
            {can.why === "signin" ? withLink(t("chat.readingFreeSignInLine", { name: artistName }), <a className="lnk" href={signInHref()}>{t("chat.signIn")}</a>)
              : can.why === "minor" ? <>{t("chat.minorNote")}</>
              : <>{t("chat.supportersCan", { name: artistName })}</>}
          </p>
          {can.why !== "minor" ? <button type="button" className="pill acp" onClick={onUnlock}>{t("chat.unlockPrice", { name: artistName })}</button> : null}
        </div>
      ) : null}
      <p className="cnote after">
        {t("chat.footer")}
        {data.staff ? <> <a className="lnk" href="/dashboard/chat-room">{t("chat.editInRoom")}</a></> : null}
      </p>

      {viewing?.media ? (
        <div className="lbox" role="dialog" aria-modal="true" aria-label={mediaLabel(t, viewing.media.kind)} onClick={() => setViewing(null)}>
          <div className="lbox-in" onClick={e => e.stopPropagation()}>
            {viewing.media.kind === "video" ? <video src={viewing.media.url} controls autoPlay playsInline />
              : viewing.media.kind === "audio" ? <audio src={viewing.media.url} controls autoPlay />
              : <img src={viewing.media.url} alt={viewing.body} />}
            <div className="lbox-bar">
              <span><b>{person(viewing.from).name}</b> {viewing.body}</span>
              <button type="button" className="pill" onClick={() => setViewing(null)}>{t("chat.close")}</button>
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
  const { t } = useI18n();
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
    if (!window.confirm(kids ? t("chat.confirmDeleteWithReplies") : t("chat.confirmDelete"))) return;
    const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ action: "delete", id: c.id }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 404) { setMsg(out.error || t("chat.deleteFailed")); return; }
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
    if (!res.ok) { setMsg(out.error || t("chat.postFailed")); return; }
    setText(""); setReplyTo(null);
    const c = out.comment as ThreadComment;
    setList(l => [...(l ?? []), c]);
    if (c.pending) setNote(t("chat.pendingNote"));
    else onCount(1);
  }

  const top = (list ?? []).filter(c => !c.parentId);
  const replies = (id: string) => (list ?? []).filter(c => c.parentId === id);
  const row = (c: ThreadComment, isReply: boolean) => (
    <div key={c.id} className={"cm" + (isReply ? " reply" : "")}>
      <div className="cm-h"><b>{c.name}</b><span>{ago(t, c.createdAt)}</span>{c.pending ? <em>{t("chat.waitingApproval")}</em> : null}</div>
      <p>{c.body}</p>
      <div className="cm-ops">
        {!c.pending ? <button type="button" className="like" onClick={() => like(c)} aria-pressed={c.liked} aria-label={c.liked ? t("chat.unlike") : t("chat.like")}><IcHeart size={13} on={c.liked} />{c.likes > 0 ? <span>{c.likes}</span> : null}</button> : null}
        {!c.pending && can.comment && !isReply ? <button type="button" className="like" onClick={() => { setReplyTo(c); setText(""); }}>{t("chat.reply")}</button> : null}
        {c.mine || can.staff ? <button type="button" className="like" onClick={() => remove(c)}>{t("chat.delete")}</button> : null}
      </div>
    </div>
  );

  return (
    <div className="thread">
      {list === null ? <p className="cm-empty">{t("chat.loadingComments")}</p> : top.length === 0 ? <p className="cm-empty">{t("chat.noComments")}</p> : null}
      {top.map(c => <div key={c.id}>{row(c, false)}{replies(c.id).map(r => row(r, true))}</div>)}
      {can.comment ? (
        <div className="cm-new">
          {replyTo ? <p className="cm-rep">{t("chat.replyingTo", { name: replyTo.name })} <button type="button" className="lnk" onClick={() => setReplyTo(null)}>{t("chat.cancel")}</button></p> : null}
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={500} rows={2} placeholder={replyTo ? t("chat.writeReply") : t("chat.addComment")} aria-label={t("chat.comment")} />
          <div className="cm-send">
            <span>{text.length}/500</span>
            <button type="button" className="pill acp" disabled={busy || !text.trim()} onClick={post}>{busy ? t("chat.posting") : replyTo ? t("chat.reply") : t("chat.comment")}</button>
          </div>
          {msg ? <p className="cm-err" role="alert">{msg}</p> : null}
          {note ? <p className="cm-note">{note}</p> : null}
        </div>
      ) : can.why === "support" ? (
        <p className="cm-gate">{t("chat.supportersDo", { name: artistName })} <button type="button" className="lnk" onClick={onUnlock}>{t("chat.unlockPrice", { name: artistName })}</button></p>
      ) : can.why === "signin" ? (
        <p className="cm-gate">{withLink(t("chat.readingFreeSignIn"), <a className="lnk" href={signInHref()}>{t("chat.signIn")}</a>)}</p>
      ) : null}
    </div>
  );
}
