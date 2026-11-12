// GeekFon Radio v1, the /radio app. Ported from the locked Seat 2: Discovery
// mockup (Sean, 2026-11-12). Everything is scoped under .gfr. Station colors
// arrive from data as --st / --st-ink (and --c / --i on each card); none are
// written here.
export const RADIO_CSS = `
html,body{background:#09090a}
body{overflow:hidden}
.gfr{
  color-scheme:dark;
  --bg:#09090a; --rail:#000000; --surface:#131315; --surface-2:#1b1b1e; --surface-3:#26262a;
  --line:#2a2a2f; --text:#f5f5f6; --muted:#a3a3ab; --faint:#6e6e77; --focus:#ffffff;
  --heart:#E8302A; --scrim:rgba(0,0,0,.6);
  --rail-w:248px; --panel-w:348px; --bar-h:92px;
  --display:var(--gfr-display),'Bricolage Grotesque','Arial Black',system-ui,sans-serif;
  --body:var(--gfr-body),'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif;
  background:var(--bg);color:var(--text);font-family:var(--body);font-size:15px;line-height:1.4;-webkit-font-smoothing:antialiased;
}
.gfr *{box-sizing:border-box}
.gfr button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.gfr a{color:inherit;text-decoration:none}
.gfr img,.gfr svg{display:block}
.gfr h1,.gfr h2,.gfr h3,.gfr p{margin:0}
.gfr :focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:6px}
/* the site-wide button:focus ring shows on mouse clicks too; here only the keyboard ring */
.gfr :focus:not(:focus-visible){outline:none}
.gfr .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ---------- App shell: three zones + bar ---------- */
.gfr .app{display:grid;height:100vh;height:100dvh;grid-template-columns:var(--rail-w) minmax(0,1fr) var(--panel-w);grid-template-rows:minmax(0,1fr) var(--bar-h);grid-template-areas:"rail main panel" "bar bar bar";gap:8px;padding:8px}
.gfr .rail{grid-area:rail;background:var(--rail);border-radius:10px;display:flex;flex-direction:column;padding:18px 12px 14px;min-height:0}
.gfr .main{grid-area:main;background:var(--surface);border-radius:10px;overflow-y:auto;overflow-x:hidden;min-height:0;position:relative}
.gfr .panel{grid-area:panel;background:var(--surface);border-radius:10px;overflow-y:auto;min-height:0}
.gfr .bar{grid-area:bar}

/* ---------- Rail ---------- */
.gfr .brand{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:2px 8px 18px;text-align:left}
.gfr .brand img.wm{width:100%;max-width:188px;height:auto;display:block}
.gfr .brand b{font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:-.02em;line-height:1;display:block}
.gfr .brand small{display:block;font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-top:3px}
.gfr .nav{display:flex;flex-direction:column;gap:2px}
.gfr .nav button{display:flex;align-items:center;gap:14px;padding:10px;border-radius:6px;font-weight:700;color:var(--muted);text-align:left;font-size:15px}
.gfr .nav button:hover{color:var(--text);background:var(--surface-2)}
.gfr .nav button[aria-current="page"]{color:var(--text);background:var(--surface-2)}
.gfr .nav .count{margin-left:auto;font-size:12px;color:var(--faint);font-weight:600}
.gfr .rail h3{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:22px 10px 8px;font-weight:700}
.gfr .dial{display:flex;flex-direction:column;gap:2px;overflow-y:auto;min-height:0}
.gfr .dial button,.gfr .dial .soon{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:6px;text-align:left}
.gfr .dial button:hover{background:var(--surface-2)}
.gfr .dial .soon{opacity:.55}
.gfr .dial .sw{width:36px;height:36px;border-radius:5px;flex:none;display:grid;place-items:center;overflow:hidden;position:relative}
.gfr .dial .sw img{width:26px;height:26px;border-radius:3px;transform:rotate(-8deg);box-shadow:0 2px 6px rgba(0,0,0,.35);object-fit:cover}
.gfr .dial .nm{font-weight:600;font-size:14px;line-height:1.15;display:block}
.gfr .dial .sub{font-size:12px;color:var(--muted);display:block}
.gfr .dial button[aria-pressed="true"] .nm{color:var(--hl)}
.gfr .dial .eqw{margin-left:auto}
.gfr .home{margin:auto 8px 0;font-size:12.5px;color:var(--faint);display:flex;align-items:center;gap:8px;padding-top:12px}
.gfr .home:hover{color:var(--muted)}

/* ---------- Main ---------- */
.gfr .top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px;padding:14px 28px;min-height:54px;background:linear-gradient(var(--surface) 55%, transparent)}
.gfr .chip{font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;background:var(--surface-3);color:var(--muted);white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.gfr .chip:hover{color:var(--text)}
.gfr .top .chip{margin-left:auto}
.gfr .mlogo{display:none}
.gfr .view{padding:4px 28px 40px}
.gfr .hero{position:relative;margin:-64px -28px 0;padding:76px 28px 22px;background:linear-gradient(180deg, color-mix(in srgb, var(--st) 38%, var(--surface)) 0%, var(--surface) 100%);transition:background .6s}
.gfr .hello{font-family:var(--display);font-weight:800;font-size:clamp(34px,4.4vw,56px);letter-spacing:-.035em;line-height:.95}
.gfr .lede{margin:10px 0 0;color:var(--muted);font-size:15px;max-width:560px}
.gfr .lede b{color:var(--text)}
.gfr .quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:22px}
.gfr .qt{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.07);border-radius:6px;overflow:hidden;text-align:left;height:56px;padding-right:10px;transition:background .2s}
.gfr .qt:hover{background:rgba(255,255,255,.14)}
.gfr .qt .sq{width:56px;height:56px;flex:none;display:grid;place-items:center;color:#fff}
.gfr .qt .sq img{width:56px;height:56px;object-fit:cover}
.gfr .qt b{font-weight:700;font-size:14px;line-height:1.15;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gfr .qt .eqw{margin-left:auto}
.gfr .qt .hsq{background:linear-gradient(135deg,#E8302A,#A8329A)}

.gfr .shelf{margin-top:30px}
.gfr .shelf-h{display:flex;align-items:baseline;gap:10px;margin:0 0 14px}
.gfr .shelf-h h2{font-family:var(--display);font-weight:800;font-size:24px;letter-spacing:-.02em;line-height:1}
.gfr .tag{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border-radius:5px;background:var(--surface-3);color:var(--muted);vertical-align:middle}
.gfr .shelf-h .more{margin-left:auto;font-size:13px;font-weight:700;color:var(--muted)}
.gfr .shelf-h .more:hover{color:var(--text);text-decoration:underline}

.gfr .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:14px}
.gfr .card{position:relative;overflow:hidden;border-radius:10px;background:var(--c);color:var(--i);aspect-ratio:1/1.12;padding:16px 16px 0;text-align:left;display:flex;flex-direction:column;isolation:isolate;transition:transform .25s ease, box-shadow .25s ease}
.gfr .card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,.45)}
.gfr .card .name{font-family:var(--display);font-weight:800;font-size:clamp(22px,2.1vw,30px);letter-spacing:-.03em;line-height:.92;max-width:80%;position:relative;z-index:2}
.gfr .card .line{font-size:12.5px;font-weight:600;opacity:.82;margin-top:7px;max-width:78%;position:relative;z-index:2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gfr .collage{position:absolute;inset:auto -10% -6% 22%;height:60%;z-index:1;pointer-events:none}
.gfr .collage img{position:absolute;width:56%;aspect-ratio:1;object-fit:cover;border-radius:6px;box-shadow:0 10px 24px rgba(0,0,0,.45);transition:transform .35s ease}
.gfr .collage img:nth-child(1){right:6%;bottom:2%;transform:rotate(9deg);z-index:3}
.gfr .collage img:nth-child(2){right:40%;bottom:-4%;transform:rotate(-10deg);z-index:2}
.gfr .collage img:nth-child(3){right:24%;bottom:30%;transform:rotate(3deg);z-index:1;width:46%}
.gfr .card:hover .collage img:nth-child(1){transform:rotate(13deg) translateY(-4px)}
.gfr .card:hover .collage img:nth-child(2){transform:rotate(-14deg) translateY(-2px)}
.gfr .card .go{position:absolute;top:12px;right:12px;width:44px;height:44px;border-radius:50%;background:var(--bg);color:var(--c);display:grid;place-items:center;z-index:4;box-shadow:0 6px 16px rgba(0,0,0,.35);opacity:0;transform:translateY(6px);transition:opacity .2s, transform .2s}
.gfr .card:hover .go,.gfr .card:focus-visible .go,.gfr .card.on .go{opacity:1;transform:none}
.gfr .card .air{position:absolute;left:16px;bottom:14px;z-index:4;display:none;align-items:center;gap:7px;background:var(--bg);color:var(--text);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 9px;border-radius:5px}
.gfr .card.on .air{display:flex}
.gfr .card.wide{grid-column:span 2;aspect-ratio:auto;min-height:100%}
.gfr .card.wide .collage{inset:auto -4% -8% 38%;height:96%}
.gfr .card.wide .collage img{width:44%}
.gfr .card.wide .collage img:nth-child(3){width:38%;right:26%;bottom:34%}
.gfr .card.coming{cursor:default;background:var(--surface-2);color:var(--text);border:1px dashed color-mix(in srgb, var(--c) 70%, transparent)}
.gfr .card.coming:hover{transform:none;box-shadow:none}
.gfr .card.coming .name{color:var(--c)}
.gfr .card.coming .ring{position:absolute;right:-30%;bottom:-30%;width:90%;aspect-ratio:1;border-radius:50%;border:22px solid color-mix(in srgb, var(--c) 30%, transparent);box-shadow:0 0 0 22px color-mix(in srgb, var(--c) 14%, transparent)}
.gfr .card.coming .tag{position:absolute;left:16px;bottom:16px;background:var(--c);color:var(--i)}

.gfr .recent{display:flex;gap:16px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.gfr .rc{flex:0 0 150px;text-align:left}
.gfr .rc img,.gfr .rc .ph{width:150px;height:150px;object-fit:cover;border-radius:6px;margin-bottom:8px;background:var(--surface-2)}
.gfr .rc b{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfr .rc span{font-size:13px;color:var(--muted)}
.gfr .rc:hover b{text-decoration:underline}
.gfr .empty{border:1px dashed var(--line);border-radius:10px;padding:22px;color:var(--muted);font-size:14px;display:flex;align-items:center;gap:14px}
.gfr .empty svg{flex:none;color:var(--faint)}

/* Stations view */
.gfr .vhead{padding:28px 0 6px}
.gfr .vhead h1{font-family:var(--display);font-weight:800;font-size:clamp(32px,4vw,52px);letter-spacing:-.035em;line-height:.95}
.gfr .vhead p{color:var(--muted);margin:8px 0 0}
.gfr .rows{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.gfr .srow{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:18px;align-items:center;padding:10px;border-radius:10px;background:var(--surface-2);text-align:left}
.gfr .srow:hover{background:var(--surface-3)}
.gfr .srow .art{width:96px;height:96px;border-radius:8px;background:var(--c);position:relative;overflow:hidden}
.gfr .srow .art img{position:absolute;width:62px;height:62px;border-radius:4px;object-fit:cover;box-shadow:0 6px 12px rgba(0,0,0,.4)}
.gfr .srow .art img:nth-child(1){right:-6px;bottom:-6px;transform:rotate(9deg);z-index:2}
.gfr .srow .art img:nth-child(2){left:-4px;top:-6px;transform:rotate(-8deg)}
.gfr .srow h2{font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:-.02em;line-height:1.05}
.gfr .srow p{margin:4px 0 0;color:var(--muted);font-size:13.5px}
.gfr .srow .act{display:flex;align-items:center;gap:10px;padding-right:8px}
.gfr .pill{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:6px;font-weight:700;font-size:14px;background:var(--text);color:var(--bg);white-space:nowrap}
.gfr .pill.ghost{background:transparent;color:var(--text);box-shadow:inset 0 0 0 1px var(--line)}
.gfr .pill.ghost:hover{box-shadow:inset 0 0 0 1px var(--muted)}
.gfr .srow.dim{opacity:.75}
.gfr .srow.dim:hover{background:var(--surface-2)}

/* Hearts view */
.gfr .hhero{margin:-64px -28px 0;padding:84px 28px 24px;display:flex;align-items:flex-end;gap:24px;background:linear-gradient(180deg, color-mix(in srgb, var(--heart) 46%, var(--surface)), var(--surface))}
.gfr .hhero .big{width:150px;height:150px;border-radius:8px;flex:none;display:grid;place-items:center;background:linear-gradient(135deg, var(--heart), color-mix(in srgb, var(--heart) 40%, #000));color:#fff;box-shadow:0 18px 40px rgba(0,0,0,.45)}
.gfr .hhero small{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.gfr .hhero h1{font-family:var(--display);font-weight:800;font-size:clamp(34px,5vw,64px);letter-spacing:-.04em;line-height:.95;margin:6px 0 8px}
.gfr .hhero p{margin:0;color:var(--muted);font-size:14px;max-width:640px}
.gfr .ib{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--muted);flex:none}
.gfr .ib:hover{color:var(--text);background:var(--surface-3)}
.gfr .ib.hearted{color:var(--heart)}
.gfr .ib:disabled{opacity:.35;cursor:default;background:none}
.gfr .wit{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;padding:8px 12px;border-radius:6px;background:var(--surface-3);color:var(--text);white-space:nowrap}
.gfr .wit:hover{background:color-mix(in srgb, var(--st) 30%, var(--surface-3))}
.gfr .wit .q{width:18px;height:18px;border-radius:50%;background:var(--st);color:var(--st-ink);display:grid;place-items:center;font-size:12px;font-weight:800;font-family:var(--display)}

/* Song rows (Hearted songs) */
.gfr .hg{margin-top:24px}
.gfr .hg-h{display:flex;align-items:center;gap:12px;padding:0 10px 8px;border-bottom:1px solid var(--line);margin-bottom:6px}
.gfr .hg-h img{width:44px;height:44px;border-radius:8px;object-fit:cover}
.gfr .hg-h a{font-family:var(--display);font-weight:800;font-size:21px;letter-spacing:-.02em;line-height:1;display:block}
.gfr .hg-h a:hover{text-decoration:underline}
.gfr .hg-h .s{font-size:12.5px;color:var(--muted)}
.gfr .slist{display:flex;flex-direction:column;margin-top:6px}
.gfr .sng{position:relative;display:grid;grid-template-columns:40px 48px minmax(0,1fr) auto 92px auto;gap:14px;align-items:center;padding:8px 10px;border-radius:6px;--ac-l:color-mix(in srgb, var(--ac) 62%, #ffffff)}
.gfr .sng:hover,.gfr .sng.on{background:var(--surface-2)}
.gfr .pvb{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--surface-3);color:var(--text)}
.gfr .pvb svg{width:18px;height:18px}
.gfr .sng:hover .pvb,.gfr .sng.on .pvb,.gfr .pvb:focus-visible{background:var(--ac);color:var(--ac-ink)}
.gfr .sng > img,.gfr .sng > .ph{width:48px;height:48px;border-radius:4px;object-fit:cover;background:var(--surface-3)}
.gfr .st{min-width:0}
.gfr .st .tl{display:flex;align-items:center;gap:8px;min-width:0}
.gfr .st b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.gfr .ptag{display:none;flex:none;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 6px;border-radius:4px;background:var(--ac);color:var(--ac-ink)}
.gfr .sng.on .ptag{display:inline-block}
.gfr .st .sub{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;margin-top:2px}
.gfr .alink{color:var(--muted)}
.gfr .alink:hover{color:var(--text);text-decoration:underline}
.gfr .mlen{display:none}
.gfr .len{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.gfr .sng.on .len{color:var(--text)}
.gfr .sng .ops{display:flex;gap:2px}
.gfr .rp{position:absolute;left:10px;right:10px;bottom:0;height:2px;border-radius:2px;overflow:hidden}
.gfr .sng.on .rp{background:var(--surface-3)}
.gfr .rp i{display:block;height:100%;width:0;background:var(--ac)}
.gfr .unl{font-size:13px;font-weight:700;color:var(--ac-l);text-decoration:underline;text-underline-offset:3px;text-align:left;display:block;white-space:normal;max-width:220px;line-height:1.3}
.gfr .unl:hover{color:var(--text)}
.gfr .foot{color:var(--faint);font-size:13px;margin:18px 0 0}

/* ---------- Right panel: What is this? ---------- */
.gfr .panel-in{min-height:100%;background:linear-gradient(180deg, color-mix(in srgb, var(--st) 48%, var(--surface)) 0, var(--surface) 420px);transition:background .6s;position:relative}
.gfr .ph-h{display:flex;align-items:center;gap:10px;padding:16px 18px 6px}
.gfr .ph-h h2{font-size:15px;font-weight:700}
.gfr .ph-h .x{margin-left:auto;display:none}
.gfr .pback{margin:0 18px 6px;font-size:12.5px;font-weight:700;color:var(--text);opacity:.8;display:inline-flex;align-items:center;gap:6px}
.gfr .pback:hover{opacity:1;text-decoration:underline}
.gfr .pcover{margin:8px 18px 0;aspect-ratio:1;border-radius:8px;overflow:hidden;box-shadow:0 20px 44px rgba(0,0,0,.5);position:relative;background:var(--st)}
.gfr .pcover img{width:100%;height:100%;object-fit:cover}
.gfr .pmeta{padding:16px 18px 4px}
.gfr .pmeta .song{font-family:var(--display);font-weight:800;font-size:26px;letter-spacing:-.025em;line-height:1}
.gfr .pmeta .who{margin-top:6px;color:var(--muted);font-weight:600}
.gfr .card2{margin:14px 12px 0;background:var(--surface-2);border-radius:10px;padding:16px}
.gfr .card2 .lab{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.gfr .artist{display:flex;align-items:center;gap:12px}
.gfr .artist img,.gfr .artist .ph{width:52px;height:52px;border-radius:8px;object-fit:cover;flex:none;background:var(--surface-3)}
.gfr .artist b{font-family:var(--display);font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:1.05;display:block}
.gfr .artist span{font-size:13px;color:var(--muted);display:block;margin-top:2px}
.gfr .visit{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-radius:6px;background:var(--text);color:var(--bg);font-weight:700;font-size:14px}
.gfr .visit:hover{background:#ffffff}
.gfr .visit small{font-weight:500;opacity:.6;font-size:12px;margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.gfr .visit > span{white-space:nowrap}
.gfr .facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.gfr .facts span{font-size:12px;font-weight:600;color:var(--muted);background:var(--surface-3);padding:4px 8px;border-radius:5px}
.gfr .lyr{background:var(--st);color:var(--st-ink)}
.gfr .lyr .lab{color:var(--st-ink);opacity:.75}
.gfr .lyr .ln{font-family:var(--display);font-weight:700;font-size:19px;line-height:1.22;letter-spacing:-.01em;margin:0 0 3px}
.gfr .lyr .sec{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65;margin:10px 0 4px}
.gfr .lyr .sec:first-child{margin-top:0}
.gfr .lyr .none{font-size:14px;font-weight:600;opacity:.85}
.gfr .lprev{max-height:236px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 70%, transparent);mask-image:linear-gradient(#000 70%, transparent)}
.gfr .lyr .full{margin-top:10px;display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:6px;background:var(--st-ink);color:var(--st);font-weight:800;font-size:14px}
.gfr .lang{font-size:12.5px;opacity:.75;margin:0 0 10px;font-weight:600}
.gfr .recentp{margin:12px 12px 16px}
.gfr .recentp .it{display:flex;align-items:center;gap:10px;padding:6px 4px;width:100%;text-align:left}
.gfr .recentp img,.gfr .recentp .ph{width:40px;height:40px;border-radius:4px;object-fit:cover;background:var(--surface-3);flex:none}
.gfr .recentp b{display:block;font-size:13.5px}
.gfr .recentp span span{font-size:12.5px;color:var(--muted)}
.gfr .spot{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:11px 14px;border-radius:6px;background:var(--text);color:var(--bg);font-weight:700;font-size:14px}
.gfr .panel.flash .pcover{animation:gfrFlash .9s ease}
@keyframes gfrFlash{0%{box-shadow:0 0 0 0 var(--st)}40%{box-shadow:0 0 0 8px var(--st)}100%{box-shadow:0 20px 44px rgba(0,0,0,.5)}}

/* ---------- Now playing bar ---------- */
.gfr .bar{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr);align-items:center;gap:20px;padding:0 12px;position:relative}
.gfr .np{display:flex;align-items:center;gap:14px;min-width:0}
.gfr .np .cv{width:60px;height:60px;border-radius:6px;overflow:hidden;flex:none;box-shadow:0 4px 12px rgba(0,0,0,.4);position:relative;background:var(--st);display:grid;place-items:center}
.gfr .np .cv img{width:100%;height:100%;object-fit:cover}
.gfr .np .cv img.logo{width:62%;height:62%;object-fit:contain}
.gfr .np .tx{display:flex;flex-direction:column;min-width:0;text-align:left}
.gfr .np .tx .tt{display:block;max-width:100%;text-align:left;min-width:0}
.gfr .np .tx .tt b{display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfr .np .tx .tt:hover b{text-decoration:underline}
.gfr .np .tx .ta{display:block;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;align-self:flex-start;max-width:100%;text-align:left}
.gfr .np .tx .ta:hover{color:var(--text);text-decoration:underline}
.gfr .np .tx .sponsor{color:var(--text);font-weight:700;text-decoration:underline;text-underline-offset:3px;display:inline-flex;align-items:center;gap:5px}
.gfr .ctr{display:flex;flex-direction:column;align-items:center;gap:6px}
.gfr .ctr .row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;width:100%;max-width:560px}
.gfr .live{justify-self:end;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.gfr .live i{width:7px;height:7px;border-radius:50%;background:var(--faint)}
.gfr .live.on i{background:var(--st);box-shadow:0 0 0 3px color-mix(in srgb, var(--st) 30%, transparent)}
.gfr .live.pvm{color:var(--text)}
.gfr .live.pvm i{background:var(--heart);box-shadow:0 0 0 3px color-mix(in srgb, var(--heart) 30%, transparent)}
.gfr .stname{justify-self:start;font-size:12px;font-weight:700;color:var(--muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfr .play{width:52px;height:52px;border-radius:50%;background:var(--text);color:var(--bg);display:grid;place-items:center;transition:transform .15s}
.gfr .play:hover{transform:scale(1.06)}
.gfr .play:disabled{opacity:.5;cursor:default;transform:none}
.gfr .prog{display:flex;align-items:center;gap:10px;width:100%;max-width:560px;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.gfr .track{flex:1;height:4px;border-radius:2px;background:var(--surface-3);position:relative;overflow:hidden}
.gfr .track i{position:absolute;inset:0 auto 0 0;width:0;background:var(--text);border-radius:2px;transition:width .5s linear}
.gfr .bar:hover .track i{background:var(--st)}
.gfr .rt{display:flex;align-items:center;justify-content:flex-end;gap:6px}
.gfr .mtabs{display:none}
.gfr .mini-prog{display:none}
.gfr .show-m{display:none}

/* ---------- Lyrics overlay ---------- */
.gfr .lyrics{position:fixed;inset:0;z-index:50;background:var(--st);color:var(--st-ink);display:flex;flex-direction:column}
.gfr .lyrics .lh{display:flex;align-items:center;gap:14px;padding:18px 28px}
.gfr .lyrics .lh img{width:52px;height:52px;border-radius:6px;object-fit:cover}
.gfr .lyrics .lh b{display:block;font-family:var(--display);font-weight:800;font-size:20px;letter-spacing:-.02em;line-height:1}
.gfr .lyrics .lh span{font-size:13.5px;opacity:.8;font-weight:600}
.gfr .lyrics .lh .wit{margin-left:auto;background:var(--st-ink);color:var(--st)}
.gfr .lyrics .lh .wit .q{background:var(--st);color:var(--st-ink)}
.gfr .lyrics .lh .cl{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb, var(--st-ink) 14%, transparent)}
.gfr .lyrics .lb{flex:1;overflow-y:auto;padding:10px 28px 120px}
.gfr .lyrics .lb-in{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:56px;align-items:start}
.gfr .lyrics .side{position:sticky;top:0;background:color-mix(in srgb, var(--st-ink) 10%, transparent);border-radius:10px;padding:16px}
.gfr .lyrics .side img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;box-shadow:0 18px 40px rgba(0,0,0,.3)}
.gfr .lyrics .side b{display:block;font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:-.02em;margin:14px 0 2px}
.gfr .lyrics .side span{font-size:13.5px;opacity:.8}
.gfr .lyrics .side a{margin-top:14px;display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-radius:6px;background:var(--st-ink);color:var(--st);font-weight:800}
.gfr .lyrics .ln{font-family:var(--display);font-weight:800;font-size:clamp(26px,3.6vw,42px);letter-spacing:-.025em;line-height:1.14;margin:0 0 10px}
.gfr .lyrics .sec{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin:30px 0 10px}
.gfr .lyrics .sec:first-child{margin-top:8px}
.gfr .lyrics .note{font-size:13.5px;font-weight:600;opacity:.8;margin:0 0 18px}

/* toast and preview note */
.gfr .toast{position:fixed;left:50%;bottom:calc(var(--bar-h) + 22px);transform:translate(-50%,20px);background:var(--text);color:var(--bg);font-weight:700;font-size:14px;padding:10px 16px;border-radius:6px;opacity:0;pointer-events:none;transition:opacity .2s, transform .2s;z-index:60;white-space:nowrap}
.gfr .toast.show{opacity:1;transform:translate(-50%,0)}
.gfr.pv .toast{bottom:calc(var(--bar-h) + 80px)}
.gfr .pvnote{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--bar-h) + 18px);z-index:45;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 14px;border-radius:8px;background:var(--surface-3);box-shadow:0 14px 36px rgba(0,0,0,.55);font-size:13.5px;font-weight:600;max-width:calc(100vw - 32px)}
.gfr .pvnote .eq{color:var(--heart)}
.gfr .pvn-b{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:6px;background:var(--text);color:var(--bg);font-weight:700;white-space:nowrap}
.gfr .pvn-b svg{width:16px;height:16px}
.gfr .pvn-u{padding:8px 12px;border-radius:6px;background:var(--ac);color:var(--ac-ink);font-weight:700;white-space:nowrap}

/* equalizer */
.gfr .eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
.gfr .eq i{width:3px;background:currentColor;border-radius:1px;height:40%;animation:gfrEq 1s ease-in-out infinite}
.gfr .eq i:nth-child(2){animation-delay:-.4s}
.gfr .eq i:nth-child(3){animation-delay:-.7s}
.gfr .eq.still i{animation:none}
.gfr .eq.still i:nth-child(1){height:50%}.gfr .eq.still i:nth-child(2){height:80%}.gfr .eq.still i:nth-child(3){height:35%}
@keyframes gfrEq{0%,100%{height:30%}50%{height:100%}}

.gfr .scrim{position:fixed;inset:0;background:var(--scrim);z-index:30}

/* ---------- Mid width: panel becomes a drawer ---------- */
@media (max-width:1180px){
  .gfr .app{grid-template-columns:var(--rail-w) minmax(0,1fr);grid-template-areas:"rail main" "bar bar"}
  .gfr .panel{position:fixed;right:8px;top:8px;bottom:calc(var(--bar-h) + 8px);width:min(380px,calc(100vw - 16px));z-index:40;transform:translateX(110%);transition:transform .3s ease;box-shadow:-20px 0 40px rgba(0,0,0,.5)}
  .gfr .panel.open{transform:none}
  .gfr .ph-h .x{display:grid}
}

/* ---------- Phone ---------- */
@media (max-width:760px){
  body{overflow:auto}
  .gfr{--bar-h:64px;--tabs-h:62px;font-size:14.5px}
  .gfr .app{display:block;padding:0;height:auto;min-height:100dvh}
  .gfr .rail{display:none}
  .gfr .main{border-radius:0;overflow:visible;min-height:100dvh;padding-bottom:calc(var(--bar-h) + var(--tabs-h) + 28px + env(safe-area-inset-bottom))}
  .gfr .top{padding:12px 16px;background:linear-gradient(var(--surface) 60%, transparent)}
  .gfr .mlogo{display:flex;align-items:center;gap:8px;min-width:0}
  .gfr .mlogo img.wm{height:30px;width:auto;display:block}
  .gfr .mlogo small{font-size:10.5px;color:var(--muted);font-weight:700;letter-spacing:.08em;text-transform:uppercase;align-self:flex-end;margin-bottom:2px}
  .gfr .mlogo b{font-family:var(--display);font-weight:800;font-size:17px;letter-spacing:-.02em}
  .gfr .view{padding:0 16px 24px}
  .gfr .hero{margin:-62px -16px 0;padding:70px 16px 18px}
  .gfr .lede{font-size:14px}
  .gfr .quick{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .gfr .qt{height:52px}
  .gfr .qt .sq,.gfr .qt .sq img{width:52px;height:52px}
  .gfr .qt b{font-size:13px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .gfr .shelf{margin-top:26px}
  .gfr .shelf-h h2{font-size:21px}
  .gfr .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .gfr .card{padding:12px 12px 0;aspect-ratio:1/1.18}
  .gfr .card .name{font-size:21px;max-width:92%}
  .gfr .card .line{font-size:11.5px;max-width:92%}
  .gfr .card .go{width:38px;height:38px;top:auto;bottom:10px;right:10px;opacity:1;transform:none}
  .gfr .card .go svg{width:16px;height:16px}
  .gfr .card .air{left:10px;bottom:10px}
  .gfr .card.wide{grid-column:span 2;aspect-ratio:2/1.08}
  .gfr .card.coming .tag{left:12px;bottom:12px}
  .gfr .rc{flex-basis:128px}.gfr .rc img,.gfr .rc .ph{width:128px;height:128px}
  .gfr .srow{grid-template-columns:72px minmax(0,1fr);gap:12px}
  .gfr .srow .art{width:72px;height:72px}
  .gfr .srow .art img{width:48px;height:48px}
  .gfr .srow h2{font-size:18px}
  .gfr .srow .act{grid-column:1 / -1;padding:0}
  .gfr .srow .act .pill{flex:1;justify-content:center}
  .gfr .hhero{margin:-62px -16px 0;padding:76px 16px 20px;gap:16px}
  .gfr .hhero .big{width:96px;height:96px}
  .gfr .sng{grid-template-columns:36px 44px minmax(0,1fr) auto;gap:10px;padding:8px 4px}
  .gfr .pvb{width:36px;height:36px}
  .gfr .sng > img,.gfr .sng > .ph{width:44px;height:44px}
  .gfr .sng .len{display:none}
  .gfr .mlen{display:inline-flex;align-items:center}
  .gfr .sng .sx{grid-column:3 / -1;grid-row:2;margin-top:-4px;min-width:0}
  .gfr .sng .ops .ib{width:36px}
  .gfr .rp{left:4px;right:4px}
  .gfr .hg-h{flex-wrap:wrap;padding:0 4px 8px}

  /* mini player above tabs */
  .gfr .bar{position:fixed;left:8px;right:8px;bottom:calc(var(--tabs-h) + env(safe-area-inset-bottom) + 6px);height:var(--bar-h);z-index:20;border-radius:8px;background:color-mix(in srgb, var(--st) 46%, #121214);display:flex;gap:8px;padding:0 6px 0 8px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:background .6s}
  .gfr .np{flex:1;gap:10px}
  .gfr .np .cv{width:46px;height:46px;border-radius:5px}
  .gfr .np .tx .tt b{font-size:14px}
  .gfr .np .tx .ta{font-size:12.5px;color:color-mix(in srgb, var(--text) 75%, transparent)}
  .gfr .ctr{flex-direction:row;gap:0}
  .gfr .ctr .row{display:flex;gap:0;width:auto}
  .gfr .ctr .live,.gfr .prog,.gfr .stname,.gfr .rt .wit .t,.gfr .bar .hide-m{display:none}
  .gfr .show-m{display:grid}
  .gfr .rt .wit{background:transparent;padding:0;width:36px;height:40px;justify-content:center}
  .gfr .rt .wit .q{width:22px;height:22px;font-size:13px;background:var(--text);color:var(--bg)}
  .gfr .rt .ib{width:36px}
  .gfr .play{width:44px;height:44px;background:transparent;color:var(--text)}
  .gfr .play svg{width:26px;height:26px}
  .gfr .rt{gap:0}
  .gfr .mini-prog{display:block;position:absolute;left:8px;right:8px;bottom:0;height:2px;background:rgba(255,255,255,.18);border-radius:2px;overflow:hidden}
  .gfr .mini-prog i{display:block;height:100%;width:0;background:var(--text);transition:width .5s linear}
  .gfr .mtabs{display:grid;grid-template-columns:repeat(3,1fr);position:fixed;left:0;right:0;bottom:0;z-index:19;height:calc(var(--tabs-h) + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:linear-gradient(transparent, rgba(0,0,0,.92) 36%, #000)}
  .gfr .mtabs button{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;padding-bottom:10px;font-size:11px;font-weight:600;color:var(--muted)}
  .gfr .mtabs button[aria-current="page"]{color:var(--text)}

  /* panel becomes a bottom sheet */
  .gfr .panel{position:fixed;left:0;right:0;top:auto;bottom:0;width:auto;height:92dvh;border-radius:14px 14px 0 0;transform:translateY(105%);z-index:40;box-shadow:0 -20px 40px rgba(0,0,0,.6)}
  .gfr .panel.open{transform:none}
  .gfr .ph-h{padding-top:18px}
  .gfr .ph-h::before{content:"";position:absolute;left:50%;top:7px;width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,.4);transform:translateX(-50%)}
  .gfr .pcover{margin:8px 16px 0;max-width:340px}
  .gfr .lyrics .lh{padding:14px 16px}
  .gfr .lyrics .lh .wit .t{display:none}
  .gfr .lyrics .lb{padding:6px 16px 120px}
  .gfr .lyrics .ln{font-size:26px}
  .gfr .lyrics .lb-in{grid-template-columns:1fr;gap:20px}
  .gfr .lyrics .side{position:static;display:grid;grid-template-columns:72px 1fr;gap:4px 14px;align-items:center}
  .gfr .lyrics .side img{grid-row:span 2;width:72px}
  .gfr .lyrics .side b{margin:0;font-size:18px}
  .gfr .lyrics .side a{grid-column:1 / -1;margin-top:8px}
  .gfr .toast{bottom:calc(var(--bar-h) + var(--tabs-h) + 20px)}
  .gfr .pvnote{left:8px;right:8px;transform:none;max-width:none;flex-wrap:wrap;bottom:calc(var(--bar-h) + var(--tabs-h) + env(safe-area-inset-bottom) + 14px)}
  .gfr .pvnote > span:not(.eq){flex:1 1 160px}
  .gfr.pv .toast{bottom:calc(var(--bar-h) + var(--tabs-h) + 84px)}
}

@media (prefers-reduced-motion:reduce){
  .gfr *,.gfr *::before,.gfr *::after{transition:none !important;animation:none !important;scroll-behavior:auto !important}
}
`;
