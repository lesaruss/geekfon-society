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

type Liker = { userId: string; name: string | null };
type Comment = { id: string; name: string; body: string | null; audioUrl: string | null; createdAt: string };

export function PostCard({ post, artistSlug, name, avatarUrl }: { post: SocialFeedPost; artistSlug: string; name: string; avatarUrl?: string | null }) {
  const [count, setCount] = useState<number>(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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

  async function postComment() {
    if (posting || (!draft.trim() && !voiceBlob)) return;
    setPosting(true);
    const headers = await authHeader();
    if (!headers.Authorization) { setPosting(false); return; }
    try {
      const form = new FormData();
      form.set("artistSlug", artistSlug);
      form.set("postId", post.id);
      if (draft.trim()) form.set("body", draft.trim());
      if (voiceBlob) form.set("audio", voiceBlob, "comment.webm");
      const res = await fetch("/api/social/comments", { method: "POST", headers, body: form });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setDraft("");
        discardVoice();
      }
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
            <img src={post.mediaUrl} alt="" />
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

      {commentsOpen && (
        <div className="sf-comment-box">
          {commentsLoading && <p className="sf-comment-loading">Loading comments...</p>}
          {!commentsLoading && comments.length > 0 && (
            <div className="sf-comment-list">
              {comments.map((c) => (
                <div key={c.id} className="sf-comment-row-item">
                  <div className="sf-avatar-init sf-comment-avatar" style={{ background: initialColor(c.name) }}>{c.name.charAt(0)}</div>
                  <div className="sf-comment-body">
                    <span className="sf-comment-name">{c.name}</span>
                    {c.body && <span className="sf-comment-text">{c.body}</span>}
                    {c.audioUrl && <audio className="sf-comment-audio" controls src={c.audioUrl} />}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sf-comment-row">
            <input
              className="sf-comment-input"
              type="text"
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              className={`sf-mic-btn${recording ? " sf-recording" : ""}`}
              onClick={recording ? stopRecording : startRecording}
              aria-label="Record a voice comment"
              title="Record a voice comment"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            </button>
            <button type="button" className="sf-comment-send" disabled={posting || (!draft.trim() && !voiceBlob)} onClick={postComment}>
              Post
            </button>
          </div>
          {recording && <div className="sf-rec-hint">Recording... tap the mic again to stop.</div>}
          {voiceUrl && !recording && (
            <div className="sf-voice-note">
              <audio controls src={voiceUrl} />
              <button type="button" className="sf-voice-discard" title="Discard" onClick={discardVoice}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function SocialFeed({ artistSlug, name, avatarUrl, posts }: { artistSlug: string; name: string; avatarUrl?: string | null; posts: SocialFeedPost[] }) {
  if (!posts.length) {
    return <div className="pulse-empty"><p>Posts coming soon.</p></div>;
  }
  return (
    <div className="sf-feed">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} artistSlug={artistSlug} name={name} avatarUrl={avatarUrl} />
      ))}
    </div>
  );
}
