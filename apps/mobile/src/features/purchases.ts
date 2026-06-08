import { Platform } from 'react-native'
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases'

/**
 * RevenueCat / StoreKit In-App Purchase layer (App Store Guideline 3.1.1).
 *
 * The app uses RevenueCat to wrap StoreKit: it presents the auto-renewable
 * subscriptions (Pro / Elite) for purchase, and RevenueCat validates receipts
 * and notifies our server (webhook) which grants the matching tier in Supabase.
 * Web purchases (Lemon Squeezy) keep working alongside — the user's effective
 * plan is whichever source grants access.
 *
 * Entitlement identifiers configured in the RevenueCat dashboard:
 *   - "pro"   → Pro tier
 *   - "elite" → Elite tier
 */

export const RC_ENTITLEMENTS = { pro: 'pro', elite: 'elite' } as const
export type EntitlementTier = 'pro' | 'elite' | null

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''

// Product IDs configured in App Store Connect / RevenueCat — used as a fallback
// to fetch products directly if the offering returns nothing.
const PRODUCT_IDS = ['synap_pro_monthly', 'synap_pro_yearly', 'synap_elite_monthly', 'synap_elite_yearly']

let configured = false

/** Diagnostic: what the build sees for the RevenueCat key (prefix only, safe to
 *  show). 'appl_…' = correct App Store key; 'test_…' = wrong (Test Store key);
 *  '(none)' = the EXPO_PUBLIC_REVENUECAT_IOS_KEY secret wasn't set at build time. */
export function purchasesKeyPrefix(): string {
  if (!IOS_KEY) return '(none)'
  return IOS_KEY.slice(0, 5) + '…'
}

/** A unified, ready-to-render purchasable item (works whether it came from an
 *  offering package or a direct product lookup). */
export type Buyable = {
  id: string
  title: string
  description: string
  priceString: string
  purchase: () => Promise<CustomerInfo | null>
}

/** Configure the SDK once at app launch. Safe to call repeatedly. */
export function configurePurchases() {
  if (configured) return
  if (Platform.OS !== 'ios' || !IOS_KEY) return // IAP is iOS-only here; no-op without a key
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR)
    Purchases.configure({ apiKey: IOS_KEY })
    configured = true
  } catch {
    /* non-fatal — paywall will surface "unavailable" if this failed */
  }
}

/** Tie purchases to the signed-in account so the webhook can map them to the user. */
export async function identifyPurchaser(userId: string | undefined | null) {
  if (!configured || !userId) return
  try { await Purchases.logIn(userId) } catch { /* non-fatal */ }
}

export async function resetPurchaser() {
  if (!configured) return
  try { await Purchases.logOut() } catch { /* non-fatal */ }
}

export function purchasesReady() {
  return configured
}

/** Current offering (the set of packages the user can buy), or null. */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current ?? null
  } catch {
    return null
  }
}

/** Load the buyable plans. Prefers the configured "current" offering; if that
 *  returns nothing (e.g. offering not marked current yet), falls back to fetching
 *  the products directly by ID. Either way each item carries its own purchase().
 *  Returns [] only when the SDK can't reach the store at all (bad/empty key, or
 *  the products aren't "Ready to Submit" yet). */
export async function loadBuyables(): Promise<Buyable[]> {
  if (!configured) return []
  // 1) Offering packages (preferred).
  try {
    const offerings = await Purchases.getOfferings()
    const pkgs = offerings.current?.availablePackages ?? []
    if (pkgs.length) {
      return pkgs.map((pkg): Buyable => ({
        id: pkg.identifier,
        title: pkg.product.title,
        description: pkg.product.description,
        priceString: pkg.product.priceString,
        purchase: async () => (await Purchases.purchasePackage(pkg)).customerInfo,
      }))
    }
  } catch { /* fall through to direct product fetch */ }
  // 2) Direct product fetch (covers an offering that isn't wired up yet).
  try {
    const products = await Purchases.getProducts(PRODUCT_IDS)
    return products.map((p): Buyable => ({
      id: p.identifier,
      title: p.title,
      description: p.description,
      priceString: p.priceString,
      purchase: async () => (await Purchases.purchaseStoreProduct(p)).customerInfo,
    }))
  } catch { /* nothing available */ }
  return []
}

/** Buy a package. Returns the resulting customer info, or throws on real errors
 *  (user cancellation is swallowed and returns null). */
export async function buyPackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo
}

export async function restore(): Promise<CustomerInfo | null> {
  if (!configured) return null
  return Purchases.restorePurchases()
}

/** Highest active entitlement from a CustomerInfo (elite outranks pro).
 *  Matches the entitlement identifier case-insensitively so "Pro"/"pro" and
 *  "Elite"/"elite" all resolve correctly. */
export function tierFromCustomerInfo(info: CustomerInfo | null | undefined): EntitlementTier {
  const active = info?.entitlements?.active ?? {}
  const keys = Object.keys(active).map(k => k.toLowerCase())
  if (keys.includes(RC_ENTITLEMENTS.elite)) return 'elite'
  if (keys.includes(RC_ENTITLEMENTS.pro)) return 'pro'
  return null
}

export async function getActiveTier(): Promise<EntitlementTier> {
  if (!configured) return null
  try {
    return tierFromCustomerInfo(await Purchases.getCustomerInfo())
  } catch {
    return null
  }
}

/** True if a RevenueCat purchase error is just the user cancelling. */
export function isUserCancelled(err: any): boolean {
  return !!err && (err.userCancelled === true || err.code === '1' || err.code === 1)
}
