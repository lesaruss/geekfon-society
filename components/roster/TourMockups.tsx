"use client";
// Screens for the Support tour (2026-10-04, Sean: fill the space and show
// people what they actually get for $11, framed like screenshots on a laptop
// or phone, not a list). Built in HTML so they always match the live data:
// real covers, track names, posts, stations and story sections. Features not
// live yet (Chat, the Gallery's wallpapers) are labelled Preview by the tour.
import type { PublicAlbum, PublicSong } from "@/lib/server/depot";
import type { RadioStation } from "@/lib/server/radio";
import "./storefront.css";

export function BrowserFrame({ url, children, dark }: { url: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={"mk-browser" + (dark ? " mk-dark" : "")}>
      <div className="mk-bar"><i /><i /><i /><span>{url}</span></div>
      <div className="mk-screen">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={"mk-phone " + (className || "")}><div className="mk-notch" />{children}</div>;
}

function Eq() {
  return <span className="mk-eq" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export function AlbumScreen({ artist, slug, album, songs }: { artist: string; slug: string; album: PublicAlbum; songs: PublicSong[] }) {
  const playing = 1;
  return (
    <BrowserFrame url={`geekfon.ai/${slug}`}>
      <div className="mk-album">
        <div className="mk-album-art">
          {album.coverUrl && <img src={album.coverUrl} alt="" />}
          <div className="mk-album-meta"><span>Album</span><strong>{album.title}</strong><em>{artist}</em></div>
        </div>
        <ol className="mk-tracks">
          {songs.slice(0, 7).map((s, i) => (
            <li key={s.id} className={i === playing ? "on" : ""}>
              <span className="mk-n">{i === playing ? <Eq /> : i + 1}</span>
              {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <b />}
              <span className="mk-t">{s.title}</span>
              <span className="mk-full">Full</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mk-player">
        {songs[playing]?.coverUrl && <img src={songs[playing].coverUrl!} alt="" />}
        <div><strong>{songs[playing]?.title}</strong><span>{artist} · full song</span><div className="mk-prog"><i style={{ width: "46%" }} /></div></div>
      </div>
    </BrowserFrame>
  );
}

export type MockPost = { text?: string; title?: string; thumb?: string; date?: string };

export function FeedScreen({ artist, avatar, posts, images }: { artist: string; avatar: string | null; posts: MockPost[]; images: string[] }) {
  const cards = [0, 1, 2].map(i => {
    const p = posts[i];
    return { text: p?.title || p?.text || ["Studio night. Something new is coming.", "Thank you for every message this week.", "Outfit check before rehearsal."][i], img: p?.thumb || images[i] || null, date: p?.date || ["Today", "Yesterday", "This week"][i] };
  });
  return (
    <div className="mk-feed-wrap">
      <PhoneFrame>
        <div className="mk-feed">
          <div className="mk-feed-head">Pulse</div>
          {cards.slice(0, 2).map((c, i) => (
            <div key={i} className="mk-post">
              <div className="mk-post-who">{avatar && <img src={avatar} alt="" />}<div><strong>{artist}</strong><span>{c.date}</span></div></div>
              {c.img && <img className="mk-post-img" src={c.img} alt="" />}
              <p>{c.text.slice(0, 90)}</p>
              <div className="mk-post-acts"><span>♥ 248</span><span>💬 31</span></div>
            </div>
          ))}
        </div>
      </PhoneFrame>
      <div className="mk-feed-side">
        {cards.map((c, i) => (
          <div key={i} className="mk-mini">
            {c.img && <img src={c.img} alt="" />}
            <div><strong>{artist}</strong><span>{c.text.slice(0, 60)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GalleryScreen({ slug, images, wallpaper }: { slug: string; images: string[]; wallpaper: string | null }) {
  return (
    <div className="mk-gallery-wrap">
      <BrowserFrame url={`geekfon.ai/${slug}?tab=gallery`}>
        <div className="mk-gallery">
          {images.slice(0, 10).map((u, i) => <img key={i} src={u} alt="" className={i === 0 ? "big" : ""} />)}
        </div>
      </BrowserFrame>
      <PhoneFrame className="mk-lock">
        {wallpaper && <img src={wallpaper} alt="" />}
        <div className="mk-clock">9:41<span>Saturday</span></div>
      </PhoneFrame>
    </div>
  );
}

export type MockChat = { room: string; me: string; people: Record<string, { name: string; avatar: string | null }>; lines: { from: string; text: string }[] };

export function ChatScreen({ artist, chat }: { artist: string; chat: MockChat }) {
  return (
    <BrowserFrame url="geekfon.ai/chat" dark>
      <div className="mk-chat">
        <aside>
          <div className="mk-chat-room on"># {chat.room}</div>
          {Object.entries(chat.people).filter(([k]) => k !== chat.me).map(([k, v]) => (
            <div key={k} className="mk-chat-person">{v.avatar ? <img src={v.avatar} alt="" /> : <b />}{v.name}</div>
          ))}
        </aside>
        <div className="mk-chat-main">
          <div className="mk-chat-top"># {chat.room}<span>{artist}&apos;s view · today&apos;s episode</span></div>
          <div className="mk-chat-body">
            {chat.lines.map((ln, n) => {
              const who = chat.people[ln.from];
              const me = ln.from === chat.me;
              return (
                <div key={n} className={"mk-msg" + (me ? " me" : "")}>
                  {!me && (who?.avatar ? <img src={who.avatar} alt="" /> : <b />)}
                  <div>{!me && <span>{who?.name || ln.from}</span>}<p>{ln.text}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function RadioScreen({ artist, song, stations, active }: { artist: string; song: string; stations: RadioStation[]; active: string }) {
  return (
    <BrowserFrame url={`geekfon.ai/radio?station=${active}`} dark>
      <div className="mk-radio">
        <div className="mk-radio-btn">
          <img src="/geekfon-logo.png" alt="" />
          <span className="mk-ring" /><span className="mk-ring r2" />
        </div>
        <div className="mk-radio-np">
          <span className="mk-live"><i /> Now playing · live worldwide</span>
          <strong>{song}</strong>
          <em>{artist}</em>
          <div className="mk-prog"><i style={{ width: "38%" }} /></div>
        </div>
        <div className="mk-radio-stations">
          {stations.slice(0, 5).map(st => <span key={st.slug} className={st.slug === active ? "on" : ""}>{st.name}</span>)}
        </div>
      </div>
    </BrowserFrame>
  );
}

export function StoryScreen({ artist, slug, labels, portrait }: { artist: string; slug: string; labels: string[]; portrait: string | null }) {
  const cards = (labels.length ? labels : ["Backstory", "Lore", "Relationships", "Timeline", "Voice", "Visual identity"]).slice(0, 6);
  return (
    <BrowserFrame url={`geekfon.ai/${slug}?tab=bible`}>
      <div className="mk-story">
        <div className="mk-story-head">
          {portrait && <img src={portrait} alt="" />}
          <div><span>The Bible</span><strong>{artist}</strong><em>Every chapter of her story, unlocked</em></div>
        </div>
        <div className="mk-story-grid">
          {cards.map((l, i) => (
            <div key={l} className={"mk-story-card" + (i === 0 ? " open" : "")}>
              <strong>{l}<span>{i === 0 ? "Reading" : "🔓"}</span></strong>
              <i /><i /><i style={{ width: "86%" }} /><i /><i style={{ width: "72%" }} /><i style={{ width: "40%" }} />
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}
