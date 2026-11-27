"use client";
// Radio listener tracking v2 (Sean, 2026-11-27): "I don't know if people might
// just have it playing and never sign up... Can we tell?"
//
// While the radio is actually playing, a heartbeat goes to /api/radio/ping
// every 20 seconds with: the seconds really played since the last beat, the
// station, the song on air, and (first beat only) where the listener came from
// and the page they landed on. A device id kept in this browser links the
// sessions, and a signed-in listener's token is sent now and then so the
// server can attach the account. claimRadioDevice() links an earlier
// anonymous listener to the account they later sign up with, so the
// Command Center can count conversions.
//
// Team devices: open any geekfon.ai page with ?team=1 once and this browser
// is left out of the numbers (?team=0 undoes it). lesaruss.com accounts are
// flagged by the server. No name, email or IP is stored.

import { supabase } from "@/lib/supabase";

const LS_DEVICE = "gfr-device";
const LS_TEAM = "gfr-team";
const LS_CLAIMED = "gfr-claimed";
const BEAT_MS = 20000;

function store(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function radioDeviceId(): string {
  const ls = store();
  let id = ls?.getItem(LS_DEVICE) || "";
  if (!id) { id = newId(); try { ls?.setItem(LS_DEVICE, id); } catch { /* memory only */ } }
  return id;
}

function teamFlag(): boolean {
  const ls = store();
  try {
    const q = new URLSearchParams(window.location.search).get("team");
    if (q === "1") ls?.setItem(LS_TEAM, "1");
    if (q === "0") ls?.removeItem(LS_TEAM);
  } catch { /* ignore */ }
  return ls?.getItem(LS_TEAM) === "1";
}

async function accessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export type ListenState = { station: string; songKey?: string | null; title?: string | null; artist?: string | null };

/**
 * Start the heartbeat for one listening session. Call while audio is playing;
 * call the returned function when it stops (it sends the last partial beat).
 * `legacySessionId` also keeps the old radio_presence "listening now" count fed.
 */
export function startListenHeartbeat(surface: "radio" | "mini", get: () => ListenState, legacySessionId?: string): () => void {
  const session = newId();
  const device = radioDeviceId();
  const team = teamFlag();
  let last = Date.now();
  let beats = 0;
  let stopped = false;

  const send = async (final = false) => {
    const now = Date.now();
    const seconds = beats === 0 ? 0 : Math.min(60, Math.round((now - last) / 1000));
    last = now;
    const st = get();
    const body: Record<string, unknown> = {
      session_id: legacySessionId || session,
      listen: {
        session, device, team, surface, seconds,
        station: st.station, song_key: st.songKey || (st.title ? `${st.title}|${st.artist ?? ""}` : null),
        title: st.title ?? null, artist: st.artist ?? null,
      },
    };
    if (beats === 0) {
      try {
        const u = new URL(window.location.href);
        const ref = document.referrer ? new URL(document.referrer).hostname : "";
        (body.listen as Record<string, unknown>).referrer_host = ref && ref !== u.hostname ? ref.replace(/^www\./, "") : null;
        (body.listen as Record<string, unknown>).landing = (u.pathname + (u.searchParams.get("station") ? `?station=${u.searchParams.get("station")}` : "")).slice(0, 200);
        (body.listen as Record<string, unknown>).utm_source = u.searchParams.get("utm_source")?.slice(0, 60) || null;
      } catch { /* ignore */ }
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // The account is looked up on the first beat and every ~5 minutes, not on every beat.
    if (beats % 15 === 0) { const t = await accessToken(); if (t) headers.Authorization = `Bearer ${t}`; }
    beats++;
    fetch("/api/radio/ping", { method: "POST", headers, body: JSON.stringify(body), keepalive: final }).catch(() => {});
  };

  send();
  const timer = setInterval(() => { if (!stopped) send(); }, BEAT_MS);
  return () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    if (Date.now() - last > 2000) send(true);
  };
}

/** A signed-in visit: link this browser's earlier listening to the account, once per account. */
export async function claimRadioDevice(): Promise<void> {
  const ls = store();
  const device = ls?.getItem(LS_DEVICE);
  if (!device) return; // never listened in this browser
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!session || !uid || ls?.getItem(LS_CLAIMED) === uid) return;
    const res = await fetch("/api/radio/claim", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ device, team: teamFlag() }) });
    if (res.ok) ls?.setItem(LS_CLAIMED, uid);
  } catch { /* try again next visit */ }
}
