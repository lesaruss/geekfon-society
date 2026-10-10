// Who reads which days of the artists' group chat (Sean, 2026-10-10,
// canon-geekfon-album-model chat_access_2026_10_10): October 1 to 3 are a
// free pilot for everyone, signed in or not. Every later day is for
// supporters, and any album purchase unlocks the whole chat on every
// artist's page, since it is one chat seen from each artist's side.
// Fixed days, not a rolling window, so every new visitor starts at the
// beginning of the story. The homepage chat lines draw from these days too.
// Shared by the server (app/api/roster/[artist]/chat) and the client.

export const FREE_CHAT_DAYS: readonly string[] = ["2026-10-01", "2026-10-02", "2026-10-03"];

export function isFreeChatDay(day: string): boolean {
  return FREE_CHAT_DAYS.includes(day);
}
