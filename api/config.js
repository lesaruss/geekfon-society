'use strict';

// GET /api/config
// Returns public (non-secret) config values safe to expose to the browser.
// Used by checkout.html to load the Stripe publishable key from an env var
// rather than hardcoding it in client HTML.

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://geekfon.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const pk = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!pk) {
    return res.status(500).json({ error: 'Stripe publishable key not configured' });
  }
  return res.json({ stripePk: pk });
};
