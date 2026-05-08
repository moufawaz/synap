'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SynapLogo from '@/components/ui/SynapLogo'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  LayoutDashboard, MessageCircle, Dumbbell, UtensilsCrossed,
  Ruler, TrendingUp, Settings, Shield, LogOut, ClipboardList, Flame, Mail,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { clearSessionPersistenceFlags } from '@/lib/auth-session'
import { useRouter } from 'next/navigation'

// ── Brand social icons (inline SVG — no external deps) ────────
function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function InstagramIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
function TikTokIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1-.07z" />
    </svg>
  )
}

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'DASHBOARD',       labelAr: 'DASHBOARD' },
  { href: '/chat',          icon: MessageCircle,   label: 'ASK ION',         labelAr: 'ASK ION' },
  { href: '/plan',          icon: ClipboardList,   label: 'MY PLAN',         labelAr: 'MY PLAN' },
  { href: '/workout/today', icon: Flame,           label: "TODAY'S WORKOUT", labelAr: "TODAY'S WORKOUT" },
  { href: '/workout',       icon: Dumbbell,        label: 'PROGRAMME',       labelAr: 'PROGRAMME' },
  { href: '/nutrition',     icon: UtensilsCrossed, label: 'NUTRITION',       labelAr: 'NUTRITION' },
  { href: '/measurements',  icon: Ruler,           label: 'MEASUREMENTS',    labelAr: 'MEASUREMENTS' },
  { href: '/progress',      icon: TrendingUp,      label: 'PROGRESS',        labelAr: 'PROGRESS' },
]
interface SidebarProps {
  user: { name: string; email: string; gender?: string; isAdmin?: boolean }
  lang?: 'en' | 'ar'
}

export default function Sidebar({ user, lang = 'en' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isRTL = lang === 'ar'

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    clearSessionPersistenceFlags()
    router.push('/')
  }

  function isActive(href: string) {
    if (href === '/dashboard')     return pathname === '/dashboard'
    if (href === '/workout/today') return pathname === '/workout/today'
    if (href === '/workout')       return pathname === '/workout'
    return pathname.startsWith(href)
  }

  // ── Brand-aligned link styles ─────────────────────────
  const linkStyle = (active: boolean) => ({
    color:       active ? '#D88BFF' : '#64748B',
    background:  active ? 'rgba(187, 92, 246, 0.10)' : 'transparent',
    border:      active ? '1px solid rgba(187, 92, 246, 0.25)' : '1px solid transparent',
    boxShadow:   active ? 'inset 0 0 20px rgba(187, 92, 246, 0.06)' : 'none',
    letterSpacing: '0.14em',
  })

  return (
    <aside
      className="hidden md:flex flex-col w-64 h-screen sticky top-0 flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #080808 0%, #0A0A0A 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div
        className="px-5 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
      >
        <SynapLogo size="sm" />
      </div>

      {/* ── Nav ──────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {NAV.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-heading font-semibold transition-all duration-200 relative group"
              style={linkStyle(active)}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = '#E2E8F0'
                  el.style.background = 'rgba(255, 255, 255, 0.02)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = '#64748B'
                  el.style.background = 'transparent'
                }
              }}
            >
              {/* Active rail */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
                  style={{
                    background: 'linear-gradient(180deg, #BB5CF6 0%, #7B2FFF 100%)',
                    boxShadow: '0 0 8px rgba(187, 92, 246, 0.6)',
                  }}
                />
              )}
              <item.icon
                size={15}
                style={{ flexShrink: 0, opacity: active ? 1 : 0.55 }}
              />
              <span>{isRTL ? item.labelAr : item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom section ───────────────────────── */}
      <div
        className="flex-shrink-0 px-3 pb-4 flex flex-col gap-1"
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          paddingTop: '12px',
        }}
      >
        {user.isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-heading font-semibold transition-all"
            style={linkStyle(pathname === '/admin')}
          >
            <Shield size={15} /> ADMIN
          </Link>
        )}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-heading font-semibold transition-all"
          style={linkStyle(pathname === '/settings')}
        >
          <Settings size={15} />
          {isRTL ? 'الإعدادات' : 'SETTINGS'}
        </Link>

        {/* ── Social links ───────────────────────── */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[
            { href: 'https://x.com/_synapfit',                Icon: XIcon,        label: 'X / Twitter' },
            { href: 'https://www.instagram.com/synap.fit/',   Icon: InstagramIcon, label: 'Instagram' },
            { href: 'https://www.tiktok.com/@synap.fit',      Icon: TikTokIcon,   label: 'TikTok' },
            { href: 'mailto:ion@synapfit.app',                Icon: Mail,         label: 'Support' },
          ].map(({ href, Icon, label }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              title={label}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#334155' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#BB5CF6' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155' }}
            >
              <Icon size={13} />
            </a>
          ))}
        </div>

        {/* ── User card ──────────────────────────── */}
        <div
          className="mt-2 p-3 rounded-xl relative overflow-hidden"
          style={{
            background: '#0E0E0E',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Subtle violet rim glow on the user card */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-xl pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(120% 80% at 0% 0%, rgba(187, 92, 246, 0.10), transparent 60%)',
            }}
          />
          <div className="flex items-center gap-2.5 relative">
            <IonAvatar gender={(user.gender as 'male' | 'female') || 'male'} size="sm" />
            <div className="flex-1 min-w-0">
              <p
                className="font-heading font-bold text-xs text-white truncate"
                style={{ letterSpacing: '0.08em' }}
              >
                {user.name || 'ATHLETE'}
              </p>
              <p
                className="font-heading text-[10px] truncate"
                style={{ color: '#475569', letterSpacing: '0.04em' }}
              >
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg transition-all flex-shrink-0"
              style={{ color: '#475569' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#BB5CF6'
                el.style.background = 'rgba(187, 92, 246, 0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#475569'
                el.style.background = 'transparent'
              }}
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
