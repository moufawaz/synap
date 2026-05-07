'use client'

import Link from 'next/link'
import { Users, MessageSquare, Trophy, Flame, Lock, Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

const UPCOMING_FEATURES = [
  {
    icon: <MessageSquare size={20} style={{ color: '#BB5CF6' }} />,
    title: 'Training Threads',
    description: 'Share your workouts, tag exercises, and discuss training strategies with the SYNAP community.',
    color: '#BB5CF6',
  },
  {
    icon: <Trophy size={20} style={{ color: '#F59E0B' }} />,
    title: 'Weekly Challenges',
    description: 'Compete in Ion-curated weekly fitness challenges. Track your rank on the live leaderboard.',
    color: '#F59E0B',
  },
  {
    icon: <Flame size={20} style={{ color: '#F97316' }} />,
    title: 'Progress Showcase',
    description: 'Share your transformation photos and milestones. Celebrate wins together.',
    color: '#F97316',
  },
  {
    icon: <Users size={20} style={{ color: '#10B981' }} />,
    title: 'Training Partners',
    description: 'Find athletes in your city with similar goals and training schedules.',
    color: '#10B981',
  },
]

export default function CommunityPage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>COMING SOON</p>
        <h1 className="font-heading font-bold text-2xl text-white tracking-wide">Community</h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#64748B' }}>Train together. Push harder. Grow faster.</p>
      </div>

      {/* Hero card */}
      <div
        className="rounded-3xl p-8 mb-8 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(187,92,246,0.12), rgba(123,47,255,0.06))', border: '1px solid rgba(187,92,246,0.2)' }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(187,92,246,0.15), transparent 70%)', filter: 'blur(40px)' }}
        />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.3)' }}>
            <Users size={28} style={{ color: '#BB5CF6' }} />
          </div>
          <h2 className="font-heading font-black text-2xl text-white mb-3">
            The SYNAP Community
          </h2>
          <p className="font-heading text-sm leading-relaxed mb-6" style={{ color: '#94A3B8', maxWidth: '360px', margin: '0 auto 24px' }}>
            We&apos;re building a community of serious athletes. Weekly challenges, training threads, and real accountability — launching soon.
          </p>
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }}
          >
            <Lock size={14} />
            In Development
          </div>
        </div>
      </div>

      {/* Upcoming features */}
      <p className="font-heading text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#475569', letterSpacing: '0.18em' }}>
        WHAT&apos;S COMING
      </p>
      <div className="flex flex-col gap-3 mb-8">
        {UPCOMING_FEATURES.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-5 rounded-2xl"
            style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
            >
              {f.icon}
            </div>
            <div>
              <p className="font-heading font-bold text-sm text-white mb-1">{f.title}</p>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#64748B' }}>{f.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Interest CTA */}
      <div
        className="rounded-2xl p-5 flex items-start gap-4"
        style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}
      >
        <Bell size={18} style={{ color: '#BB5CF6', flexShrink: 0, marginTop: 2 }} />
        <div className="flex-1">
          <p className="font-heading font-bold text-sm text-white mb-1">Want early access?</p>
          <p className="font-heading text-xs leading-relaxed mb-3" style={{ color: '#64748B' }}>
            Elite members get first access when Community launches. Upgrade now to be in the founding cohort.
          </p>
          <Link href="/pricing">
            <button
              className="font-heading font-bold text-xs px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.06em', boxShadow: '0 0 16px rgba(187,92,246,0.3)' }}
            >
              Get Elite Access →
            </button>
          </Link>
        </div>
      </div>

    </div>
  )
}
