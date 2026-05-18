'use client'

import { useEffect, useState } from 'react'
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
 * Web / PWA:
 *   Loads the OneSignal Web SDK v16 via CDN and links the Supabase user ID.
 *   This is the existing production path — zero change for web users.
 *
 * Native Capacitor (iOS / Android):
 *   Initialises @onesignal/capacitor-plugin instead of the Web SDK.
 *   The CDN <Script> tag is NOT rendered — it would conflict with APNs/FCM.
 *
 * SSR safety:
 *   `isNativePlatform()` must NOT be called during render because the server
 *   always returns false (no window.Capacitor) while the Capacitor client may
 *   return true → React hydration mismatch.  We resolve it in useEffect and
 *   use a `native` state that starts false (matching server) and updates on
 *   the client after hydration.
 */
export default function OneSignalInit({ userId }: Props) {
  // Starts false so server and client first render both agree on <Script>
  const [native, setNative] = useState(false)

  useEffect(() => {
    const isNative = isNativePlatform()
    setNative(isNative)

    if (!userId) return

    if (isNative) {
      // ── Native Capacitor path ──────────────────────────────────────────────
      // Dynamic import keeps the Capacitor SDK out of the web bundle entirely.
      import('@onesignal/capacitor-plugin')
        .then((mod) => {
          // The plugin uses a default export: OneSignalPlugin
          const OS: any = mod.default ?? (mod as any).OneSignal
          OS.initialize(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!)
          OS.login(userId).catch(() => {})
          // requestPermission API for @onesignal/capacitor-plugin v1.x
          OS.requestPermission({ fallbackToSettings: true }).catch(() => {})
        })
        .catch(() => {
          console.warn('[OneSignal] @onesignal/capacitor-plugin not installed.')
        })
      return
    }

    // ── Web / PWA path ─────────────────────────────────────────────────────
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
        // Already initialised or permission blocked — ignore
      }
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(init)
  }, [userId])

  // native starts false → server renders <Script> → client first render
  // also renders <Script> (hydration match) → useEffect sets native=true if
  // in Capacitor → re-render suppresses <Script>.  Safe for web users.
  if (native) return null

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  )
}
