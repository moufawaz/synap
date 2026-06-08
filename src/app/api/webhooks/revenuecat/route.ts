import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * RevenueCat webhook — App Store In-App Purchase fulfilment (Guideline 3.1.1).
 *
 * RevenueCat validates the StoreKit receipt and POSTs subscription lifecycle
 * events here. We map `app_user_id` (set to the Supabase user id via
 * Purchases.logIn at sign-in) to the user and write the tier into the same
 * `subscriptions` table the web (Lemon Squeezy) uses, so `effectivePlan` grants
 * access uniformly across platforms.
 *
 * Configure in the RevenueCat dashboard:
 *   - Webhook URL:  https://www.synapfit.app/api/webhooks/revenuecat
 *   - Authorization header value → REVENUECAT_WEBHOOK_AUTH env var
 *   - Entitlement identifiers: "pro" and "elite"
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function tierFrom(event: any): 'pro' | 'elite' {
  const ids: string[] = [
    ...(Array.isArray(event?.entitlement_ids) ? event.entitlement_ids : []),
    event?.entitlement_id,
    event?.product_id,
  ]
    .filter(Boolean)
    .map((s: string) => String(s).toLowerCase())
  return ids.some(s => s.includes('elite')) ? 'elite' : 'pro'
}

export async function POST(req: Request) {
  // Auth: RevenueCat sends the Authorization header value configured in the dashboard.
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH
  if (expected && req.headers.get('authorization') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  const event = body?.event
  const type: string = event?.type || ''
  // Prefer the aliased app user id; fall back to app_user_id. Must be our Supabase
  // user id (anonymous RC ids can't be mapped — ignore them).
  const candidates: string[] = [event?.app_user_id, ...(event?.aliases || []), event?.original_app_user_id].filter(Boolean)
  const userId = candidates.find(id => UUID_RE.test(String(id)))

  // TEST events and unmappable users: ack so RevenueCat doesn't retry forever.
  if (type === 'TEST' || !userId) {
    return NextResponse.json({ ok: true, ignored: type === 'TEST' ? 'test' : 'no_mappable_user' })
  }

  const admin = createAdminClient()
  const tier = tierFrom(event)
  const periodEnd = event?.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null

  // Map RevenueCat event → subscription status used by effectivePlan().
  let status: 'active' | 'cancelled' | 'past_due' | 'expired'
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
      status = 'active'
      break
    case 'CANCELLATION':
      // Still entitled until the period ends — effectivePlan keeps access for a
      // 'cancelled' sub whose current_period_ends_at is in the future.
      status = 'cancelled'
      break
    case 'BILLING_ISSUE':
      status = 'past_due'
      break
    case 'EXPIRATION':
      status = 'expired'
      break
    default:
      return NextResponse.json({ ok: true, ignored: type })
  }

  const payload: Record<string, any> = {
    user_id: userId,
    plan_type: tier,
    plan_name: tier,
    status,
    current_period_ends_at: periodEnd,
    billing_period: String(event?.period_type || '').toLowerCase().includes('annual') ? 'yearly' : 'monthly',
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from('subscriptions').upsert(payload, { onConflict: 'user_id' })
  if (error) {
    console.error('[revenuecat] subscription upsert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, type, tier, status })
}
