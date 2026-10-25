'use client'

import { useEffect } from 'react'
import { TIMEZONE_COOKIE } from '@/lib/user-time'

// Stores the browser's IANA timezone in a cookie so server components (the
// dashboard) can show "today's workout" and the greeting in the user's local
// time instead of the server's UTC clock.
export default function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz) return
      const current = document.cookie.split('; ').find(c => c.startsWith(`${TIMEZONE_COOKIE}=`))
      if (current === `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)}`) return
      document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
    } catch { /* non-fatal */ }
  }, [])
  return null
}
