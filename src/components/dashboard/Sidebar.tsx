'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SynapLogo from '@/components/ui/SynapLogo'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  LayoutDashboard, MessageCircle, Dumbbell, UtensilsCrossed,
  Ruler, TrendingUp, Settings, Shield, LogOut, ClipboardList, Flame,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'DASHBOARD',       labelAr: 'الرئيسية' },
  { href: '/chat',          icon: MessageCircle,   label: 'ASK ION',         labelAr: 'تحدث مع Ion' },
  { href: '/plan',          icon: ClipboardList,   label: 'MY PLAN',         labelAr: 'خطتي' },
  { href: '/workout/today', icon: Flame,           label: "TODAY'S WORKOUT", labelAr: 'تمرين اليوم' },
  { href: '/workout',       icon: Dumbbell,        label: 'PROGRAMME',       labelAr: 'البرنامج' },
  { href: '/nutrition',     icon: UtensilsCrossed, label: 'NUTRITION',       labelAr: 'التغذية' },
  { href: '/measurements',  icon: Ruler,           label: 'MEASUREMENTS',    labelAr: 'القياسات' },
  { href: '/progress',      icon: TrendingUp,      label: 'PROGRESS',        labelAr: 'التقدم' },
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
