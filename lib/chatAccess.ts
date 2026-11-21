// 2026-11-04: the whole story moved forward 35 days (Oct 1 became Thu Nov 5)
// so the content stays ahead of the calendar; the opening days are now Nov 5-7.
// Who reads which days of the artists' group chat (Sean, 2026-10-10,
// canon-geekfon-album-model chat_access_2026_10_10): October 1 to 3 are a
// free pilot for everyone, signed in or not. Every later day is for that
// artist's supporters, page by page: buying Roxanne's album opens every day
// on Roxanne's page only. On another artist's page the same reader gets the
// free days and the locked cards until they support that artist too, so the
// chat is also how fans discover the rest of the roster.
// (Superseded 2026-11-21 by the rolling window below.)
// Shared by the server (app/api/roster/[artist]/chat) and the client.

export const FREE_CHAT_DAYS: readonly string[] = ["2026-11-05", "2026-11-06", "2026-11-07"];

// Sean, 2026-11-04 opened every day to everyone. Sean, 2026-11-21 replaced
// that with a rolling window: everyone reads today and the 5 days before it;
// older days are for that artist's supporters ("Support any one artist and
// you get access to the chats for that artist"). FREE_CHAT_DAYS stays as the
// opening days the homepage draws its snippets from.
export const FREE_CHAT_WINDOW_DAYS = 5;

function shiftDay(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** True when `day` (YYYY-MM-DD) is today or within the free window before `today` (both story-time days). */
export function isFreeChatDay(day: string, today: string): boolean {
  return day >= shiftDay(today, -FREE_CHAT_WINDOW_DAYS);
}
