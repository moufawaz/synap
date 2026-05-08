'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { SESSION_ACTIVE_KEY, SESSION_MODE_KEY } from '@/lib/auth-session'

export default function SessionPersistenceGate() {
  useEffect(() => {
    try {
      const mode = localStorage.getItem(SESSION_MODE_KEY)
      if (mode !== 'session') return

      const isSameBrowserSession = sessionStorage.getItem(SESSION_ACTIVE_KEY) === '1'
      if (isSameBrowserSession) return

      localStorage.removeItem(SESSION_MODE_KEY)
      createBrowserClient().auth.signOut().catch(() => {})
    } catch {}
  }, [])

  return null
}
