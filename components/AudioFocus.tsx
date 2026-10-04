"use client";
// Pauses this tab's media when another geekfon.ai tab starts playing, and
// announces this tab's own plays (lib/audioFocus.ts). Covers every <audio>
// and <video> in the page; players that use a detached Audio() object (the
// radio) wire themselves to the same channel.
import { useEffect } from "react";
import { announcePlay, onOtherTabPlay } from "@/lib/audioFocus";

export default function AudioFocus() {
  useEffect(() => {
    const onPlay = () => announcePlay();
    document.addEventListener("play", onPlay, true);
    const off = onOtherTabPlay(() => {
      document.querySelectorAll<HTMLMediaElement>("audio, video").forEach(m => { if (!m.paused) m.pause(); });
    });
    return () => { document.removeEventListener("play", onPlay, true); off(); };
  }, []);
  return null;
}
