'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_FALLBACKS = {
  passport:     { price: process.env.STRIPE_PRICE_PASSPORT,   mode: 'payment'      },
  'all-access': { price: process.env.STRIPE_PRICE_ALL_ACCESS, mode: 'subscription' },
  lifetime:     { price: process.env.STRIPE_PRICE_LIFETIME,   mode: 'payment'      },
};

const VALID_TIERS = new Set(['passport', 'all-access', 'lifetime']);

async function getPriceFromDB(tier) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      url + '/rest/v1/lesaruss_products?select=stripe_price_id,mode&brand=eq.geekfon&product_slug=eq.' + tier + '&active=eq.true&limit=1',
      { headers: { apikey: key, Authorization: 'Bearer ' + key } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || !rows[0]) return null;
    return { price: rows[0].stripe_price_id, mode: rows[0].mode };
  } catch (err) {
    console.error('Supabase lookup failed, using fallback:', err.message);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://geekfon.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { tier } = req.query;
  if (!tier || !VALID_TIERS.has(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Use: passport, all-access, lifetime' });
  }

  const quantity = parseInt(req.query.quantity, 10) || 1;
  const artists  = req.query.artists || '';
  const origin   = req.headers.origin || 'https://geekfon.ai';

  const product = (await getPriceFromDB(tier)) || PRICE_FALLBACKS[tier];
  if (!product || !product.price) {
    return res.status(500).json({ error: 'Price not configured for: ' + tier });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: product.price, quantity }],
      mode: product.mode,
      ui_mode: 'embedded',
      return_url: origin + '/register?tier=' + tier + '&session_id={CHECKOUT_SESSION_ID}',
      metadata: { tier, artists, quantity: String(quantity) },
    });
    return res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Checkout session failed' });
  }
};
