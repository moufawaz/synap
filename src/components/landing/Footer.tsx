'use client'

import Link from 'next/link'
import SynapLogo from '@/components/ui/SynapLogo'
import { type Language, t } from '@/lib/i18n'

interface FooterProps {
  lang: Language
}

export default function Footer({ lang }: FooterProps) {
  const isRTL = lang === 'ar'

  const links = [
    { label: t(lang, 'nav_features'), href: '#features' },
    { label: t(lang, 'nav_how_it_works'), href: '#how-it-works' },
    { label: lang === 'ar' ? 'الأسعار' : 'Pricing', href: '/pricing' },
    { label: t(lang, 'footer_privacy'), href: '/privacy' },
    { label: t(lang, 'footer_terms'), href: '/terms' },
  ]

  return (
    <footer
      className="relative border-t border-white/5 py-12"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div className={`flex flex-col gap-4 ${isRTL ? 'items-end' : 'items-start'}`}>
            <SynapLogo size="sm" />
            <p className="text-light-muted text-sm max-w-xs leading-relaxed">
              {t(lang, 'footer_tagline')}
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {['𝕏', 'in', 'IG'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-light-muted hover:text-light hover:border-violet/30 text-xs transition-all duration-200"
                >
                  {social}
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
                  <a
                    href={link.href}
                    className="text-light-muted hover:text-light text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
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
            <Link
              href="/auth/signup"
              className="btn-primary text-sm px-5 py-2.5"
            >
              {t(lang, 'nav_cta')}
            </Link>
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
