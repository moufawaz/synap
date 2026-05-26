import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// ── Admin-only subscription management endpoint ──────────────────
//
// Actions:
//   grant       — set status=active, plan_name=tier (default pro)
//   set_trial   — set status=trial, trial_ends_at = now + 7d
//   revoke      — set status=cancelled
//   reset       — set status=free, plan_name=free
//   set_tier    — update plan_name only (keep existing status)
//
// Body: { userId, action, tier?, billingPeriod? }

const ALLOWED_ACTIONS = ['grant', 'set_trial', 'revoke', 'reset', 'set_tier'] as const
type SubAction = (typeof ALLOWED_ACTIONS)[number]

export async function POST(req: NextRequest) {
  // ── Auth guard: admin only ────────────────────────────────────
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { userId, action, tier, billingPeriod } = body as {
    userId: string
    action: SubAction
    tier?: string
    billingPeriod?: string
  }

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
  }

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  // Check for existing subscription row
  const { data: existingSub, error: fetchErr } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const planName   = (tier || 'pro').toLowerCase()
  const period     = billingPeriod || 'monthly'

  let updatePayload: Record<string, any> = { updated_at: now }

  switch (action) {
    case 'grant':
      updatePayload = {
        ...updatePayload,
        plan_name: planName,
        status: 'active',
        billing_period: period,
        cancelled_at: null,
        trial_ends_at: null,
      }
      break

    case 'set_trial': {
      const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString()
      updatePayload = {
        ...updatePayload,
        plan_name: planName,
        status: 'trial',
        billing_period: period,
        trial_ends_at: trialEnd,
        cancelled_at: null,
      }
      break
    }

    case 'revoke':
      updatePayload = {
        ...updatePayload,
        status: 'cancelled',
        cancelled_at: now,
      }
      break

    case 'reset':
      updatePayload = {
        ...updatePayload,
        plan_name: 'free',
        status: 'free',
        billing_period: null,
        trial_ends_at: null,
        cancelled_at: null,
        current_period_ends_at: null,
        lemon_squeezy_subscription_id: null,
      }
      break

    case 'set_tier':
      if (!tier) return NextResponse.json({ error: 'tier required for set_tier action' }, { status: 400 })
      updatePayload = { ...updatePayload, plan_name: planName }
      break
  }

  let error: string | null = null

  if (existingSub) {
    const { error: updErr } = await admin
      .from('subscriptions')
      .update(updatePayload)
      .eq('user_id', userId)
    error = updErr?.message || null
  } else {
    // Create new subscription row
    const { error: insErr } = await admin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_name: updatePayload.plan_name || 'free',
        status: updatePayload.status || 'free',
        billing_period: updatePayload.billing_period || null,
        trial_ends_at: updatePayload.trial_ends_at || null,
        created_at: now,
        updated_at: now,
      })
    error = insErr?.message || null
  }

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    action,
    userId,
    applied: updatePayload,
  })
}
