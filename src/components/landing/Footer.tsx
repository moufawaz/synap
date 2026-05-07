'use client'

import Link from 'next/link'
import SynapLogo from '@/components/ui/SynapLogo'
import { type Language, t } from '@/lib/i18n'
import { Mail } from 'lucide-react'

interface FooterProps {
  lang: Language
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1-.07z" />
    </svg>
  )
}

const SOCIAL = [
  { href: 'https://x.com/_synapfit',                     Icon: XIcon,         label: 'X / Twitter' },
  { href: 'https://www.instagram.com/synap.fit/',        Icon: InstagramIcon,  label: 'Instagram' },
  { href: 'https://www.tiktok.com/@synap.fit',           Icon: TikTokIcon,    label: 'TikTok' },
  { href: 'mailto:ion@synapfit.app',                     Icon: Mail,          label: 'Email Support' },
]

export default function Footer({ lang }: FooterProps) {
  const isRTL = lang === 'ar'

  const links = [
    { label: t(lang, 'nav_features'),                         href: '#features' },
    { label: t(lang, 'nav_how_it_works'),                     href: '#how-it-works' },
    { label: lang === 'ar' ? 'الأسعار'    : 'Pricing',        href: '/pricing' },
    { label: lang === 'ar' ? 'تواصل معنا' : 'Contact Us',     href: '/contact' },
    { label: t(lang, 'footer_privacy'),                       href: '/privacy' },
    { label: t(lang, 'footer_terms'),                         href: '/terms' },
  ]

  return (
    <footer
      className="relative border-t border-white/5 py-12"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">

          {/* Brand + Social */}
          <div className={`flex flex-col gap-4 ${isRTL ? 'items-end' : 'items-start'}`}>
            <SynapLogo size="sm" />
            <p className="text-light-muted text-sm max-w-xs leading-relaxed">
              {t(lang, 'footer_tagline')}
            </p>
            {/* Real social links */}
            <div className="flex items-center gap-2">
              {SOCIAL.map(({ href, Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  title={label}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center transition-all duration-200"
                  style={{ color: '#64748B' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = '#BB5CF6'
                    el.style.borderColor = 'rgba(187,92,246,0.35)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = '#64748B'
                    el.style.borderColor = 'rgba(255,255,255,0.1)'
                  }}
                >
                  <Icon size={13} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className={`flex flex-col gap-4 ${isRTL ? 'items-end' : 'items-start'}`}>
            <h4 className="font-heading font-semibold text-light text-sm uppercase tracking-wider">
              {t(lang, 'footer_links')}
            </h4>
            <ul className={`flex flex-col gap-2 ${isRTL ? 'items-end' : 'items-start'}`}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-light-muted hover:text-light text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / CTA */}
          <div className={`flex flex-col gap-4 ${isRTL ? 'items-end' : 'items-start'}`}>
            <h4 className="font-heading font-semibold text-light text-sm uppercase tracking-wider">
              {isRTL ? 'ابدأ الآن' : 'Get Started'}
            </h4>
            <p className="text-light-muted text-sm">
              {isRTL
                ? 'Ion جاهز لبناء خطتك الآن. مجاناً، بدون بطاقة.'
                : 'Ion is ready to build your plan right now. Free, no card.'}
            </p>
            <Link href="/auth/signup" className="btn-primary text-sm px-5 py-2.5">
              {t(lang, 'nav_cta')}
            </Link>
            <a
              href="mailto:ion@synapfit.app"
              className="flex items-center gap-2 text-sm transition-colors duration-200"
              style={{ color: '#64748B' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#BB5CF6' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B' }}
            >
              <Mail size={13} />
              ion@synapfit.app
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <p className="text-light-muted/60 text-xs">
            {t(lang, 'footer_copy')}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            <span className="text-light-muted/60 text-xs">
              {isRTL ? 'جميع الأنظمة تعمل' : 'All systems operational'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
