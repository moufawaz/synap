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

// Only cache exchange RATES — country is always re-detected fresh
const RATE_CACHE_KEY = 'synap_rates_v1'
const RATE_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

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

// ── Fetch live exchange rate (rates cached 24h, country always fresh) ──────
async function fetchRate(targetCurrency: string): Promise<number> {
  if (targetCurrency === 'SAR') return 1

  // Check rate cache first
  try {
    const cached = localStorage.getItem(RATE_CACHE_KEY)
    if (cached) {
      const { rates, expiry } = JSON.parse(cached)
      if (Date.now() < expiry && rates?.[targetCurrency] != null) {
        return rates[targetCurrency]
      }
    }
  } catch {}

  const res = await fetch(
    `https://api.frankfurter.app/latest?base=SAR&symbols=${targetCurrency}`
  )
  const data = await res.json()
  const rate = data?.rates?.[targetCurrency] ?? 1

  // Cache this rate
  try {
    const cached = localStorage.getItem(RATE_CACHE_KEY)
    const existing = cached ? JSON.parse(cached) : { rates: {}, expiry: Date.now() + RATE_CACHE_TTL }
    existing.rates[targetCurrency] = rate
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(existing))
  } catch {}

  return rate
}

// ── Detect country — always fresh, never cached ───────────────
async function detectCountry(): Promise<string> {
  // 1. Vercel server-side geo header (most reliable — our own API, no rate limits)
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 3000)
    const res = await fetch('/api/geo', { signal: controller.signal })
    clearTimeout(tid)
    const data = await res.json()
    if (data?.country && REGION_TO_CURRENCY[data.country]) return data.country
  } catch {}

  // 2. Browser locale (great for Arabic/MENA users with ar-SA locale)
  const fromLocale = detectRegion()
  if (fromLocale && REGION_TO_CURRENCY[fromLocale]) return fromLocale

  // 3. ipapi.co last resort
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 3000)
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    clearTimeout(tid)
    const data = await res.json()
    if (data?.country_code) return data.country_code
  } catch {}

  return 'SA' // default to Saudi Arabia
}

// ── Main detection + rate function ────────────────────────────
export async function detectUserCurrency(): Promise<CurrencyInfo> {
  // Country is ALWAYS detected fresh (Vercel geo is fast & free)
  const region = await detectCountry()
  const currencyInfo = REGION_TO_CURRENCY[region] || REGION_TO_CURRENCY['SA']

  let rate = 1
  try {
    rate = await fetchRate(currencyInfo.code)
  } catch {
    rate = 1
  }

  return {
    code: currencyInfo.code,
    symbol: currencyInfo.symbol,
    rate,
    detected: true,
  }
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
