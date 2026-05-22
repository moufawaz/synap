import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { I18nManager } from 'react-native'
import { Language, TranslationMap, t } from './translations'

type LanguageContextValue = {
  language: Language
  isRtl: boolean
  text: TranslationMap
  setLanguage: (language: Language) => Promise<void>
}

const STORAGE_KEY = 'synap_language'
const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (value === 'en' || value === 'ar') setLanguageState(value)
    }).catch(() => {})
  }, [])

  async function setLanguage(next: Language) {
    setLanguageState(next)
    I18nManager.allowRTL(next === 'ar')
    await AsyncStorage.setItem(STORAGE_KEY, next)
  }

  const value = useMemo(() => ({
    language,
    isRtl: language === 'ar',
    text: t[language],
    setLanguage,
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}
