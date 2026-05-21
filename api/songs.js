'use strict';

// GET /api/songs?artist=<slug>
// Returns the tracks the requesting user can access based on their GFS tier.
//
// Tier access:
//   free (no auth)  - is_free_preview = true tracks only
//   passport        - released tracks (release_date <= now) for purchased artists
//   all-access      - released tracks for all artists
//   lifetime        - all tracks regardless of release_date

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function sbGet(path, key) {
  const res = await fetch(SUPABASE_URL + path, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
  });
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + path);
  return res.json();
}

async function getUserIdFromToken(token) {
  try {
    const data = await sbGet('/auth/v1/user', token);
    return data && data.id ? data.id : null;
  } catch (_) { return null; }
}

async function getGfsMember(userId) {
  try {
    const rows = await sbGet(
      '/rest/v1/gfs_members?select=tier,passport_artists,is_minor&user_id=eq.' + userId + '&limit=1',
      SUPABASE_SVC
    );
    return rows && rows[0] ? rows[0] : null;
  } catch (_) { return null; }
}

async function fetchTracks(artistSlug, extraClauses) {
  let path = '/rest/v1/radio_tracks?select=id,artist_slug,title,duration_seconds,src_path,thumb_path,embed_id,release_date,is_free_preview,sort_order&is_public=eq.true';
  if (artistSlug) path += '&artist_slug=eq.' + encodeURIComponent(artistSlug);
  if (extraClauses) path += '&' + extraClauses;
  path += '&order=artist_slug.asc,sort_order.asc';
  return sbGet(path, SUPABASE_SVC);
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers['cookie'] || '';
  const m = cookie.match(/sb-[^-]+-auth-token=([^;]+)/);
  if (m) {
    try {
      const parsed = JSON.parse(decodeURIComponent(m[1]));
      return parsed.access_token || null;
    } catch (_) { return m[1]; }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://geekfon.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const artistSlug = req.query.artist || null;

  try {
    const token = extractToken(req);
    let tier = 'free';
    let passportArtists = [];
    let isMinor = false;

    if (token) {
      const userId = await getUserIdFromToken(token);
      if (userId) {
        const member = await getGfsMember(userId);
        if (member) {
          tier = member.tier || 'free';
          passportArtists = member.passport_artists || [];
          isMinor = member.is_minor || false;
        }
      }
    }

    let tracks;
    const now = new Date().toISOString();

    if (tier === 'lifetime') {
      tracks = await fetchTracks(artistSlug, null);
    } else if (tier === 'all-access') {
      tracks = await fetchTracks(artistSlug, 'release_date=lte.' + now);
    } else if (tier === 'passport' && passportArtists.length > 0) {
      // Released tracks for purchased artists
      const inList = passportArtists.map(a => encodeURIComponent(a)).join(',');
      let path =
        '/rest/v1/radio_tracks?select=id,artist_slug,title,duration_seconds,src_path,thumb_path,embed_id,release_date,is_free_preview,sort_order' +
        '&is_public=eq.true' +
        '&release_date=lte.' + now +
        '&artist_slug=in.(' + inList + ')' +
        '&order=artist_slug.asc,sort_order.asc';
      if (artistSlug) path += '&artist_slug=eq.' + encodeURIComponent(artistSlug);
      tracks = await sbGet(path, SUPABASE_SVC);
    } else {
      // Free preview only
      tracks = await fetchTracks(artistSlug, 'is_free_preview=eq.true');
    }

    return res.status(200).json({ tier, tracks: tracks || [], passportArtists, isMinor });
  } catch (err) {
    console.error('songs API error:', err.message);
    return res.status(500).json({ error: 'Failed to load tracks' });
  }
};
