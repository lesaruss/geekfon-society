// Shapes for the Seat 2 Artists page (/roster) and artist pages (/<artist>),
// shared by the server loader (lib/server/artistPage.ts), the public APIs
// (/api/radio/roster, /api/radio/artist-page) and the client views.

export type StationChip = { slug: string; name: string; color: string | null; ink: string | null };

export type RosterArtist = {
  slug: string;
  name: string;
  genre: string | null;
  location: string | null;
  picture: string | null; // square-friendly picture for the card
  accent: string;
  ink: string;
  /** Genre stations the artist is on; empty means their home is GeekFon Radio. */
  stations: StationChip[];
  songCount: number;
};

export type RosterData = { complete: boolean; artists: RosterArtist[]; groups: StationChip[] };

export type ArtistSong = {
  id: string;
  title: string;
  durationSeconds: number | null;
  coverUrl: string | null;
  thumbUrl: string | null;
  isRemix: boolean;
  /** A released single (its full stream is public); everything else is vault audio. */
  single: boolean;
  /** Singles only: the public full stream, played on demand for supporters. */
  publicUrl: string | null;
};

export type PressItem = { slug: string | null; title: string; tag: string | null; date: string | null; blurb: string | null; thumb: string | null; href: string | null };

export type GalleryTile = { id: string; title: string | null; url: string; thumb: string | null; kind: string };

export type ArtistPageData = {
  /** false when the server could not reach the catalog; the page then asks the API. */
  complete: boolean;
  slug: string;
  name: string;
  tagline: string | null;
  bio: string[];
  quote: string | null;
  genre: string | null;
  location: string | null;
  pills: string[];
  accent: string;
  ink: string;
  cutout: string | null;
  portrait: string | null;
  avatar: string | null;
  videoThumb: string | null;
  songs: ArtistSong[];
  /** Every station the artist is heard on (GeekFon Radio first). */
  stations: StationChip[];
  /** The closest-sounding genre station, if any. */
  homeStation: StationChip | null;
  press: PressItem[];
  gallery: { items: GalleryTile[]; lockedCount: number };
  /** The album the $11 buys today; null sells the artist's season pass (same $11 unlock). */
  album: { id: string; title: string } | null;
};

/** Stored copy uses " - " as a break; plain copy reads it as a comma (no dashes in visible text). */
export function plainDashes(s: string): string {
  return s.replace(/\s+[-–—]\s+/g, ", ").replace(/[–—]/g, ", ");
}
