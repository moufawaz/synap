'use client'

import { useState, useEffect, useRef } from 'react'
import IonAvatar from '@/components/ui/IonAvatar'
import { Send, Sparkles } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  "How am I progressing?",
  "Adjust my calories",
  "I missed a workout",
  "Feeling tired lately",
  "Explain my workout split",
  "Best time to take protein?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileGender, setProfileGender] = useState<'male' | 'female'>('male')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadHistory() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
      supabase.from('chat_messages').select('role, content, id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(50),
    ])

    if (profileRes.data?.gender) setProfileGender(profileRes.data.gender as any)
    if (historyRes.data) {
      setMessages(historyRes.data.map((m, i) => ({ ...m, id: m.id || String(i) })))
    }
  }

  async function sendMessage(text?: string) {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I had a connection issue. Try again?",
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0A0A0A' }}>
        <IonAvatar gender={profileGender} size="sm" animated />
        <div>
          <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.08em' }}>ION</p>
          <p className="font-heading text-xs" style={{ color: '#108981' }}>● Always available</p>
        </div>
        <div className="ml-auto">
          <Sparkles size={16} style={{ color: '#BB5CF6' }} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <IonAvatar gender={profileGender} size="xl" animated />
            <div>
              <p className="font-heading font-black text-lg text-white tracking-wider mb-2" style={{ letterSpacing: '0.08em' }}>
                Hey — ask me anything.
              </p>
              <p className="font-heading text-sm" style={{ color: '#475569' }}>
                Workouts, meals, progress, motivation — I'm here.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="px-3 py-1.5 rounded-full font-heading text-xs font-semibold tracking-wider transition-all"
                  style={{ background: 'rgba(187,92,246,0.08)', border: '1px solid rgba(187,92,246,0.2)', color: '#94A3B8' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-end gap-2.5 chat-bubble ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' && <IonAvatar gender={profileGender} size="sm" />}
            <div
              className="max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-3"
              style={msg.role === 'assistant'
                ? { background: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '4px' }
                : { background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.25)', borderBottomRightRadius: '4px' }
              }
            >
              <p className="font-heading text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#E2E8F0' }}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2.5">
            <IonAvatar gender={profileGender} size="sm" />
            <div className="rounded-2xl px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts if messages exist */}
      {messages.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {QUICK_PROMPTS.slice(0, 3).map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full font-heading text-xs font-semibold tracking-wider transition-all"
              style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)', color: '#64748B' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#080808' }}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Ion anything..."
            className="flex-1 rounded-xl px-4 py-3 text-sm font-heading outline-none"
            style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
            onFocus={e => e.target.style.borderColor = 'rgba(187,92,246,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() && !loading ? '#BB5CF6' : 'rgba(255,255,255,0.05)',
              boxShadow: input.trim() && !loading ? '0 0 16px rgba(187,92,246,0.35)' : 'none',
            }}
          >
            <Send size={15} style={{ color: input.trim() && !loading ? 'white' : '#333' }} />
          </button>
        </form>
      </div>
    </div>
  )
}
