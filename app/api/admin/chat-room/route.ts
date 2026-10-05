// /api/admin/chat-room   (Authorization: Bearer <supabase token>, staff only)
//
// Back end of the Chat Writers' Room (2026-10-04, Sean: "I want to be able to
// update what shows in the chat from the back end ... set the prompt of
// what's happening so they can respond how they would actually respond").
// The story arc, a plan of days (beat + cast), drafts written in each
// artist's voice by the gfs-chat-writer edge function, line edits, and
// approval, which is the only way lines reach the site.
//
// GET                         story, days in a window, their lines, the cast list
// POST { action, ... }        save_story | save_day | generate | edit_line |
//                             add_line | delete_line | set_media | clear_day |
//                             approve | unapprove
//
// Approving a day also posts its tagged photos and videos to the tagged
// artists' Social feeds (lib/server/chatSocial.ts); taking it down removes
// them. Times are LA time: the story lives in the LA house.

import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { serviceClient, SUPABASE_URL } from "@/lib/server/supabaseAdmin";
import { loadChatCast } from "@/lib/server/chatCast";
import { syncDaySocial } from "@/lib/server/chatSocial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const noStore = { "Cache-Control": "private, no-store" };
const TZ = "America/Los_Angeles";

function laInstant(day: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(n => parseInt(n, 10));
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = noon.getTime() - local.getTime();
  const base = new Date(`${day}T00:00:00Z`).getTime() + offsetMs;
  return new Date(base + ((isNaN(h) ? 12 : h) * 60 + (isNaN(m) ? 0 : m)) * 60000).toISOString();
}

function laDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function staff(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return null;
  const ent = await entitlementFor(viewer, "roxanne");
  return ent.reason === "staff" ? viewer : null;
}

export async function GET(req: NextRequest) {
  const v = await staff(req);
  if (!v) return NextResponse.json({ error: "staff only" }, { status: 403, headers: noStore });
  const sb = serviceClient()!;
  const today = laDay(new Date());
  const from = laDay(new Date(Date.now() - 30 * 864e5));
  const to = laDay(new Date(Date.now() + 45 * 864e5));

  const [{ data: story }, { data: days }, cast] = await Promise.all([
    sb.from("gfs_chat_story").select("*").eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("gfs_chat_days").select("*").gte("day", from).lte("day", to).order("day"),
    loadChatCast(sb),
  ]);
  const dayIds = (days ?? []).map((d: { id: string }) => d.id);
  const { data: lines } = dayIds.length
    ? await sb.from("gfs_chat_messages").select("id, day_id, from_slug, body, original, original_lang, posted_at, published, media_url, media_kind, media_poster, photo_prompt, tagged").in("day_id", dayIds).order("posted_at")
    : { data: [] };

  return NextResponse.json({ today, story, days: days ?? [], lines: lines ?? [], cast }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const v = await staff(req);
  if (!v) return NextResponse.json({ error: "staff only" }, { status: 403, headers: noStore });
  const sb = serviceClient()!;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });

  switch (b.action) {
    case "save_story": {
      const fields = {
        title: String(b.title || "Untitled arc"),
        premise: String(b.premise || ""),
        secrets: String(b.secrets || ""),
        tone: String(b.tone || ""),
        starts_on: b.starts_on || null,
        ends_on: b.ends_on || null,
        updated_at: new Date().toISOString(),
        updated_by: v.email,
      };
      const q = b.id
        ? sb.from("gfs_chat_story").update(fields).eq("id", String(b.id)).select().single()
        : sb.from("gfs_chat_story").insert({ ...fields, active: true }).select().single();
      const { data, error } = await q;
      return error ? fail(error.message, 500) : NextResponse.json({ story: data }, { headers: noStore });
    }

    case "save_day": {
      const day = String(b.day || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return fail("bad day");
      const { data: story } = await sb.from("gfs_chat_story").select("id").eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await sb.from("gfs_chat_days").upsert({
        day,
        beat: String(b.beat || ""),
        cast: Array.isArray(b.cast) ? (b.cast as string[]) : [],
        ...(typeof b.direction === "string" ? { direction: b.direction } : {}),
        story_id: story?.id ?? null,
      }, { onConflict: "day" }).select().single();
      return error ? fail(error.message, 500) : NextResponse.json({ day: data }, { headers: noStore });
    }

    case "generate": {
      if (!b.day_id) return fail("missing day");
      // The writer checks the admin's own session (already verified above).
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gfs-chat-writer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("authorization") || "" },
        body: JSON.stringify({ day_id: b.day_id, direction: b.direction || null }),
      });
      const out = await res.json().catch(() => ({ error: `writer returned ${res.status}` }));
      return NextResponse.json(out, { status: res.ok ? 200 : res.status, headers: noStore });
    }

    case "edit_line": {
      const patch: Record<string, unknown> = {};
      if (typeof b.body === "string") patch.body = b.body.slice(0, 2000);
      if (typeof b.from === "string") patch.from_slug = b.from;
      if (b.original !== undefined) patch.original = b.original || null;
      if (b.original_lang !== undefined) patch.original_lang = b.original_lang || null;
      if (typeof b.time === "string" && typeof b.day === "string") patch.posted_at = laInstant(b.day, b.time);
      const { error } = await sb.from("gfs_chat_messages").update(patch).eq("id", String(b.id));
      return error ? fail(error.message, 500) : NextResponse.json({ ok: true }, { headers: noStore });
    }

    case "add_line": {
      const { data: d } = await sb.from("gfs_chat_days").select("id, day, status").eq("id", String(b.day_id)).maybeSingle();
      if (!d) return fail("day not found", 404);
      const { error } = await sb.from("gfs_chat_messages").insert({
        room: "geekfon-crew",
        day_id: d.id,
        from_slug: String(b.from || ""),
        body: String(b.body || "").slice(0, 2000),
        posted_at: laInstant(d.day, String(b.time || "12:00")),
        published: d.status === "approved",
        created_by: v.email,
      });
      return error ? fail(error.message, 500) : NextResponse.json({ ok: true }, { headers: noStore });
    }

    case "delete_line": {
      const { error } = await sb.from("gfs_chat_messages").delete().eq("id", String(b.id));
      return error ? fail(error.message, 500) : NextResponse.json({ ok: true }, { headers: noStore });
    }

    case "set_media": {
      const kind = ["image", "video", "audio"].includes(String(b.kind)) ? String(b.kind) : null;
      const patch: Record<string, unknown> = {
        media_url: b.url ? String(b.url) : null,
        media_kind: b.url ? kind || "image" : null,
        ...(b.poster !== undefined ? { media_poster: b.poster ? String(b.poster) : null } : {}),
        ...(Array.isArray(b.tagged) ? { tagged: b.tagged as string[] } : {}),
        ...(typeof b.prompt === "string" ? { photo_prompt: b.prompt || null } : {}),
      };
      const { error } = await sb.from("gfs_chat_messages").update(patch).eq("id", String(b.id));
      return error ? fail(error.message, 500) : NextResponse.json({ ok: true }, { headers: noStore });
    }

    case "clear_day": {
      const { data: d } = await sb.from("gfs_chat_days").select("id, status").eq("id", String(b.day_id)).maybeSingle();
      if (!d) return fail("day not found", 404);
      if (d.status === "approved") await syncDaySocial(sb, d.id, false);
      const { error: e1 } = await sb.from("gfs_chat_messages").delete().eq("day_id", d.id);
      const { error: e2 } = await sb.from("gfs_chat_days").delete().eq("id", d.id);
      return e1 || e2 ? fail((e1 || e2)!.message, 500) : NextResponse.json({ ok: true }, { headers: noStore });
    }

    case "approve":
    case "unapprove": {
      const approve = b.action === "approve";
      const { error: e1 } = await sb.from("gfs_chat_messages").update({ published: approve }).eq("day_id", String(b.day_id));
      const { error: e2 } = await sb.from("gfs_chat_days").update({
        status: approve ? "approved" : "draft",
        approved_at: approve ? new Date().toISOString() : null,
        approved_by: approve ? v.email : null,
      }).eq("id", String(b.day_id));
      // The tour-preview placeholder lines retire once a real day is approved.
      if (approve) await sb.from("gfs_chat_messages").delete().eq("created_by", "seed:chatPreview");
      if (e1 || e2) return fail((e1 || e2)!.message, 500);
      const social = await syncDaySocial(sb, String(b.day_id), approve);
      return NextResponse.json({ ok: true, social }, { headers: noStore });
    }
  }
  return fail("unknown action");
}
