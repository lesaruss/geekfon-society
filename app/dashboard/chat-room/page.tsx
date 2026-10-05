"use client";
// Chat Writers' Room (2026-10-04, Sean: "show me the back end where we can
// see these conversations that are generated with insights from the actual
// artists ... set the prompt of what's happening so they can respond how they
// would actually respond"). The story arc the chat follows, a plan of days
// (what happens + who is in it), drafts written in each artist's own voice
// (character_agents personas, via the gfs-chat-writer edge function), line
// edits, and approval, which is the only way a day reaches the artists' pages.
// Same account-only gate as the other admin tools.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboard, ADMIN_EMAIL } from "../context";
import { supabase } from "@/lib/supabase";

type Story = { id: string; title: string; premise: string; secrets: string; tone: string; starts_on: string | null; ends_on: string | null };
type Day = { id: string; day: string; beat: string; cast: string[]; direction: string | null; status: "planned" | "draft" | "approved"; notes: string | null; generated_at: string | null; approved_at: string | null };
type Line = { id: string; day_id: string; from_slug: string; body: string; original: string | null; original_lang: string | null; posted_at: string; published: boolean };
type CastMember = { slug: string; name: string; avatar: string | null; accent: string | null; hasVoice: boolean };
type Data = { today: string; story: Story | null; days: Day[]; lines: Line[]; cast: CastMember[] };

const DEFAULT_CAST = ["lex-from-brixton", "roxanne", "riku", "shamanic-resin"];

async function api(method: "GET" | "POST", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/chat-room", {
    method,
    headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `Request failed (${res.status})`);
  return out;
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(day: string, today: string): string {
  const d = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return day === today ? `Today · ${d}` : d;
}

function nyTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
}

export default function ChatWritersRoom() {
  const { userEmail, loading } = useDashboard();
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await api("GET")); setErr(null); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { if (userEmail === ADMIN_EMAIL) load(); }, [userEmail, load]);
  useEffect(() => { if (data && !selected) setSelected(data.today); }, [data, selected]);
  // Open the plan on today, not a week back.
  useEffect(() => { document.querySelector(".cw-day.today")?.scrollIntoView({ block: "center" }); }, [data !== null]);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200); };

  // The plan shows every day from a week back to three weeks out.
  const planDays = useMemo(() => {
    if (!data) return [];
    const out: string[] = [];
    for (let i = -7; i <= 21; i++) out.push(addDays(data.today, i));
    return out;
  }, [data]);

  if (loading) return <div className="cw-center"><style>{CSS}</style><div className="cw-spin" /></div>;
  if (userEmail !== ADMIN_EMAIL) {
    return <div className="cw-center"><style>{CSS}</style><p className="cw-muted">This tool is for the GeekFon admin account.</p></div>;
  }

  const dayRow = (d: string) => data?.days.find(x => x.day === d) || null;
  const current = selected ? dayRow(selected) : null;
  const currentLines = current ? (data?.lines || []).filter(l => l.day_id === current.id) : [];

  return (
    <div className="cw">
      <style>{CSS}</style>
      {toast && <div className="cw-toast">{toast}</div>}
      <header className="cw-head">
        <div>
          <div className="cw-eyebrow">Admin tool</div>
          <h1 className="cw-title">Chat Writers&apos; Room</h1>
          <p className="cw-muted">Set the story, plan each day, and the artists write it in their own voices. Nothing shows on the artists&apos; pages until you approve the day.</p>
        </div>
      </header>
      {err && <p className="cw-err">{err}</p>}
      {!data ? <div className="cw-center"><div className="cw-spin" /></div> : (
        <>
          <StoryCard story={data.story} onSaved={s => { setData({ ...data, story: s }); say("Story saved"); }} />
          <div className="cw-grid">
            <nav className="cw-days" aria-label="Days">
              {planDays.map(d => {
                const row = dayRow(d);
                return (
                  <button key={d} type="button" className={"cw-day" + (d === selected ? " on" : "") + (d === data.today ? " today" : "")} onClick={() => setSelected(d)}>
                    <span className="cw-day-date">{dayLabel(d, data.today)}</span>
                    <span className={"cw-badge cw-" + (row?.status || "empty")}>{row ? row.status : "open"}</span>
                    {row?.beat && <span className="cw-day-beat">{row.beat}</span>}
                  </button>
                );
              })}
            </nav>
            {selected && (
              <DayEditor
                key={selected + (current?.id || "")}
                date={selected}
                today={data.today}
                row={current}
                lines={currentLines}
                cast={data.cast}
                onChange={load}
                say={say}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StoryCard({ story, onSaved }: { story: Story | null; onSaved: (s: Story) => void }) {
  const [open, setOpen] = useState(!story);
  const [f, setF] = useState<Story>(story || { id: "", title: "", premise: "", secrets: "", tone: "", starts_on: null, ends_on: null });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Story) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="cw-card">
      <button type="button" className="cw-card-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span><span className="cw-eyebrow">Story arc</span><strong>{f.title || "No story yet"}</strong></span>
        <span className="cw-muted">{f.starts_on && f.ends_on ? `${f.starts_on} to ${f.ends_on}` : ""} {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="cw-form">
          <label>Title<input value={f.title} onChange={set("title")} /></label>
          <div className="cw-field"><span className="cw-label-row">What&apos;s happening (the premise every day follows)<Dictate onText={t => setF(v => ({ ...v, premise: joinText(v.premise, t) }))} /></span><textarea rows={6} value={f.premise} onChange={set("premise")} aria-label="Premise" /></div>
          <div className="cw-field"><span className="cw-label-row">Secrets (never revealed in the chat)<Dictate onText={t => setF(v => ({ ...v, secrets: joinText(v.secrets, t) }))} /></span><textarea rows={3} value={f.secrets} onChange={set("secrets")} aria-label="Secrets" /></div>
          <div className="cw-field"><span className="cw-label-row">Tone<Dictate onText={t => setF(v => ({ ...v, tone: joinText(v.tone, t) }))} /></span><textarea rows={2} value={f.tone} onChange={set("tone")} aria-label="Tone" /></div>
          <div className="cw-row">
            <label>From<input type="date" value={f.starts_on || ""} onChange={set("starts_on")} /></label>
            <label>To<input type="date" value={f.ends_on || ""} onChange={set("ends_on")} /></label>
          </div>
          <button type="button" className="cw-go" disabled={busy} onClick={async () => {
            setBusy(true);
            try { const { story: s } = await api("POST", { action: "save_story", ...f, id: f.id || undefined }); setF(s); onSaved(s); } catch (e) { alert((e as Error).message); }
            setBusy(false);
          }}>{busy ? "Saving…" : "Save story"}</button>
        </div>
      )}
    </section>
  );
}

function DayEditor({ date, today, row, lines, cast, onChange, say }: { date: string; today: string; row: Day | null; lines: Line[]; cast: CastMember[]; onChange: () => Promise<void>; say: (m: string) => void }) {
  const [beat, setBeat] = useState(row?.beat || "");
  const [who, setWho] = useState<string[]>(row?.cast?.length ? row.cast : DEFAULT_CAST);
  const [direction, setDirection] = useState(row?.direction || "");
  const [busy, setBusy] = useState<string | null>(null);
  const people = useMemo(() => Object.fromEntries(cast.map(c => [c.slug, c])), [cast]);
  const dirty = beat !== (row?.beat || "") || direction !== (row?.direction || "") || who.join() !== (row?.cast?.length ? row.cast : DEFAULT_CAST).join();

  async function run(label: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(label);
    try { await fn(); await onChange(); if (done) say(done); } catch (e) { alert((e as Error).message); }
    setBusy(null);
  }
  const saveDay = () => api("POST", { action: "save_day", day: date, beat, cast: who, direction });

  return (
    <section className="cw-editor">
      <div className="cw-editor-head">
        <h2>{dayLabel(date, today)}</h2>
        {row && <span className={"cw-badge cw-" + row.status}>{row.status}</span>}
      </div>

      <div className="cw-label cw-label-row">What happens today (the beat)<Dictate onText={t => setBeat(v => joinText(v, t))} /></div>
      <textarea className="cw-beat" rows={4} value={beat} onChange={e => setBeat(e.target.value)} aria-label="Beat"
        placeholder="e.g. First full day at the house. Lex calls out Roxanne for being late to their session again; she has a comeback. Riku is up all night on something and won't say what. Shamanic Resin get lost on the way to the studio." />

      <label className="cw-label">Who&apos;s in the chat</label>
      <div className="cw-cast">
        {cast.map(c => (
          <button key={c.slug} type="button" className={"cw-chip" + (who.includes(c.slug) ? " on" : "") + (c.hasVoice ? "" : " novoice")} style={who.includes(c.slug) && c.accent ? { borderColor: c.accent } : undefined}
            title={c.hasVoice ? undefined : `${c.name} has no character voice yet, so their lines will be brief and neutral`}
            onClick={() => setWho(w => w.includes(c.slug) ? w.filter(x => x !== c.slug) : [...w, c.slug])}>
            {c.avatar ? <img src={c.avatar} alt="" /> : <span className="cw-chip-ph" style={{ background: c.accent || "#555" }} />}
            {c.name}{!c.hasVoice && <span className="cw-novoice">no voice yet</span>}
          </button>
        ))}
      </div>

      <div className="cw-actions">
        <button type="button" className="cw-ghost" disabled={!!busy || !dirty} onClick={() => run("save", saveDay, "Day saved")}>{busy === "save" ? "Saving…" : "Save day"}</button>
        <span className="cw-direction-wrap">
          <input className="cw-direction" value={direction} onChange={e => setDirection(e.target.value)} placeholder="Optional direction for this draft (e.g. shorter, more Riku, end on a cliffhanger)" />
          <Dictate onText={t => setDirection(v => joinText(v, t))} />
        </span>
        <button type="button" className="cw-go" disabled={!!busy || !beat.trim() || who.length === 0} onClick={() => run("gen", async () => {
          const { day } = await saveDay();
          const out = await api("POST", { action: "generate", day_id: day.id, direction });
          if (out.error) throw new Error(out.error);
        }, "Draft written")}>{busy === "gen" ? "The artists are writing… (about a minute)" : row?.status === "planned" || !row ? "Write the day" : "Rewrite the day"}</button>
      </div>

      {row?.notes && <p className="cw-summary"><strong>Draft summary:</strong> {row.notes}</p>}

      {row && lines.length > 0 && (
        <>
          <div className="cw-lines">
            {lines.map(l => <LineRow key={l.id} line={l} date={date} people={people} who={row.cast} onChange={onChange} />)}
          </div>
          <AddLine dayId={row.id} who={row.cast} people={people} onChange={onChange} />
          <div className="cw-approve">
            {row.status === "approved"
              ? <>
                  <span className="cw-muted">Live on the artists&apos; pages{row.day > today ? ` from ${row.day}` : ""}. Lines appear at their times (New York).</span>
                  <button type="button" className="cw-ghost" disabled={!!busy} onClick={() => run("unapprove", () => api("POST", { action: "unapprove", day_id: row.id }), "Day taken down")}>Take down</button>
                </>
              : <>
                  <span className="cw-muted">Edit any line, then approve to publish this day.</span>
                  <button type="button" className="cw-go" disabled={!!busy} onClick={() => run("approve", () => api("POST", { action: "approve", day_id: row.id }), "Day approved")}>{busy === "approve" ? "Approving…" : "Approve day"}</button>
                </>}
          </div>
        </>
      )}
    </section>
  );
}

function LineRow({ line, date, people, who, onChange }: { line: Line; date: string; people: Record<string, CastMember>; who: string[]; onChange: () => Promise<void> }) {
  const [body, setBody] = useState(line.body);
  const [from, setFrom] = useState(line.from_slug);
  const [time, setTime] = useState(nyTime(line.posted_at));
  const p = people[from];
  const dirty = body !== line.body || from !== line.from_slug || time !== nyTime(line.posted_at);
  async function save() {
    await api("POST", { action: "edit_line", id: line.id, body, from, time, day: date });
    await onChange();
  }
  return (
    <div className="cw-line" style={p?.accent ? { borderLeftColor: p.accent } : undefined}>
      <input className="cw-time" value={time} onChange={e => setTime(e.target.value)} aria-label="Time (New York)" />
      <select value={from} onChange={e => setFrom(e.target.value)} aria-label="Speaker">
        {[...new Set([...who, from])].map(s => <option key={s} value={s}>{people[s]?.name || s}</option>)}
      </select>
      <div className="cw-line-text">
        <textarea rows={1} value={body} onChange={e => setBody(e.target.value)} aria-label="Line" />
        {line.original && <span className="cw-orig">{line.original_lang ? `${line.original_lang}: ` : ""}{line.original}</span>}
      </div>
      {dirty && <button type="button" className="cw-mini" onClick={save}>Save</button>}
      <button type="button" className="cw-mini cw-del" onClick={async () => { await api("POST", { action: "delete_line", id: line.id }); await onChange(); }} aria-label="Delete line">✕</button>
    </div>
  );
}

function AddLine({ dayId, who, people, onChange }: { dayId: string; who: string[]; people: Record<string, CastMember>; onChange: () => Promise<void> }) {
  const [from, setFrom] = useState(who[0] || "");
  const [time, setTime] = useState("20:00");
  const [body, setBody] = useState("");
  return (
    <form className="cw-line cw-add" onSubmit={async e => { e.preventDefault(); if (!body.trim()) return; await api("POST", { action: "add_line", day_id: dayId, from, time, body }); setBody(""); await onChange(); }}>
      <input className="cw-time" value={time} onChange={e => setTime(e.target.value)} aria-label="Time (New York)" />
      <select value={from} onChange={e => setFrom(e.target.value)} aria-label="Speaker">
        {who.map(s => <option key={s} value={s}>{people[s]?.name || s}</option>)}
      </select>
      <div className="cw-line-text"><textarea rows={1} value={body} onChange={e => setBody(e.target.value)} placeholder="Add a line by hand" /></div>
      <button type="submit" className="cw-mini">Add</button>
    </form>
  );
}

// Dictation (2026-10-04, Sean: "a recording feature so I can just dictate my
// thoughts and don't have to type"). The browser's own speech recognition
// (Chrome, Edge, Safari incl. iPhone); the button hides where there is none.
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function joinText(prev: string, add: string): string {
  const t = add.trim();
  if (!t) return prev;
  return prev && !/\s$/.test(prev) ? `${prev} ${t}` : prev + t;
}

function Dictate({ onText }: { onText: (text: string) => void }) {
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop();
  }, []);
  if (!supported) return null;
  function toggle() {
    if (on) { recRef.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) return;
    const rec = new R();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) cb.current(e.results[i][0].transcript);
      }
    };
    rec.onend = () => setOn(false);
    rec.onerror = () => setOn(false);
    recRef.current = rec;
    rec.start();
    setOn(true);
  }
  return (
    <button type="button" className={"cw-mic" + (on ? " on" : "")} onClick={toggle} aria-pressed={on} aria-label={on ? "Stop dictating" : "Dictate"} title={on ? "Stop dictating" : "Dictate"}>
      {on ? <><span className="cw-mic-dot" />Listening… tap to stop</> : <><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>Dictate</>}
    </button>
  );
}

const CSS = `
.cw { padding: 28px 32px 60px; color: #e8e8e8; max-width: 1400px; margin: 0 auto; }
.cw-center { display: flex; align-items: center; justify-content: center; padding: 80px 0; }
.cw-spin { width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(255,255,255,.12); border-top-color: #AAFF00; animation: cwspin .8s linear infinite; }
@keyframes cwspin { to { transform: rotate(360deg); } }
.cw-eyebrow { display: block; font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: #AAFF00; }
.cw-title { margin: 4px 0 6px; font-size: 28px; font-weight: 900; letter-spacing: -.01em; color: #fff; }
.cw-muted { color: rgba(255,255,255,.55); font-size: 13px; margin: 0; }
.cw-err { color: #ff8a80; font-size: 13px; }
.cw-head { margin-bottom: 18px; }
.cw-toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 50; background: #AAFF00; color: #000; font-size: 12px; font-weight: 900; padding: 10px 18px; border-radius: 999px; }
.cw-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; margin-bottom: 18px; }
.cw-card-head { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; background: none; border: none; color: inherit; font: inherit; cursor: pointer; text-align: left; }
.cw-card-head strong { display: block; font-size: 16px; color: #fff; margin-top: 2px; }
.cw-form { display: grid; gap: 12px; padding: 0 18px 18px; }
.cw-form label, .cw-form .cw-field, .cw-label { display: grid; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.55); }
.cw-label { margin-top: 14px; }
.cw input, .cw textarea, .cw select { font: inherit; font-size: 14px; color: #fff; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 9px 11px; min-width: 0; text-transform: none; letter-spacing: 0; font-weight: 500; }
.cw select option { color: #111; }
.cw textarea { resize: vertical; line-height: 1.45; }
.cw-row { display: flex; gap: 12px; }
.cw-go { background: #AAFF00; color: #000; border: none; cursor: pointer; font: inherit; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; padding: 11px 20px; border-radius: 999px; white-space: nowrap; justify-self: start; }
.cw-go:disabled { opacity: .45; cursor: default; }
.cw-ghost { background: rgba(255,255,255,.06); color: #fff; border: 1px solid rgba(255,255,255,.16); cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: 10px 18px; border-radius: 999px; white-space: nowrap; }
.cw-ghost:disabled { opacity: .4; cursor: default; }
.cw-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 18px; align-items: start; }
.cw-days { display: grid; gap: 4px; max-height: calc(100vh - 260px); overflow-y: auto; padding-right: 4px; position: sticky; top: 12px; }
.cw-day { display: grid; grid-template-columns: 1fr auto; gap: 3px 8px; text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,.02); color: inherit; font: inherit; cursor: pointer; }
.cw-day:hover { background: rgba(255,255,255,.05); }
.cw-day.on { border-color: #AAFF00; background: rgba(170,255,0,.06); }
.cw-day.today .cw-day-date { color: #AAFF00; }
.cw-day-date { font-size: 13px; font-weight: 800; color: #fff; }
.cw-day-beat { grid-column: 1 / -1; font-size: 12px; color: rgba(255,255,255,.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cw-badge { font-size: 9.5px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; align-self: center; }
.cw-empty { color: rgba(255,255,255,.35); border: 1px dashed rgba(255,255,255,.18); }
.cw-planned { background: rgba(255,255,255,.1); color: #fff; }
.cw-draft { background: rgba(246,152,32,.18); color: #F69820; }
.cw-approved { background: rgba(0,215,95,.16); color: #00D75F; }
.cw-editor { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px 20px 22px; }
.cw-editor-head { display: flex; align-items: center; gap: 12px; }
.cw-editor-head h2 { margin: 0; font-size: 20px; font-weight: 900; color: #fff; }
.cw-beat { width: 100%; box-sizing: border-box; }
.cw-cast { display: flex; flex-wrap: wrap; gap: 8px; }
.cw-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px 5px 5px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03); color: rgba(255,255,255,.6); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.cw-chip.on { color: #fff; background: rgba(255,255,255,.08); }
.cw-chip img, .cw-chip-ph { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; object-position: 50% 15%; }
.cw-actions { display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
.cw-direction-wrap { flex: 1; min-width: 220px; display: flex; gap: 8px; align-items: center; }
.cw-direction { flex: 1; min-width: 0; }
.cw-label-row { display: flex !important; align-items: center; justify-content: space-between; gap: 10px; }
.cw-mic { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); color: rgba(255,255,255,.8); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
.cw-mic:hover { color: #fff; border-color: #AAFF00; }
.cw-mic.on { background: rgba(255,82,82,.16); border-color: #ff5252; color: #fff; }
.cw-mic-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff5252; animation: cwpulse 1s ease-in-out infinite; }
@keyframes cwpulse { 50% { opacity: .3; } }
.cw-chip.novoice { opacity: .7; }
.cw-novoice { font-size: 9.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-left: 2px; }
.cw-summary { margin: 16px 0 0; font-size: 13px; color: rgba(255,255,255,.7); background: rgba(170,255,0,.05); border: 1px solid rgba(170,255,0,.18); border-radius: 10px; padding: 10px 12px; }
.cw-lines { display: grid; gap: 6px; margin-top: 16px; }
.cw-line { display: grid; grid-template-columns: 64px 160px minmax(0, 1fr) auto auto; gap: 8px; align-items: start; padding: 6px 8px 6px 10px; border-left: 3px solid rgba(255,255,255,.2); background: rgba(255,255,255,.02); border-radius: 8px; }
.cw-line .cw-time { padding: 8px; text-align: center; }
.cw-line-text { display: grid; gap: 4px; }
.cw-line-text textarea { width: 100%; box-sizing: border-box; field-sizing: content; min-height: 38px; }
.cw-orig { font-size: 12px; color: rgba(255,255,255,.5); }
.cw-mini { background: rgba(255,255,255,.08); color: #fff; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; font: inherit; font-size: 11px; font-weight: 800; padding: 8px 10px; cursor: pointer; }
.cw-del { color: #ff8a80; }
.cw-add { margin-top: 8px; border-left-style: dashed; }
.cw-approve { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.08); flex-wrap: wrap; }
@media (max-width: 900px) {
  .cw { padding: 20px 14px 50px; }
  .cw-grid { grid-template-columns: 1fr; }
  .cw-days { position: static; max-height: 240px; }
  .cw-line { grid-template-columns: 58px minmax(0, 1fr) auto; }
  .cw-line select { grid-column: 2 / -1; }
  .cw-line .cw-line-text { grid-column: 1 / -1; }
}
`;
