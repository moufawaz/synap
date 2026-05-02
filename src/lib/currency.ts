'use client'

import { useState, useEffect } from 'react'

// ── Region → Currency mapping ──────────────────────────────────
export const REGION_TO_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  SA: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  AE: { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  KW: { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar' },
  QA: { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal' },
  BH: { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar' },
  OM: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
  JO: { code: 'JOD', symbol: 'JOD', name: 'Jordanian Dinar' },
  EG: { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound' },
  MA: { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  US: { code: 'USD', symbol: '$',   name: 'US Dollar' },
  GB: { code: 'GBP', symbol: '£',   name: 'British Pound' },
  EU: { code: 'EUR', symbol: '€',   name: 'Euro' },
  DE: { code: 'EUR', symbol: '€',   name: 'Euro' },
  FR: { code: 'EUR', symbol: '€',   name: 'Euro' },
  TR: { code: 'TRY', symbol: '₺',   name: 'Turkish Lira' },
  PK: { code: 'PKR', symbol: '₨',   name: 'Pakistani Rupee' },
  IN: { code: 'INR', symbol: '₹',   name: 'Indian Rupee' },
}

// ── Locale prefix → region fallback (for browsers that report language without region) ──
const LOCALE_PREFIX_TO_REGION: Record<string, string> = {
  ar: 'SA',   // Arabic → Saudi Arabia (most common MENA Arabic)
  'ar-SA': 'SA', 'ar-AE': 'AE', 'ar-KW': 'KW', 'ar-QA': 'QA',
  'ar-BH': 'BH', 'ar-OM': 'OM', 'ar-JO': 'JO', 'ar-EG': 'EG',
  'ar-MA': 'MA',
  tr: 'TR', ur: 'PK', hi: 'IN',
}

const CACHE_KEY = 'synap_currency_v3'  // bumped from v2 to clear stale cache
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export interface CurrencyInfo {
  code: string
  symbol: string
  rate: number   // how many units of this currency = 1 SAR
  detected: boolean
}

// ── Detect region from browser locale (fast, no network, correct for MENA) ──
export function detectRegion(): string {
  if (typeof window === 'undefined') return 'SA'
  try {
    const lang = navigator.language || navigator.languages?.[0] || 'en'

    // 1. Exact match on full locale tag (e.g. "ar-SA", "en-US", "tr-TR")
    const exactMatch = LOCALE_PREFIX_TO_REGION[lang]
    if (exactMatch) return exactMatch

    // 2. Try Intl.Locale to extract the region subtag (e.g. "en-SA" → "SA")
    const locale = new Intl.Locale(lang)
    const region = locale.region || (locale as any).maximize?.()?.region || ''
    if (region && REGION_TO_CURRENCY[region]) return region

    // 3. Match on language prefix only (e.g. "ar" → "SA", "tr" → "TR")
    const prefix = lang.split('-')[0].toLowerCase()
    const prefixMatch = LOCALE_PREFIX_TO_REGION[prefix]
    if (prefixMatch) return prefixMatch

    return region || ''  // empty string signals "unknown, try IP"
  } catch {
    return ''
  }
}

// ── Fetch live exchange rate from frankfurter.app ──────────────
async function fetchRate(targetCurrency: string): Promise<number> {
  if (targetCurrency === 'SAR') return 1

  const res = await fetch(
    `https://api.frankfurter.app/latest?base=SAR&symbols=${targetCurrency}`,
    { cache: 'force-cache' }
  )
  const data = await res.json()
  return data?.rates?.[targetCurrency] ?? 1
}

// ── Main detection + rate function ────────────────────────────
export async function detectUserCurrency(): Promise<CurrencyInfo> {
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, expiry } = JSON.parse(cached)
      if (Date.now() < expiry) return data
    }
  } catch {}

  // 1. Try browser locale first — fast, reliable for MENA / Arabic users
  let region = detectRegion()

  // 2. Only fall back to IP geolocation if locale gives no recognizable region
  //    (e.g. plain "en" with no country code)
  if (!region || !REGION_TO_CURRENCY[region]) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 3000)
      const geoRes = await fetch('https://ipapi.co/json/', { signal: controller.signal })
      clearTimeout(tid)
      const geoData = await geoRes.json()
      if (geoData?.country_code) region = geoData.country_code
    } catch {
      // both locale and IP failed — default to SAR
    }
  }

  const currencyInfo = REGION_TO_CURRENCY[region] || REGION_TO_CURRENCY['SA']

  let rate = 1
  try {
    rate = await fetchRate(currencyInfo.code)
  } catch {
    rate = 1
  }

  const result: CurrencyInfo = {
    code: currencyInfo.code,
    symbol: currencyInfo.symbol,
    rate,
    detected: true,
  }

  // Cache result
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: result,
      expiry: Date.now() + CACHE_TTL,
    }))
  } catch {}

  return result
}

// ── Format a SAR price in user's currency ─────────────────────
export function formatPrice(priceSAR: number, currency: CurrencyInfo, decimals = 0): string {
  const converted = priceSAR * currency.rate
  const formatted = converted.toFixed(decimals === 0 && converted >= 10 ? 0 : 2)
  return `${currency.symbol} ${formatted}`
}

// ── React hook ────────────────────────────────────────────────
export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>({
    code: 'SAR',
    symbol: 'SAR',
    rate: 1,
    detected: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    detectUserCurrency()
      .then(c => { setCurrency(c); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmt = (priceSAR: number, decimals?: number) => formatPrice(priceSAR, currency, decimals)

  return { currency, loading, fmt }
}
