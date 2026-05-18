'use client'

/**
 * DeepLinkHandler — two-in-one:
 *
 * 1. Universal / App Links — incoming URLs from the OS when the user taps
 *    a synapfit.app link in Safari, email, etc.  Forwarded to Next.js router.
 *
 * 2. Local Notification taps — when the user taps a local notification, the
 *    `localNotificationActionPerformed` event fires.  We read `notification.extra.url`
 *    (set by the NotificationScheduler) and route to that screen.
 *
 * On web both listeners are no-ops.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNativePlatform } from '@/lib/platform'

export default function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativePlatform()) return

    const cleanups: (() => void)[] = []

    // ── 1. Universal Links (synapfit.app URLs tapped outside the app) ────────
    import('@capacitor/app').then(({ App }) => {
      const handler = App.addListener('appUrlOpen', (event: { url: string }) => {
        try {
          const url = new URL(event.url)
          const path = url.pathname + url.search + url.hash
          router.push(path)
        } catch {
          // Malformed URL — ignore
        }
      })
      cleanups.push(() => { handler.then(h => h.remove()).catch(() => {}) })
    }).catch(() => {})

    // ── 2. Local notification taps ───────────────────────────────────────────
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      const handler = LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
          try {
            // The scheduler stores the deep-link path in `extra.url`
            const url: string | undefined = action.notification?.extra?.url
            if (url && url.startsWith('/')) {
              router.push(url)
            }
          } catch {
            // Ignore
          }
        },
      )
      cleanups.push(() => { handler.then(h => h.remove()).catch(() => {}) })
    }).catch(() => {})

    return () => {
      cleanups.forEach(fn => fn())
    }
  }, [router])

  return null
}
