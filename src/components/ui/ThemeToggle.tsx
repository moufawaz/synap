'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { usePathname } from 'next/navigation'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'synap_theme'
const POSITION_KEY = 'synap_theme_toggle_position'
const SIZE = 44
const EDGE = 16

type Position = { x: number; y: number }

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

function clampPosition(position: Position): Position {
  if (typeof window === 'undefined') return position
  return {
    x: Math.min(Math.max(EDGE, position.x), window.innerWidth - SIZE - EDGE),
    y: Math.min(Math.max(EDGE, position.y), window.innerHeight - SIZE - EDGE),
  }
}

function defaultPosition(pathname: string | null): Position {
  if (typeof window === 'undefined') return { x: EDGE, y: EDGE }
  const x = window.innerWidth - SIZE - EDGE
  const y = pathname === '/chat'
    ? 74
    : window.innerHeight - SIZE - (window.innerWidth >= 768 ? 20 : 96)
  return clampPosition({ x, y })
}

function loadPosition(pathname: string | null): Position {
  if (typeof window === 'undefined') return defaultPosition(pathname)
  try {
    const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY) || 'null')
    if (typeof saved?.x === 'number' && typeof saved?.y === 'number') {
      const safe = clampPosition(saved)
      if (pathname === '/chat' && safe.y > window.innerHeight - 160) {
        return defaultPosition(pathname)
      }
      return safe
    }
  } catch {}
  return defaultPosition(pathname)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const pathname = usePathname()
  const [position, setPosition] = useState<Position | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    applyTheme(initial)
    setPosition(loadPosition(pathname))
  }, [pathname])

  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

  function toggleTheme() {
    if (dragRef.current?.moved) return
    setTheme(nextTheme)
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!position) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setPosition(clampPosition({ x: drag.originX + dx, y: drag.originY + dy }))
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const finalPosition = position ? clampPosition(position) : defaultPosition(pathname)
    setPosition(finalPosition)
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(finalPosition))
    } catch {}
    window.setTimeout(() => {
      dragRef.current = null
    }, 0)
  }

  useEffect(() => {
    function handleResize() {
      setPosition(prev => {
        const next = clampPosition(prev ?? defaultPosition(pathname))
        try {
          window.localStorage.setItem(POSITION_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pathname])

  return (
    <button
      type="button"
      onClick={toggleTheme}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode. Drag to move.`}
      className="fixed z-[40] h-11 w-11 rounded-full border transition-colors duration-200 flex items-center justify-center touch-none select-none"
      style={{
        left: position?.x ?? -999,
        top: position?.y ?? -999,
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
