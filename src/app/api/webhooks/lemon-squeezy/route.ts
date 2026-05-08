import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature, VARIANT_TO_PLAN } from '@/lib/lemon-squeezy'
import { sendEmail } from '@/lib/resend'

// Use service role to bypass RLS in webhook handler
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') || ''

  // Verify signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('[LS Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName: string = payload?.meta?.event_name || ''
  const data = payload?.data
  const attrs = data?.attributes || {}
  const customData = attrs?.first_order_item?.custom_data || payload?.meta?.custom_data || {}
  const userId: string | null = customData?.user_id || null

  console.info(`[LS Webhook] ${eventName} | user=${userId}`)

  const supabase = getServiceClient()

  // ── Log every event ────────────────────────────────────────
  await supabase.from('billing_events').insert({
    user_id: userId,
    event_type: eventName,
    lemon_squeezy_event_name: eventName,
    payload,
  })

  if (!userId) {
    console.warn('[LS Webhook] No user_id in custom_data — cannot update subscription')
    return NextResponse.json({ ok: true })
  }

  // ── Get user email for notifications ──────────────────────
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  const userEmail = authUser?.user?.email
  const { data: profileRow } = await supabase.from('profiles').select('name').eq('user_id', userId).single()
  const userName = profileRow?.name || 'Athlete'

  const lsSubId: string = data?.id || attrs?.subscription_id || ''
  const variantId = String(attrs?.variant_id || attrs?.first_order_item?.variant_id || '')
  const planMeta = VARIANT_TO_PLAN[variantId]
  const planName: 'pro' | 'elite' = planMeta?.plan || 'pro'
  const billingPeriod = planMeta?.billing || 'monthly'
  const isElite = planName === 'elite'

  const trialEndsAt: string | null = attrs?.trial_ends_at || null
  const renewsAt: string | null = attrs?.renews_at || null
  const endsAt: string | null = attrs?.ends_at || null

  switch (eventName) {
    // ─────────────────────────────────────────────────────────
    case 'subscription_created': {
      const isInTrial = attrs?.status === 'on_trial' || !!trialEndsAt
      const status = isInTrial ? 'trial' : 'active'

      await upsertSubscription(supabase, userId, {
        lemon_squeezy_subscription_id: lsSubId,
        lemon_squeezy_customer_id: String(attrs?.customer_id || ''),
        variant_id: variantId,
        plan_type: planName,
        plan_name: planName,
        billing_period: billingPeriod,
        status,
        trial_ends_at: trialEndsAt,
        current_period_ends_at: renewsAt || endsAt,
      })

      if (isInTrial && userEmail) {
        sendEmail({ to: userEmail, type: 'trial_started', data: { name: userName, trialDays: 7 } }).catch(() => {})
      }

      // Ion welcome message
      const welcomeMsg = isElite
        ? `Welcome to Elite, ${userName}! You now have access to everything: unlimited Ion messages, weekly body composition reports, personalised supplement recommendations, and goal timeline predictions. This is the full package. Let's build something exceptional.`
        : isInTrial
          ? `Your 7-day free trial has started, ${userName}! You now have full Pro access. Remember: if you cancel before day 7, you will never be charged. I'll remind you before the trial ends. Let's make these 7 days count.`
          : `Welcome to Pro, ${userName}! You now have unlimited access to Ion, your full diet and workout plans, and all tracking features. Let's get to work.`

      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: welcomeMsg,
        message_type: 'text',
      })
      break
    }

    // ─────────────────────────────────────────────────────────
    case 'subscription_updated': {
      const newStatus = mapLsStatus(attrs?.status)

      await upsertSubscription(supabase, userId, {
        lemon_squeezy_subscription_id: lsSubId,
        variant_id: variantId,
        plan_type: planName,
        plan_name: planName,
        billing_period: billingPeriod,
        status: newStatus,
        trial_ends_at: trialEndsAt,
        current_period_ends_at: renewsAt || endsAt,
      })
      break
    }

    // ─────────────────────────────────────────────────────────
    case 'subscription_cancelled': {
      // Fetch existing subscription to check if still in trial
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      const isInTrial = existingSub?.status === 'trial'
      const trialEnd = existingSub?.trial_ends_at ? new Date(existingSub.trial_ends_at) : null
      const cancelledInTrial = isInTrial && trialEnd && trialEnd > new Date()

      await supabase
        .from('subscriptions')
        .update({
          status: cancelledInTrial ? 'starter' : 'cancelled',
          cancelled_at: new Date().toISOString(),
          // If cancelled during trial → revert to Starter immediately
          ...(cancelledInTrial ? {
            plan_type: 'starter',
            plan_name: 'starter',
            trial_ends_at: null,
            lemon_squeezy_subscription_id: null,
          } : {
            current_period_ends_at: endsAt || renewsAt,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (cancelledInTrial && userEmail) {
        sendEmail({ to: userEmail, type: 'trial_cancelled', data: { name: userName } }).catch(() => {})

        // Zero-charge confirmation Ion message
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'assistant',
          content: `Your trial has been cancelled successfully, ${userName}. As promised: zero charges. You have reverted to the Starter plan. You are always welcome back whenever you are ready.`,
          message_type: 'text',
        })
      } else if (userEmail) {
        sendEmail({ to: userEmail, type: 'subscription_cancelled', data: { name: userName, endsAt: endsAt || renewsAt } }).catch(() => {})
      }
      break
    }

    // ─────────────────────────────────────────────────────────
    case 'subscription_resumed': {
      await upsertSubscription(supabase, userId, {
        lemon_squeezy_subscription_id: lsSubId,
        status: 'active',
        cancelled_at: null,
        current_period_ends_at: renewsAt,
      })
      break
    }

    // ─────────────────────────────────────────────────────────
    case 'subscription_expired': {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', plan_type: 'starter', plan_name: 'starter', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }

    // ─────────────────────────────────────────────────────────
    case 'subscription_payment_success': {
      // Reactivate if was expired/cancelled
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_ends_at: renewsAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .in('status', ['active', 'past_due'])
      break
    }

    // ─────────────────────────────────────────────────────────
    case 'subscription_payment_failed': {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }

    default:
      console.info(`[LS Webhook] Unhandled event: ${eventName}`)
  }

  return NextResponse.json({ ok: true })
}

// ── Helper: upsert subscription row ────────────────────────────
async function upsertSubscription(supabase: any, userId: string, data: Record<string, any>) {
  const payload = {
    user_id: userId,
    ...data,
    updated_at: new Date().toISOString(),
  }
  await supabase
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id' })
}

// ── Helper: map LS status to our status ──────────────────────
function mapLsStatus(lsStatus: string): string {
  switch (lsStatus) {
    case 'active':    return 'active'
    case 'on_trial':  return 'trial'
    case 'cancelled': return 'cancelled'
    case 'expired':   return 'expired'
    case 'past_due':  return 'past_due'
    case 'paused':    return 'cancelled'
    default:          return 'active'
  }
}
