import Link from 'next/link'
import SynapLogo from '@/components/ui/SynapLogo'

export const metadata = {
  title: 'Support — SYNAP',
  description: 'Get help with your SYNAP account, training plan, or technical issues.',
}

const FAQ = [
  {
    q: 'How do I reset my password?',
    a: 'Go to the login page and tap "Forgot password". We\'ll email you a reset link within a few seconds. Check your spam folder if it doesn\'t arrive.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'On web: go to Settings → Billing and use the manage subscription link. On iOS: go to Settings → Apple ID → Subscriptions → SYNAP. On Android: go to Play Store → Subscriptions → SYNAP. Your access continues until the end of the current billing period.',
  },
  {
    q: 'Why isn\'t Ion responding?',
    a: 'Ion requires an active internet connection. If you\'re connected and Ion still isn\'t responding, try refreshing the page or restarting the app. If the issue persists, contact us.',
  },
  {
    q: 'How do I update my goals or stats?',
    a: 'Go to Settings → Profile and update any of your measurements, goals, or preferences. Ion will automatically adapt your plan on the next interaction.',
  },
  {
    q: 'How does the food photo scan work?',
    a: 'Tap the camera icon in the Nutrition tab and take a clear photo of your meal. Ion will estimate the macros and add it to your daily log. You can always edit the values manually after.',
  },
  {
    q: 'Can I use SYNAP offline?',
    a: 'Basic navigation works offline but AI features (Ion chat, food scan, plan generation) require an internet connection.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Email us at ion@synapfit.app with the subject "Delete my account" from your registered email address. We will permanently delete all your data within 30 days.',
  },
  {
    q: 'I was charged but my subscription isn\'t active.',
    a: 'This can happen if payment processing was delayed. Email us at ion@synapfit.app with your order confirmation or receipt and we\'ll resolve it immediately.',
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen" style={{ background: '#060606' }}>

      {/* Nav */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between">
        <Link href="/"><SynapLogo size="sm" showTagline={false} /></Link>
        <Link href="/" className="font-heading text-xs tracking-widest transition-colors" style={{ color: '#475569' }}>
          ← Back
        </Link>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.2em' }}>SUPPORT</p>
        <h1 className="font-heading font-black text-4xl text-white mb-3">How can we help?</h1>
        <p className="font-heading text-sm" style={{ color: '#475569' }}>
          Check the common questions below or reach out directly — we typically respond within 24 hours.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Contact card */}
        <div className="rounded-2xl p-6 mb-12 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
          style={{ background: 'rgba(187,92,246,0.07)', border: '1px solid rgba(187,92,246,0.15)' }}>
          <div>
            <p className="font-heading font-bold text-white mb-1">Email support</p>
            <p className="font-heading text-sm" style={{ color: '#94A3B8' }}>
              For account issues, billing questions, or anything not covered below.
            </p>
          </div>
          <a
            href="mailto:ion@synapfit.app"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-sm text-white transition-all"
            style={{ background: 'rgba(187,92,246,0.2)', border: '1px solid rgba(187,92,246,0.3)' }}
          >
            ion@synapfit.app
          </a>
        </div>

        {/* FAQ */}
        <h2 className="font-heading font-black text-xl text-white mb-6">Common questions</h2>
        <div className="flex flex-col gap-4">
          {FAQ.map((item, i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-heading font-bold text-white text-sm mb-2">{item.q}</p>
              <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* Still stuck */}
        <div className="mt-12 text-center">
          <p className="font-heading text-sm mb-1" style={{ color: '#475569' }}>Still stuck?</p>
          <a href="mailto:ion@synapfit.app" className="font-heading font-bold text-sm" style={{ color: '#BB5CF6' }}>
            ion@synapfit.app
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <p className="font-heading text-xs" style={{ color: '#334155' }}>© 2026 SYNAP. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="font-heading text-xs transition-colors" style={{ color: '#334155' }}>Privacy</Link>
          <Link href="/terms" className="font-heading text-xs transition-colors" style={{ color: '#334155' }}>Terms</Link>
        </div>
      </div>
    </div>
  )
}
