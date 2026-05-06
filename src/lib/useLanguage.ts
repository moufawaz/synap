'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Language } from './i18n'
import { t as translate } from './i18n'

const LANG_STORAGE_KEY = 'synap_lang'
// Written before reload so the new tab-session won't loop; cleared on mount.
const RELOAD_GUARD_KEY = 'synap_lang_reloading'

export function useLanguage() {
  const [lang, setLangState] = useState<Language>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Clear the reload guard that was set before the last reload
    try { sessionStorage.removeItem(RELOAD_GUARD_KEY) } catch {}

    // 1. Read localStorage immediately (fast, avoids flash)
    try {
      const cached = localStorage.getItem(LANG_STORAGE_KEY) as Language | null
      if (cached === 'en' || cached === 'ar') setLangState(cached)
    } catch {}

    // 2. Load authoritative preference from Supabase
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setReady(true); return }
      supabase
        .from('users')
        .select('language')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const dbLang = data?.language as Language | undefined
          if (dbLang === 'en' || dbLang === 'ar') {
            setLangState(dbLang)
            try { localStorage.setItem(LANG_STORAGE_KEY, dbLang) } catch {}
          }
          setReady(true)
        })
    })
  }, [])

  // Apply RTL to the document whenever language changes
  useEffect(() => {
    if (!ready) return
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, ready])

  const setLang = useCallback(async (newLang: Language) => {
    // ── Prevent infinite reload loops ────────────────────────────────────────
    // sessionStorage survives a location.reload() within the same tab but is
    // cleared when the tab is closed, so the guard is always scoped correctly.
    try {
      const guard = sessionStorage.getItem(RELOAD_GUARD_KEY)
      if (guard === newLang) return   // reload already in-flight for this value
      sessionStorage.setItem(RELOAD_GUARD_KEY, newLang)
    } catch {}

    // Persist to localStorage BEFORE the reload — new page reads it immediately
    try { localStorage.setItem(LANG_STORAGE_KEY, newLang) } catch {}

    // Immediate DOM update so RTL flips before the spinner appears
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang

    // Persist to Supabase (fire-and-forget; reload happens right after)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ language: newLang }).eq('id', user.id)
      }
    } catch (err) {
      console.error('[useLanguage] Failed to persist language preference:', err)
    }

    // Full reload so all server components and React state re-initialise with
    // the persisted language — no stale client state from before the switch.
    window.location.reload()
  }, [])

  const isRTL = lang === 'ar'

  // Convenience: pre-bound translation function for current language
  const tt = useCallback((key: Parameters<typeof translate>[1]) => translate(lang, key), [lang])

  return { lang, setLang, isRTL, ready, t: tt }
}
