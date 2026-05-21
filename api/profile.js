'use strict';

// POST /api/profile
// Authorization: Bearer <supabase_access_token>
//
// Called by /dashboard on first load after magic-link auth.
// Finds the matching gfs_pending_profiles row by email, merges
// name/dob/tos_agreed_at into gfs_members, upserts the member row,
// then deletes the pending row.
//
// Idempotent: safe to call multiple times. If no pending row exists,
// returns the existing member row.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbGet(path) {
  const res = await fetch(SUPABASE_URL + path, {
    headers: { apikey: SUPABASE_SVC, Authorization: 'Bearer ' + SUPABASE_SVC },
  });
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + path);
  return res.json();
}

async function getUser(token) {
  const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_SVC, Authorization: 'Bearer ' + token },
  });
  if (!res.ok) return null;
  return res.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://geekfon.ai');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Extract token
  const auth = req.headers.authorization || '';
  let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    const cookies = req.headers.cookie || '';
    const m = cookies.match(/gfs_token=([^;]+)/);
    if (m) token = m[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = await getUser(token);
    if (!user || !user.id) return res.status(401).json({ error: 'Invalid token' });

    const userId = user.id;
    const email = (user.email || '').toLowerCase();

    // Look for pending profile
    const pending = await sbGet(
      '/rest/v1/gfs_pending_profiles?email=eq.' + encodeURIComponent(email) + '&limit=1&order=created_at.desc'
    );

    // Get existing member row if any
    const existing = await sbGet(
      '/rest/v1/gfs_members?user_id=eq.' + userId + '&limit=1'
    );
    const member = existing && existing[0] ? existing[0] : null;

    let profileData = {};
    if (pending && pending[0]) {
      const p = pending[0];
      profileData = {
        name: p.name,
        dob: p.dob,
        tos_agreed_at: p.tos_agreed_at,
        // Only upgrade tier, never downgrade
        tier: upgradeTier(member ? member.tier : 'free', p.tier),
      };
    }

    // Upsert gfs_members
    const upsertBody = Object.assign(
      { user_id: userId, tier: member ? member.tier : 'free' },
      profileData
    );

    const upsertRes = await fetch(SUPABASE_URL + '/rest/v1/gfs_members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SVC,
        Authorization: 'Bearer ' + SUPABASE_SVC,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(upsertBody),
    });

    if (!upsertRes.ok) {
      const err = await upsertRes.text();
      console.error('gfs_members upsert error:', err);
      return res.status(500).json({ error: 'Could not save profile' });
    }

    const upserted = await upsertRes.json();
    const finalMember = Array.isArray(upserted) ? upserted[0] : upserted;

    // Delete pending row if it existed
    if (pending && pending[0]) {
      await fetch(SUPABASE_URL + '/rest/v1/gfs_pending_profiles?email=eq.' + encodeURIComponent(email), {
        method: 'DELETE',
        headers: { apikey: SUPABASE_SVC, Authorization: 'Bearer ' + SUPABASE_SVC },
      });
    }

    return res.json({ ok: true, member: finalMember });
  } catch (err) {
    console.error('profile error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Tier order for upgrade check
const TIER_ORDER = { free: 0, passport: 1, 'all-access': 2, lifetime: 3 };
function upgradeTier(current, incoming) {
  const c = TIER_ORDER[current] !== undefined ? TIER_ORDER[current] : 0;
  const i = TIER_ORDER[incoming] !== undefined ? TIER_ORDER[incoming] : 0;
  return i > c ? incoming : current;
}
