'use client'

import { useEffect } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    OneSignalDeferred?: ((os: any) => Promise<void>)[]
  }
}

interface Props {
  userId: string
}

export default function OneSignalInit({ userId }: Props) {
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    const init = async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        })
        // Link this browser to the Supabase user ID
        await OneSignal.login(userId)
      } catch (e) {
        // Silently ignore — e.g. already initialised
      }
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(init)
  }, [userId])

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  )
}
