// Homepage and roster numbers to watch (playbook geekfon-character-select,
// 2026-10-10): tap to listen, artist opens, follows and album clicks. Sent to
// GA4 (G-5YTJ0CZLJY, loaded in app/layout.tsx), which the HQ dashboard reads.
type Gtag = (cmd: "event", name: string, params?: Record<string, unknown>) => void;

export function track(name: "gfs_tap_listen" | "gfs_artist_pick" | "gfs_artist_open" | "gfs_play_single" | "gfs_preview" | "gfs_follow" | "gfs_album_click" | "gfs_lola_intro", params: Record<string, unknown> = {}): void {
  try {
    const g = (window as unknown as { gtag?: Gtag }).gtag;
    g?.("event", name, params);
  } catch { /* analytics never breaks the page */ }
}
