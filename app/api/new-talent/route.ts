// New Talent submissions (/new-talent). Checks every field again on the server and
// writes one row to gfs_new_talent_submissions (service role only; RLS on, no policies).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type SongIn = { title?: unknown; kind?: unknown; path?: unknown; url?: unknown };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isHttps = (v: string) => { try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; } };
const PATH_RE = /^gfs-new-talent\/\d{4}-\d{2}-\d{2}\/\d+-[a-z0-9]+\.(mp3|wav|m4a|aac|flac)$/;

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (str(b.website, 200)) return NextResponse.json({ ok: true }); // honeypot: bots fill it, people never see it

    const artist_name = str(b.artistName, 120);
    const contact_name = str(b.contactName, 120);
    const email = str(b.email, 200).toLowerCase();
    const city = str(b.city, 120);
    const genre = str(b.genre, 80);
    const bio = str(b.bio, 1500);
    const links = str(b.links, 1000);
    if (!artist_name || !contact_name || !genre) return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ error: "Please check your email address." }, { status: 400 });
    if (b.ownsRights !== true || b.permissionToPlay !== true) return NextResponse.json({ error: "Please confirm both boxes to send." }, { status: 400 });

    const rawSongs: SongIn[] = Array.isArray(b.songs) ? b.songs.slice(0, 3) : [];
    const songs = rawSongs.map(s => {
      const title = str(s.title, 160);
      if (!title) return null;
      if (s.kind === "file") { const path = str(s.path, 300); return PATH_RE.test(path) ? { title, kind: "file", path } : null; }
      if (s.kind === "link") { const url = str(s.url, 500); return isHttps(url) ? { title, kind: "link", url } : null; }
      return null;
    });
    if (!songs.length || songs.some(s => !s)) return NextResponse.json({ error: "Each song needs a title and a file or a link." }, { status: 400 });

    const sb = createClient(SUPA_URL, SUPA_SERVICE_KEY);
    const { error } = await sb.from("gfs_new_talent_submissions").insert({
      artist_name, contact_name, email, city: city || null, genre, bio: bio || null, links: links || null,
      songs, owns_rights: true, permission_to_play: true, status: "pending",
    });
    if (error) {
      console.error("new-talent insert error:", error);
      return NextResponse.json({ error: "We could not save that. Try again in a minute." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("new-talent route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
