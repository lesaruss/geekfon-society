"use client";
import { useState, useEffect } from "react";
import SiteChrome from "@/components/SiteChrome";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";

const CITY_IMAGES = [
  CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png",  // roxanne / NYC
  CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png",  // lex
  CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png",  // shamanic
  CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png",  // rustblood
  CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png",  // straight and narrow
  CDN + "hf_20260619_125302_4c4f6747-3bcb-45b2-a743-610912078942.png",  // nilo wave
  CDN + "hf_20260620_234313_10dea700-d199-4e4a-bc73-0b276a46d266.png",  // lord zorlot
];

const LAUNCH_ARTISTS = [
  { name: "Roxanne",            slug: "roxanne",         genre: "J-Pop / Pop Rock",        role: "Co-Captain" },
  { name: "Lex from Brixton",   slug: "lex-from-brixton", genre: "UK Grime / Dancehall",   role: "Co-Captain" },
  { name: "Shamanic Resin",     slug: "shamanic-resin",  genre: "Neo-Soul / Indie R&B",    role: "Founding Artist" },
];

export default function PlusWaitlistPage() {
  const [form, setForm] = useState({ name: "", email: "", city: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cityIdx, setCityIdx] = useState(0);
  const [cityVisible, setCityVisible] = useState(true);

  // Rotate cities every 5s with a crossfade
  useEffect(() => {
    const timer = setInterval(() => {
      setCityVisible(false);
      setTimeout(() => {
        setCityIdx(i => (i + 1) % CITY_IMAGES.length);
        setCityVisible(true);
      }, 700);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.city.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/plus-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setErrorMsg("Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <SiteChrome>
      <style>{CSS}</style>
      <div className="plus-page">

        {/* Hero - full width, rotating city bg */}
        <div className="plus-hero">
          {/* Aurora layer */}
          <div className="plus-aurora" aria-hidden="true">
            <div className="plus-stars" />
            <div className="apga apga1" /><div className="apga apga2" /><div className="apga apga3" />
            <div className="apga apga4" /><div className="apga apga5" />
            <div className="plus-ground" />
          </div>
          {/* Rotating city image */}
          <div className="plus-city-stage" aria-hidden="true">
            <img
              src={CITY_IMAGES[cityIdx]}
              alt=""
              aria-hidden="true"
              className={"plus-city-img" + (cityVisible ? " visible" : "")}
            />
          </div>
          {/* Hero content */}
          <div className="plus-hero-content">
            <div className="plus-hero-badge">Invitation Only</div>
            <h1 className="plus-hero-title">GeekFon Plus</h1>
            <p className="plus-hero-sub">
              The street team behind GeekFon Society. Earn real income promoting the community
              in your city, at events, and in your area.
            </p>
          </div>
        </div>

        {/* Two-column body */}
        <div className="plus-layout">

          {/* Main column */}
          <div className="plus-main">

            {/* What is Plus */}
            <section className="plus-section">
              <h2 className="plus-section-title">What is Plus?</h2>
              <p className="plus-section-text">
                GeekFon Plus is a select group of representatives who carry the GeekFon Society
                mission into the real world. You are not just a fan - you are part of the launch
                team. Every city will have its own chapter. Every chapter will have its own story.
              </p>
            </section>

            {/* Perks */}
            <section className="plus-section">
              <h2 className="plus-section-title">What you get</h2>
              <div className="plus-perks">
                {[
                  { icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", label: "Early access", desc: "All tracks before public release" },
                  { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", label: "City chapter", desc: "Represent GeekFon in your area" },
                  { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "Verified rep", desc: "Official Plus badge and credentials" },
                  { icon: "M2.5 18.5l7-7 4 4L20.5 8M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6", label: "Income opportunities", desc: "Earn from events, referrals, and campaigns" },
                  { icon: "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z", label: "Exclusive LESARs", desc: "Bonus points for rep activities" },
                  { icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", label: "Event access", desc: "Priority entry to GeekFon live events" },
                ].map((perk, i) => (
                  <div key={i} className="plus-perk">
                    <div className="plus-perk-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d={perk.icon} />
                      </svg>
                    </div>
                    <div className="plus-perk-body">
                      <div className="plus-perk-label">{perk.label}</div>
                      <div className="plus-perk-desc">{perk.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Waitlist form */}
            <section className="plus-section plus-form-section">
              {status === "success" ? (
                <div className="plus-success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <h2 className="plus-success-title">You&apos;re on the list.</h2>
                  <p className="plus-success-text">
                    We review applications by city on a rolling basis. If selected, you will hear from us directly.
                    Keep an eye on your inbox.
                  </p>
                  <a href="/" className="plus-back-link">Back to GeekFon Society</a>
                </div>
              ) : (
                <>
                  <h2 className="plus-section-title">Request an invitation</h2>
                  <p className="plus-section-text">
                    We are building Plus chapter by chapter, city by city. Submit your information
                    and we will reach out when your city opens.
                  </p>
                  <form className="plus-form" onSubmit={handleSubmit} noValidate>
                    <div className="plus-field">
                      <label className="plus-label" htmlFor="plus-name">Full name</label>
                      <input
                        id="plus-name"
                        className="plus-input"
                        type="text"
                        placeholder="Your name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                        autoComplete="name"
                      />
                    </div>
                    <div className="plus-field">
                      <label className="plus-label" htmlFor="plus-email">Email address</label>
                      <input
                        id="plus-email"
                        className="plus-input"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="plus-field">
                      <label className="plus-label" htmlFor="plus-city">City</label>
                      <input
                        id="plus-city"
                        className="plus-input"
                        type="text"
                        placeholder="Your city"
                        value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        required
                        autoComplete="address-level2"
                      />
                    </div>
                    {status === "error" && (
                      <p className="plus-error" role="alert">{errorMsg}</p>
                    )}
                    <button
                      type="submit"
                      className="plus-submit"
                      disabled={status === "loading" || !form.name || !form.email || !form.city}
                    >
                      {status === "loading" ? "Submitting..." : "Request invitation"}
                    </button>
                  </form>
                </>
              )}
            </section>

            <p className="plus-fine-print">
              GeekFon Plus is invitation-only. Submitting this form does not guarantee acceptance.
              Approved representatives will be contacted directly by the GeekFon team.
            </p>
          </div>

          {/* Right sidebar */}
          <aside className="plus-sidebar">

            {/* Who you'll represent */}
            <div className="plus-sidebar-block">
              <div className="plus-sidebar-label">Who you&apos;ll represent</div>
              <div className="plus-artist-list">
                {LAUNCH_ARTISTS.map((a, i) => (
                  <a key={i} href={`/${a.slug}`} className="plus-artist-card">
                    <div className="plus-artist-initial">{a.name.charAt(0)}</div>
                    <div className="plus-artist-info">
                      <div className="plus-artist-name">{a.name}</div>
                      <div className="plus-artist-genre">{a.genre}</div>
                    </div>
                    <div className="plus-artist-role">{a.role}</div>
                  </a>
                ))}
                <div className="plus-artist-more">+ more artists dropping Season 1</div>
              </div>
            </div>

            {/* How selection works */}
            <div className="plus-sidebar-block">
              <div className="plus-sidebar-label">How selection works</div>
              <div className="plus-steps">
                {[
                  { n: "01", t: "Apply", d: "Submit your name, email, and city." },
                  { n: "02", t: "Review", d: "We review by city on a rolling basis." },
                  { n: "03", t: "Invite", d: "Selected reps get a direct invite from the team." },
                  { n: "04", t: "Activate", d: "Get your Plus badge, LESARs bonus, and city brief." },
                ].map((s, i) => (
                  <div key={i} className="plus-step">
                    <div className="plus-step-n">{s.n}</div>
                    <div>
                      <div className="plus-step-t">{s.t}</div>
                      <div className="plus-step-d">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>
      </div>
    </SiteChrome>
  );
}

const CSS = `
.plus-page { max-width: none; margin: 0; padding: 0 0 80px; font-family: inherit; }

/* ---- Hero ---- */
.plus-hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: #020c0a;
  color: #fff;
  padding: 64px 40px 60px;
  border-bottom: 4px solid #6366f1;
  min-height: 320px;
  display: flex;
  align-items: flex-end;
}
.plus-hero-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
}
.plus-hero-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .18em;
  padding: 5px 14px;
  border-radius: 100px;
  background: rgba(99,102,241,.18);
  color: #818cf8;
  border: 1px solid rgba(99,102,241,.3);
  margin-bottom: 20px;
}
.plus-hero-title {
  font-size: clamp(42px, 6vw, 72px);
  font-weight: 900;
  letter-spacing: -.03em;
  text-transform: uppercase;
  margin: 0 0 16px;
  line-height: .94;
}
.plus-hero-sub {
  font-size: 17px;
  color: rgba(255,255,255,.78);
  max-width: 520px;
  line-height: 1.6;
  margin: 0;
}

/* Aurora */
.plus-aurora {
  position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
}
.plus-stars {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 9% 6%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 24% 12%, rgba(255,255,255,.35) 0%, transparent 100%),
    radial-gradient(1px 1px at 44% 4%, rgba(255,255,255,.48) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 18% 4%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 66% 2%, rgba(255,255,255,.55) 0%, transparent 100%);
}
.apga { position:absolute; border-radius:50%; filter:blur(90px); }
.apga1 { width:85vw; height:48vh; top:-20vh; left:4vw; background:radial-gradient(ellipse at center,rgba(99,102,241,.22) 0%,transparent 70%); animation:apgd1 18s ease-in-out infinite alternate; }
.apga2 { width:62vw; height:40vh; top:-14vh; right:-6vw; background:radial-gradient(ellipse at center,rgba(0,155,255,.15) 0%,transparent 70%); animation:apgd2 24s ease-in-out infinite alternate; }
.apga3 { width:52vw; height:34vh; top:0; left:24vw; background:radial-gradient(ellipse at center,rgba(120,0,255,.12) 0%,transparent 70%); animation:apgd3 20s ease-in-out infinite alternate; }
.apga4 { width:40vw; height:24vh; top:-8vh; left:46vw; background:radial-gradient(ellipse at center,rgba(79,70,229,.13) 0%,transparent 70%); animation:apgd4 28s ease-in-out infinite alternate; }
.apga5 { width:28vw; height:20vh; top:4vh; left:62vw; background:radial-gradient(ellipse at center,rgba(190,70,255,.09) 0%,transparent 70%); animation:apgd5 22s ease-in-out infinite alternate; }
.plus-ground { position:absolute; bottom:0; left:0; right:0; height:60%; background:linear-gradient(to top,rgba(2,12,10,.92) 0%,transparent 100%); }
@keyframes apgd1 { from{transform:translate(0,0) scaleX(1)} to{transform:translate(4vw,5vh) scaleX(1.1)} }
@keyframes apgd2 { from{transform:translate(0,0) scaleY(1)} to{transform:translate(-5vw,3vh) scaleY(1.18)} }
@keyframes apgd3 { from{transform:translate(0,0) rotate(0)} to{transform:translate(3vw,-4vh) rotate(7deg)} }
@keyframes apgd4 { from{transform:translate(0,0)} to{transform:translate(-4vw,6vh)} }
@keyframes apgd5 { from{transform:translate(0,0) scale(1)} to{transform:translate(5vw,-5vh) scale(1.3)} }

/* Rotating city */
.plus-city-stage {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden;
}
.plus-city-stage::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 40%;
  background: linear-gradient(to bottom, rgba(2,12,10,.9) 0%, transparent 100%);
  z-index: 10;
}
.plus-city-img {
  width: 100%; height: 100%; object-fit: cover; object-position: center bottom; display: block;
  opacity: 0;
  transition: opacity .7s ease;
}
.plus-city-img.visible { opacity: 1; }

/* ---- Two-column layout ---- */
.plus-layout {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 0 40px;
  margin-top: 0;
}
.plus-main {
  flex: 1;
  min-width: 0;
  padding-top: 36px;
  padding-right: 32px;
}
.plus-sidebar {
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 100px;
  padding-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Sections */
.plus-section { padding-bottom: 0; margin-bottom: 32px; }
.plus-section-title {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .18em;
  color: rgba(26,26,26,.5);
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(0,0,0,.07);
}
.plus-section-text { font-size: 15px; color: rgba(26,26,26,.78); line-height: 1.75; margin: 0; }

/* Perks */
.plus-perks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
.plus-perk {
  display: flex; align-items: flex-start; gap: 12px;
  background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 12px; padding: 16px 14px;
}
.plus-perk-icon {
  width: 36px; height: 36px; border-radius: 9px;
  background: rgba(99,102,241,.1); display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #4338ca;
}
.plus-perk-icon svg { width: 17px; height: 17px; }
.plus-perk-label { font-size: 13px; font-weight: 800; color: #1a1a1a; margin-bottom: 2px; }
.plus-perk-desc { font-size: 12px; color: rgba(26,26,26,.55); line-height: 1.4; }

/* Form */
.plus-form-section {
  background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 16px;
  padding: 28px 28px 24px;
}
.plus-form-section .plus-section-title { margin-bottom: 8px; }
.plus-form-section .plus-section-text { margin-bottom: 24px; }
.plus-form { display: flex; flex-direction: column; gap: 16px; }
.plus-field { display: flex; flex-direction: column; gap: 6px; }
.plus-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: rgba(26,26,26,.7); }
.plus-input {
  font-family: inherit; font-size: 15px; font-weight: 500; color: #1a1a1a;
  background: #f8f8f8; border: 1.5px solid rgba(0,0,0,.12); border-radius: 9px;
  padding: 12px 14px; outline: none; transition: border-color .15s;
}
.plus-input:focus { border-color: #6366f1; background: #fff; }
.plus-input::placeholder { color: rgba(26,26,26,.3); }
.plus-error { font-size: 13px; color: #dc2626; margin: 0; }
.plus-submit {
  margin-top: 4px; padding: 14px;
  background: #4338ca; color: #fff; border: none; border-radius: 10px;
  font-family: inherit; font-size: 14px; font-weight: 900; text-transform: uppercase;
  letter-spacing: .08em; cursor: pointer; transition: background .15s;
}
.plus-submit:hover:not(:disabled) { background: #3730a3; }
.plus-submit:disabled { opacity: .5; cursor: not-allowed; }
.plus-submit:focus-visible { outline: 2px solid #6366f1; outline-offset: 3px; }
.plus-fine-print { font-size: 12px; color: rgba(26,26,26,.4); line-height: 1.65; margin: 24px 0 0; }

/* Success */
.plus-success { text-align: center; padding: 16px 0; }
.plus-success svg { width: 48px; height: 48px; stroke: #4338ca; margin-bottom: 16px; }
.plus-success-title { font-size: 24px; font-weight: 900; color: #1a1a1a; margin: 0 0 12px; }
.plus-success-text { font-size: 15px; color: rgba(26,26,26,.7); line-height: 1.7; margin: 0 0 24px; }
.plus-back-link { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #4338ca; text-decoration: none; }
.plus-back-link:hover { text-decoration: underline; }

/* ---- Sidebar blocks ---- */
.plus-sidebar-block {
  background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 14px;
  padding: 20px 18px;
}
.plus-sidebar-label {
  font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .18em;
  color: rgba(26,26,26,.4); margin-bottom: 14px;
}
/* Artist cards */
.plus-artist-list { display: flex; flex-direction: column; gap: 2px; }
.plus-artist-card {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 10px; border-radius: 10px; text-decoration: none;
  transition: background .12s;
}
.plus-artist-card:hover { background: rgba(99,102,241,.06); }
.plus-artist-initial {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(99,102,241,.12); color: #4338ca;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900; flex-shrink: 0;
}
.plus-artist-info { flex: 1; min-width: 0; }
.plus-artist-name { font-size: 13px; font-weight: 800; color: #1a1a1a; }
.plus-artist-genre { font-size: 11px; color: rgba(26,26,26,.5); margin-top: 1px; }
.plus-artist-role {
  font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em;
  padding: 3px 8px; border-radius: 100px;
  background: rgba(99,102,241,.1); color: #4338ca; white-space: nowrap;
}
.plus-artist-more {
  font-size: 11px; color: rgba(26,26,26,.4); font-style: italic;
  padding: 8px 10px 2px; text-align: center;
}

/* How selection works steps */
.plus-steps { display: flex; flex-direction: column; gap: 14px; }
.plus-step { display: flex; align-items: flex-start; gap: 12px; }
.plus-step-n {
  font-size: 10px; font-weight: 900; letter-spacing: .06em;
  color: #4338ca; background: rgba(99,102,241,.1);
  border-radius: 6px; padding: 4px 8px; flex-shrink: 0; margin-top: 1px;
}
.plus-step-t { font-size: 13px; font-weight: 800; color: #1a1a1a; margin-bottom: 2px; }
.plus-step-d { font-size: 12px; color: rgba(26,26,26,.55); line-height: 1.45; }

/* ---- Responsive ---- */
@media (max-width: 900px) {
  .plus-hero { padding: 48px 20px 44px; min-height: 260px; }
  .plus-layout { flex-direction: column; padding: 0 16px; }
  .plus-main { padding-right: 0; }
  .plus-sidebar { width: 100%; position: static; padding-top: 0; }
  .plus-perks { grid-template-columns: 1fr; }
  .plus-form-section { padding: 20px 16px; }
}
`;
