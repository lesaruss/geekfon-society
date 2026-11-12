// The Artists page and artist pages (Seat 2: Discovery), ported from the
// approved mockup. Scoped under .gfr; each artist's accent arrives from data
// as --ac / --ac-ink (gfs_artists.profile.accent), none are written here.
export const ARTIST_CSS = `
.gfr .nav a[aria-current="page"],.gfr .mtabs a[aria-current="page"]{color:var(--text)}
.gfr .nav a[aria-current="page"]{background:var(--surface-2)}
.gfr .track.seek{cursor:pointer}
.gfr .artist .apic{flex:none}
.gfr .crumbs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.gfr .crumbs a{color:inherit;text-decoration:none;border-bottom:1px solid transparent}
.gfr .crumbs a:hover,.gfr .crumbs a:focus-visible{color:var(--text);border-bottom-color:currentColor}
.gfr .crumbs span[aria-current]{color:var(--text)}
.gfr .ahead .crumbs{color:var(--text);opacity:.9}
.gfr .eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.gfr .lnk{font-weight:700;color:var(--text);text-decoration:underline;text-underline-offset:3px}

/* ---------- Artists (/roster) ---------- */
.gfr .filters{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 20px}
.gfr .fchip{padding:8px 14px;border-radius:6px;background:var(--surface-3);font-weight:700;font-size:14px;white-space:nowrap}
.gfr .fchip:hover{background:color-mix(in srgb, var(--text) 16%, var(--surface-3))}
.gfr .fchip[aria-pressed="true"]{background:var(--text);color:var(--bg)}
.gfr .agrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.gfr .acard{position:relative;display:flex;flex-direction:column;gap:12px;padding:12px;border-radius:10px;background:var(--surface-2);transition:background .2s}
.gfr .acard:hover,.gfr .acard.on{background:var(--surface-3)}
.gfr .apic{display:block;aspect-ratio:1;border-radius:8px;overflow:hidden;background:linear-gradient(160deg, var(--ac), color-mix(in srgb, var(--ac) 30%, #000));box-shadow:0 10px 24px rgba(0,0,0,.35)}
.gfr .acard .apic img{width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
.gfr .acard:hover .apic img{transform:scale(1.04)}
.gfr .apic .ini{display:grid;place-items:center;width:100%;height:100%;font-family:var(--display);font-weight:800;font-size:56px;color:var(--ac-ink)}
.gfr .apw{position:relative}
.gfr .aplay{position:absolute;right:10px;bottom:10px;width:48px;height:48px;border-radius:50%;background:var(--ac);color:var(--ac-ink);display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.45);opacity:0;transform:translateY(6px);transition:opacity .2s, transform .2s}
.gfr .acard:hover .aplay,.gfr .acard.on .aplay,.gfr .aplay:focus-visible{opacity:1;transform:none}
.gfr .aair{position:absolute;left:10px;top:10px;display:flex;align-items:center;gap:7px;background:var(--bg);color:var(--text);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 9px;border-radius:5px}
.gfr .ameta{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.gfr .ameta .an{font-family:var(--display);font-weight:800;font-size:20px;letter-spacing:-.02em;line-height:1.05;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gfr .ameta .an:hover{text-decoration:underline}
.gfr .ameta .ag{font-size:13px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gfr .schip{margin-top:4px;font-size:11.5px;font-weight:700;padding:4px 8px;border-radius:5px;background:var(--c);color:var(--i)}

/* ---------- Artist page ---------- */
.gfr .aview{--ac-l:color-mix(in srgb, var(--ac) 62%, #ffffff)}
.gfr .ahead{position:relative;margin:-64px -28px 0;padding:88px 292px 26px 28px;min-height:390px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background:linear-gradient(180deg, color-mix(in srgb, var(--ac) 64%, var(--surface)) 0%, color-mix(in srgb, var(--ac) 24%, var(--surface)) 72%, var(--surface) 100%)}
.gfr .ahead .eyebrow{color:var(--text);opacity:.85}
.gfr .atext{position:relative;z-index:2;min-width:0}
.gfr .aname{font-family:var(--display);font-weight:800;font-size:clamp(52px,7vw,100px);letter-spacing:-.045em;line-height:.86;margin:0;overflow-wrap:anywhere}
.gfr .atag{font-family:var(--display);font-weight:700;font-size:clamp(17px,1.6vw,21px);letter-spacing:-.01em;line-height:1.22;margin:14px 0 0;max-width:30ch}
.gfr .apills{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}
.gfr .apills span{font-size:12px;font-weight:700;padding:5px 9px;border-radius:5px;background:rgba(0,0,0,.3);color:var(--text);display:inline-flex;align-items:center;gap:5px}
.gfr .aart{position:absolute;right:36px;top:62px;bottom:0;width:236px;overflow:hidden;z-index:1}
.gfr .aart.cut img{width:100%;height:auto;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))}
.gfr .aart.sq{top:auto;bottom:26px;width:200px;height:200px;border-radius:10px;box-shadow:0 18px 40px rgba(0,0,0,.45)}
.gfr .aart.sq img{width:100%;height:100%;object-fit:cover}
.gfr .aact{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:20px}
.gfr .pill svg{width:18px;height:18px;flex:none}
.gfr .pill.acp{background:var(--ac);color:var(--ac-ink)}
.gfr .pill.acp:hover{filter:brightness(1.08)}
.gfr .pill:disabled{opacity:.55;cursor:default;filter:none}
.gfr .pill[aria-pressed="true"] svg{color:var(--ac-l)}
.gfr .pill.sup{background:color-mix(in srgb, var(--ac) 22%, var(--surface-3));color:var(--text)}
.gfr .anote{font-size:12.5px;color:var(--faint);margin:10px 0 0}
.gfr .atabs{position:sticky;top:54px;z-index:4;display:flex;gap:8px;margin:20px -28px 0;padding:10px 28px;background:var(--surface);overflow-x:auto;scrollbar-width:none}
.gfr .atabs::-webkit-scrollbar{display:none}
.gfr .atab{padding:8px 14px;border-radius:6px;background:var(--surface-3);font-weight:700;font-size:14px;white-space:nowrap}
.gfr .atab:hover{background:color-mix(in srgb, var(--text) 16%, var(--surface-3))}
.gfr .atab[aria-selected="true"]{background:var(--text);color:var(--bg)}
.gfr .apanel{padding-top:12px}

/* Music */
.gfr .mtop{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:10px}
.gfr .onair{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:center;padding:10px;border-radius:10px;background:var(--surface-2)}
.gfr .oa-art{width:64px;height:64px;border-radius:8px;background:var(--c);position:relative;overflow:hidden}
.gfr .oa-art img{position:absolute;width:42px;height:42px;border-radius:4px;object-fit:cover;box-shadow:0 6px 12px rgba(0,0,0,.4)}
.gfr .oa-art img:nth-child(1){right:-5px;bottom:-5px;transform:rotate(9deg);z-index:2}
.gfr .oa-art img:nth-child(2){left:-4px;top:-5px;transform:rotate(-8deg)}
.gfr .onair .eyebrow{margin:0 0 3px}
.gfr .onair b{display:block;font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:-.02em;line-height:1.05}
.gfr .onair .s{font-size:13px;color:var(--muted)}
.gfr .oa-play{width:46px;height:46px;border-radius:50%;background:var(--c);color:var(--i);display:grid;place-items:center;margin-right:4px;transition:transform .15s}
.gfr .oa-play:hover{transform:scale(1.06)}
.gfr .cteaser{display:flex;align-items:center;gap:14px;padding:10px 16px 10px 18px;border-radius:10px;background:color-mix(in srgb, var(--ac) 22%, var(--surface-2));min-width:0;text-align:left}
.gfr .cteaser:hover{background:color-mix(in srgb, var(--ac) 32%, var(--surface-2))}
.gfr .cteaser b{display:block;font-weight:700}
.gfr .cteaser .s{font-size:13px;color:var(--muted)}
.gfr .cteaser > svg{margin-left:auto;flex:none}
.gfr .avs{display:flex;flex:none}
.gfr .avs img{width:34px;height:34px;border-radius:8px;object-fit:cover;box-shadow:0 0 0 2px var(--surface-2)}
.gfr .msub{color:var(--muted);font-size:14px;margin:-6px 0 6px}
.gfr .aview .sng{--ac-l:color-mix(in srgb, var(--ac) 62%, #ffffff)}
.gfr .mlock{display:none;color:var(--faint)}
.gfr .lockb{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted);padding:5px 8px;border-radius:5px;background:var(--surface-3);white-space:nowrap}
.gfr button.lockb:hover{color:var(--text);background:color-mix(in srgb, var(--ac) 30%, var(--surface-3))}
.gfr .lockb.ok{color:var(--ac-l)}

/* Chat */
.gfr .chat{max-width:900px}
.gfr .chat-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}
.gfr .days{display:flex;flex-wrap:wrap;gap:6px}
.gfr .dchip{padding:7px 12px;border-radius:6px;background:var(--surface-3);font-weight:700;font-size:13px}
.gfr .dchip[aria-pressed="true"]{background:var(--ac);color:var(--ac-ink)}
.gfr .dsel select{appearance:none;-webkit-appearance:none;font:inherit;font-weight:700;font-size:13px;color:var(--text);background:var(--surface-3) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3ab' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;border:0;border-radius:6px;padding:7px 34px 7px 12px;cursor:pointer}
.gfr .cnote{font-size:12.5px;color:var(--faint);margin:0}
.gfr .cnote.after{margin-top:10px}
.gfr .msgs{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}
.gfr .msg{display:flex;align-items:flex-start;gap:10px;max-width:78%}
.gfr .msg.grouped{margin-top:-4px}
.gfr .msg.me{align-self:flex-end}
.gfr .mav{width:34px;height:34px;border-radius:8px;object-fit:cover;flex:none;margin-top:18px}
.gfr .mav.gap{visibility:hidden}
.gfr .mavl{flex:none;display:block}
.gfr .mph{display:grid;place-items:center;font-weight:800;color:#fff}
.gfr .mb{min-width:0;display:flex;flex-direction:column;align-items:flex-start}
.gfr .msg.me .mb{align-items:flex-end}
.gfr .mw{font-size:12px;color:var(--muted);margin:0 4px 4px;display:flex;gap:8px}
.gfr .mw a,.gfr .mw b{color:var(--text);font-weight:700}
.gfr .mw a:hover{text-decoration:underline}
.gfr .brow{display:flex;align-items:center;gap:6px;max-width:100%}
.gfr .msg.me .brow{flex-direction:row-reverse}
.gfr .bub{margin:0;padding:10px 14px;border-radius:14px 14px 14px 4px;background:var(--surface-3);font-size:15px;line-height:1.35;text-align:left;overflow-wrap:anywhere}
.gfr .msg.me .bub{background:var(--ac);color:var(--ac-ink);border-radius:14px 14px 4px 14px}
.gfr .bub.bph{padding:6px;width:min(300px,100%)}
.gfr .bub.bph img{width:100%;border-radius:10px}
.gfr .bub.bph span{display:block;padding:8px 8px 4px}
.gfr .mmed{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--surface-3);color:var(--text);flex:none}
.gfr .mmed:hover{background:color-mix(in srgb, var(--ac) 40%, var(--surface-3))}
.gfr .reacts{display:flex;gap:4px;margin-top:4px}
.gfr .react{font-size:12px;padding:2px 7px;border-radius:10px;background:var(--surface-2);display:inline-flex;gap:4px;align-items:center}
.gfr .react b{font-size:11px;color:var(--muted)}
.gfr .mops{display:flex;flex-wrap:wrap;gap:2px}
.gfr .like{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--faint);padding:4px 6px;margin-top:2px;border-radius:5px}
.gfr .like:hover{color:var(--text)}
.gfr .like[aria-pressed="true"]{color:var(--heart)}
.gfr .drop{display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;align-items:center;padding:12px;border-radius:10px;margin:8px 0;background:linear-gradient(120deg, color-mix(in srgb, var(--ac) 30%, var(--surface-2)), var(--surface-2));box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--ac) 50%, transparent)}
.gfr .drop img,.gfr .drop .dph{width:72px;height:72px;border-radius:6px;object-fit:cover;background:var(--ac)}
.gfr .drop .eyebrow{color:var(--ac-l);margin:0 0 4px}
.gfr .drop b{display:block;font-family:var(--display);font-weight:800;font-size:20px;letter-spacing:-.02em;line-height:1.05}
.gfr .drop .s{font-size:13px;color:var(--muted)}
.gfr .thread{margin:6px 0 4px;padding:10px 12px;border-radius:8px;background:var(--surface-2);width:min(520px,100%);text-align:left}
.gfr .cm{padding:6px 0;border-bottom:1px solid var(--line)}
.gfr .cm:last-child{border-bottom:0}
.gfr .cm.reply{margin-left:18px}
.gfr .cm-h{display:flex;gap:8px;align-items:baseline;font-size:12.5px}
.gfr .cm-h span{color:var(--faint)}
.gfr .cm-h em{font-style:normal;color:var(--ac-l);font-weight:700}
.gfr .cm p{margin:2px 0 0;font-size:14px}
.gfr .cm-ops{display:flex;gap:2px}
.gfr .cm-empty,.gfr .cm-gate,.gfr .cm-rep{font-size:13px;color:var(--muted);margin:4px 0}
.gfr .cm-new textarea{width:100%;margin-top:8px;font:inherit;font-size:14px;color:var(--text);background:var(--surface-3);border:0;border-radius:6px;padding:10px;resize:vertical}
.gfr .cm-send{display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--faint)}
.gfr .cm-err{color:var(--heart);font-size:13px;margin:6px 0 0}
.gfr .cm-note{color:var(--muted);font-size:13px;margin:6px 0 0}
.gfr .compose{display:flex;align-items:center;gap:12px;margin-top:22px;padding:12px 12px 12px 16px;border-radius:10px;background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line)}
.gfr .compose > svg{color:var(--faint);flex:none}
.gfr .compose p{margin:0;flex:1;color:var(--muted);font-size:14px}
.gfr .lbox{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.85);display:grid;place-items:center;padding:24px}
.gfr .lbox-in{max-width:min(900px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px}
.gfr .lbox-in img,.gfr .lbox-in video{max-width:100%;max-height:calc(100dvh - 140px);border-radius:10px;object-fit:contain}
.gfr .lbox-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px}

/* Press */
.gfr .press{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:12px}
.gfr .pc{display:flex;flex-direction:column;text-align:left;border-radius:10px;background:var(--surface-2);border-top:4px solid var(--ac);overflow:hidden}
.gfr a.pc:hover{background:var(--surface-3)}
.gfr .pimg{display:block;aspect-ratio:16/9;background:var(--surface-3);overflow:hidden}
.gfr .pimg img{width:100%;height:100%;object-fit:cover}
.gfr .pbody{display:flex;flex-direction:column;gap:8px;padding:16px 18px 18px;flex:1}
.gfr .pc .ptg{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ac-l)}
.gfr .pc h3{font-family:var(--display);font-weight:800;font-size:20px;letter-spacing:-.02em;line-height:1.08;margin:0}
.gfr .pc time{font-size:12.5px;color:var(--faint)}
.gfr .pc p{margin:0;color:var(--muted);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gfr .pc .rdl{margin-top:auto;display:inline-flex;gap:6px;align-items:center;font-weight:700;font-size:13.5px}

/* Gallery */
.gfr .gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(180px,100%),1fr));gap:10px}
.gfr .gi{position:relative;aspect-ratio:4/5;border-radius:10px;overflow:hidden;background:var(--surface-2);display:block;text-align:left}
.gfr .gi img{width:100%;height:100%;object-fit:cover}
.gfr .gi.lk img{filter:blur(18px) saturate(1.15);transform:scale(1.18)}
.gfr .gi .gl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,.35);font-weight:700;font-size:13px;text-align:center;padding:10px}
.gfr .gi .lc{width:44px;height:44px;border-radius:50%;background:var(--text);color:var(--bg);display:grid;place-items:center}
.gfr .gi .cap{position:absolute;left:10px;bottom:10px;right:10px;width:max-content;max-width:calc(100% - 20px);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:5px;background:var(--bg);color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfr .gi.lk:hover .lc{background:var(--ac);color:var(--ac-ink)}

/* About: the Artist Spotlight placeholder, then the bio */
.gfr .aspot{margin:0 0 30px;display:grid;gap:12px}
.gfr .aspot-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.gfr .aspot-h small{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ac-l)}
.gfr .aspot-h span{font-size:12px;color:var(--muted)}
.gfr .sv{position:relative;aspect-ratio:16/9;max-width:100%;border-radius:12px;overflow:hidden;background:#000;isolation:isolate}
.gfr .sv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.gfr .sv.fit img{object-fit:contain;object-position:center;background:radial-gradient(circle at 70% 40%, color-mix(in srgb, var(--ac) 55%, #000), #000 75%)}
.gfr .sv::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 22%);z-index:1;pointer-events:none}
.gfr .sv .bug{position:absolute;left:4%;top:6%;z-index:2;display:flex;align-items:center;gap:8px;font-size:clamp(9px,1vw,12px);font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#fff}
.gfr .sv .bug i{width:8px;height:8px;border-radius:2px;background:var(--ac)}
.gfr .sv .samp{position:absolute;right:4%;top:5%;z-index:2;font-size:clamp(10px,1vw,12px);font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 9px;border-radius:4px;background:rgba(0,0,0,.65);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}
.gfr .spot-note{font-size:12.5px;color:var(--muted);margin:0;max-width:80ch}
.gfr .about{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:32px;align-items:start}
.gfr .ab-h{font-family:var(--display);font-weight:800;font-size:24px;letter-spacing:-.02em;margin:0 0 10px;line-height:1}
.gfr .bio{font-size:16px;line-height:1.55;margin:0 0 12px;max-width:62ch}
.gfr .bio.dim{color:var(--muted)}
.gfr .aq{margin:18px 0 0;padding:18px 20px;border-radius:10px;background:color-mix(in srgb, var(--ac) 18%, var(--surface-2));border-left:4px solid var(--ac)}
.gfr .aq p{font-family:var(--display);font-weight:700;font-size:clamp(20px,2vw,25px);line-height:1.2;letter-spacing:-.015em;margin:0}
.gfr .aq cite{display:block;margin-top:10px;font-style:normal;font-size:13px;color:var(--muted);font-weight:700}
.gfr .facts2{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr));gap:10px;margin:22px 0 0}
.gfr .facts2 div{background:var(--surface-2);border-radius:8px;padding:12px 14px}
.gfr .facts2 dt{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);font-weight:700}
.gfr .facts2 dd{margin:5px 0 0;font-weight:700;display:flex;flex-wrap:wrap;gap:6px}
.gfr .facts2 dd button{font-size:13px;font-weight:700;padding:4px 9px;border-radius:5px;background:var(--surface-3)}
.gfr .facts2 dd button:hover{background:color-mix(in srgb, var(--ac) 30%, var(--surface-3))}
.gfr .ab-art img{width:100%;height:auto}

/* Sheet: Unlock */
.gfr .sheet{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:24px}
.gfr .sh-back{position:absolute;inset:0;background:rgba(0,0,0,.68)}
.gfr .sh-box{position:relative;width:min(780px,100%);max-height:calc(100dvh - 48px);overflow:auto;background:var(--surface);border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6);animation:gfrShIn .28s ease}
@keyframes gfrShIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.gfr .sh-in{--ac-l:color-mix(in srgb, var(--ac) 62%, #ffffff)}
.gfr .sh-x{position:absolute;top:12px;right:12px;z-index:3;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:var(--text)}
.gfr .sh-x:hover{background:rgba(255,255,255,.16)}
.gfr .uk{display:grid;grid-template-columns:250px minmax(0,1fr)}
.gfr .uk-art{position:relative;overflow:hidden;background:linear-gradient(180deg, var(--ac), color-mix(in srgb, var(--ac) 35%, #000));min-height:100%}
.gfr .uk-art.cut img{position:absolute;left:50%;top:26px;width:200px;transform:translateX(-50%);filter:drop-shadow(0 16px 26px rgba(0,0,0,.35))}
.gfr .uk-art.sq img{width:160px;height:160px;border-radius:10px;margin:36px auto;object-fit:cover;box-shadow:0 16px 30px rgba(0,0,0,.4)}
.gfr .uk-body{padding:30px 30px 24px}
.gfr .uk-h{font-family:var(--display);font-weight:800;font-size:42px;letter-spacing:-.035em;line-height:.95;margin:0 44px 0 0}
.gfr .uk-price{margin:10px 0 0;font-size:16px;color:var(--muted)}
.gfr .uk-price b{color:var(--text);font-family:var(--display);font-size:26px;font-weight:800}
.gfr .perks{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:11px}
.gfr .perks li{display:flex;gap:12px;align-items:center;font-size:14.5px;line-height:1.3}
.gfr .pk{width:30px;height:30px;border-radius:6px;background:color-mix(in srgb, var(--ac) 26%, var(--surface-3));color:var(--ac-l);display:grid;place-items:center;flex:none}
.gfr .uk-cta{margin-top:22px}
.gfr .uk-go{width:100%;justify-content:center;padding:14px 16px;font-size:15px;background:var(--ac);color:var(--ac-ink)}
.gfr .uk-go:hover{filter:brightness(1.08)}
.gfr .uk-err{color:var(--heart);font-size:13px;margin:10px 0 0;text-align:center}
.gfr .uk-life{font-size:13px;color:var(--muted);margin:10px 0 0;text-align:center}
.gfr .uk-fine{font-size:12px;color:var(--faint);margin:14px 0 0;text-align:center}

@media (max-width:1180px){
  .gfr .agrid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:1180px) and (min-width:761px){
  .gfr .ahead{padding-right:240px}
  .gfr .aart{width:200px;right:20px}
}
@media (max-width:760px){
  .gfr .agrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .gfr .acard{padding:8px;gap:8px}
  .gfr .ameta .an{font-size:17px}
  .gfr .ameta .ag{font-size:12px}
  .gfr .aplay{opacity:1;transform:none;width:40px;height:40px;right:8px;bottom:8px}
  .gfr .aair{left:8px;top:8px}
  .gfr .ahead{margin:-62px -16px 0;padding:74px 146px 20px 16px;min-height:340px}
  .gfr .aart.cut{right:4px;top:52px;width:150px}
  .gfr .aart.sq{right:16px;width:110px;height:110px;bottom:auto;top:76px}
  .gfr .aname{font-size:clamp(40px,12vw,54px)}
  .gfr .atag{font-size:16px}
  .gfr .aact .acp{flex:1 1 100%;justify-content:center}
  .gfr .aact .pill:not(.acp){flex:1 1 0;justify-content:center;padding:10px 10px;font-size:13.5px}
  .gfr .atabs{top:54px;margin:16px -16px 0;padding:10px 16px}
  .gfr .sng .sx.lk{display:none}
  .gfr .mlock{display:inline-flex;align-items:center}
  .gfr .msg{max-width:92%}
  .gfr .drop{grid-template-columns:56px minmax(0,1fr)}
  .gfr .drop img,.gfr .drop .dph{width:56px;height:56px}
  .gfr .compose{flex-wrap:wrap}
  .gfr .compose p{flex:1 1 200px}
  .gfr .compose .pill{flex:1 1 100%;justify-content:center}
  .gfr .about{grid-template-columns:1fr}
  .gfr .ab-art{display:none}
    .gfr .sheet{padding:0;align-items:flex-end}
  .gfr .sh-box{border-radius:14px 14px 0 0;max-height:92dvh;width:100%}
  .gfr .uk{grid-template-columns:1fr}
  .gfr .uk-art{height:150px;min-height:0}
  .gfr .uk-art.cut img{width:130px;top:14px}
  .gfr .uk-art.sq img{width:110px;height:110px;margin:20px auto}
  .gfr .uk-body{padding:22px 16px 20px}
  .gfr .uk-h{font-size:34px}
}
`;
