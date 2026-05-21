'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SNOOZE_KEY = 'synap_install_prompt_snoozed_until'

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as any).standalone)
}

function isMobileLike() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isiOS, setIsiOS] = useState(false)

  useEffect(() => {
    // Never show inside the native Capacitor app — user is already installed
    if ((window as any).Capacitor?.isNativePlatform?.()) return
    if (isStandalone() || !isMobileLike()) return

    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    if (Number.isFinite(snoozedUntil) && snoozedUntil > Date.now()) return

    const userAgent = window.navigator.userAgent
    const ios = /iPhone|iPad|iPod/i.test(userAgent) && !(window.navigator as any).standalone
    setIsiOS(ios)

    const showTimer = window.setTimeout(() => setVisible(true), 3500)
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => {
      window.clearTimeout(showTimer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  if (!visible || isStandalone()) return null

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    setVisible(false)
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  return (
    <div className="fixed left-3 right-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div
        className="rounded-2xl p-4 shadow-2xl"
        style={{
          background: 'rgba(14,14,14,0.96)',
          border: '1px solid rgba(187,92,246,0.24)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(187,92,246,0.14)', color: '#CC80FF' }}>
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-sm text-white">Install SYNAP</p>
            <p className="font-heading text-xs leading-relaxed mt-0.5" style={{ color: '#94A3B8' }}>
              {isiOS ? 'Open Share, then Add to Home Screen for the app experience.' : 'Add SYNAP to your home screen for faster access.'}
            </p>
            {!isiOS && deferredPrompt && (
              <button
                onClick={install}
                className="mt-3 px-4 py-2 rounded-xl font-heading font-bold text-xs"
                style={{ background: '#BB5CF6', color: 'white' }}
              >
                INSTALL
              </button>
            )}
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: '#64748B' }} aria-label="Dismiss install prompt">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
