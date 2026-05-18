'use client'

/**
 * DeepLinkHandler — listens for incoming Universal Links / App Links
 * inside the Capacitor native shell and forwards them to Next.js router.
 *
 * On web this component is a no-op (Capacitor.App is not available).
 *
 * Handles:
 *  • synapfit.app/auth/callback  → Supabase magic-link / OAuth redirect
 *  • synapfit.app/auth/reset-password → password reset
 *  • synapfit.app/*              → any deep-linked page
 *
 * Place <DeepLinkHandler /> once in a layout that wraps authenticated pages
 * (e.g. the (app) group layout, or root layout after auth).
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNativePlatform } from '@/lib/platform'

export default function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativePlatform()) return

    let cleanup: (() => void) | undefined

    import('@capacitor/app').then(({ App }) => {
      const handler = App.addListener('appUrlOpen', (event: { url: string }) => {
        try {
          const url = new URL(event.url)
          // Strip origin, keep pathname + search + hash
          const path = url.pathname + url.search + url.hash
          router.push(path)
        } catch {
          // Malformed URL — ignore
        }
      })

      cleanup = () => { handler.then(h => h.remove()).catch(() => {}) }
    }).catch(() => {})

    return () => { cleanup?.() }
  }, [router])

  return null
}
