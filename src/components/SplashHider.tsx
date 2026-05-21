'use client'

import { useEffect } from 'react'

/**
 * SplashHider — hides the Capacitor splash screen once any page mounts.
 * Placed in the root layout so it fires on every route.
 *
 * launchAutoHide is false in capacitor.config.ts so we control the exact
 * moment.  We try immediately on mount, and set a hard 2-second fallback
 * timer so the app NEVER stays black even if the plugin import is slow.
 */
export default function SplashHider() {
  useEffect(() => {
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    async function hide() {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 300 })
      } catch {
        // Plugin unavailable — nothing to hide
      }
    }

    // Attempt 1: immediately on mount
    hide()

    // Attempt 2: hard 2-second fallback — guarantees splash is gone
    // even if React is slow to mount or the plugin takes time to init
    const fallback = setTimeout(hide, 2000)
    return () => clearTimeout(fallback)
  }, [])

  return null
}
