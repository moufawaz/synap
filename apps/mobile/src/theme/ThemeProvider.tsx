import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { colors, ThemeColors, ThemeMode } from './colors'

type ThemeContextValue = {
  mode: ThemeMode
  color: ThemeColors
  setMode: (mode: ThemeMode) => Promise<void>
  toggleMode: () => Promise<void>
}

const STORAGE_KEY = 'synap_theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>(system === 'light' ? 'light' : 'dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (value === 'dark' || value === 'light') setModeState(value)
    }).catch(() => {})
  }, [])

  async function setMode(next: ThemeMode) {
    setModeState(next)
    await AsyncStorage.setItem(STORAGE_KEY, next)
  }

  async function toggleMode() {
    await setMode(mode === 'dark' ? 'light' : 'dark')
  }

  const value = useMemo(() => ({
    mode,
    color: colors[mode],
    setMode,
    toggleMode,
  }), [mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
