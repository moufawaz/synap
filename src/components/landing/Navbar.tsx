'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SynapLogo from '@/components/ui/SynapLogo'
import { type Language, t } from '@/lib/i18n'
import { Menu, X, Globe, LayoutDashboard, Dumbbell, MessageCircle, UtensilsCrossed } from 'lucide-react'

interface NavbarProps {
  lang: Language
  onLangChange: (lang: Language) => void
  isLoggedIn?: boolean
  userName?: string
}

export default function Navbar({ lang, onLangChange, isLoggedIn = false, userName = '' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const publicLinks = [
    { label: t(lang, 'nav_features'), href: '#features' },
    { label: t(lang, 'nav_how_it_works'), href: '#how-it-works' },
  ]

  const appLinks = [
    { label: 'DASHBOARD', href: '/dashboard', icon: <LayoutDashboard size={13} /> },
    { label: 'WORKOUT', href: '/workout/today', icon: <Dumbbell size={13} /> },
    { label: 'NUTRITION', href: '/nutrition', icon: <UtensilsCrossed size={13} /> },
    { label: 'ASK ION', href: '/chat', icon: <MessageCircle size={13} /> },
  ]

  const firstName = userName ? userName.split(' ')[0] : ''

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={scrolled
        ? { background: 'rgba(12,12,12,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }
        : { background: 'transparent' }
      }
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <SynapLogo size="sm" showTagline={false} />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {isLoggedIn ? (
            // App navigation links for logged-in users
            appLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 font-heading font-medium text-xs tracking-widest transition-colors duration-200"
                style={{ color: '#64748B', letterSpacing: '0.1em' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E2E8F0' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B' }}
              >
                {link.icon}
                {link.label}
              </Link>
            ))
          ) : (
            publicLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative group font-heading font-medium text-sm tracking-widest transition-colors duration-200"
                style={{ color: '#94A3B8', letterSpacing: '0.1em' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#E2E8F0' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = '#94A3B8' }}
              >
                {link.label.toUpperCase()}
                <span
                  className="absolute -bottom-1 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"
                  style={{ background: 'linear-gradient(90deg, #BB5CF6, transparent)' }}
                />
              </a>
            ))
          )}
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => onLangChange(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-heading font-semibold transition-all duration-200 tracking-wider"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = 'rgba(187,92,246,0.3)'
              el.style.color = '#E2E8F0'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'rgba(255,255,255,0.08)'
              el.style.color = '#94A3B8'
            }}
          >
            <Globe size={13} />
            <span>{lang === 'en' ? 'العربية' : 'ENGLISH'}</span>
          </button>

          {isLoggedIn ? (
            <>
              {firstName && (
                <span className="text-xs font-heading font-semibold tracking-widest" style={{ color: '#64748B' }}>
                  Hey, {firstName}
                </span>
              )}
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 btn-primary text-xs px-5 py-2.5 font-heading font-bold"
                style={{ letterSpacing: '0.1em' }}
              >
                <LayoutDashboard size={12} />
                DASHBOARD
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-xs font-heading font-semibold tracking-widest transition-colors"
                style={{ color: '#94A3B8', letterSpacing: '0.1em' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#E2E8F0' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = '#94A3B8' }}
              >
                {t(lang, 'nav_login').toUpperCase()}
              </Link>
              <Link
                href="/auth/signup"
                className="btn-primary text-xs px-5 py-2.5 font-heading font-bold"
                style={{ letterSpacing: '0.1em' }}
              >
                {t(lang, 'nav_cta').toUpperCase()}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: Lang + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => onLangChange(lang === 'en' ? 'ar' : 'en')}
            className="px-2.5 py-1.5 rounded-lg border text-xs font-heading font-bold transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          >
            {lang === 'en' ? 'ع' : 'EN'}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg border transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden backdrop-blur-xl"
          style={{ background: 'rgba(10,10,10,0.97)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="px-4 py-5 flex flex-col gap-4">
            {isLoggedIn ? (
              // App links for logged-in users
              appLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-sm font-heading font-semibold py-2 transition-colors tracking-widest"
                  style={{ color: '#94A3B8', letterSpacing: '0.12em' }}
                >
                  {link.icon} {link.label}
                </Link>
              ))
            ) : (
              publicLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-heading font-semibold py-2 transition-colors tracking-widest"
                  style={{ color: '#94A3B8', letterSpacing: '0.12em' }}
                >
                  {link.label.toUpperCase()}
                </a>
              ))
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-3 flex flex-col gap-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="btn-primary text-sm text-center font-heading font-bold tracking-widest flex items-center justify-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard size={14} /> OPEN DASHBOARD
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm font-heading font-semibold py-2 transition-colors tracking-widest"
                    style={{ color: '#94A3B8', letterSpacing: '0.12em' }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t(lang, 'nav_login').toUpperCase()}
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn-primary text-sm text-center font-heading font-bold tracking-widest"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t(lang, 'nav_cta').toUpperCase()}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
