// The artists' group chat, as a supporter sees it from one artist's side
// (2026-10-04, Sean: Chat is the artists talking to each other every day,
// "almost like a little series", shown from that artist's perspective).
// Chat is not live yet, so the storefront tour shows a scripted preview,
// labelled as such. One script per artist; the cast's avatars come from
// gfs_artists (lib/server below the page loader).
export type ChatLine = { from: string; text: string };
export type ChatScript = { room: string; cast: string[]; lines: ChatLine[] };

export const CHAT_PREVIEWS: Record<string, ChatScript> = {
  roxanne: {
    room: "geekfon-crew",
    cast: ["lex-from-brixton", "riku", "shamanic-resin"],
    lines: [
      { from: "lex-from-brixton", text: "Rehearsal moved to 7. Nobody be late this time 👀" },
      { from: "roxanne", text: "Already here. I brought matching wristbands for everyone 🎀" },
      { from: "shamanic-resin", text: "do they come in cat size" },
      { from: "riku", text: "Roxanne, I finished the new bridge. Listen when you can 🎧" },
      { from: "roxanne", text: "RIKU. I just cried on the subway. It's perfect." },
      { from: "lex-from-brixton", text: "Right, that's it. We're playing it tonight." },
    ],
  },
};
