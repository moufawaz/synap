import crypto from 'crypto'

const LS_API_URL = 'https://api.lemonsqueezy.com/v1'

function getApiKey() {
  const key = process.env.LEMON_SQUEEZY_API_KEY
  if (!key) throw new Error('LEMON_SQUEEZY_API_KEY is not set')
  return key
}

// ── Variant IDs ────────────────────────────────────────────────
export const VARIANT_IDS = {
  PRO_MONTHLY:           process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID           || '1600605',
  PRO_UNLIMITED_MONTHLY: process.env.LEMON_SQUEEZY_PRO_UNLIMITED_MONTHLY_VARIANT_ID || '1602017',
  PRO_ANNUAL:            process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID            || '1602045',
  PRO_UNLIMITED_ANNUAL:  process.env.LEMON_SQUEEZY_PRO_UNLIMITED_ANNUAL_VARIANT_ID  || '1602053',
  EXTRA_CHAT:            process.env.LEMON_SQUEEZY_EXTRA_CHAT_VARIANT_ID            || '1600640',
} as const

// ── Plan metadata by variant ID ────────────────────────────────
export interface PlanMeta {
  plan: 'pro' | 'unlimited'
  billing: 'monthly' | 'annual'
  unlimited: boolean
  priceSAR: number
  label: string
}

export const VARIANT_TO_PLAN: Record<string, PlanMeta> = {
  [VARIANT_IDS.PRO_MONTHLY]:           { plan: 'pro',       billing: 'monthly', unlimited: false, priceSAR: 34.99, label: 'Pro Monthly' },
  [VARIANT_IDS.PRO_UNLIMITED_MONTHLY]: { plan: 'unlimited', billing: 'monthly', unlimited: true,  priceSAR: 44.99, label: 'Pro+Unlimited Monthly' },
  [VARIANT_IDS.PRO_ANNUAL]:            { plan: 'pro',       billing: 'annual',  unlimited: false, priceSAR: 289.99, label: 'Pro Annual' },
  [VARIANT_IDS.PRO_UNLIMITED_ANNUAL]:  { plan: 'unlimited', billing: 'annual',  unlimited: true,  priceSAR: 369.99, label: 'Pro+Unlimited Annual' },
}

// ── Fetch store ID lazily ──────────────────────────────────────
let _storeId: string | null = null

async function getStoreId(): Promise<string> {
  if (process.env.LEMON_SQUEEZY_STORE_ID) return process.env.LEMON_SQUEEZY_STORE_ID
  if (_storeId) return _storeId

  const res = await lsRequest('GET', '/stores')
  const stores = res?.data
  if (!stores || stores.length === 0) throw new Error('No Lemon Squeezy stores found')
  _storeId = stores[0].id
  return _storeId!
}

// ── Raw API request ────────────────────────────────────────────
async function lsRequest(method: string, path: string, body?: any) {
  const res = await fetch(`${LS_API_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const text = await res.text()
  let json: any
  try { json = JSON.parse(text) } catch { json = { error: text } }

  if (!res.ok) {
    console.error(`[LS] ${method} ${path} → ${res.status}`, json)
    throw new Error(json?.errors?.[0]?.detail || `Lemon Squeezy error ${res.status}`)
  }
  return json
}

// ── Create checkout session ────────────────────────────────────
export async function createCheckout(params: {
  variantId: string
  userId: string
  userEmail: string
  userName?: string
  redirectUrl?: string
  trialDays?: number
}): Promise<string> {
  const storeId = await getStoreId()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.synapfit.app'

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
        },
        checkout_data: {
          email: params.userEmail,
          name: params.userName || '',
          custom: {
            user_id: params.userId,
          },
        },
        product_options: {
          redirect_url: params.redirectUrl || `${appUrl}/dashboard?upgraded=1`,
          receipt_button_text: 'Go to Dashboard',
          receipt_link_url: `${appUrl}/dashboard`,
        },
        ...(params.trialDays ? {
          trial_ends_at: new Date(Date.now() + params.trialDays * 24 * 60 * 60 * 1000).toISOString(),
        } : {}),
        expires_at: null,
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: params.variantId } },
      },
    },
  }

  const res = await lsRequest('POST', '/checkouts', body)
  const url = res?.data?.attributes?.url
  if (!url) throw new Error('No checkout URL returned from Lemon Squeezy')
  return url
}

// ── Cancel subscription ────────────────────────────────────────
export async function cancelSubscription(lsSubscriptionId: string): Promise<void> {
  await lsRequest('DELETE', `/subscriptions/${lsSubscriptionId}`)
}

// ── Get subscription details ───────────────────────────────────
export async function getSubscription(lsSubscriptionId: string) {
  const res = await lsRequest('GET', `/subscriptions/${lsSubscriptionId}`)
  return res?.data
}

// ── Verify webhook signature ───────────────────────────────────
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[LS Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET not set — skipping verification')
    return true // Allow in dev when secret not set
  }

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expected = hmac.digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
