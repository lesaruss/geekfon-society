// One-time setup: creates GeekFon Society products in Stripe.
// Run once: STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setup() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Error: STRIPE_SECRET_KEY env var is required.');
    process.exit(1);
  }
  console.log('Creating GeekFon Society products in Stripe...\n');

  const passport = await stripe.prices.create({
    currency: 'usd', unit_amount: 1100,
    product_data: { name: 'GeekFon Passport', description: 'One-time access. Get in. Explore the Society.' },
  });
  const allAccess = await stripe.prices.create({
    currency: 'usd', unit_amount: 1100, recurring: { interval: 'month' },
    product_data: { name: 'GeekFon All Access', description: 'Full archive, early drops, member community.' },
  });
  const lifetime = await stripe.prices.create({
    currency: 'usd', unit_amount: 11100,
    product_data: { name: 'GeekFon Lifetime', description: 'One payment. In the Society for good.' },
  });

  console.log('Done. Add these to Vercel environment variables:\n');
  console.log('STRIPE_SECRET_KEY=' + process.env.STRIPE_SECRET_KEY);
  console.log('STRIPE_PRICE_PASSPORT=' + passport.id);
  console.log('STRIPE_PRICE_ALL_ACCESS=' + allAccess.id);
  console.log('STRIPE_PRICE_LIFETIME=' + lifetime.id);
}

setup().catch(err => { console.error(err.message); process.exit(1); });
