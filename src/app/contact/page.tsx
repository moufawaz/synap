'use client'

import { useState } from 'react'
import Link from 'next/link'
import SynapLogo from '@/components/ui/SynapLogo'
import { Mail, Send, CheckCircle, ArrowLeft } from 'lucide-react'

// ── Social icons (inline SVG) ─────────────────────────────────
function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1-.07z" />
    </svg>
  )
}

const SOCIAL = [
  {
    href:  'https://x.com/_synapfit',
    Icon:  XIcon,
    label: 'X / Twitter',
    handle: '@_synapfit',
  },
  {
    href:  'https://www.instagram.com/synap.fit/',
    Icon:  InstagramIcon,
    label: 'Instagram',
    handle: '@synap.fit',
  },
  {
    href:  'https://www.tiktok.com/@synap.fit',
    Icon:  TikTokIcon,
    label: 'TikTok',
    handle: '@synap.fit',
  },
]

export default function ContactPage() {
  const [form,    setForm]    = useState({ name: '', email: '', subject: '', message: '' })
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('sent')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #060606 0%, #0A0A0A 100%)' }}
    >
      {/* ── Top bar ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 flex items-center justify-between">
        <Link href="/">
          <SynapLogo size="sm" showTagline={false} />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-heading font-semibold tracking-wider transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#BB5CF6' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569' }}
        >
          <ArrowLeft size={13} />
          BACK
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* ── Left: Info + Social ── */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-heading font-semibold tracking-widest"
              style={{ background: 'rgba(187,92,246,0.1)', border: '1px solid rgba(187,92,246,0.2)', color: '#BB5CF6' }}
            >
              <Mail size={11} />
              GET IN TOUCH
            </div>

            <h1
              className="font-heading font-black text-4xl sm:text-5xl text-white mb-4 leading-tight"
              style={{ letterSpacing: '-0.01em' }}
            >
              We&apos;d love to<br />
              <span style={{ background: 'linear-gradient(90deg, #BB5CF6, #7B2FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                hear from you
              </span>
            </h1>
            <p className="text-base leading-relaxed mb-8" style={{ color: '#64748B', maxWidth: '400px' }}>
              Have a question, suggestion, or just want to say hello?
              Drop us a message and Ion will get back to you as soon as possible.
            </p>

            {/* Email card */}
            <a
              href="mailto:ion@synapfit.app"
              className="flex items-center gap-4 p-5 rounded-2xl mb-8 group transition-all duration-200"
              style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(187,92,246,0.3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.2)' }}
              >
                <Mail size={18} style={{ color: '#BB5CF6' }} />
              </div>
              <div>
                <p className="font-heading text-xs font-semibold tracking-widest mb-0.5" style={{ color: '#475569' }}>SUPPORT EMAIL</p>
                <p className="font-heading font-bold text-white text-sm">ion@synapfit.app</p>
              </div>
            </a>

            {/* Social links */}
            <div>
              <p className="font-heading text-xs font-semibold tracking-widest mb-4" style={{ color: '#334155' }}>
                FIND US ON SOCIAL
              </p>
              <div className="flex flex-col gap-3">
                {SOCIAL.map(({ href, Icon, label, handle }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                    style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(187,92,246,0.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B' }}
                    >
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm text-white">{label}</p>
                      <p className="font-heading text-xs" style={{ color: '#475569' }}>{handle}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div
            className="rounded-2xl p-8"
            style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {status === 'sent' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                  style={{ background: 'rgba(16,137,129,0.12)', border: '1px solid rgba(16,137,129,0.3)' }}
                >
                  <CheckCircle size={28} style={{ color: '#108981' }} />
                </div>
                <h3 className="font-heading font-black text-xl text-white mb-2 tracking-wider">Message sent!</h3>
                <p className="font-heading text-sm mb-6" style={{ color: '#475569' }}>
                  We&apos;ve received your message and will reply to {form.email || 'you'} shortly.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="font-heading font-bold text-xs tracking-widest px-6 py-2.5 rounded-xl transition-all"
                  style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)', color: '#BB5CF6' }}
                >
                  SEND ANOTHER
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <p className="font-heading font-black text-lg text-white mb-1 tracking-wide">Send us a message</p>
                  <p className="font-heading text-xs" style={{ color: '#475569' }}>We&apos;ll get back to you within 24 hours.</p>
                </div>

                {/* Name + Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-heading text-xs font-semibold tracking-wider" style={{ color: '#64748B' }}>
                      YOUR NAME <span style={{ color: '#BB5CF6' }}>*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="John Smith"
                      className="w-full px-4 py-3 rounded-xl text-sm font-heading text-white placeholder-slate-600 outline-none transition-all"
                      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(187,92,246,0.4)' }}
                      onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-heading text-xs font-semibold tracking-wider" style={{ color: '#64748B' }}>
                      EMAIL ADDRESS <span style={{ color: '#BB5CF6' }}>*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 rounded-xl text-sm font-heading text-white placeholder-slate-600 outline-none transition-all"
                      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(187,92,246,0.4)' }}
                      onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs font-semibold tracking-wider" style={{ color: '#64748B' }}>
                    SUBJECT
                  </label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl text-sm font-heading text-white outline-none transition-all appearance-none"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: form.subject ? '#fff' : '#475569' }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(187,92,246,0.4)' }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                  >
                    <option value=""      style={{ background: '#111' }}>Select a topic…</option>
                    <option value="General Question"  style={{ background: '#111' }}>General Question</option>
                    <option value="Technical Support" style={{ background: '#111' }}>Technical Support</option>
                    <option value="Billing"           style={{ background: '#111' }}>Billing</option>
                    <option value="Partnership"       style={{ background: '#111' }}>Partnership</option>
                    <option value="Feedback"          style={{ background: '#111' }}>Feedback</option>
                    <option value="Other"             style={{ background: '#111' }}>Other</option>
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs font-semibold tracking-wider" style={{ color: '#64748B' }}>
                    MESSAGE <span style={{ color: '#BB5CF6' }}>*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us how we can help…"
                    className="w-full px-4 py-3 rounded-xl text-sm font-heading text-white placeholder-slate-600 outline-none transition-all resize-none"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(187,92,246,0.4)' }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                  />
                </div>

                {status === 'error' && (
                  <p className="font-heading text-xs text-center" style={{ color: '#EF4444' }}>
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-heading font-bold text-sm tracking-widest text-white transition-all duration-200 disabled:opacity-60"
                  style={{
                    background:  'linear-gradient(135deg, #BB5CF6 0%, #7B2FFF 100%)',
                    boxShadow:   '0 0 24px rgba(187,92,246,0.25)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {status === 'sending' ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      SENDING…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      SEND MESSAGE
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
