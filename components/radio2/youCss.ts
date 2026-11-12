// Your GeekFon (/you) and the signed-in person in the rail and the phone top
// bar. Scoped under .gfr, on the Seat 2 tokens (radioCss).
export const YOU_CSS = `
.gfr .face{display:inline-grid;place-items:center;flex:none;border-radius:6px;overflow:hidden;background:var(--surface-3);color:var(--text);font-weight:800;font-size:11px;line-height:1}
.gfr .face img{width:100%;height:100%;object-fit:cover;display:block}
.gfr .home.who{color:var(--muted);font-weight:700;font-size:13.5px}
.gfr .home.who:hover{color:var(--text)}
.gfr .home.who span:not(.face){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gfr .chip.who{color:var(--text);padding:4px 10px 4px 4px}
.gfr .chip.ghostchip{visibility:hidden;width:72px;min-height:26px}
.gfr .nav a[aria-current="page"]{background:var(--surface-2)}

.gfr .you .vhead{padding-bottom:18px}
.gfr .yload{color:var(--muted)}
.gfr .ycard{display:flex;align-items:center;gap:20px;padding:22px;border-radius:10px;background:var(--surface-2)}
.gfr .ycard h2{font-family:var(--display);font-weight:800;font-size:24px;letter-spacing:-.02em;line-height:1.1;margin:0}
.gfr .ycard p{color:var(--muted);margin:6px 0 0;font-size:14px;max-width:620px}
.gfr .ybody{flex:1;min-width:0}
.gfr .yic{width:64px;height:64px;border-radius:8px;flex:none;display:grid;place-items:center;background:var(--surface-3);color:var(--muted)}
.gfr .yface{width:72px;height:72px;border-radius:10px;flex:none;display:grid;place-items:center;overflow:hidden;background:var(--surface-3);font-family:var(--display);font-weight:800;font-size:30px}
.gfr .yface img{width:100%;height:100%;object-fit:cover}
.gfr .ymail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gfr .ytag{display:inline-block;margin-top:10px;font-size:12px;font-weight:700;padding:4px 8px;border-radius:6px;background:var(--surface-3);color:var(--text)}
.gfr .yact{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.gfr .yme .yact{margin-top:0;flex:none}
.gfr .yact .pill svg{width:18px;height:18px}
.gfr .ysec{margin-top:34px}
.gfr .ysec-h{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.gfr .ysec-h h2{font-family:var(--display);font-weight:800;font-size:24px;letter-spacing:-.02em;margin:0}
.gfr .ycount{color:var(--muted);font-size:13px}
.gfr .ygo{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--text);margin-top:4px}
.gfr .ygo:hover{text-decoration:underline}
.gfr .you .empty{flex-wrap:wrap}
@media (max-width:760px){
  .gfr .ycard{flex-wrap:wrap;gap:14px;padding:16px}
  .gfr .yme .yact{width:100%}
  .gfr .yme .yact .pill,.gfr .ycard .yact .pill{flex:1 1 auto;justify-content:center}
  .gfr .yic{width:48px;height:48px}
  .gfr .yface{width:56px;height:56px;font-size:24px}
}
`;
