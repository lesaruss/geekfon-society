// GeekFon Radio pop-out (/radio/pop), the locked pop-out design in the Seat 2
// look, as a page of its own: it fills its window (about 380 by 672) and the
// whole screen on phones. Station colors arrive from data as --st / --st-ink.
export const POP_CSS = `
html,body{background:#09090a;height:100%}
body{overflow:hidden}
.gfp{
  color-scheme:dark;
  --bg:#09090a; --rail:#000000; --surface:#131315; --surface-2:#1b1b1e; --surface-3:#26262a;
  --line:#2a2a2f; --text:#f5f5f6; --muted:#a3a3ab; --faint:#6e6e77; --focus:#ffffff; --heart:#E8302A;
  --display:var(--gfr-display),'Bricolage Grotesque','Arial Black',system-ui,sans-serif;
  --body:var(--gfr-body),'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif;
  position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;isolation:isolate;
  background:var(--surface);color:var(--text);font-family:var(--body);font-size:14.5px;line-height:1.4;-webkit-font-smoothing:antialiased;
  padding-bottom:env(safe-area-inset-bottom);
}
.gfp *{box-sizing:border-box}
.gfp button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.gfp a{color:inherit;text-decoration:none}
.gfp img,.gfp svg{display:block}
.gfp h1,.gfp h2,.gfp p{margin:0}
.gfp :focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:6px}
/* the site-wide button:focus ring shows on mouse clicks too; here only the keyboard ring */
.gfp :focus:not(:focus-visible){outline:none}

.gfp .tbar{display:flex;align-items:center;gap:9px;height:44px;padding:0 12px;padding-top:env(safe-area-inset-top);box-sizing:content-box;background:var(--rail);flex:none}
.gfp .tbar img{width:22px;height:22px;border-radius:50%}
.gfp .tbar b{font-family:var(--display);font-weight:800;font-size:15.5px;letter-spacing:-.02em;white-space:nowrap}

.gfp .wbody{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;
  background:linear-gradient(180deg, color-mix(in srgb, var(--st) 40%, var(--surface)) 0, var(--surface) 430px);transition:background .6s;scrollbar-width:thin;scrollbar-color:var(--line) transparent}

/* station switcher */
.gfp .tiles{display:flex;gap:8px;padding:12px 16px 4px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 16px;scrollbar-width:none;flex:none}
.gfp .tiles::-webkit-scrollbar{display:none}
.gfp .tile{position:relative;flex:0 0 116px;height:66px;border-radius:8px;overflow:hidden;background:var(--c);color:var(--i);text-align:left;padding:8px 9px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;scroll-snap-align:start;isolation:isolate;transition:transform .2s ease, box-shadow .2s ease}
.gfp .tile:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(0,0,0,.4)}
.gfp .tile .nm{position:relative;z-index:2;display:block;font-family:var(--display);font-weight:800;font-size:16px;letter-spacing:-.03em;line-height:.95;max-width:74%}
.gfp .tile img{position:absolute;right:-6px;bottom:-8px;width:44px;height:44px;border-radius:5px;object-fit:cover;transform:rotate(9deg);box-shadow:0 6px 14px rgba(0,0,0,.45);z-index:1}
.gfp .tile .air{position:absolute;left:7px;bottom:7px;z-index:3;display:none;align-items:center;gap:5px;background:var(--bg);color:var(--text);font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 6px;border-radius:5px;white-space:nowrap}
.gfp .tile .air .eq{height:9px}
.gfp .tile .air .eq i{width:2px}
.gfp .tile[aria-pressed="true"]{box-shadow:0 0 0 2px var(--text)}
.gfp .tile[aria-pressed="true"] .air{display:flex}
.gfp .tile .sea{position:relative;z-index:2;display:block;margin-top:4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.75}
.gfp .tile[aria-pressed="true"] .sea{display:none}
.gfp .tile.coming{background:var(--surface-2);color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--c) 70%, transparent);cursor:default}
.gfp .tile.coming:hover{transform:none}
.gfp .tile.coming .nm{color:var(--c)}
.gfp .tile.coming .tag{position:absolute;left:8px;bottom:8px;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 6px;border-radius:5px;background:var(--c);color:var(--i)}
.gfp .tile.coming .ring{position:absolute;right:-26px;bottom:-30px;width:70px;height:70px;border-radius:50%;border:10px solid color-mix(in srgb, var(--c) 30%, transparent)}

/* now playing */
.gfp .np{padding:10px 20px 0;flex:none}
.gfp .cvw{position:relative;width:100%;aspect-ratio:1;max-height:46vh;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 20px 44px rgba(0,0,0,.5);background:var(--st);display:grid;place-items:center}
.gfp .cvw > img{width:100%;height:100%;object-fit:cover}
.gfp .cvw > img.logo{width:46%;height:46%;object-fit:contain}
.gfp .livechip{position:absolute;left:10px;top:10px;display:inline-flex;align-items:center;gap:7px;max-width:calc(100% - 20px);background:var(--bg);color:var(--text);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 9px;border-radius:5px;white-space:nowrap}
.gfp .livechip i,.gfp .lv i{width:7px;height:7px;border-radius:50%;background:var(--faint);flex:none}
.gfp.playing .livechip i,.gfp.playing .lv i{background:var(--st);box-shadow:0 0 0 3px color-mix(in srgb, var(--st) 30%, transparent)}
.gfp .livechip span{letter-spacing:.02em;text-transform:none;color:var(--muted);font-weight:600;overflow:hidden;text-overflow:ellipsis}
.gfp .meta{display:flex;align-items:center;gap:12px;margin-top:12px;min-width:0}
.gfp .meta .thumb{display:none;width:60px;height:60px;border-radius:6px;object-fit:cover;flex:none;box-shadow:0 6px 16px rgba(0,0,0,.4)}
.gfp .meta .tx{min-width:0;flex:1}
.gfp .song{font-family:var(--display);font-weight:800;font-size:25px;letter-spacing:-.025em;line-height:1.02;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfp .who{display:inline-block;max-width:100%;margin-top:5px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:top;text-align:left}
.gfp .who:hover{color:var(--text);text-decoration:underline}
.gfp .who.sponsor{color:var(--text);text-decoration:underline;text-underline-offset:3px}
.gfp .lv{display:none;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:4px}

/* controls */
.gfp .ctl{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:10px 16px 0 14px;flex:none}
.gfp .ctl .l{display:flex;gap:2px;justify-self:start}
.gfp .ctl .r{justify-self:end}
.gfp .ib{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:var(--muted);flex:none}
.gfp .ib:hover{color:var(--text);background:var(--surface-3)}
.gfp .ib.hearted{color:var(--heart)}
.gfp .ib:disabled{opacity:.35;cursor:default;background:none}
.gfp .ib[aria-expanded="true"]{color:var(--bg);background:var(--text)}
.gfp .play{width:60px;height:60px;border-radius:50%;background:var(--text);color:var(--bg);display:grid;place-items:center;transition:transform .15s;box-shadow:0 8px 22px rgba(0,0,0,.4)}
.gfp .play:hover{transform:scale(1.06)}
.gfp .play svg{width:26px;height:26px}
.gfp .wit{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;height:44px;padding:0 13px 0 9px;border-radius:6px;background:var(--surface-3);color:var(--text);white-space:nowrap}
.gfp .wit:hover{background:color-mix(in srgb, var(--st) 30%, var(--surface-3))}
.gfp .wit .q{width:22px;height:22px;border-radius:50%;background:var(--st);color:var(--st-ink);display:grid;place-items:center;font-size:13px;font-weight:800;font-family:var(--display)}
.gfp .wit[aria-expanded="true"]{background:var(--text);color:var(--bg)}

/* progress */
.gfp .prog{display:flex;align-items:center;gap:10px;padding:8px 20px 0;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;flex:none}
.gfp .track{flex:1;height:4px;border-radius:2px;background:var(--surface-3);position:relative;overflow:hidden}
.gfp .track i{position:absolute;inset:0 auto 0 0;width:0;background:var(--text);border-radius:2px;transition:width .5s linear}
.gfp.playing .track i{background:var(--st)}

/* footer */
.gfp .wfoot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding:14px 20px 12px;font-size:12px;color:var(--faint);flex:none}
.gfp .wfoot span{flex:1;min-width:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfp .wfoot a{color:var(--muted);font-weight:700;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.gfp .wfoot a:hover{color:var(--text)}
.gfp .inst{display:inline-flex;align-items:center;gap:5px;flex:none;font-size:12px;line-height:1;font-weight:700;padding:6px 8px;border-radius:6px;background:var(--surface-2);color:var(--text);box-shadow:inset 0 0 0 1px var(--line)}
.gfp .inst:hover{background:var(--text);color:var(--bg)}

/* lyrics in place */
.gfp .lyrics{display:none;flex:1;min-height:180px;flex-direction:column;margin:12px 12px 0;border-radius:10px;background:var(--st);color:var(--st-ink)}
.gfp .lyr-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:12px 14px 6px;flex:none}
.gfp .lyr-h b{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.75}
.gfp .lyr-h span{font-size:12px;font-weight:600;opacity:.75;text-align:right}
.gfp .lyr-s{flex:1;min-height:0;overflow-y:auto;padding:2px 14px 22px;scrollbar-width:thin;-webkit-mask-image:linear-gradient(#000 82%, transparent);mask-image:linear-gradient(#000 82%, transparent)}
.gfp .lyr-s .ln{font-family:var(--display);font-weight:700;font-size:19px;line-height:1.22;letter-spacing:-.01em;margin:0 0 4px}
.gfp .lyr-s .sec{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65;margin:14px 0 5px}
.gfp .lyr-s .sec:first-child{margin-top:2px}
.gfp .lyr-s .fine{font-size:12.5px;font-weight:600;opacity:.75;margin:16px 0 0}
.gfp.lyr .lyrics{display:flex}
.gfp.lyr .cvw{display:none}
.gfp.lyr .meta{margin-top:4px}
.gfp.lyr .meta .thumb{display:block}
.gfp.lyr .song{font-size:20px}
.gfp.lyr .lv{display:flex}
.gfp.lyr .wfoot{display:none}
.gfp.lyr .prog{padding-bottom:14px}

/* sheets: What is this? and Install */
.gfp .wscrim{position:absolute;inset:0;background:rgba(0,0,0,.6);z-index:6}
.gfp .sheet{position:absolute;left:0;right:0;bottom:0;max-height:calc(100% - 64px);overflow-y:auto;z-index:7;border-radius:14px 14px 0 0;
  background:linear-gradient(180deg, color-mix(in srgb, var(--st) 30%, var(--surface)) 0, var(--surface) 260px);box-shadow:0 -20px 40px rgba(0,0,0,.55);padding:0 0 calc(14px + env(safe-area-inset-bottom));animation:gfpUp .28s ease}
@keyframes gfpUp{from{transform:translateY(100%)}to{transform:none}}
.gfp .grab{width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,.4);margin:8px auto 0}
.gfp .sh-h{display:flex;align-items:center;gap:10px;padding:8px 10px 4px 16px}
.gfp .sh-h h2{font-size:15px;font-weight:700}
.gfp .sh-h .ib{margin-left:auto;width:36px;height:36px}
.gfp .card2{margin:10px 12px 0;background:var(--surface-2);border-radius:10px;padding:14px}
.gfp .card2 .lab{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.gfp .artist{display:flex;align-items:center;gap:12px}
.gfp .artist img{width:64px;height:64px;border-radius:8px;object-fit:cover;flex:none;box-shadow:0 8px 18px rgba(0,0,0,.4)}
.gfp .artist b{font-family:var(--display);font-size:24px;font-weight:800;letter-spacing:-.025em;line-height:1;display:block}
.gfp .artist span{display:block;font-size:13px;color:var(--muted);margin-top:5px}
.gfp .facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.gfp .facts span{font-size:12px;font-weight:600;color:var(--muted);background:var(--surface-3);padding:4px 8px;border-radius:5px}
.gfp .visit{margin-top:14px;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:6px;background:var(--text);color:var(--bg);font-weight:700;font-size:14.5px}
.gfp .visit:hover{background:#ffffff}
.gfp .visit small{margin-left:auto;font-weight:600;opacity:.6;font-size:12px}
.gfp .visit-note{font-size:12px;color:var(--faint);margin:8px 2px 0}
.gfp .lyrc{background:var(--st);color:var(--st-ink)}
.gfp .lyrc .lab{color:var(--st-ink);opacity:.75}
.gfp .lyrc .lang{font-size:12.5px;opacity:.75;margin:0 0 8px;font-weight:600}
.gfp .lprev{max-height:150px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 60%, transparent);mask-image:linear-gradient(#000 60%, transparent)}
.gfp .lprev .ln{font-family:var(--display);font-weight:700;font-size:17px;line-height:1.22;letter-spacing:-.01em;margin:0 0 3px}
.gfp .lprev .sec{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65;margin:8px 0 4px}
.gfp .lprev .sec:first-child{margin-top:0}
.gfp .full{margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border-radius:6px;background:var(--st-ink);color:var(--st);font-weight:800;font-size:13.5px}
.gfp .none{font-size:14px;font-weight:600;opacity:.85}
.gfp .steps{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.gfp .steps li{font-size:14px;line-height:1.35}
.gfp .steps b{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}

/* equalizer and toast */
.gfp .eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
.gfp .eq i{width:3px;background:currentColor;border-radius:1px;height:40%;animation:gfpEq 1s ease-in-out infinite}
.gfp .eq i:nth-child(2){animation-delay:-.4s}
.gfp .eq i:nth-child(3){animation-delay:-.7s}
.gfp .eq.still i{animation:none}
.gfp .eq.still i:nth-child(1){height:50%}.gfp .eq.still i:nth-child(2){height:80%}.gfp .eq.still i:nth-child(3){height:35%}
@keyframes gfpEq{0%,100%{height:30%}50%{height:100%}}
.gfp .toast{position:absolute;left:50%;bottom:20px;transform:translate(-50%,16px);background:var(--text);color:var(--bg);font-weight:700;font-size:14px;padding:10px 16px;border-radius:6px;opacity:0;pointer-events:none;transition:opacity .2s, transform .2s;z-index:60;white-space:nowrap;max-width:calc(100% - 32px)}
.gfp .toast.show{opacity:1;transform:translate(-50%,0)}

/* short windows */
@media (max-height:700px){
  .gfp .np{padding:8px 40px 0}
  .gfp .song{font-size:22px}
}
/* wide windows (someone maximized it): keep the player a column */
@media (min-width:520px){
  .gfp .wbody > *{width:100%;max-width:480px;margin-left:auto;margin-right:auto}
  .gfp .tiles{max-width:none !important;justify-content:center}
}
@media (prefers-reduced-motion: reduce){
  .gfp *,.gfp *::before,.gfp *::after{animation:none !important;transition:none !important}
}
.gfp .inote{margin:0 0 12px;font-size:13.5px;line-height:1.45;color:var(--text)}
`;
