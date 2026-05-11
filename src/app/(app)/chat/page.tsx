'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import IonAvatar from '@/components/ui/IonAvatar'
import { Send, Sparkles, Dumbbell, Utensils, TrendingUp, AlertCircle, Zap, CheckCircle, Clock, PanelLeft, X } from 'lucide-react'
import { useLanguage } from '@/lib/useLanguage'

const PLAN_MODIFY_WINDOW_DAYS = 30

export const dynamic = 'force-dynamic'

type MessageType = 'text' | 'suggestion' | 'workout_card' | 'meal_card' | 'milestone' | 'alert' | 'new_plan'
type Role = 'user' | 'ion' | 'assistant'

interface Message {
  id: string
  role: Role
  content: string
  message_type?: MessageType
  metadata?: any
  created_at?: string
}

interface ChatSession {
  id: string
  title: string
  dateLabel: string
  timeLabel: string
  messages: Message[]
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

const QUICK_PROMPTS_AR = [
  'كيف أتقدم؟',
  'عدّل سعراتي',
  'فاتني تمرين',
  'أشعر بالتعب',
  'اشرح تقسيم التمرين',
  'أفضل وقت للبروتين؟',
  'أريد تغيير هدفي',
  'أشعر بآلام عضلية',
]

export default function ChatPage() {
  const { isRTL } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileGender, setProfileGender] = useState<'male' | 'female'>('male')
  const [planDaysLeft, setPlanDaysLeft] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const quickPrompts = isRTL ? QUICK_PROMPTS_AR : QUICK_PROMPTS
  const sessions = useMemo(() => buildChatSessions(messages, isRTL), [messages, isRTL])
  const selectedSession = selectedSessionId ? sessions.find(session => session.id === selectedSessionId) : null
  const visibleMessages = selectedSession?.messages ?? messages

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages, loading])

  async function loadHistory() {
    const res = await fetch('/api/chat?limit=250', { cache: 'no-store' }).catch(() => null)
    if (!res?.ok) return
    const data = await res.json()

    if (data.profile?.gender) setProfileGender(data.profile.gender as any)
    if (Array.isArray(data.messages)) {
      setMessages(data.messages.map((m: any, i: number) => ({ ...m, id: m.id || String(i) })))
    }
    if (data.activeWorkoutPlan?.created_at) {
      const planAge = Math.floor((Date.now() - new Date(data.activeWorkoutPlan.created_at).getTime()) / 86400000)
      const remaining = PLAN_MODIFY_WINDOW_DAYS - planAge
      setPlanDaysLeft(remaining > 0 ? remaining : 0)
    }
  }

  async function sendMessage(text?: string) {
    const content = (text || input).trim()
    if (!content || loading) return

    setSelectedSessionId(null)
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, created_at: new Date().toISOString() }
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
          created_at: new Date().toISOString(),
        }])
      } else {
        // API returned an error — show it in the chat as an alert
        const isLimitError = data.error === 'daily_limit_reached' || data.error === 'starter_expired'
        const errMsg = isLimitError
          ? `${data.message} [Upgrade to Pro](/pricing)`
          : (data.message || data.error || 'Something went wrong. Try again.')
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ion',
          content: errMsg,
          message_type: 'alert',
          created_at: new Date().toISOString(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ion',
        content: "I lost the connection. Check your internet and try again.",
        message_type: 'alert',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <div className="flex h-screen relative" style={{ background: '#080808' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {historyOpen && (
        <ChatHistorySidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          isRTL={isRTL}
          onSelect={(id) => {
            setSelectedSessionId(id)
            if (window.innerWidth < 768) setHistoryOpen(false)
          }}
          onAll={() => {
            setSelectedSessionId(null)
            if (window.innerWidth < 768) setHistoryOpen(false)
          }}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {historyOpen && (
        <button
          type="button"
          aria-label={isRTL ? 'إغلاق السجل' : 'Close history'}
          className="fixed inset-0 z-[75] bg-black/50 md:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      <main className="flex flex-col h-screen flex-1 min-w-0">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0A0A14' }}>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="h-9 w-9 rounded-xl border flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          aria-label={isRTL ? 'فتح سجل المحادثات' : 'Open chat history'}
          title={isRTL ? 'سجل المحادثات' : 'Chat history'}
        >
          <PanelLeft size={16} />
        </button>
        <IonAvatar gender={profileGender} size="sm" animated />
        <div>
          <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.08em' }}>ION</p>
          <p className="font-heading text-xs" style={{ color: '#10B981' }}>● Always available</p>
        </div>
        <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} flex items-center gap-2`}>
          <button
            onClick={() => sendMessage("Run my daily adaptation check")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-heading text-xs font-semibold transition-all"
            style={{ background: 'rgba(187,92,246,0.1)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.2)' }}
            title="Run Ion's daily check"
          >
            <Zap size={11} /> Check-in
          </button>
          <Sparkles size={16} style={{ color: '#BB5CF6' }} />
        </div>
      </div>

      {/* Plan modification time banner */}
      {planDaysLeft !== null && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0"
          style={{
            background: planDaysLeft > 7
              ? 'rgba(16,137,129,0.06)'
              : planDaysLeft > 0
              ? 'rgba(245,158,11,0.06)'
              : 'rgba(239,68,68,0.06)',
            borderBottom: `1px solid ${planDaysLeft > 7 ? 'rgba(16,137,129,0.18)' : planDaysLeft > 0 ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)'}`,
          }}
        >
          <Clock size={12} style={{ color: planDaysLeft > 7 ? '#108981' : planDaysLeft > 0 ? '#F59E0B' : '#EF4444', flexShrink: 0 }} />
          <p className="font-heading text-xs" style={{ color: planDaysLeft > 7 ? '#108981' : planDaysLeft > 0 ? '#F59E0B' : '#EF4444' }}>
            {planDaysLeft > 0
              ? `${planDaysLeft} day${planDaysLeft !== 1 ? 's' : ''} left to modify your plan - ask Ion for changes here`
              : 'Plan modification window expired - ask Ion for a new plan or renewal'}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <IonAvatar gender={profileGender} size="xl" animated />
            <div>
              <p className="font-heading font-bold text-lg text-white tracking-wider mb-2" style={{ letterSpacing: '0.08em' }}>
                Hey - ask me anything.
              </p>
              <p className="font-heading text-sm" style={{ color: '#475569' }}>
                Workouts, meals, progress, motivation - I'm here.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {quickPrompts.map(p => (
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

        {selectedSession && (
          <div className="mx-auto mb-1 px-3 py-1 rounded-full border font-heading text-[11px]" style={{ color: '#94A3B8', borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            {isRTL ? 'تعرض جلسة' : 'Viewing'}: {selectedSession.dateLabel} · {selectedSession.timeLabel}
          </div>
        )}

        {visibleMessages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} gender={profileGender} onPrompt={sendMessage} isRTL={isRTL} />
        ))}

        {loading && (
          <div className="flex items-end gap-2.5 chat-bubble">
            <IonAvatar gender={profileGender} size="sm" />
            <div className="rounded-2xl px-4 py-3" style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '4px' }}>
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
          {quickPrompts.slice(0, 4).map(p => (
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
        <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isRTL ? 'اسأل Ion أي شيء...' : 'Ask Ion anything...'}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all"
            style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.07)', color: '#F0F0FF' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() && !loading ? '#BB5CF6' : 'rgba(255,255,255,0.05)',
              boxShadow: input.trim() && !loading ? '0 0 16px rgba(187,92,246,0.4)' : 'none',
            }}
          >
            <Send size={15} style={{ color: input.trim() && !loading ? 'white' : '#333' }} />
          </button>
        </form>
      </div>
      </main>
    </div>
  )
}

function ChatHistorySidebar({
  sessions,
  selectedSessionId,
  isRTL,
  onSelect,
  onAll,
  onClose,
}: {
  sessions: ChatSession[]
  selectedSessionId: string | null
  isRTL: boolean
  onSelect: (id: string) => void
  onAll: () => void
  onClose: () => void
}) {
  return (
    <aside
      className={`fixed top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} z-[80] w-80 max-w-[86vw] md:relative md:max-w-none shrink-0 flex flex-col`}
      style={{
        background: '#0A0A0A',
        borderInlineEnd: isRTL ? undefined : '1px solid rgba(255,255,255,0.06)',
        borderInlineStart: isRTL ? '1px solid rgba(255,255,255,0.06)' : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="font-heading text-xs font-bold tracking-widest uppercase" style={{ color: '#BB5CF6' }}>
            {isRTL ? 'سجل المحادثات' : 'Chat History'}
          </p>
          <p className="font-heading text-[11px] mt-0.5" style={{ color: '#64748B' }}>
            {isRTL ? 'حسب اليوم والجلسة' : 'By day and session'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg border flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          aria-label={isRTL ? 'إخفاء السجل' : 'Hide history'}
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          onClick={onAll}
          className="w-full rounded-xl px-3 py-2.5 text-start font-heading text-xs font-bold transition-all"
          style={{
            background: selectedSessionId === null ? 'rgba(187,92,246,0.14)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selectedSessionId === null ? 'rgba(187,92,246,0.28)' : 'rgba(255,255,255,0.07)'}`,
            color: selectedSessionId === null ? '#D88BFF' : '#CBD5E1',
          }}
        >
          {isRTL ? 'كل المحادثة الحالية' : 'All current history'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.length === 0 ? (
          <p className="font-heading text-xs text-center py-8" style={{ color: '#64748B' }}>
            {isRTL ? 'لا توجد محادثات محفوظة بعد.' : 'No saved conversations yet.'}
          </p>
        ) : sessions.map(session => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            className="w-full rounded-xl p-3 text-start transition-all"
            style={{
              background: selectedSessionId === session.id ? 'rgba(187,92,246,0.14)' : 'rgba(255,255,255,0.035)',
              border: `1px solid ${selectedSessionId === session.id ? 'rgba(187,92,246,0.28)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-heading text-[11px] font-bold" style={{ color: '#D88BFF' }}>{session.dateLabel}</span>
              <span className="font-heading text-[10px]" style={{ color: '#64748B' }}>{session.timeLabel}</span>
            </div>
            <p className="font-heading text-sm font-semibold line-clamp-2" style={{ color: '#E2E8F0' }}>
              {session.title}
            </p>
            <p className="font-heading text-[10px] mt-1" style={{ color: '#475569' }}>
              {session.messages.length} {isRTL ? 'رسائل' : session.messages.length === 1 ? 'message' : 'messages'}
            </p>
          </button>
        ))}
      </div>
    </aside>
  )
}

function buildChatSessions(messages: Message[], isRTL: boolean): ChatSession[] {
  const sorted = [...messages].sort((a, b) => messageTime(a) - messageTime(b))
  const sessions: ChatSession[] = []
  const gapMs = 1000 * 60 * 90

  for (const message of sorted) {
    const time = messageTime(message)
    const last = sessions[sessions.length - 1]
    const lastMessage = last?.messages[last.messages.length - 1]
    const shouldStart =
      !last ||
      !lastMessage ||
      !sameDay(time, messageTime(lastMessage)) ||
      time - messageTime(lastMessage) > gapMs

    if (shouldStart) {
      sessions.push({
        id: message.created_at || message.id,
        title: titleFromMessage(message, isRTL),
        dateLabel: formatSessionDate(time, isRTL),
        timeLabel: formatSessionTime(time),
        messages: [message],
      })
    } else {
      last.messages.push(message)
      if (!last.title || last.title === (isRTL ? 'جلسة آيون' : 'Ion session')) {
        last.title = titleFromMessage(message, isRTL)
      }
    }
  }

  return sessions.reverse()
}

function messageTime(message: Message) {
  const parsed = message.created_at ? new Date(message.created_at).getTime() : Number(message.id)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function sameDay(a: number, b: number) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function formatSessionDate(time: number, isRTL: boolean) {
  const date = new Date(time)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(time, today.getTime())) return isRTL ? 'اليوم' : 'Today'
  if (sameDay(time, yesterday.getTime())) return isRTL ? 'أمس' : 'Yesterday'
  return date.toLocaleDateString(isRTL ? 'ar' : 'en', { month: 'short', day: 'numeric' })
}

function formatSessionTime(time: number) {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function titleFromMessage(message: Message, isRTL: boolean) {
  const cleaned = displayChatContent(message.content).replace(/\s+/g, ' ').trim()
  if (!cleaned) return isRTL ? 'جلسة آيون' : 'Ion session'
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}...` : cleaned
}

// ── Rich Message Bubble ────────────────────────────────
function displayChatContent(content: string) {
  const cleaned = String(content || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const match = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : cleaned)
    if (typeof parsed?.message === 'string') return parsed.message.trim()
    if (typeof parsed?.reply === 'string') return parsed.reply.trim()
    if (typeof parsed?.content === 'string') return parsed.content.trim()
  } catch {}

  return cleaned
}

function MessageBubble({ msg, gender, onPrompt, isRTL }: { msg: Message; gender: 'male' | 'female'; onPrompt: (t: string) => void; isRTL: boolean }) {
  const isUser = msg.role === 'user'
  const type = msg.message_type || 'text'
  const content = displayChatContent(msg.content)

  if (isUser) {
    return (
      <div className={`flex items-end gap-2.5 chat-bubble ${isRTL ? 'justify-start' : 'flex-row-reverse'}`}>
        <div
          className="max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-3"
           style={{
             background: 'rgba(187,92,246,0.15)',
             border: '1px solid rgba(187,92,246,0.25)',
             borderBottomRightRadius: isRTL ? '1rem' : '4px',
             borderBottomLeftRadius: isRTL ? '4px' : '1rem',
           }}
        >
          <p className="font-heading text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#F0F0FF', textAlign: isRTL ? 'right' : 'left' }}>
            {content}
          </p>
        </div>
      </div>
    )
  }

  // Ion messages with rich types
  const cardStyle = {
    suggestion: { bg: 'rgba(187,92,246,0.06)', border: 'rgba(187,92,246,0.2)', icon: <Zap size={13} style={{ color: '#D88BFF' }} />, label: 'Suggestion' },
    workout_card: { bg: 'rgba(187,92,246,0.04)', border: 'rgba(187,92,246,0.2)', icon: <Dumbbell size={13} style={{ color: '#BB5CF6' }} />, label: 'Workout Update' },
    meal_card: { bg: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.2)', icon: <Utensils size={13} style={{ color: '#10B981' }} />, label: 'Nutrition' },
    milestone: { bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.25)', icon: <CheckCircle size={13} style={{ color: '#F59E0B' }} />, label: 'Milestone' },
    alert: { bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)', icon: <AlertCircle size={13} style={{ color: '#EF4444' }} />, label: 'Alert' },
    new_plan: { bg: 'rgba(187,92,246,0.08)', border: 'rgba(187,92,246,0.3)', icon: <TrendingUp size={13} style={{ color: '#D88BFF' }} />, label: 'New Plan' },
    text: { bg: '#0E0E0E', border: 'rgba(255,255,255,0.05)', icon: null, label: null },
  }

  const style = cardStyle[type] || cardStyle.text
  const isCard = type !== 'text'

  return (
    <div className={`flex items-end gap-2.5 chat-bubble ${isRTL ? 'flex-row-reverse' : ''}`}>
      <IonAvatar gender={gender} size="sm" />
      <div
        className="max-w-[78%] sm:max-w-[72%] rounded-2xl px-4 py-3"
        dir="auto"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          borderBottomLeftRadius: isRTL ? '1rem' : '4px',
          borderBottomRightRadius: isRTL ? '4px' : '1rem',
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

        <p className="font-heading text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#F0F0FF', textAlign: isRTL ? 'right' : 'left' }}>
          {content}
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
            <a href="/plan" className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(187,92,246,0.15)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.2)' }}>
              View New Plan
            </a>
          </div>
        )}
        {type === 'workout_card' && (
          <div className="flex gap-2 mt-3">
            <a href="/workout/today" className="px-3 py-1 rounded-lg font-heading text-xs font-semibold" style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6', border: '1px solid rgba(187,92,246,0.2)' }}>
              Go to Workout
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
