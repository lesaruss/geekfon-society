'use strict';

// POST /api/webhook
// Listens for Stripe checkout.session.completed events.
// On success: upserts a gfs_members row with the correct tier.
// Passport tier: appends purchased artist slugs to passport_artists[].

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ---------------------------------------------------------------------------
// Supabase helpers (service role)
// ---------------------------------------------------------------------------

async function sbReq(method, path, body) {
  const res = await fetch(SUPABASE_URL + path, {
    method,
    headers: {
      apikey:          SUPABASE_SVC,
      Authorization:   'Bearer ' + SUPABASE_SVC,
      'Content-Type':  'application/json',
      Prefer:          'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + text);
  return text ? JSON.parse(text) : null;
}

async function getOrCreateGfsMember(userId, stripeCustomerId) {
  // Try to get existing row
  const rows = await sbReq(
    'GET',
    '/rest/v1/gfs_members?select=id,tier,passport_artists&user_id=eq.' + userId + '&limit=1'
  );
  if (rows && rows[0]) return rows[0];

  // Create fresh member row at free tier
  const created = await sbReq('POST', '/rest/v1/gfs_members', {
    user_id:            userId,
    tier:               'free',
    stripe_customer_id: stripeCustomerId,
    passport_artists:   [],
  });
  return created && created[0] ? created[0] : null;
}

async function setTier(userId, tier, stripeCustomerId) {
  await sbReq(
    'PATCH',
    '/rest/v1/gfs_members?user_id=eq.' + userId,
    { tier, stripe_customer_id: stripeCustomerId }
  );
}

async function appendPassportArtists(userId, artists) {
  if (!artists || artists.length === 0) return;
  // Use Postgres array concatenation via RPC or raw SQL via execute_sql is not available here.
  // Instead: read current array, merge, write back.
  const rows = await sbReq(
    'GET',
    '/rest/v1/gfs_members?select=passport_artists&user_id=eq.' + userId + '&limit=1'
  );
  const current = (rows && rows[0] && rows[0].passport_artists) || [];
  const merged  = Array.from(new Set([...current, ...artists]));
  await sbReq(
    'PATCH',
    '/rest/v1/gfs_members?user_id=eq.' + userId,
    { passport_artists: merged }
  );
}

// ---------------------------------------------------------------------------
// Resolve Stripe customer email -> Supabase auth user_id
// ---------------------------------------------------------------------------

async function getUserIdByEmail(email) {
  // Look up in Supabase Auth admin API
  const res = await fetch(
    SUPABASE_URL + '/auth/v1/admin/users?email=' + encodeURIComponent(email),
    {
      headers: {
        apikey:       SUPABASE_SVC,
        Authorization: 'Bearer ' + SUPABASE_SVC,
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const users = data.users || (Array.isArray(data) ? data : []);
  return users.length > 0 ? users[0].id : null;
}

// ---------------------------------------------------------------------------
// Raw body capture (required for Stripe signature verification)
// ---------------------------------------------------------------------------

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let event;

  if (WEBHOOK_SECRET) {
    try {
      const rawBody = await getRawBody(req);
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  } else {
    // No secret configured - accept body as-is (dev/test only)
    event = req.body;
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session    = event.data.object;
  const metadata   = session.metadata || {};
  const tier       = metadata.tier;
  const artistsRaw = metadata.artists || '';
  const customerId = session.customer;
  const email      = session.customer_details && session.customer_details.email;

  if (!tier || !email) {
    console.error('Webhook: missing tier or email in session', session.id);
    return res.status(200).json({ received: true });
  }

  try {
    const userId = await getUserIdByEmail(email);

    if (!userId) {
      // User has not created an account yet. Log for deferred provisioning.
      console.warn('Webhook: no Supabase user for email ' + email + ', tier=' + tier);
      // Could queue here; for now, return success so Stripe does not retry.
      return res.status(200).json({ received: true, note: 'no_user_yet' });
    }

    await getOrCreateGfsMember(userId, customerId);

    if (tier === 'passport') {
      // Ensure tier is at least passport (do not downgrade lifetime)
      const rows = await sbReq(
        'GET',
        '/rest/v1/gfs_members?select=tier&user_id=eq.' + userId + '&limit=1'
      );
      const currentTier = rows && rows[0] ? rows[0].tier : 'free';
      if (currentTier !== 'lifetime') {
        await setTier(userId, 'passport', customerId);
      }
      const artists = artistsRaw.split(',').map(a => a.trim()).filter(Boolean);
      await appendPassportArtists(userId, artists);
    } else if (tier === 'all-access') {
      const rows = await sbReq(
        'GET',
        '/rest/v1/gfs_members?select=tier&user_id=eq.' + userId + '&limit=1'
      );
      const currentTier = rows && rows[0] ? rows[0].tier : 'free';
      if (currentTier !== 'lifetime') {
        await setTier(userId, 'all-access', customerId);
      }
    } else if (tier === 'lifetime') {
      await setTier(userId, 'lifetime', customerId);
    }

    console.log('Webhook: provisioned user=' + userId + ' tier=' + tier);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook provisioning error:', err.message);
    // Return 200 so Stripe does not retry - log the error for manual review.
    return res.status(200).json({ received: true, error: err.message });
  }
};
