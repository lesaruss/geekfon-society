// New Talent (/new-talent): how it works and the step form. Scoped under .gfr, on the Seat 2 tokens (radioCss).
// --c / --i are the New Talent station colors (radioData NEW_TALENT).
export const NT_CSS = `
.gfr .nt .vhead p{max-width:640px}
.gfr .nthow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0 22px}
.gfr .nthow div{padding:16px 18px;border-radius:10px;background:var(--surface-2);border-top:3px solid var(--c)}
.gfr .nthow b{display:block;font-family:var(--display);font-weight:800;font-size:18px;letter-spacing:-.02em;line-height:1.1}
.gfr .nthow span{display:block;color:var(--muted);font-size:13.5px;margin-top:6px;line-height:1.4}

.gfr .ntcard{position:relative;padding:24px 26px;border-radius:10px;background:var(--surface-2);scroll-margin-top:16px}
.gfr .ntsteps{display:flex;gap:8px;list-style:none;margin:0 0 22px;padding:0;flex-wrap:wrap}
.gfr .ntsteps li{display:flex;align-items:center;gap:8px;padding:7px 12px 7px 7px;border-radius:6px;background:var(--surface-3);color:var(--muted);font-weight:700;font-size:13px}
.gfr .ntsteps li span{display:grid;place-items:center;width:22px;height:22px;border-radius:5px;background:var(--surface);font-size:12px}
.gfr .ntsteps li[aria-current="step"]{background:var(--c);color:var(--i)}
.gfr .ntsteps li[aria-current="step"] span{background:rgba(0,0,0,.18);color:var(--i)}
.gfr .ntsteps li.done{color:var(--text)}

.gfr .ntgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 18px}
.gfr .ntgrid.one{grid-template-columns:1fr}
.gfr .ntf{display:flex;flex-direction:column;gap:7px;min-width:0}
.gfr .ntf>span{font-weight:700;font-size:13.5px}
.gfr .ntf i{color:var(--c);font-style:normal}
.gfr .ntf em{color:var(--faint);font-style:normal;font-weight:600}
.gfr .ntf input,.gfr .ntf textarea,.gfr .ntf select{width:100%;font:inherit;font-size:15px;color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px 14px;outline:none}
.gfr .ntf textarea{resize:vertical;min-height:52px;line-height:1.45}
.gfr .ntf input:focus,.gfr .ntf textarea:focus,.gfr .ntf select:focus{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent)}
.gfr .ntf input::placeholder,.gfr .ntf textarea::placeholder{color:var(--faint)}
.gfr .ntf select{appearance:none;-webkit-appearance:none;padding-right:46px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a3a3ab' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
.gfr .ntgenre{max-width:420px;margin-bottom:18px}

.gfr .ntsongs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:14px}
.gfr .ntsong{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:8px;background:var(--surface);border:1px solid var(--line)}
.gfr .ntsong-h{display:flex;align-items:center;justify-content:space-between}
.gfr .ntsong-h b{font-family:var(--display);font-weight:800;font-size:16px}
.gfr .ntx{color:var(--muted);font-weight:700;font-size:13px;text-decoration:underline;text-underline-offset:3px}
.gfr .ntx:hover{color:var(--text)}
.gfr .ntseg{display:flex;gap:6px}
.gfr .ntseg button{flex:1;padding:9px 10px;border-radius:6px;font-weight:700;font-size:13px;color:var(--muted);background:var(--surface-3)}
.gfr .ntseg button[aria-pressed="true"]{background:var(--text);color:var(--bg)}
.gfr .ntfile{position:relative;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;border-radius:6px;border:1px dashed color-mix(in srgb, var(--c) 60%, transparent);cursor:pointer}
.gfr .ntfile input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
.gfr .ntfile-b{padding:8px 12px;border-radius:6px;background:var(--c);color:var(--i);font-weight:700;font-size:13px;white-space:nowrap}
.gfr .ntfile-n{color:var(--muted);font-size:13px;min-width:0;overflow-wrap:anywhere}
.gfr .ntfile:focus-within{box-shadow:0 0 0 3px color-mix(in srgb, var(--c) 30%, transparent)}
.gfr .ntadd{margin-top:14px}
.gfr .ntnote{color:var(--faint);font-size:13px;margin:10px 0 0}

.gfr .ntsend{display:flex;flex-direction:column;gap:14px}
.gfr .ntsum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:6px}
.gfr .ntsum div{padding:12px 14px;border-radius:8px;background:var(--surface);min-width:0}
.gfr .ntsum small{display:block;color:var(--faint);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.gfr .ntsum b{display:block;margin-top:4px;font-size:14px;overflow-wrap:anywhere}
.gfr .ntchk{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:8px;background:var(--surface);cursor:pointer;font-size:14.5px;line-height:1.45;max-width:860px}
.gfr .ntchk input{flex:none;width:20px;height:20px;margin-top:1px;accent-color:var(--c)}

.gfr .nterr{margin:16px 0 0;padding:10px 14px;border-radius:6px;background:color-mix(in srgb, #ff5a5a 14%, transparent);color:#ffb3b3;font-weight:600;font-size:14px}
.gfr .ntnav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}
.gfr .ntcount{color:var(--muted);font-weight:700;font-size:13px}
.gfr .pill.ntgo{background:var(--c);color:var(--i)}
.gfr .pill.ntgo:hover{filter:brightness(1.08)}
.gfr .pill:disabled{opacity:.6;cursor:default}
.gfr .nthp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}

.gfr .ntdone{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:8px 0}
.gfr .ntok{display:grid;place-items:center;width:52px;height:52px;border-radius:10px;background:var(--c);color:var(--i);font-size:26px;font-weight:800}
.gfr .ntdone h2{font-family:var(--display);font-weight:800;font-size:28px;letter-spacing:-.02em;margin:6px 0 0}
.gfr .ntdone p{color:var(--muted);margin:0 0 8px;max-width:620px}

.gfr a.card.coming.strip{cursor:pointer;text-decoration:none}
.gfr a.card.coming.strip:hover{border-style:solid}
.gfr .card.coming.strip .ntcta{position:relative;z-index:2;align-self:flex-start;margin-top:14px;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:6px;background:var(--c);color:var(--i);font-weight:700;font-size:14px}

@media (max-width:1180px){
  .gfr .nthow{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gfr .ntsum{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:760px){
  .gfr .nthow{grid-template-columns:1fr;gap:10px}
  .gfr .ntcard{padding:18px 16px}
  .gfr .ntgrid{grid-template-columns:1fr}
  .gfr .ntsteps li{font-size:0;padding:6px}
  .gfr .ntsteps li[aria-current="step"]{font-size:13px;padding-right:12px}
  .gfr .ntsum{grid-template-columns:1fr}
  .gfr .ntnav .pill{padding:10px 14px}
}
`;
