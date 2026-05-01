import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { stripe, PLANS } from '@/lib/stripe'

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured — all plans are currently free.' }, { status: 503 })
  }

  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planId } = await req.json()
    const plan = PLANS[planId as keyof typeof PLANS]

    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: 'Invalid plan or price not configured' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?cancelled=1`,
      metadata: { userId: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
