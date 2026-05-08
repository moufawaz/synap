'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'synap_theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

  function toggleTheme() {
    setTheme(nextTheme)
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="fixed bottom-24 right-4 md:bottom-5 md:right-5 z-[70] h-11 w-11 rounded-full border transition-all duration-200 flex items-center justify-center"
      style={{
        background: 'var(--void-elevated)',
        borderColor: 'var(--silver-rim)',
        color: 'var(--silver)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18), 0 0 20px rgba(187,92,246,0.16)',
      }}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
