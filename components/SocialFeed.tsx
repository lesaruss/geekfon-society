"use client";

// GeekFon Social feed-card - approved sample, 2026-07-28 (Roxanne pilot).
// CORRECTED same day per V: this does NOT replace the .sg-grid thumbnail
// grid as the main Social view. The grid stays exactly as it was; PostCard
// below is rendered INSIDE the existing lightbox when a grid cell is
// clicked, so the interactive card (avatar+name header, caption, liked-by
// stack, Like/Comment row, typed-or-voice comment composer) is what you see
// after opening a post, not instead of the grid. See ArtistPage.tsx's
// sg-lightbox block. Comments can be typed or a recorded voice note (per V:
// make voice-comment the standard pattern everywhere, not just here).
// Backed by the real gfs_pulse_likes / gfs_pulse_comments tables via
// /api/social/like and /api/social/comments - see
// project_geekfon_social_feed_card_sample memory for the full build note.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SocialFeedPost = {
  id: string;
  text?: string;
  type?: string;
  mediaUrl: string | null;
  thumb?: string | null;
  pinned?: boolean;
  timestamp?: string;
  audioUrl?: string | null;
};

function stripSignOff(text: string | undefined, name: string): string {
  if (!text) return "";
  const lines = text.split("\n");
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length && lines[lines.length - 1].trim().toLowerCase() === name.trim().toLowerCase()) {
    lines.pop();
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  }
  return lines.join("\n");
}

function formatDate(ts?: string): string {
  if (!ts) return "Recent";
  // timeZone pinned to UTC so this renders identically on the server and in
  // the client's local browser timezone - without it, a post near midnight
  // could format to a different calendar day on each side and trip a React
  // hydration mismatch (seen live as minified error #418 on first ship).
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function initialColor(seed: string): string {
  const palette = ["#E91E8C", "#4338ca", "#2e7d32", "#b45309", "#0891b2"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// Voice-comment audio has two separate bugs to work around:
// 1. Chrome's MediaRecorder writes webm/opus with no real duration in the
//    container header - <audio> reports Infinity/NaN/0. Forcing a seek
//    past the end makes the browser walk the file and compute the real
//    duration; snapping back to 0 afterward leaves a normal player.
// 2. CONFIRMED LIVE 2026-07-29: for a POSTED comment (network URL, not the
//    in-memory blob: URL used by the pre-post preview), the <audio> tag
//    never even got past readyState 0 - it hung forever. Root cause:
//    Supabase Storage's public delivery answers Range requests with a 206
//    but omits Accept-Ranges/Content-Range entirely, which breaks Chrome's
//    duration-probing for a Cues-less webm and it just gives up silently.
//    Fix: fetch the file ourselves as a Blob (proven to work fine and
//    fast - it's a small file) and hand the <audio> tag a local blob: URL
//    instead of the raw network URL, sidestepping the broken range path.
function FixedDurationAudio({ src, className }: { src: string; className?: string }) {
  const isBlob = src.startsWith("blob:");
  const [playableSrc, setPlayableSrc] = useState<string | null>(isBlob ? src : null);
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (src.startsWith("blob:")) {
      setPlayableSrc(src);
      return;
    }
    let localUrl: string | null = null;
    let cancelled = false;
    setPlayableSrc(null);
    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        localUrl = URL.createObjectURL(blob);
        setPlayableSrc(localUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [src]);

  function handleLoadedMetadata() {
    const audio = ref.current;
    if (!audio) return;
    if (audio.duration === Infinity || Number.isNaN(audio.duration) || audio.duration === 0) {
      const onTimeUpdate = () => {
        audio.currentTime = 0;
        audio.removeEventListener("timeupdate", onTimeUpdate);
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.currentTime = 1e101;
    }
  }

  if (!playableSrc) {
    return <span className="sf-audio-loading">Loading audio...</span>;
  }

  return (
    <audio
      ref={ref}
      className={className}
      controls
      preload="metadata"
      src={playableSrc}
      onLoadedMetadata={handleLoadedMetadata}
    />
  );
}

type Liker = { userId: string; name: string | null };
type Comment = { id: string; userId: string; name: string; body: string | null; audioUrl: string | null; createdAt: string };

// Minimal shape of the Web Speech API's SpeechRecognition - not in TS DOM
// lib by default, and vendor-prefixed on non-Chromium browsers.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function PostCard({ post, artistSlug, name, avatarUrl, tierRank = 1, isAdmin = false }: { post: SocialFeedPost; artistSlug: string; name: string; avatarUrl?: string | null; tierRank?: number; isAdmin?: boolean }) {
  const [count, setCount] = useState<number>(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [micMenuOpen, setMicMenuOpen] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // dictationBaseRef: whatever was already typed/dictated before this
  // dictation session started (locked once, at start). finalTranscriptRef:
  // only the NEW final speech segments heard during this session, appended
  // incrementally as they arrive - never recomputed from scratch.
  const dictationBaseRef = useRef("");
  const finalTranscriptRef = useRef("");
  // Per V, 2026-07-28: dictation (speech-to-text into the comment box) is
  // available to every commenting member, including Passport (the free
  // registration tier). Actual voice-note recording (an audio attachment) is
  // reserved for Plus/Pro (tierRank >= 2) - Passport members only ever see
  // dictation, no menu needed since there's nothing to choose between.
  const canRecordVoiceNote = tierRank >= 2;

  // 30-second song preview button overlaid on cover-art posts. Per V,
  // 2026-07-29: no separate trimmed audio file - just play the real track
  // from 0:00 and auto-stop at 30s in the browser.
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  useEffect(() => {
    return () => { if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current); };
  }, []);

  function togglePreview() {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setPreviewPlaying(true);
    previewTimeoutRef.current = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      setPreviewPlaying(false);
    }, 30000);
  }

  async function authHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  async function loadLikes() {
    try {
      const res = await fetch(`/api/social/like?artistSlug=${encodeURIComponent(artistSlug)}&postId=${encodeURIComponent(post.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count || 0);
      setLikedByMe(!!data.likedByMe);
      setLikers(data.likers || []);
    } catch { /* non-fatal, counts stay at 0 */ }
  }

  useEffect(() => { loadLikes(); }, [post.id]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    const headers = await authHeader();
    if (!headers.Authorization) { setLikeBusy(false); return; }
    try {
      const res = await fetch("/api/social/like", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ artistSlug, postId: post.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikedByMe(!!data.liked);
        setCount(data.count || 0);
        loadLikes();
      }
    } finally {
      setLikeBusy(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/social/comments?artistSlug=${encodeURIComponent(artistSlug)}&postId=${encodeURIComponent(post.id)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } finally {
      setCommentsLoading(false);
    }
  }

  async function deleteComment(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    const headers = await authHeader();
    if (!headers.Authorization) { setDeletingId(null); return; }
    try {
      const res = await fetch(`/api/social/comments?id=${encodeURIComponent(id)}`, { method: "DELETE", headers });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function toggleCommentPanel() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) loadComments();
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Voice comments need microphone access, which isn't available here.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      // BUG FIXED 2026-07-29 (reported live: recording produced a file that
      // played back as "error"): this used to hardcode the Blob's type to
      // "audio/webm" no matter what the browser actually recorded. Chrome/
      // Firefox do encode webm/opus by default, but Safari's MediaRecorder
      // defaults to mp4/aac - the resulting file was real audio, just
      // mislabeled, so every player (inline preview and the uploaded file)
      // failed to decode it. Fix: ask the browser what it actually supports,
      // pass that into the MediaRecorder constructor, and read back
      // rec.mimeType (the source of truth for what it will really produce)
      // to label the Blob correctly.
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus"];
      const supportedMime = typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
        ? mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m))
        : undefined;
      const rec = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
      const actualMime = rec.mimeType || supportedMime || "audio/webm";
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: actualMime });
        setVoiceBlob(blob);
        setVoiceUrl(URL.createObjectURL(blob));
        setRecording(false);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      alert("Microphone access was blocked or unavailable.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function discardVoice() {
    setVoiceBlob(null);
    setVoiceUrl(null);
  }

  function startDictation() {
    const SpeechRecognitionCtor: (new () => SpeechRecognitionLike) | undefined =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Dictation isn't supported in this browser yet. Try typing, or use Chrome/Safari.");
      return;
    }
    dictationBaseRef.current = draft ? draft.trim() + " " : "";
    finalTranscriptRef.current = "";
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      // BUG FIXED 2026-07-28 (reported live: dictation duplicated the
      // message multiple times on post): the previous version re-scanned
      // e.results from index 0 on every event, which in continuous mode
      // keeps ALL prior results in the array - re-adding text that had
      // already been committed to dictationBaseRef, compounding on every
      // new phrase. Fix: only walk NEW results starting at e.resultIndex,
      // and accumulate final text into its own ref that's never recomputed
      // from scratch.
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscriptRef.current += transcript + " ";
        else interimText += transcript;
      }
      setDraft((dictationBaseRef.current + finalTranscriptRef.current).trimStart() + (interimText ? "…" + interimText : ""));
    };
    recognition.onerror = () => {
      setDictating(false);
    };
    recognition.onend = () => {
      setDictating(false);
      // Land on the clean committed text - drop any trailing interim marker
      // left over if onend fires before a final result comes back.
      setDraft((dictationBaseRef.current + finalTranscriptRef.current).trimStart());
    };
    recognitionRef.current = recognition;
    recognition.start();
    setDictating(true);
  }

  function stopDictation() {
    recognitionRef.current?.stop();
  }

  function handleMicClick() {
    if (recording) { stopRecording(); return; }
    if (dictating) { stopDictation(); return; }
    if (canRecordVoiceNote) { setMicMenuOpen((v) => !v); return; }
    startDictation();
  }

  async function postComment() {
    if (posting || (!draft.trim() && !voiceBlob)) return;
    setPosting(true);
    const headers = await authHeader();
    if (!headers.Authorization) { setPosting(false); alert("You need to be signed in to comment."); return; }
    try {
      const form = new FormData();
      form.set("artistSlug", artistSlug);
      form.set("postId", post.id);
      if (draft.trim()) form.set("body", draft.trim());
      if (voiceBlob) {
        const ext = voiceBlob.type.includes("mp4") ? "m4a" : voiceBlob.type.includes("wav") ? "wav" : voiceBlob.type.includes("ogg") ? "ogg" : "webm";
        form.set("audio", voiceBlob, `comment.${ext}`);
      }
      const res = await fetch("/api/social/comments", { method: "POST", headers, body: form });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setDraft("");
        discardVoice();
      } else {
        // BUG FIXED 2026-07-29 (reported live: "clicked Post, nothing
        // happens"): a non-ok response used to fall through with zero
        // feedback - the request could 500 and the member would have no
        // idea their comment never posted. Surface whatever the API says
        // went wrong.
        const data = await res.json().catch(() => null);
        alert(data?.error || "Couldn't post that comment. Try again in a moment.");
      }
    } catch {
      alert("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPosting(false);
    }
  }

  const caption = stripSignOff(post.text, name);
  const others = likers.filter((l) => l.name).slice(0, 3).map((l) => l.name).join(", ");

  return (
    <article className="sf-post">
      {post.mediaUrl && (
        <div className="sf-media">
          {post.type === "video" ? (
            <video src={post.mediaUrl} poster={post.thumb || undefined} controls playsInline preload="metadata" />
          ) : (
            <>
              <img src={post.mediaUrl} alt="" />
              {post.audioUrl && (
                <button
                  type="button"
                  className={`sf-preview-play${previewPlaying ? " sf-preview-playing" : ""}`}
                  aria-label={previewPlaying ? "Pause song preview" : "Play 30 second song preview"}
                  onClick={(e) => { e.stopPropagation(); togglePreview(); }}
                >
                  {previewPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
              )}
              {post.audioUrl && (
                <audio ref={previewAudioRef} src={post.audioUrl} preload="none" onEnded={() => setPreviewPlaying(false)} />
              )}
            </>
          )}
          {commentsOpen && (
            <div className="sf-comment-overlay">
              <div className="sf-comment-overlay-header">
                <span className="sf-comment-overlay-title">Comments</span>
                <button type="button" className="sf-comment-overlay-close" onClick={toggleCommentPanel} aria-label="Close comments" title="Close comments">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="sf-comment-overlay-body">
          {commentsLoading && <p className="sf-comment-loading">Loading comments...</p>}
          {!commentsLoading && comments.length > 0 && (
            <div className="sf-comment-list">
              {comments.map((c) => (
                <div key={c.id} className="sf-comment-row-item">
                  <div className="sf-avatar-init sf-comment-avatar" style={{ background: initialColor(c.name) }}>{c.name.charAt(0)}</div>
                  <div className="sf-comment-body">
                    <span className="sf-comment-name">{c.name}</span>
                    {c.body && <span className="sf-comment-text">{c.body}</span>}
                    {c.audioUrl && <FixedDurationAudio className="sf-comment-audio" src={c.audioUrl} />}
                  </div>
                  {/* Per Sean/V 2026-07-28: a member can delete their own
                      comment; admin can delete any comment. */}
                  {(isAdmin || c.userId === currentUserId) && (
                    <button
                      type="button"
                      className="sf-comment-delete"
                      onClick={() => deleteComment(c.id)}
                      disabled={deletingId === c.id}
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="sf-comment-row">
            <textarea
              className="sf-comment-input"
              rows={3}
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="sf-comment-actions-row">
              <div className="sf-mic-wrap">
                <button
                  type="button"
                  className={`sf-mic-btn${recording || dictating ? " sf-recording" : ""}`}
                  onClick={handleMicClick}
                  aria-label={canRecordVoiceNote ? "Dictate or record a voice comment" : "Dictate this comment"}
                  title={canRecordVoiceNote ? "Dictate or record a voice comment" : "Dictate this comment"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                </button>
                {/* Plus/Pro only: same mic icon, two distinct functions - typed
                    dictation into the box above, or an attached voice-note
                    recording (like Passport never sees this choice, they only
                    ever get dictation, so there's nothing to pick between). */}
                {micMenuOpen && (
                  <div className="sf-mic-menu">
                    <button type="button" onClick={() => { setMicMenuOpen(false); startDictation(); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>
                      Dictate
                    </button>
                    <button type="button" onClick={() => { setMicMenuOpen(false); startRecording(); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                      Record voice note
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className={`sf-comment-send${posting ? " sf-comment-send-busy" : ""}`} disabled={posting || (!draft.trim() && !voiceBlob)} onClick={postComment}>
                {posting ? (
                  <>
                    <svg className="sf-comment-send-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="9" strokeDasharray="40" strokeDashoffset="20" /></svg>
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
          {dictating && <div className="sf-rec-hint">Listening... tap the mic again to stop.</div>}
          {recording && <div className="sf-rec-hint">Recording... tap the mic again to stop.</div>}
          {voiceUrl && !recording && (
            <div className="sf-voice-note">
              <FixedDurationAudio src={voiceUrl} />
              <button type="button" className="sf-voice-discard" title="Discard" onClick={discardVoice}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="sf-header">
        {avatarUrl ? (
          <img className="sf-avatar" src={avatarUrl} alt={name} loading="lazy" decoding="async" />
        ) : (
          <div className="sf-avatar-init" style={{ background: initialColor(name) }}>{name.charAt(0)}</div>
        )}
        <div className="sf-who">
          <div className="sf-name">{name}</div>
          <div className="sf-time">{formatDate(post.timestamp)}</div>
        </div>
        {post.pinned && <div className="sf-pin">Pinned</div>}
      </div>

      {caption && <p className="sf-text">{caption}</p>}

      {count > 0 && (
        <div className="sf-liked-row">
          <div className="sf-liker-stack">
            {likers.slice(0, 3).map((l, i) => (
              <div key={l.userId} className="sf-liker-circle" style={{ background: initialColor(l.name || l.userId), zIndex: 3 - i }}>
                {(l.name || "?").charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <div className="sf-liked-text">
            {likedByMe ? (
              <>Liked by <strong>you</strong>{others ? `, ${others}` : ""}{count > (others ? 4 : 1) ? ` and ${count - (others ? 4 : 1)} others` : ""}</>
            ) : (
              <>{others ? <>Liked by {others}{count > 3 ? ` and ${count - 3} others` : ""}</> : <>{count} {count === 1 ? "like" : "likes"}</>}</>
            )}
          </div>
        </div>
      )}

      <div className="sf-interact-row">
        <button type="button" className={`sf-interact-btn${likedByMe ? " sf-like-active" : ""}`} onClick={toggleLike} disabled={likeBusy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
          {likedByMe ? "Liked" : "Like"}
        </button>
        <button type="button" className="sf-interact-btn" onClick={toggleCommentPanel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>
          Comment
        </button>
      </div>
    </article>
  );
}

export default function SocialFeed({ artistSlug, name, avatarUrl, posts, tierRank }: { artistSlug: string; name: string; avatarUrl?: string | null; posts: SocialFeedPost[]; tierRank?: number }) {
  if (!posts.length) {
    return <div className="pulse-empty"><p>Posts coming soon.</p></div>;
  }
  return (
    <div className="sf-feed">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} artistSlug={artistSlug} name={name} avatarUrl={avatarUrl} tierRank={tierRank} />
      ))}
    </div>
  );
}
