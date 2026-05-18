'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { isNativePlatform } from '@/lib/platform'

declare global {
  interface Window {
    OneSignalDeferred?: ((os: any) => Promise<void>)[]
  }
}

interface Props {
  userId: string
}

/**
 * OneSignalInit — dual-mode push initialisation.
 *
 * Web (browser / PWA):
 *   Loads the OneSignal Web SDK v16 via CDN and links the Supabase user ID
 *   so push segments work per-user.
 *
 * Native (Capacitor iOS / Android):
 *   The Web SDK is NOT loaded — it would fight with the native APNs/FCM
 *   channel.  Instead we import @onesignal/onesignal-capacitor dynamically
 *   and initialise it with the same App ID.  The service worker is irrelevant
 *   in native context (APNs / FCM handles delivery).
 *
 *   Before this works in the native build, also:
 *   1. `npm install @onesignal/onesignal-capacitor`
 *   2. Add push entitlements in Xcode (iOS) and google-services.json (Android)
 */
export default function OneSignalInit({ userId }: Props) {
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    if (isNativePlatform()) {
      // ── Native Capacitor path ────────────────────────────────────────────────
      // Dynamically import so the web bundle is never affected.
      import('@onesignal/capacitor-plugin')
        .then((mod) => {
          // The plugin uses a default export
          const OneSignal = mod.default ?? (mod as any).OneSignal
          OneSignal.initialize(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!)
          OneSignal.login(userId).catch(() => {})
          // Request permission on first launch (iOS shows the native prompt)
          OneSignal.Notifications.requestPermission(true).catch(() => {})
        })
        .catch(() => {
          // Package not yet installed — silently ignore in dev.
          console.warn('[OneSignal] @onesignal/capacitor-plugin not installed. Run: npm install @onesignal/capacitor-plugin')
        })
      return
    }

    // ── Web / PWA path ─────────────────────────────────────────────────────────
    const init = async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        })
        await OneSignal.login(userId)
      } catch {
        // Silently ignore — already initialised or blocked.
      }
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(init)
  }, [userId])

  // Only inject the CDN script tag on web — native handles its own SDK
  if (isNativePlatform()) return null

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  )
}
