import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cancelSubscription } from '@/lib/lemon-squeezy'

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('lemon_squeezy_subscription_id, status, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subError || !sub) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    if (!sub.lemon_squeezy_subscription_id) {
      return NextResponse.json({ error: 'No subscription ID found' }, { status: 404 })
    }

    if (sub.status === 'cancelled' || sub.status === 'expired' || sub.status === 'free') {
      return NextResponse.json({ error: 'Subscription is already cancelled or inactive' }, { status: 400 })
    }

    await cancelSubscription(sub.lemon_squeezy_subscription_id)

    const isInTrial = sub.status === 'trial'
    await admin
      .from('subscriptions')
      .update({
        status: isInTrial ? 'free' : 'cancelled',
        cancelled_at: new Date().toISOString(),
        ...(isInTrial ? {
          plan_name: 'free',
          trial_ends_at: null,
          lemon_squeezy_subscription_id: null,
        } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return NextResponse.json({
      ok: true,
      isTrialCancel: isInTrial,
      message: isInTrial
        ? 'Trial cancelled - you will never be charged.'
        : 'Subscription cancelled. You keep access until the period ends.',
    })
  } catch (err: any) {
    console.error('[Cancel] Error:', err?.message || err)
    return NextResponse.json(
      { error: 'Failed to cancel. Please contact support.' },
      { status: 500 },
    )
  }
}
