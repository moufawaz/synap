import crypto from 'crypto'

const LS_API_URL = 'https://api.lemonsqueezy.com/v1'

function getApiKey() {
  const key = process.env.LEMON_SQUEEZY_API_KEY
  if (!key) throw new Error('LEMON_SQUEEZY_API_KEY is not set')
  return key
}

// ── Variant IDs ────────────────────────────────────────────────
export const VARIANT_IDS = {
  PRO_MONTHLY:    process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID    || '1600605',
  PRO_ANNUAL:     process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID     || '1602045',
  ELITE_MONTHLY:  process.env.LEMON_SQUEEZY_ELITE_MONTHLY_VARIANT_ID  || '1602017',
  ELITE_ANNUAL:   process.env.LEMON_SQUEEZY_ELITE_ANNUAL_VARIANT_ID   || '1602053',
} as const

// ── Plan metadata by variant ID ────────────────────────────────
export interface PlanMeta {
  plan: 'pro' | 'elite'
  billing: 'monthly' | 'annual'
  priceSAR: number
  label: string
}

export const VARIANT_TO_PLAN: Record<string, PlanMeta> = {
  [VARIANT_IDS.PRO_MONTHLY]:   { plan: 'pro',   billing: 'monthly', priceSAR: 39.99,  label: 'Pro Monthly' },
  [VARIANT_IDS.PRO_ANNUAL]:    { plan: 'pro',   billing: 'annual',  priceSAR: 319.99, label: 'Pro Annual' },
  [VARIANT_IDS.ELITE_MONTHLY]: { plan: 'elite', billing: 'monthly', priceSAR: 69.99,  label: 'Elite Monthly' },
  [VARIANT_IDS.ELITE_ANNUAL]:  { plan: 'elite', billing: 'annual',  priceSAR: 559.99, label: 'Elite Annual' },
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
        // Note: trial period must be configured on the variant in the LS dashboard.
        // The trial_ends_at field is NOT supported in the checkout API (LS returns 422).
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
    if (process.env.NODE_ENV === 'production') {
      console.error('[LS Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not set')
      return false
    }
    console.warn('[LS Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not set; allowing unsigned webhook in development')
    return true
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
