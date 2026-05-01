import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  const supabase = createServerClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.userId
      if (userId) {
        await supabase.from('profiles').update({
          stripe_customer_id: session.customer,
          subscription_status: 'active',
          subscription_plan: 'pro',
        }).eq('user_id', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('stripe_customer_id', sub.customer)
        .single()

      if (profile?.user_id) {
        await supabase.from('profiles').update({
          subscription_status: 'cancelled',
          subscription_plan: 'free',
        }).eq('user_id', profile.user_id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await supabase.from('profiles').update({
        subscription_status: 'past_due',
      }).eq('stripe_customer_id', invoice.customer)
      break
    }
  }

  return NextResponse.json({ received: true })
}
