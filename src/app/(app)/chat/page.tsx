'use client'

import { useState, useEffect, useRef } from 'react'
import IonAvatar from '@/components/ui/IonAvatar'
import { Send, Sparkles, Dumbbell, Utensils, TrendingUp, AlertCircle, Zap, CheckCircle } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type MessageType = 'text' | 'suggestion' | 'workout_card' | 'meal_card' | 'milestone' | 'alert' | 'new_plan'
type Role = 'user' | 'ion' | 'assistant'

interface Message {
  id: string
  role: Role
  content: string
  message_type?: MessageType
  metadata?: any
}

const QUICK_PROMPTS = [
  "How am I progressing?",
  "Adjust my calories",
  "I missed a workout",
  "Feeling tired lately",
  "Explain my workout split",
  "Best time to take protein?",
  "I want to change my goal",
  "I'm feeling sore",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileGender, setProfileGender] = useState<'male' | 'female'>('male')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadHistory() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
      supabase.from('chat_messages').select('id, role, content, message_type, metadata')
        .eq('user_id', user.id).order('created_at', { ascending: true }).limit(60),
    ])

    if (profileRes.data?.gender) setProfileGender(profileRes.data.gender as any)
    if (historyRes.data) {
      setMessages(historyRes.data.map((m: any, i: number) => ({ ...m, id: m.id || String(i) })))
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
          role: 'ion',
          content: data.reply,
          message_type: data.message_type || 'text',
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ion',
        content: "Sorry, I had a connection issue. Try again?",
        message_type: 'text',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#080810' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0A0A14' }}>
        <IonAvatar gender={profileGender} size="sm" animated />
        <div>
          <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.08em' }}>ION</p>
          <p className="font-heading text-xs" style={{ color: '#10B981' }}>● Always available</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => sendMessage("Run my daily adaptation check")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-heading text-xs font-semibold transition-all"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}
            title="Run Ion's daily check"
          >
            <Zap size={11} /> Check-in
          </button>
          <Sparkles size={16} style={{ color: '#7C3AED' }} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <IonAvatar gender={profileGender} size="xl" animated />
            <div>
              <p className="font-heading font-bold text-lg text-white tracking-wider mb-2" style={{ letterSpacing: '0.08em' }}>
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
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#94A3B8' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} gender={profileGender} onPrompt={sendMessage} />
        ))}

        {loading && (
          <div className="flex items-end gap-2.5 chat-bubble">
            <IonAvatar gender={profileGender} size="sm" />
            <div className="rounded-2xl px-4 py-3" style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts rail */}
      {messages.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {QUICK_PROMPTS.slice(0, 4).map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full font-heading text-xs font-semibold tracking-wider transition-all"
              style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: '#64748B' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#080810' }}>
        <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Ion anything..."
            className="flex-1 rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all"
            style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.07)', color: '#F0F0FF' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() && !loading ? '#7C3AED' : 'rgba(255,255,255,0.05)',
              boxShadow: input.trim() && !loading ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
            }}
          >
            <Send size={15} style={{ color: input.trim() && !loading ? 'white' : '#333' }} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Rich Message Bubble ────────────────────────────────
function MessageBubble({ msg, gender, onPrompt }: { msg: Message; gender: 'male' | 'female'; onPrompt: (t: string) => void }) {
  const isUser = msg.role === 'user'
  const type = msg.message_type || 'text'

  if (isUser) {
    return (
      <div className="flex items-end gap-2.5 flex-row-reverse chat-bubble">
        <div
          className="max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-3"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', borderBottomRightRadius: '4px' }}
        >
          <p className="font-heading text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#F0F0FF' }}>
            {msg.content}
          </p>
        </div>
      </div>
    )
  }

  // Ion messages with rich types
  const cardStyle = {
    suggestion: { bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.2)', icon: <Zap size={13} style={{ color: '#A78BFA' }} />, label: 'Suggestion' },
    workout_card: { bg: 'rgba(34,211,238,0.04)', border: 'rgba(34,211,238,0.2)', icon: <Dumbbell size={13} style={{ color: '#22D3EE' }} />, label: 'Workout Update' },
    meal_card: { bg: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.2)', icon: <Utensils size={13} style={{ color: '#10B981' }} />, label: 'Nutrition' },
    milestone: { bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.25)', icon: <CheckCircle size={13} style={{ color: '#F59E0B' }} />, label: 'Milestone' },
    alert: { bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)', icon: <AlertCircle size={13} style={{ color: '#EF4444' }} />, label: 'Alert' },
    new_plan: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.3)', icon: <TrendingUp size={13} style={{ color: '#A78BFA' }} />, label: 'New Plan' },
    text: { bg: '#121220', border: 'rgba(255,255,255,0.05)', icon: null, label: null },
  }

  const style = cardStyle[type] || cardStyle.text
  const isCard = type !== 'text'

  return (
    <div className="flex items-end gap-2.5 chat-bubble">
      <IonAvatar gender={gender} size="sm" />
      <div
        className="max-w-[78%] sm:max-w-[72%] rounded-2xl px-4 py-3"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          borderBottomLeftRadius: '4px',
        }}
      >
        {/* Card label */}
        {isCard && style.icon && (
          <div className="flex items-center gap-1.5 mb-2 pb-2" style={{ borderBottom: `1px solid ${style.border}` }}>
            {style.icon}
            <span className="font-heading text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748B' }}>
              {style.label}
            </span>
          </div>
        )}

        <p className="font-heading text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#F0F0FF' }}>
          {msg.content}
        </p>

        {/* Context-aware quick replies for special types */}
        {type === 'alert' && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => onPrompt("Help me fix this")} className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
              Help me fix this
            </button>
            <button onClick={() => onPrompt("What should I change?")} className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}>
              What to change?
            </button>
          </div>
        )}
        {type === 'milestone' && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => onPrompt("What's next for me?")} className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}>
              What's next?
            </button>
          </div>
        )}
        {type === 'new_plan' && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <a href="/plan" className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
              View New Plan →
            </a>
          </div>
        )}
        {type === 'workout_card' && (
          <div className="flex gap-2 mt-3">
            <a href="/workout/today" className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
              Go to Workout →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
