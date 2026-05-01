'use client'

import SynapLogo from '@/components/ui/SynapLogo'
import Link from 'next/link'

interface AuthCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Background orbs */}
      <div className="orb w-[500px] h-[500px] top-[-100px] left-1/2 -translate-x-1/2" style={{ background: 'rgba(187,92,246,0.1)' }} />
      <div className="orb w-[300px] h-[300px] bottom-[-50px] right-[-50px]" style={{ background: 'rgba(187,92,246,0.06)' }} />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(187,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(187,92,246,1) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-10">
          <SynapLogo size="md" showTagline />
        </Link>

        {/* Card */}
        <div className="glass-card p-8 gradient-border" style={{ background: '#0E0E0E' }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-heading font-black text-2xl text-white tracking-widest mb-2" style={{ letterSpacing: '0.12em' }}>
              {title}
            </h1>
            <p className="font-heading text-sm tracking-wider" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 text-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
