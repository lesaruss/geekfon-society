"use client";
// One sound at a time across geekfon.ai tabs (2026-10-04). Radio links open
// artist pages in a new tab so the radio keeps playing; when the fan then
// plays something on the artist page (or anywhere else), every other
// geekfon.ai tab pauses instead of two songs playing over each other.
// BroadcastChannel only reaches same-origin tabs in the same browser.

type Listener = () => void;
const TAB = Math.random().toString(36).slice(2);
let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function ch(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel("geekfon-audio");
    channel.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "play" && e.data.tab !== TAB) listeners.forEach(fn => fn());
    };
  }
  return channel;
}

/** Tell other tabs this tab just started playing. */
export function announcePlay(): void {
  ch()?.postMessage({ type: "play", tab: TAB });
}

/** Run fn when another tab starts playing. Returns an unsubscribe. */
export function onOtherTabPlay(fn: Listener): () => void {
  ch();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
