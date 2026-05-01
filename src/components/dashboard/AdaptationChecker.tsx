'use client'

import { useEffect } from 'react'

// Runs Ion's daily adaptation check silently on first dashboard visit of the day
export default function AdaptationChecker() {
  useEffect(() => {
    const key = `synap_check_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return // already ran today

    // Fire and forget — don't block dashboard load
    fetch('/api/adaptation-check', { method: 'POST' })
      .then(() => localStorage.setItem(key, '1'))
      .catch(() => {}) // silently fail
  }, [])

  return null // renders nothing
}
