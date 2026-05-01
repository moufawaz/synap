import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeKey && stripeKey !== 'your_stripe_secret_key'
  ? new Stripe(stripeKey)
  : null

export const STRIPE_ENABLED = !!stripe

// ── Plans (all free at launch) ─────────────────────────
export const PLANS = {
  free: {
    id: 'free',
    name: 'SYNAP Free',
    price: 0,
    currency: 'usd',
    features: [
      'Full Ion AI coaching',
      'Personalised workout plan',
      'Personalised diet plan',
      'Body measurement tracking',
      'Progress charts',
      'Bilingual (EN / AR)',
    ],
    stripePriceId: null, // Will be set when Stripe is activated
  },
  pro: {
    id: 'pro',
    name: 'SYNAP Pro',
    price: 1499, // $14.99/month in cents — inactive at launch
    currency: 'usd',
    features: [
      'Everything in Free',
      'Priority AI responses',
      'Video exercise library',
      'Advanced analytics',
      'Plan customisation',
      'Email + push coaching',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
  },
}

export async function createCheckoutSession(userId: string, priceId: string, email: string) {
  if (!stripe) throw new Error('Stripe not configured')
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?cancelled=1`,
    metadata: { userId },
  })
}

export async function createPortalSession(customerId: string) {
  if (!stripe) throw new Error('Stripe not configured')
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  })
}
