// gfs-chat-writer: writes one day of the GeekFon artists' group chat as
// DRAFT lines, in each artist's own voice (2026-10-04, Sean: "show me the
// back end where we can see these conversations that are generated with
// insights from the actual artists ... we gotta set the prompt of what's
// happening in the back end so they can respond how they would").
//
// Inputs (POST JSON): { day_id, direction? }
// Reads: gfs_chat_story (the arc), gfs_chat_days (the day's beat + cast,
// plus the next few planned beats for foreshadowing), the last few days of
// approved lines, each cast member's persona from character_agents
// (system_prompt), and GeekFon release state (song_release_briefs, albums).
// Writes: replaces that day's unpublished lines in gfs_chat_messages and
// marks the day 'draft'. Nothing reaches the site until Sean approves the
// day in the Chat Writers' Room (the Next app publishes on approve).
//
// Auth: only the GeekFon app's server calls this, with the service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-opus-5-5";
const TZ = "America/New_York";
// gfs_artists slugs that differ from their character_agents slug.
const AGENT_SLUG: Record<string, string> = { riku: "riku-hayasaka" };

const Line = z.object({
  from: z.string(),
  time: z.string(),
  text: z.string(),
  original: z.string().nullable(),
  original_lang: z.string().nullable(),
});
const Day = z.object({ lines: z.array(Line), summary: z.string() });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// The UTC instant of HH:MM on a New York calendar day (DST-safe).
function nyInstant(day: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(n => parseInt(n, 10));
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = noon.getTime() - local.getTime();
  const base = new Date(`${day}T00:00:00Z`).getTime() + offsetMs;
  return new Date(base + ((isNaN(h) ? 12 : h) * 60 + (isNaN(m) ? 0 : m)) * 60000).toISOString();
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${serviceKey}`) return json({ error: "unauthorized" }, 401);

  const { day_id, direction } = await req.json().catch(() => ({}));
  if (!day_id) return json({ error: "day_id required" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: day } = await sb.from("gfs_chat_days").select("*").eq("id", day_id).maybeSingle();
  if (!day) return json({ error: "day not found" }, 404);
  if (!day.cast?.length) return json({ error: "pick the cast for this day first" }, 400);

  const storyQ = day.story_id
    ? sb.from("gfs_chat_story").select("*").eq("id", day.story_id).maybeSingle()
    : sb.from("gfs_chat_story").select("*").eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const agentSlugs = day.cast.map((s: string) => AGENT_SLUG[s] || s);

  const [{ data: story }, { data: agents }, { data: artists }, { data: prevDays }, { data: nextDays }, { data: briefs }, { data: albums }] = await Promise.all([
    storyQ,
    sb.from("character_agents").select("slug, display_name, system_prompt").in("slug", agentSlugs),
    sb.from("gfs_artists").select("slug, name").in("slug", day.cast),
    sb.from("gfs_chat_days").select("id, day, beat").lt("day", day.day).eq("status", "approved").order("day", { ascending: false }).limit(3),
    sb.from("gfs_chat_days").select("day, beat").gt("day", day.day).order("day", { ascending: true }).limit(4),
    sb.from("song_release_briefs").select("track_name, artist_slug, distrokid_status, release_date").eq("brand_slug", "geekfon"),
    sb.from("gfs_albums").select("title, artist_slug, status, geekfon_release_date"),
  ]);

  const nameOf = (s: string) => (artists ?? []).find((a: { slug: string }) => a.slug === s)?.name || s;
  const personas = day.cast.map((s: string) => {
    const a = (agents ?? []).find((x: { slug: string }) => x.slug === (AGENT_SLUG[s] || s));
    return `### ${nameOf(s)}  (use from: "${s}")\n${a?.system_prompt || "(no persona on file: keep this artist brief and neutral)"}`;
  }).join("\n\n");

  // The last few approved days, so the story carries on rather than resets.
  let previous = "";
  for (const d of [...(prevDays ?? [])].reverse()) {
    const { data: lines } = await sb.from("gfs_chat_messages").select("from_slug, body, posted_at").eq("day_id", d.id).order("posted_at");
    previous += `\n[${d.day}] beat: ${d.beat}\n` + (lines ?? []).map((l: { from_slug: string; body: string }) => `${nameOf(l.from_slug) || l.from_slug}: ${l.body}`).join("\n") + "\n";
  }

  const today = new Date().toISOString().slice(0, 10);
  const released = (briefs ?? []).filter((b: { distrokid_status: string; release_date: string | null }) =>
    b.distrokid_status === "live" || (b.distrokid_status === "submitted" && b.release_date && b.release_date <= today));
  const upcoming = (briefs ?? []).filter((b: { release_date: string | null }) => b.release_date && b.release_date > today);

  const system = `You are the writers' room for the GeekFon Society artists' group chat: a daily, scripted glimpse into the artists' lives that supporters read on the artists' pages. You write one day of the chat at a time, as the artists themselves, each in their own established voice.

Write like a real group chat: short messages, replies to each other, someone being late, in-jokes, the occasional single emoji line. Typically 10 to 24 messages across the day, spread over plausible times (HH:MM, 24-hour, New York time). Every message must come from someone in today's cast, using exactly the "from" key given for them.

Hard rules (roster-wide canon): no cursing or vulgarity; no political, religious or third-rail content; stage names only (Logan is the only real name allowed); never sexualize any character; don't invent new biographical facts (ages, family, past events) beyond what each persona states; Riku uses they/them; Shamanic Resin's members (Aoi, Ren, Momo, Vera) are young and wholesome, so keep their lines age-appropriate and speak as the group or name the member speaking at the start ("Momo: ..."). Respect the story's secrets exactly. Only mention a song by title if it is in the released list or today's beat names it.

If an artist would naturally write in another language (for example Japanese or Korean), you may set "original" to the line as written and "original_lang" to its ISO code (ja, ko, es...), with "text" as the English translation; otherwise both are null. Use this sparingly.

"summary" is one sentence for the producer describing what happened in the day and which future hints were planted.

The cast's personas follow.

${personas}`;

  const user = `STORY ARC: ${story?.title || "(untitled)"}
Premise: ${story?.premise || ""}
Secrets (never reveal): ${story?.secrets || ""}
Tone: ${story?.tone || ""}

RELEASED SONGS (may be named): ${released.map((b: { track_name: string; artist_slug: string }) => `${b.track_name} (${b.artist_slug})`).join("; ") || "none"}
UPCOMING RELEASES (hint only, never name): ${upcoming.map((b: { track_name: string; artist_slug: string; release_date: string }) => `${b.artist_slug} on ${b.release_date}`).join("; ") || "none on the calendar"}
ALBUMS: ${(albums ?? []).map((a: { title: string | null; artist_slug: string; status: string }) => `${a.artist_slug}: ${a.title || "untitled"} (${a.status})`).join("; ") || "none"}

PREVIOUS DAYS:${previous || " (this is the first day)"}

COMING UP (plant small hints only where natural): ${(nextDays ?? []).map((d: { day: string; beat: string }) => `[${d.day}] ${d.beat}`).join(" | ") || "nothing planned yet"}

TODAY: ${day.day}
Cast: ${day.cast.map((s: string) => `${nameOf(s)} ("${s}")`).join(", ")}
Beat: ${day.beat || "An ordinary day in the house."}
${direction ? `Producer's direction for this draft: ${direction}` : ""}

Write today's chat.`;

  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
  let parsed: z.infer<typeof Day> | null = null;
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(Day) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") return json({ error: "The model declined to write this day. Try rewording the beat." }, 422);
    parsed = response.parsed_output;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Rate limited, try again in a minute." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Model error ${e.status}: ${e.message}` }, 502);
    return json({ error: String(e) }, 500);
  }
  if (!parsed) return json({ error: "The draft didn't come back in the right shape. Try again." }, 502);

  const castSet = new Set(day.cast as string[]);
  const rows = parsed.lines
    .filter(l => castSet.has(l.from) && l.text.trim())
    .map(l => ({
      room: "geekfon-crew",
      day_id: day.id,
      from_slug: l.from,
      body: l.text.trim().slice(0, 2000),
      original: l.original?.trim() || null,
      original_lang: l.original?.trim() ? (l.original_lang || null) : null,
      kind: "message",
      posted_at: nyInstant(day.day, l.time),
      published: false,
      created_by: `gfs-chat-writer:${MODEL}`,
    }));

  await sb.from("gfs_chat_messages").delete().eq("day_id", day.id).eq("published", false);
  const { error: insErr } = await sb.from("gfs_chat_messages").insert(rows);
  if (insErr) return json({ error: insErr.message }, 500);
  await sb.from("gfs_chat_days").update({ status: "draft", model: MODEL, generated_at: new Date().toISOString(), notes: parsed.summary }).eq("id", day.id);

  return json({ ok: true, count: rows.length, summary: parsed.summary });
});
