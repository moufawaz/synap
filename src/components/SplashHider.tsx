'use client'

import { useEffect } from 'react'

/**
 * SplashHider — hides the Capacitor splash screen once any page mounts.
 * Placed in the root layout so it fires on every route.
 * launchAutoHide is false in capacitor.config.ts so we control timing here.
 */
export default function SplashHider() {
  useEffect(() => {
    if (!(window as any).Capacitor?.isNativePlatform?.()) return
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 300 }))
      .catch(() => {})
  }, [])

  return null
}
