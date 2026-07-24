import ArtistPage from "@/components/ArtistPage";
import { notFound } from "next/navigation";
import type { ArtistContent } from "@/components/ArtistPage";

// 2026-07-24: forces this route out of Next.js's Full Route Cache. Without
// this, the custom domain (geekfon.ai) has been observed serving a stale
// compiled HTML document - referencing an OLD hashed CSS/JS chunk from a
// previous deployment - even when Vercel reports the newest deployment as
// READY and correctly aliased, and even though that same deployment's own
// *.vercel.app preview URL serves the current, correct chunk. This exact
// failure mode hit this same route before (breadcrumb prop bug, 2026-07-12);
// the underlying fetches already use { next: { revalidate: 0 } } to keep
// Supabase data fresh, but that only opts individual fetches out of the
// Data Cache, not the route's own Full Route Cache. force-dynamic disables
// route-level caching entirely so every request is rendered fresh.
export const dynamic = "force-dynamic";

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/";

const ARTIST_CITY: Record<string, { desktop: string; mobile: string }> = {
  "roxanne":             { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  "riku-hayasaka":       { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  "riku":                { desktop: CDN + "hf_20260619_061254_7c730145-acef-4518-a816-64c5846ffb1b.png", mobile: CDN + "hf_20260619_062028_83b5584e-2bc2-4879-ac28-ec59b79962f8.png" },
  "rustblood-prophets":  { desktop: CDN + "hf_20260619_061452_342ffc31-9332-438d-b032-c581bbfc5205.png", mobile: CDN + "hf_20260619_062309_26ba4c35-6221-47ff-844e-a8cab948cdab.png" },
  "lex-from-brixton":    { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png" },
  "lickle-sis":          { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "lickle-bro":          { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "mad-tings":           { desktop: CDN + "hf_20260619_060647_f5cc249a-0fe0-4f02-97a4-2a848334cf98.png", mobile: CDN + "hf_20260619_062128_cd958296-6f06-4efb-ad10-97306f3d2558.png" },
  "shamanic-resin":      { desktop: CDN + "hf_20260619_061116_c00ea5ca-cad0-4b95-b593-c9d5d4a7f654.png", mobile: CDN + "hf_20260619_062102_df16b724-a594-440e-a35d-3a96406fabf7.png" },
  "straight-and-narrow": { desktop: CDN + "hf_20260619_061001_82fbd428-6543-4a12-ba50-fe80d6255515.png", mobile: CDN + "hf_20260619_061949_d919c8f7-448a-48c4-aa18-a5487e4ae4a0.png" },
  "nilo-wave":           { desktop: CDN + "hf_20260619_125302_4c4f6747-3bcb-45b2-a743-610912078942.png", mobile: CDN + "hf_20260619_125452_ad933e6f-0b03-43a4-b111-341e76b9efd9.jpeg" },
  "lord-zorlot":         { desktop: CDN + "hf_20260620_234313_10dea700-d199-4e4a-bc73-0b276a46d266.png", mobile: CDN + "hf_20260620_234318_0c97a0f3-1396-4f24-9de7-327ccec5d0bf.png" },
};

type AuditRow = {
  doc_type: string;
  title: string;
  content: string;
  scores: Record<string, number>;
};

// Extract a single-line labeled value, stopping at pipe or newline
function extract(text: string, label: string): string | undefined {
  const rx = new RegExp(`^${label}:\\s*([^|\\n]+)`, "mi");
  const m = text.match(rx);
  return m ? m[1].trim() : undefined;
}

// Parse plain-text artist_brief into structured ArtistContent fields
function parseArtistBrief(text: string): Partial<ArtistContent> {
  const result: Partial<ArtistContent> = {};

  // Identity
  const identityEntries: Record<string, string> = {};
  const nameVal       = extract(text, "NAME");
  const nationality   = extract(text, "NATIONALITY");
  const base          = extract(text, "BASE");
  const professions   = extract(text, "PROFESSIONS");
  const affiliation   = extract(text, "AFFILIATION");
  const role          = extract(text, "ROLE");
  const statusVal     = extract(text, "STATUS");
  if (nameVal)      identityEntries["Name"]         = nameVal;
  if (nationality)  identityEntries["Nationality"]  = nationality;
  if (base)         identityEntries["Base"]         = base;
  if (professions)  identityEntries["Professions"]  = professions;
  if (affiliation)  identityEntries["Affiliation"]  = affiliation;
  if (role)         identityEntries["Role"]         = role;
  if (statusVal)    identityEntries["Status"]       = statusVal;
  if (Object.keys(identityEntries).length > 0) result.identity = identityEntries;

  // Brief / narrative
  const briefEntries: Record<string, string> = {};
  const highConcept      = extract(text, "HIGH CONCEPT");
  const strength         = extract(text, "GREATEST STRENGTH");
  const weakness         = extract(text, "GREATEST WEAKNESS");
  const wound            = extract(text, "DEFINING WOUND");
  const emotionalJourney = extract(text, "EMOTIONAL JOURNEY");

  // Multi-line blocks - read until next all-caps label or end
  function extractBlock(label: string): string | undefined {
    const rx = new RegExp(`^${label}:\\s*(.+?)(?=\\n[A-Z][A-Z\\s]+:|$)`, "ms");
    const m = text.match(rx);
    return m ? m[1].replace(/\s+/g, " ").trim() : undefined;
  }
  const lostSong         = extractBlock("THE LOST SONG ERA");
  const rikuConversation = extractBlock("THE RIKU CONVERSATION");

  if (highConcept)       briefEntries.highConcept       = highConcept;
  if (strength)          briefEntries.strength          = strength;
  if (weakness)          briefEntries.weakness          = weakness;
  if (wound)             briefEntries.wound             = wound;
  if (lostSong)          briefEntries.lostSong          = lostSong;
  if (rikuConversation)  briefEntries.rikuConversation  = rikuConversation;
  if (emotionalJourney)  briefEntries.emotionalJourney  = emotionalJourney;
  if (Object.keys(briefEntries).length > 0) result.brief = briefEntries;

  // Sonic DNA
  const vocalLine = text.match(/VOCAL IDENTITY:\s*(.+)/i);
  const genreLine = text.match(/GENRE IDENTITY:\s*(.+)/i);
  if (vocalLine || genreLine) {
    const sonic: ArtistContent["sonic"] = {};
    if (vocalLine) {
      const vt = vocalLine[1];
      const ageM     = vt.match(/Age Perception:\s*([^.]+)/i);
      const toneM    = vt.match(/Tone:\s*([^.]+)/i);
      const energyM  = vt.match(/Energy:\s*([^.]+)/i);
      const textureM = vt.match(/Texture:\s*([^.]+)/i);
      if (ageM) sonic.vocalAge = ageM[1].trim();
      const toneParts = [
        toneM    ? "Tone: "    + toneM[1].trim()    : null,
        energyM  ? "Energy: "  + energyM[1].trim()  : null,
        textureM ? "Texture: " + textureM[1].trim()  : null,
      ].filter(Boolean);
      if (toneParts.length > 0) sonic.tone = toneParts.join(". ");
      // delivery = sentence fragments after the structured descriptors
      const deliveryRaw = vt.split(".").slice(4).join(".").trim();
      if (deliveryRaw) sonic.delivery = deliveryRaw;
    }
    if (genreLine) {
      const gt = genreLine[1];
      const primaryM   = gt.match(/Primary:\s*([^.]+)/i);
      const secondaryM = gt.match(/Secondary:\s*([^.]+)/i);
      if (primaryM)   sonic.primaryGenre   = primaryM[1].replace(/\.$/, "").trim();
      if (secondaryM) sonic.secondaryGenre = secondaryM[1].replace(/\.$/, "").trim();
    }
    if (Object.keys(sonic).length > 0) result.sonic = sonic;
  }

  // Relationships
  const relSection = text.match(/RELATIONSHIPS:\n([\s\S]*?)(?:\n[A-Z][A-Z\s]+:|$)/);
  if (relSection) {
    const rels = relSection[1]
      .split("\n")
      .filter(l => l.trim().startsWith("-"))
      .map(l => {
        const t = l.replace(/^-\s*/, "");
        const ci = t.indexOf(":");
        if (ci === -1) return null;
        return { name: t.slice(0, ci).trim(), desc: t.slice(ci + 1).trim() };
      })
      .filter((r): r is { name: string; desc: string } => r !== null);
    if (rels.length > 0) result.relationships = rels;
  }

  return result;
}

// Map song_audit rows to ArtistContent.songAudits
function mapSongAudits(rows: AuditRow[]): NonNullable<ArtistContent["songAudits"]> {
  return rows.map(row => {
    // "Song Title — Artist Name — Song Audit" -> "Song Title"
    const cleanTitle = row.title.split(" — ")[0].trim();

    const statusM = row.content.match(/^STATUS:\s*(.+)/im);
    const themeM  = row.content.match(/^CORE THEME:\s*(.+)/im);
    const emotionM = row.content.match(/^PRIMARY EMOTION:\s*(.+)/im);

    let status: string | undefined;
    let pillar: string | undefined;
    if (statusM) {
      status = statusM[1].split(/[.,]/)[0].trim();
      const pillarM = statusM[1].match(/Pillar:\s*([^.]+)/i);
      if (pillarM) pillar = pillarM[1].trim();
    }
    const theme   = themeM   ? themeM[1].split(".")[0].trim()   : undefined;
    const emotion = emotionM ? emotionM[1].split(".")[0].trim() : undefined;

    return { title: cleanTitle, status, pillar, theme, emotion, scores: row.scores };
  });
}

async function getArtist(slug: string): Promise<ArtistContent | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const opts = { headers, next: { revalidate: 0 } } as RequestInit & { next: { revalidate: number } };

  // Fetch profile, audits, and active ads in parallel
  const [profileRes, auditsRes, adsRes] = await Promise.all([
    fetch(
      `${url}/rest/v1/gfs_artists?slug=eq.${encodeURIComponent(slug)}&select=name,profile&limit=1`,
      opts
    ),
    fetch(
      `${url}/rest/v1/gfs_anr_audits?artist_slug=eq.${encodeURIComponent(slug)}&select=doc_type,title,content,scores&order=doc_type.asc,title.asc`,
      opts
    ),
    fetch(
      `${url}/functions/v1/ad-resolve?brand_slug=geekfon-society&page_slug=${encodeURIComponent('/[artist]')}`,
      opts
    ),
  ]);

  if (!profileRes.ok) return null;
  const rows = await profileRes.json();
  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  const profile: ArtistContent = { ...(row.profile || {}) };
  if (!profile.name) profile.name = row.name;

  // Merge ANR data
  if (auditsRes.ok) {
    const auditRows: AuditRow[] = await auditsRes.json();

    // Parse artist brief -> identity, brief narrative, sonic DNA, relationships
    const briefRow = auditRows.find(
      r => r.doc_type === "artist_brief" || r.doc_type === "character_bible"
    );
    if (briefRow?.content) {
      const parsed = parseArtistBrief(briefRow.content);
      if (!profile.identity    && parsed.identity)    profile.identity    = parsed.identity;
      if (!profile.brief       && parsed.brief)       profile.brief       = parsed.brief;
      if (!profile.sonic       && parsed.sonic)       profile.sonic       = parsed.sonic;
      if (!profile.relationships && parsed.relationships) profile.relationships = parsed.relationships;
    }

    // Song audits -> Brief tab audit cards
    const songRows = auditRows.filter(r => r.doc_type === "song_audit");
    if (songRows.length > 0 && !(profile.songAudits?.length)) {
      profile.songAudits = mapSongAudits(songRows);
    }

    // Derive track stubs from song audits when no tracks in profile
    if ((!profile.tracks || profile.tracks.length === 0) && songRows.length > 0) {
      profile.tracks = songRows.map(r => ({
        n: r.title.split(" — ")[0].trim(),
        m: "Season 1",
        v: "members" as const,
      }));
    }
  }

  // Merge ad-resolve slots (real Ad Console inventory - replaces gfs_active_ads 2026-07-19)
  if (adsRes && adsRes.ok) {
    const adData: { slots?: { slot_id: string; image_url: string | null; link_url: string | null; placement_id: string; campaign_id: string | null }[] } = await adsRes.json();
    const slots = adData.slots || [];
    for (const s of slots) {
      if (!s.image_url || !s.campaign_id) continue;
      if (s.slot_id === "gfs-artist-primary-ad")  { profile.primaryAdUrl  = s.image_url; profile.primaryAdLink  = s.link_url || undefined; profile.primaryAdPlacementId  = s.placement_id; profile.primaryAdCampaignId  = s.campaign_id; }
      if (s.slot_id === "gfs-artist-feature-ad")  { profile.featureAdUrl  = s.image_url; profile.featureAdLink  = s.link_url || undefined; profile.featureAdPlacementId  = s.placement_id; profile.featureAdCampaignId  = s.campaign_id; }
      if (s.slot_id === "gfs-artist-skyscraper")  { profile.skyscraperUrl = s.image_url; profile.skyscraperLink = s.link_url || undefined; profile.skyscraperPlacementId = s.placement_id; profile.skyscraperCampaignId = s.campaign_id; }
    }
  }

  return profile;
}

type Props = { params: Promise<{ artist: string }> };

export default async function ArtistPageRoute({ params }: Props) {
  const { artist: slug } = await params;
  const content = await getArtist(slug);
  if (!content) notFound();
  const cityBg = ARTIST_CITY[slug] ?? null;
  return <ArtistPage content={content} cityBg={cityBg} slug={slug} />;
}

export async function generateMetadata({ params }: Props) {
  const { artist: slug } = await params;
  const content = await getArtist(slug);
  const name = content?.name || slug;
  return {
    title: `${name} - GeekFon Society`,
    description: content?.tagline || `${name} is an original artist on GeekFon Society.`,
  };
}




