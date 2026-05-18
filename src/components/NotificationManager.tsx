'use client'

/**
 * NotificationManager — mounts once in the authenticated layout.
 *
 * On every app open it:
 *   1. Reads the user's stored notification preferences
 *   2. Sets up Android notification channels (idempotent)
 *   3. Re-applies the full notification schedule
 *
 * This ensures schedules survive app reinstall, OS permission resets,
 * or the user editing their preferences from another device.
 *
 * Completely silent on web — isNativePlatform() guards every Capacitor call.
 */

import { useEffect } from 'react'
import { isNativePlatform } from '@/lib/platform'
import { loadNotifPrefs } from '@/lib/notification-prefs'
import { applyNotificationSchedule } from '@/lib/notifications'

export default function NotificationManager() {
  useEffect(() => {
    if (!isNativePlatform()) return

    const prefs = loadNotifPrefs()
    applyNotificationSchedule(prefs).catch(e => {
      console.warn('[NotificationManager] Schedule failed:', e)
    })
  }, [])

  return null
}
