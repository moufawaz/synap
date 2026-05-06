'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { Language } from './i18n'
import { t as translate } from './i18n'

const LANG_STORAGE_KEY = 'synap_lang'

export function useLanguage() {
  const [lang, setLangState] = useState<Language>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
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
    setLangState(newLang)
    try { localStorage.setItem(LANG_STORAGE_KEY, newLang) } catch {}
    // Immediate DOM update for instant RTL switch
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
    // Persist to Supabase
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ language: newLang }).eq('id', user.id)
      }
    } catch (err) {
      console.error('[useLanguage] Failed to persist language preference:', err)
    }
  }, [])

  const isRTL = lang === 'ar'

  // Convenience: pre-bound translation function for current language
  const tt = useCallback((key: Parameters<typeof translate>[1]) => translate(lang, key), [lang])

  return { lang, setLang, isRTL, ready, t: tt }
}
