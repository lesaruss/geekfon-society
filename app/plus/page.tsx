"use client";
import { useState } from "react";
import SiteChrome from "@/components/SiteChrome";

export default function PlusWaitlistPage() {
  const [form, setForm] = useState({ name: "", email: "", city: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

        {/* Hero */}
        <div className="plus-hero">
          <div className="plus-hero-badge">Invitation Only</div>
          <h1 className="plus-hero-title">GeekFon Plus</h1>
          <p className="plus-hero-sub">
            The street team behind GeekFon Society. Earn real income promoting the community
            in your city, at events, and in your area.
          </p>
        </div>

        {/* What is Plus */}
        <div className="plus-body">
          <section className="plus-section">
            <h2 className="plus-section-title">What is Plus?</h2>
            <p className="plus-section-text">
              GeekFon Plus is a select group of representatives who carry the GeekFon Society
              mission into the real world. You are not just a fan - you are part of the launch
              team. Every city will have its own chapter. Every chapter will have its own story.
            </p>
          </section>

          {/* Perks grid */}
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

          {/* Fine print */}
          <p className="plus-fine-print">
            GeekFon Plus is invitation-only. Submitting this form does not guarantee acceptance.
            Approved representatives will be contacted directly by the GeekFon team.
          </p>
        </div>

      </div>
    </SiteChrome>
  );
}

const CSS = `
.plus-page { max-width: none; margin: 0; padding: 0 0 80px; font-family: inherit; }

/* Hero */
.plus-hero {
  background: #111;
  color: #fff;
  padding: 64px 40px 56px;
  border-bottom: 4px solid #6366f1;
  text-align: center;
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
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 900;
  letter-spacing: -.03em;
  text-transform: uppercase;
  margin: 0 0 16px;
  line-height: .96;
}
.plus-hero-sub {
  font-size: 17px;
  color: rgba(255,255,255,.75);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Body */
.plus-body { max-width: 680px; margin: 0 auto; padding: 0 24px; }
.plus-section { padding: 44px 0 0; }
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
.plus-perks { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 4px; }
.plus-perk {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 12px;
  padding: 18px 16px;
}
.plus-perk-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(99,102,241,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #4338ca;
}
.plus-perk-icon svg { width: 18px; height: 18px; }
.plus-perk-label { font-size: 13px; font-weight: 800; color: #1a1a1a; margin-bottom: 3px; }
.plus-perk-desc { font-size: 12px; color: rgba(26,26,26,.55); line-height: 1.4; }

/* Form section */
.plus-form-section {
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 16px;
  padding: 32px;
  margin-top: 44px;
}
.plus-form-section .plus-section-title { margin-bottom: 8px; }
.plus-form-section .plus-section-text { margin-bottom: 28px; }
.plus-form { display: flex; flex-direction: column; gap: 18px; }
.plus-field { display: flex; flex-direction: column; gap: 6px; }
.plus-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: rgba(26,26,26,.7); }
.plus-input {
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  background: #f8f8f8;
  border: 1.5px solid rgba(0,0,0,.12);
  border-radius: 9px;
  padding: 12px 14px;
  outline: none;
  transition: border-color .15s;
}
.plus-input:focus { border-color: #6366f1; background: #fff; }
.plus-input::placeholder { color: rgba(26,26,26,.3); }
.plus-error { font-size: 13px; color: #dc2626; margin: 0; }
.plus-submit {
  margin-top: 4px;
  padding: 14px;
  background: #4338ca;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
  cursor: pointer;
  transition: background .15s;
}
.plus-submit:hover:not(:disabled) { background: #3730a3; }
.plus-submit:disabled { opacity: .5; cursor: not-allowed; }
.plus-submit:focus-visible { outline: 2px solid #6366f1; outline-offset: 3px; }

/* Success state */
.plus-success { text-align: center; padding: 16px 0; }
.plus-success svg { width: 48px; height: 48px; stroke: #4338ca; margin-bottom: 16px; }
.plus-success-title { font-size: 24px; font-weight: 900; color: #1a1a1a; margin: 0 0 12px; }
.plus-success-text { font-size: 15px; color: rgba(26,26,26,.7); line-height: 1.7; margin: 0 0 24px; }
.plus-back-link { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #4338ca; text-decoration: none; }
.plus-back-link:hover { text-decoration: underline; }

/* Fine print */
.plus-fine-print { font-size: 12px; color: rgba(26,26,26,.4); line-height: 1.65; text-align: center; margin: 32px 0 0; padding: 0 8px; }

@media (max-width: 640px) {
  .plus-hero { padding: 48px 20px 40px; }
  .plus-body { padding: 0 16px; }
  .plus-perks { grid-template-columns: 1fr; }
  .plus-form-section { padding: 22px 18px; }
}
`;
