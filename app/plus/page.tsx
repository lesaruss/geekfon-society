"use client";
import { useState, useEffect, useRef } from "react";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";
const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const CITY_IMAGES = [
  CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png",
  CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png",
  CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png",
  CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png",
  CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png",
  CDN + "hf_20260619_125302_4c4f6747-3bcb-45b2-a743-610912078942.png",
  CDN + "hf_20260620_234313_10dea700-d199-4e4a-bc73-0b276a46d266.png",
];

const LAUNCH_ARTISTS = [
  { name: "Roxanne",          slug: "roxanne",          genre: "J-Pop / Pop Rock",      role: "Co-Captain" },
  { name: "Lex from Brixton", slug: "lex-from-brixton", genre: "UK Grime / Dancehall",  role: "Co-Captain" },
  { name: "Shamanic Resin",   slug: "shamanic-resin",   genre: "Neo-Soul / Indie R&B",  role: "Founding Artist" },
];

type VideoMode = "upload" | "link";
type Status = "idle" | "uploading" | "submitting" | "success" | "error";

export default function PlusApplyPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isMember, setIsMember]       = useState(false);

  // Gate: must be a Passport member to apply
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/passport";
        return;
      }
      const { data } = await supabase
        .from("gfs_members")
        .select("tier")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.tier) {
        window.location.href = "/passport";
        return;
      }
      setIsMember(true);
      setAuthChecked(true);
    }
    checkAuth();
    return () => { cancelled = true; };
  }, []);

  const [form, setForm] = useState({ name: "", email: "", city: "", reason: "" });
  const [videoMode, setVideoMode] = useState<VideoMode>("upload");
  const [videoLink, setVideoLink] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cityIdx, setCityIdx] = useState(0);
  const [cityVisible, setCityVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCityVisible(false);
      setTimeout(() => { setCityIdx(i => (i + 1) % CITY_IMAGES.length); setCityVisible(true); }, 700);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setFileError("Please select a video file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(`Video must be ${MAX_MB}MB or smaller. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }
    setVideoFile(file);
    setUploadProgress(0);
  }

  function clearFile() {
    setVideoFile(null);
    setUploadProgress(0);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadVideo(file: File): Promise<string> {
    // Get signed upload URL from server
    const res = await fetch("/api/plus-apply/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    if (!res.ok) throw new Error("Could not get upload URL.");
    const { signedUrl, path } = await res.json();

    // Upload directly to Supabase Storage with progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error("Upload failed.")); };
      xhr.onerror = () => reject(new Error("Upload failed."));
      xhr.send(file);
    });

    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.city.trim() || !form.reason.trim()) return;
    if (videoMode === "upload" && !videoFile) { setFileError("Please attach a video."); return; }
    if (videoMode === "link" && !videoLink.trim()) { setErrorMsg("Please include a video link."); return; }

    setErrorMsg("");
    try {
      let videoUrl = "";
      let videoType: VideoMode = videoMode;

      if (videoMode === "upload" && videoFile) {
        setStatus("uploading");
        videoUrl = await uploadVideo(videoFile);
      } else {
        videoUrl = videoLink.trim();
      }

      setStatus("submitting");
      const res = await fetch("/api/plus-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, videoUrl, videoType }),
      });
      if (!res.ok) throw new Error("Submission failed.");
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const isSubmitting = status === "uploading" || status === "submitting";
  const canSubmit = !isSubmitting
    && form.name.trim() && form.email.trim() && form.city.trim() && form.reason.trim()
    && (videoMode === "link" ? !!videoLink.trim() : !!videoFile);

  // Hold render until auth resolved
  if (!authChecked || !isMember) {
    return (
      <SiteChrome>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
          <span style={{ color: "#666", fontFamily: "Montserrat, sans-serif", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>Checking access...</span>
        </div>
      </SiteChrome>
    );
  }

  return (
    <SiteChrome>
      <style>{CSS}</style>
      <div className="plus-page">

        {/* Hero */}
        <div className="plus-hero">
          <div className="plus-aurora" aria-hidden="true">
            <div className="plus-stars" />
            <div className="apga apga1" /><div className="apga apga2" /><div className="apga apga3" />
            <div className="apga apga4" /><div className="apga apga5" />
            <div className="plus-ground" />
          </div>
          <div className="plus-city-stage" aria-hidden="true">
            <img
              src={CITY_IMAGES[cityIdx]}
              alt=""
              aria-hidden="true"
              className={"plus-city-img" + (cityVisible ? " visible" : "")}
            />
          </div>
          <div className="plus-hero-content">
            <div className="plus-hero-badge">By Selection Only</div>
            <h1 className="plus-hero-title">GeekFon Plus</h1>
            <p className="plus-hero-sub">
              A select group of representatives who carry GeekFon Society into the real world.
              This is not a signup. It is an invitation we extend - after you earn it.
            </p>
          </div>
        </div>

        {/* Two-column body */}
        <div className="plus-layout">

          {/* Main column */}
          <div className="plus-main">

            <section className="plus-section">
              <h2 className="plus-section-title">What is Plus?</h2>
              <p className="plus-section-text">
                GeekFon Plus reps represent the community in their city - at events, on the ground,
                and online. You promote the artists, bring people in, and build your chapter.
                In return, you get early access to every track, exclusive Points, event priority,
                and real opportunities to earn from the work you put in.
                We do not accept everyone. We look for people who already move like this.
              </p>
            </section>

            <section className="plus-section">
              <h2 className="plus-section-title">What you get</h2>
              <div className="plus-perks">
                {[
                  { icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", label: "Early access", desc: "Every track before the public and streaming platforms" },
                  { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", label: "City chapter", desc: "Your own chapter. Your city. Your reputation." },
                  { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "Verified rep status", desc: "Official Plus badge, credentials, and team brief" },
                  { icon: "M2.5 18.5l7-7 4 4L20.5 8M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6", label: "Income opportunities", desc: "Earn from events, referrals, and brand campaigns" },
                  { icon: "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z", label: "Exclusive Points", desc: "Bonus points for every rep activity you complete" },
                  { icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", label: "Event priority", desc: "First access to every GeekFon live event" },
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

            {/* Application form */}
            <section className="plus-section plus-form-section">
              {status === "success" ? (
                <div className="plus-success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <h2 className="plus-success-title">Application received.</h2>
                  <p className="plus-success-text">
                    The team reviews every application personally. If you are selected,
                    you will hear from us directly. Thank you for putting yourself forward.
                  </p>
                  <a href="/" className="plus-back-link">Back to GeekFon Society</a>
                </div>
              ) : (
                <>
                  <h2 className="plus-section-title">Apply to the team</h2>
                  <p className="plus-section-text" style={{ marginBottom: 28 }}>
                    Show us who you are. Include a short video - tell us your city, why you want in,
                    and how you move in your community. We watch every one.
                  </p>
                  <form className="plus-form" onSubmit={handleSubmit} noValidate>

                    <div className="plus-field-row">
                      <div className="plus-field">
                        <label className="plus-label" htmlFor="plus-name">Full name</label>
                        <input id="plus-name" className="plus-input" type="text" placeholder="Your name"
                          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          required autoComplete="name" />
                      </div>
                      <div className="plus-field">
                        <label className="plus-label" htmlFor="plus-email">Email</label>
                        <input id="plus-email" className="plus-input" type="email" placeholder="you@example.com"
                          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required autoComplete="email" />
                      </div>
                    </div>

                    <div className="plus-field">
                      <label className="plus-label" htmlFor="plus-city">City</label>
                      <input id="plus-city" className="plus-input" type="text" placeholder="Your city"
                        value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        required autoComplete="address-level2" />
                    </div>

                    <div className="plus-field">
                      <label className="plus-label" htmlFor="plus-reason">Why should we pick you?</label>
                      <textarea id="plus-reason" className="plus-input plus-textarea"
                        placeholder="Tell us how you move in your city, what you bring, and why GeekFon Plus should be yours."
                        value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                        required rows={4} />
                    </div>

                    {/* Video section */}
                    <div className="plus-field">
                      <div className="plus-label-row">
                        <span className="plus-label">Video</span>
                        <span className="plus-label-note">Required - max {MAX_MB}MB if uploading</span>
                      </div>
                      <div className="plus-video-toggle">
                        <button type="button"
                          className={"plus-toggle-btn" + (videoMode === "upload" ? " active" : "")}
                          onClick={() => { setVideoMode("upload"); setVideoLink(""); setErrorMsg(""); }}>
                          Upload file
                        </button>
                        <button type="button"
                          className={"plus-toggle-btn" + (videoMode === "link" ? " active" : "")}
                          onClick={() => { setVideoMode("link"); clearFile(); setErrorMsg(""); }}>
                          Submit a link
                        </button>
                      </div>

                      {videoMode === "upload" && (
                        <div className="plus-upload-zone">
                          {!videoFile ? (
                            <label className="plus-upload-label" htmlFor="plus-video-file">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                              </svg>
                              <span className="plus-upload-cta">Choose video</span>
                              <span className="plus-upload-hint">MP4, MOV, or WebM - max {MAX_MB}MB</span>
                              <input
                                id="plus-video-file"
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                className="plus-file-input"
                                onChange={handleFileChange}
                              />
                            </label>
                          ) : (
                            <div className="plus-file-selected">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="plus-file-icon">
                                <rect x="2" y="7" width="15" height="10" rx="2"/><path d="M17 9l5-3v12l-5-3"/>
                              </svg>
                              <div className="plus-file-info">
                                <div className="plus-file-name">{videoFile.name}</div>
                                <div className="plus-file-size">{(videoFile.size / 1024 / 1024).toFixed(1)}MB</div>
                              </div>
                              <button type="button" className="plus-file-remove" onClick={clearFile} aria-label="Remove video">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          )}
                          {status === "uploading" && (
                            <div className="plus-progress-wrap">
                              <div className="plus-progress-bar">
                                <div className="plus-progress-fill" style={{ width: `${uploadProgress}%` }} />
                              </div>
                              <span className="plus-progress-pct">{uploadProgress}%</span>
                            </div>
                          )}
                          {fileError && <p className="plus-error" role="alert">{fileError}</p>}
                        </div>
                      )}

                      {videoMode === "link" && (
                        <input className="plus-input" type="url"
                          placeholder="YouTube, Instagram, TikTok, or any video URL"
                          value={videoLink}
                          onChange={e => { setVideoLink(e.target.value); setErrorMsg(""); }}
                        />
                      )}
                    </div>

                    {errorMsg && <p className="plus-error" role="alert">{errorMsg}</p>}

                    <button type="submit" className="plus-submit" disabled={!canSubmit}>
                      {status === "uploading"
                        ? `Uploading video... ${uploadProgress}%`
                        : status === "submitting"
                        ? "Submitting application..."
                        : "Submit my application"}
                    </button>
                  </form>
                </>
              )}
            </section>

            <p className="plus-fine-print">
              Applications are reviewed by the GeekFon team. Submission does not guarantee selection.
              Selected representatives will be contacted directly. We read every application.
            </p>
          </div>

          {/* Right sidebar */}
          <aside className="plus-sidebar">
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

            <div className="plus-sidebar-block">
              <div className="plus-sidebar-label">How selection works</div>
              <div className="plus-steps">
                {[
                  { n: "01", t: "Apply", d: "Submit your application and video." },
                  { n: "02", t: "Review", d: "The team watches every video personally." },
                  { n: "03", t: "Selection", d: "If chosen, you get a direct invite." },
                  { n: "04", t: "Activate", d: "Get your badge, Points bonus, and city brief." },
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

/* Hero */
.plus-hero {
  position: relative; overflow: hidden; isolation: isolate; background: #020c0a;
  color: #fff; padding: 64px 40px 60px; border-bottom: 4px solid #6366f1;
  min-height: 300px; display: flex; align-items: flex-end;
}
.plus-hero-content { position: relative; z-index: 2; max-width: 640px; }
.plus-hero-badge {
  display: inline-block; font-size: 10px; font-weight: 900; text-transform: uppercase;
  letter-spacing: .18em; padding: 5px 14px; border-radius: 100px;
  background: rgba(99,102,241,.18); color: #818cf8; border: 1px solid rgba(99,102,241,.3);
  margin-bottom: 20px;
}
.plus-hero-title {
  font-size: clamp(42px, 6vw, 72px); font-weight: 900; letter-spacing: -.03em;
  text-transform: uppercase; margin: 0 0 16px; line-height: .94;
}
.plus-hero-sub { font-size: 17px; color: rgba(255,255,255,.78); max-width: 520px; line-height: 1.6; margin: 0; }

/* Aurora */
.plus-aurora { position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none; }
.plus-stars {
  position:absolute;inset:0;
  background-image:
    radial-gradient(1px 1px at 9% 6%,rgba(255,255,255,.55) 0%,transparent 100%),
    radial-gradient(1px 1px at 24% 12%,rgba(255,255,255,.35) 0%,transparent 100%),
    radial-gradient(1px 1px at 44% 4%,rgba(255,255,255,.48) 0%,transparent 100%),
    radial-gradient(1.5px 1.5px at 18% 4%,rgba(255,255,255,.65) 0%,transparent 100%),
    radial-gradient(1.5px 1.5px at 66% 2%,rgba(255,255,255,.55) 0%,transparent 100%);
}
.apga{position:absolute;border-radius:50%;filter:blur(90px)}
.apga1{width:85vw;height:48vh;top:-20vh;left:4vw;background:radial-gradient(ellipse at center,rgba(99,102,241,.22) 0%,transparent 70%);animation:apgd1 18s ease-in-out infinite alternate}
.apga2{width:62vw;height:40vh;top:-14vh;right:-6vw;background:radial-gradient(ellipse at center,rgba(0,155,255,.15) 0%,transparent 70%);animation:apgd2 24s ease-in-out infinite alternate}
.apga3{width:52vw;height:34vh;top:0;left:24vw;background:radial-gradient(ellipse at center,rgba(120,0,255,.12) 0%,transparent 70%);animation:apgd3 20s ease-in-out infinite alternate}
.apga4{width:40vw;height:24vh;top:-8vh;left:46vw;background:radial-gradient(ellipse at center,rgba(79,70,229,.13) 0%,transparent 70%);animation:apgd4 28s ease-in-out infinite alternate}
.apga5{width:28vw;height:20vh;top:4vh;left:62vw;background:radial-gradient(ellipse at center,rgba(190,70,255,.09) 0%,transparent 70%);animation:apgd5 22s ease-in-out infinite alternate}
.plus-ground{position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(2,12,10,.92) 0%,transparent 100%)}
@keyframes apgd1{from{transform:translate(0,0) scaleX(1)}to{transform:translate(4vw,5vh) scaleX(1.1)}}
@keyframes apgd2{from{transform:translate(0,0) scaleY(1)}to{transform:translate(-5vw,3vh) scaleY(1.18)}}
@keyframes apgd3{from{transform:translate(0,0) rotate(0)}to{transform:translate(3vw,-4vh) rotate(7deg)}}
@keyframes apgd4{from{transform:translate(0,0)}to{transform:translate(-4vw,6vh)}}
@keyframes apgd5{from{transform:translate(0,0) scale(1)}to{transform:translate(5vw,-5vh) scale(1.3)}}
.plus-city-stage{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.plus-city-stage::before{content:'';position:absolute;top:0;left:0;right:0;height:40%;background:linear-gradient(to bottom,rgba(2,12,10,.9) 0%,transparent 100%);z-index:10}
.plus-city-img{width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block;opacity:0;transition:opacity .7s ease}
.plus-city-img.visible{opacity:1}

/* Layout */
.plus-layout{display:flex;align-items:flex-start;gap:0;padding:0 40px;margin-top:0}
.plus-main{flex:1;min-width:0;padding-top:36px;padding-right:32px}
.plus-sidebar{width:300px;flex-shrink:0;position:sticky;top:100px;padding-top:36px;display:flex;flex-direction:column;gap:20px}

/* Sections */
.plus-section{margin-bottom:32px}
.plus-section-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:rgba(26,26,26,.5);margin:0 0 16px;padding-bottom:12px;border-bottom:2px solid rgba(0,0,0,.07)}
.plus-section-text{font-size:15px;color:rgba(26,26,26,.78);line-height:1.75;margin:0}

/* Perks */
.plus-perks{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
.plus-perk{display:flex;align-items:flex-start;gap:12px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:16px 14px}
.plus-perk-icon{width:36px;height:36px;border-radius:9px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#4338ca}
.plus-perk-icon svg{width:17px;height:17px}
.plus-perk-label{font-size:13px;font-weight:800;color:#1a1a1a;margin-bottom:2px}
.plus-perk-desc{font-size:12px;color:rgba(26,26,26,.55);line-height:1.4}

/* Form */
.plus-form-section{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:28px 28px 24px}
.plus-form-section .plus-section-title{margin-bottom:8px}
.plus-form{display:flex;flex-direction:column;gap:18px}
.plus-field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.plus-field{display:flex;flex-direction:column;gap:6px}
.plus-label{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(26,26,26,.7)}
.plus-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0}
.plus-label-note{font-size:11px;font-weight:600;color:rgba(26,26,26,.4);text-transform:none;letter-spacing:0}
.plus-input{font-family:inherit;font-size:15px;font-weight:500;color:#1a1a1a;background:#f8f8f8;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;padding:12px 14px;outline:none;transition:border-color .15s;resize:none}
.plus-input:focus{border-color:#6366f1;background:#fff}
.plus-input::placeholder{color:rgba(26,26,26,.3)}
.plus-textarea{min-height:108px}

/* Video toggle */
.plus-video-toggle{display:flex;gap:2px;background:rgba(0,0,0,.06);border-radius:10px;padding:3px;margin-bottom:12px;width:fit-content}
.plus-toggle-btn{font-family:inherit;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;padding:8px 18px;border-radius:8px;border:none;background:transparent;color:rgba(26,26,26,.5);cursor:pointer;transition:all .15s}
.plus-toggle-btn.active{background:#fff;color:#1a1a1a;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.plus-toggle-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}

/* Upload zone */
.plus-upload-zone{display:flex;flex-direction:column;gap:10px}
.plus-upload-label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1.5px dashed rgba(0,0,0,.18);border-radius:10px;padding:28px 20px;cursor:pointer;transition:border-color .15s;position:relative}
.plus-upload-label:hover{border-color:#6366f1}
.plus-upload-label svg{width:28px;height:28px;color:rgba(26,26,26,.35)}
.plus-upload-cta{font-size:14px;font-weight:800;color:#4338ca}
.plus-upload-hint{font-size:12px;color:rgba(26,26,26,.4)}
.plus-file-input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.plus-file-selected{display:flex;align-items:center;gap:12px;background:#f8f8f8;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:12px 14px}
.plus-file-icon{width:20px;height:20px;flex-shrink:0;color:#4338ca}
.plus-file-info{flex:1;min-width:0}
.plus-file-name{font-size:13px;font-weight:700;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plus-file-size{font-size:11px;color:rgba(26,26,26,.5);margin-top:1px}
.plus-file-remove{background:none;border:none;cursor:pointer;padding:4px;color:rgba(26,26,26,.4);display:flex;align-items:center;border-radius:4px}
.plus-file-remove:hover{color:#dc2626;background:rgba(220,38,38,.08)}
.plus-file-remove:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
.plus-file-remove svg{width:14px;height:14px}
.plus-progress-wrap{display:flex;align-items:center;gap:10px}
.plus-progress-bar{flex:1;height:6px;background:rgba(0,0,0,.08);border-radius:3px;overflow:hidden}
.plus-progress-fill{height:100%;background:#4338ca;border-radius:3px;transition:width .2s ease}
.plus-progress-pct{font-size:11px;font-weight:800;color:#4338ca;min-width:32px;text-align:right}

/* Submit */
.plus-error{font-size:13px;color:#dc2626;margin:0}
.plus-submit{padding:15px;background:#4338ca;color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;transition:background .15s;margin-top:4px}
.plus-submit:hover:not(:disabled){background:#3730a3}
.plus-submit:disabled{opacity:.45;cursor:not-allowed}
.plus-submit:focus-visible{outline:2px solid #6366f1;outline-offset:3px}
.plus-fine-print{font-size:12px;color:rgba(26,26,26,.4);line-height:1.65;margin:24px 0 0}

/* Success */
.plus-success{text-align:center;padding:16px 0}
.plus-success svg{width:48px;height:48px;stroke:#4338ca;margin-bottom:16px}
.plus-success-title{font-size:24px;font-weight:900;color:#1a1a1a;margin:0 0 12px}
.plus-success-text{font-size:15px;color:rgba(26,26,26,.7);line-height:1.7;margin:0 0 24px}
.plus-back-link{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#4338ca;text-decoration:none}
.plus-back-link:hover{text-decoration:underline}

/* Sidebar */
.plus-sidebar-block{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:20px 18px}
.plus-sidebar-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:rgba(26,26,26,.4);margin-bottom:14px}
.plus-artist-list{display:flex;flex-direction:column;gap:2px}
.plus-artist-card{display:flex;align-items:center;gap:11px;padding:10px;border-radius:10px;text-decoration:none;transition:background .12s}
.plus-artist-card:hover{background:rgba(99,102,241,.06)}
.plus-artist-initial{width:34px;height:34px;border-radius:50%;background:rgba(99,102,241,.12);color:#4338ca;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0}
.plus-artist-info{flex:1;min-width:0}
.plus-artist-name{font-size:13px;font-weight:800;color:#1a1a1a}
.plus-artist-genre{font-size:11px;color:rgba(26,26,26,.5);margin-top:1px}
.plus-artist-role{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:100px;background:rgba(99,102,241,.1);color:#4338ca;white-space:nowrap}
.plus-artist-more{font-size:11px;color:rgba(26,26,26,.4);font-style:italic;padding:8px 10px 2px;text-align:center}
.plus-steps{display:flex;flex-direction:column;gap:14px}
.plus-step{display:flex;align-items:flex-start;gap:12px}
.plus-step-n{font-size:10px;font-weight:900;letter-spacing:.06em;color:#4338ca;background:rgba(99,102,241,.1);border-radius:6px;padding:4px 8px;flex-shrink:0;margin-top:1px}
.plus-step-t{font-size:13px;font-weight:800;color:#1a1a1a;margin-bottom:2px}
.plus-step-d{font-size:12px;color:rgba(26,26,26,.55);line-height:1.45}

/* Responsive */
@media(max-width:900px){
  .plus-hero{padding:48px 20px 44px;min-height:260px}
  .plus-layout{flex-direction:column;padding:0 16px}
  .plus-main{padding-right:0}
  .plus-sidebar{width:100%;position:static;padding-top:0}
  .plus-perks{grid-template-columns:1fr}
  .plus-form-section{padding:20px 16px}
  .plus-field-row{grid-template-columns:1fr}
}
`;
