/**
 * platform.ts — safe runtime detection of native Capacitor context.
 *
 * Capacitor injects `window.Capacitor` when the web app is running inside
 * a native iOS or Android shell.  This module provides tree-shakeable helpers
 * so we can gate UI branches (e.g. hide LemonSqueezy checkout on native,
 * swap OneSignal Web SDK → native SDK) without importing the full Capacitor
 * package on the server.
 */

/** Returns true only when running inside the Capacitor native shell. */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

/** Returns 'ios' | 'android' | 'web' */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  return (window as any).Capacitor?.getPlatform?.() ?? 'web'
}

/** true when running in Safari or as a PWA on iOS (but NOT Capacitor native) */
export function isIOSWeb(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativePlatform()) return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}
