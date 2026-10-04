// What a signed-out visitor sees on any roster tab other than Discography
// (2026-10-04, Sean: visitors get a preview; the artist's world opens up
// once they sign in, and fully once they support).
import "./roster.css";

const COPY: Record<string, string> = {
  pulse: "news and stories",
  social: "posts",
  gallery: "wallpapers and art",
  chat: "chat",
  bible: "story and world",
  members: "band",
};

export default function SignInGate({ artistName, tab }: { artistName: string; tab: string }) {
  const redirect = typeof window !== "undefined" ? window.location.pathname + `?tab=${tab}` : "";
  return (
    <section className="rs-gate">
      <div className="rs-gate-title">Sign in to step into {artistName}&apos;s world</div>
      <p className="rs-gate-sub">
        {artistName}&apos;s {COPY[tab] || "page"} {tab === "chat" || tab === "gallery" ? "opens" : "open"} up with a free GeekFon account.
        The music is right here in the Discography, free to preview.
      </p>
      <div className="rs-gate-actions">
        <a className="rs-cta" href={`/register?redirect=${encodeURIComponent(redirect)}`}>Create a free account</a>
        <a className="rs-link" href={`/login?redirect=${encodeURIComponent(redirect)}`}>I have an account</a>
      </div>
    </section>
  );
}
