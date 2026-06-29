'use strict';

// POST /api/register
// Body: { name, dob, email, tos }
//
// 1. Validates DOB - blocks under-13 (COPPA), flags under-18
// 2. Saves to gfs_pending_profiles
// 3. Sends Supabase magic link -> emailRedirectTo: /dashboard
//
// After the user clicks the magic link, /api/profile merges
// gfs_pending_profiles into gfs_members.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;

const VALID_TIERS = new Set(['free', 'passport', 'all-access', 'lifetime']);

function calcAge(dob) {
  const now = new Date();
  const birth = new Date(dob);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://geekfon.ai');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { name, dob, email, tos, tier = 'free' } = body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!dob) return res.status(400).json({ error: 'Date of birth is required' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (!tos) return res.status(400).json({ error: 'You must agree to the Terms of Service' });
  if (!VALID_TIERS.has(tier)) return res.status(400).json({ error: 'Invalid tier' });

  const age = calcAge(dob);
  if (age < 13) {
    return res.status(403).json({ error: 'You must be 13 or older to join GeekFon Society.' });
  }

  const isMinor = age < 18;

  try {
    // Save pending profile (anon insert via service key to bypass RLS for validation)
    const insertRes = await fetch(SUPABASE_URL + '/rest/v1/gfs_pending_profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SVC,
        Authorization: 'Bearer ' + SUPABASE_SVC,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        dob,
        tier,
        tos_agreed_at: new Date().toISOString(),
        is_minor: isMinor,
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('pending_profiles insert error:', err);
      return res.status(500).json({ error: 'Could not save registration' });
    }

    // Send the GeekFon-branded magic link via Resend (gfs-auth-email function).
    // Pending profile is already saved above, so we just trigger the branded send.
    const magicRes = await fetch(SUPABASE_URL + '/functions/v1/gfs-auth-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'login', email: email.toLowerCase().trim() }),
    });

    if (!magicRes.ok) {
      const err = await magicRes.text();
      console.error('branded magic link error:', err);
      return res.status(500).json({ error: 'Could not send confirmation email' });
    }

    return res.json({ ok: true, minor: isMinor });
  } catch (err) {
    console.error('register error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
