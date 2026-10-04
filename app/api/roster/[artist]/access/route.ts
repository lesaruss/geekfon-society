// GET /api/roster/<artist>/access   (Authorization: Bearer <supabase token>)
//
// Everything on an artist's public roster that only a supporter may have,
// decided on the server. The page renders the free view (singles in full,
// 30-second previews, Identity card); this route upgrades it for a viewer
// who is entitled:
//   - supporter of this artist (or Lifetime): signed full streams + lyrics
//     for every vault song, downloads where the purchase includes them, and
//     the full fan Bible;
//   - not a supporter but owns individual songs (LESARs): full streams for
//     just those songs.
// A visitor with no session gets { supporter: false } and nothing else.
// Signed URLs are short-lived and per request; no vault path is returned.

import { NextRequest, NextResponse } from "next/server";
import { loadArtistRows, accessOf } from "@/lib/server/depot";
import { signStream } from "@/lib/server/depot";
import { viewerFromRequest, entitlementFor } from "@/lib/server/entitlements";
import { loadFanBible } from "@/lib/server/bible";
import { loadGallery } from "@/lib/server/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Long enough to cover a listening session (seeking re-requests the same
// URL), short enough that a copied link goes stale the same day.
const STREAM_TTL_SECONDS = 6 * 60 * 60;

type SongGrant = {
  stream: string;
  download?: string;
  lyricsEn: string | null;
  lyricsOriginal: string | null;
  lyricsOriginalLang: string | null;
};

function fileName(artist: string, title: string): string {
  return `${artist} - ${title}.mp3`.replace(/[\\/:*?"<>|]+/g, "");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ artist: string }> }) {
  const { artist } = await params;
  const noStore = { "Cache-Control": "private, no-store" };

  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ signedIn: false, supporter: false, songs: {} }, { headers: noStore });

  const ent = await entitlementFor(viewer, artist);
  const { rows, rule } = await loadArtistRows(artist, true);

  const grantRows = rows.filter(r => {
    if (!r.src_path || accessOf(r, rule) === "single") return false;
    return ent.supporter || ent.ownedTitles.has(r.title);
  });

  const songs: Record<string, SongGrant> = {};
  await Promise.all(
    grantRows.map(async r => {
      const owned = ent.ownedTitles.has(r.title);
      const [stream, download] = await Promise.all([
        signStream(r.src_path!, STREAM_TTL_SECONDS),
        ent.download || owned ? signStream(r.src_path!, STREAM_TTL_SECONDS, fileName(artist, r.title)) : Promise.resolve(null),
      ]);
      if (!stream) return;
      songs[r.id] = {
        stream,
        ...(download ? { download } : {}),
        lyricsEn: r.lyrics_en,
        lyricsOriginal: r.lyrics_original,
        lyricsOriginalLang: r.lyrics_original_lang,
      };
    })
  );

  // Downloads of public singles for supporters with download rights.
  const downloads: Record<string, string> = {};
  if (ent.download) {
    await Promise.all(
      rows
        .filter(r => r.src_path && accessOf(r, rule) === "single")
        .map(async r => {
          const d = await signStream(r.src_path!, STREAM_TTL_SECONDS, fileName(artist, r.title));
          if (d) downloads[r.id] = d;
        })
    );
  }

  const [bible, gallery] = await Promise.all([
    ent.supporter ? loadFanBible(artist, { full: true }) : Promise.resolve(undefined),
    // Signed-in non-supporters get only what the page already shows; no need to re-sign.
    ent.supporter ? loadGallery(artist, ent.reason === "staff" ? "admin" : "supporter") : Promise.resolve(undefined),
  ]);

  return NextResponse.json(
    {
      signedIn: true,
      supporter: ent.supporter,
      allArtists: ent.allArtists,
      reason: ent.reason,
      download: ent.download,
      songs,
      downloads,
      staff: ent.reason === "staff",
      ...(bible ? { bible } : {}),
      ...(gallery ? { gallery } : {}),
    },
    { headers: noStore }
  );
}
