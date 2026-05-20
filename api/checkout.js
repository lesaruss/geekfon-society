const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  passport: process.env.STRIPE_PRICE_PASSPORT,
  'all-access': process.env.STRIPE_PRICE_ALL_ACCESS,
  lifetime: process.env.STRIPE_PRICE_LIFETIME,
};

const MODES = {
  passport: 'payment',
  'all-access': 'subscription',
  lifetime: 'payment',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://geekfon.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { tier } = req.query;
  if (!tier || !PRICES[tier]) return res.status(400).json({ error: 'Invalid tier. Use: passport, all-access, lifetime' });
  if (!PRICES[tier]) return res.status(500).json({ error: 'Price ID not configured for: ' + tier });

  const quantity = parseInt(req.query.quantity, 10) || 1;
  const artists = req.query.artists || '';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICES[tier], quantity: quantity }],
      mode: MODES[tier],
      success_url: 'https://geekfon.ai/welcome?tier=' + tier,
      cancel_url: 'https://geekfon.ai/passport',
      metadata: { tier, artists, quantity: String(quantity) },
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Checkout session failed' });
  }
};
