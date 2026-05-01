'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import IonAvatar from '@/components/ui/IonAvatar'
import SynapLogo from '@/components/ui/SynapLogo'
import MeasurementCard from '@/components/onboarding/MeasurementCard'
import PlanGenerating from '@/components/onboarding/PlanGenerating'
import {
  ONBOARDING_STEPS,
  getActiveSteps,
  getPhaseLabel,
  type OnboardingData,
  type OnboardingContext,
  type OnboardingStep,
} from '@/lib/onboardingFlow'
import { Send, ChevronRight, Globe } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────
type Message = {
  id: string
  role: 'ion' | 'user'
  content: string
  type?: 'text' | 'measurement_card' | 'quickreply_selected'
  stepId?: string
}

// ── Component ──────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [ionGender, setIonGender] = useState<'male' | 'female'>('male')
  const [messages, setMessages] = useState<Message[]>([])
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedMulti, setSelectedMulti] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [started, setStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isRTL = lang === 'ar'

  // Active steps depend on collected data (conditional steps)
  const activeSteps = getActiveSteps(data as OnboardingContext)
  const currentStep = activeSteps[currentStepIndex]
  const totalPhases = 8
  const progress = Math.round(((currentStepIndex) / activeSteps.length) * 100)

  // ── Auto scroll ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Show first Ion message after start ──────────────────
  useEffect(() => {
    if (started && messages.length === 0 && activeSteps.length > 0) {
      showIonMessage(activeSteps[0], {} as OnboardingContext)
    }
  }, [started])

  // ── Show Ion message ────────────────────────────────────
  function showIonMessage(step: OnboardingStep, ctx: OnboardingContext) {
    setIsTyping(true)
    const delay = 800 + Math.random() * 600
    setTimeout(() => {
      setIsTyping(false)
      const content = isRTL
        ? step.ionMessageAr(ctx)
        : step.ionMessage(ctx)
      addMessage({ role: 'ion', content, stepId: step.id })
    }, delay)
  }

  // ── Add message ─────────────────────────────────────────
  function addMessage(msg: Omit<Message, 'id'>) {
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() + Math.random() }])
  }

  // ── Advance to next step ────────────────────────────────
  function advance(updatedData: Partial<OnboardingData>) {
    const newData = { ...data, ...updatedData }
    setData(newData)
    setSelectedMulti([])
    setTextInput('')

    const newActiveSteps = getActiveSteps(newData as OnboardingContext)
    const nextIndex = currentStepIndex + 1

    if (nextIndex >= newActiveSteps.length) {
      // Done — show generating screen
      setTimeout(() => setGenerating(true), 500)
      return
    }

    const nextStep = newActiveSteps[nextIndex]
    setCurrentStepIndex(nextIndex)

    // Handle generating step
    if (nextStep.responseType === 'done') {
      setTimeout(() => setGenerating(true), 500)
      return
    }

    // Show next Ion message
    setTimeout(() => showIonMessage(nextStep, newData as OnboardingContext), 300)
  }

  // ── Handle quick reply ──────────────────────────────────
  function handleQuickReply(value: string, label: string) {
    if (!currentStep) return
    addMessage({ role: 'user', content: label })

    // Special cases
    if (currentStep.id === 'ion_gender') {
      setIonGender(value as 'male' | 'female')
    }
    if (currentStep.id === 'greeting' || currentStep.field === 'language') {
      if (value === 'ar') setLang('ar')
    }

    const field = currentStep.field
    advance(field ? { [field]: value } : {})
  }

  // ── Handle multiselect confirm ──────────────────────────
  function handleMultiConfirm() {
    if (!currentStep || selectedMulti.length === 0) return
    const labels = selectedMulti.join(', ')
    addMessage({ role: 'user', content: labels })
    const field = currentStep.field
    advance(field ? { [field]: selectedMulti.join(',') } : {})
  }

  // ── Handle text submit ──────────────────────────────────
  function handleTextSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!currentStep || !textInput.trim()) {
      // Optional — skip
      if (currentStep?.optional) {
        addMessage({ role: 'user', content: isRTL ? 'تخطي' : 'Skip' })
        advance({})
      }
      return
    }

    // Parse weight_kg / height_cm from combined message
    if (currentStep.id === 'weight_height') {
      const text = textInput
      const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|كيلو)?/i)
      const heightMatch = text.match(/(\d{2,3})\s*(?:cm|سم)?/i)
      const updates: Partial<OnboardingData> = {}
      if (weightMatch) updates.weight_kg = weightMatch[1]
      if (heightMatch) updates.height_cm = heightMatch[1]
      addMessage({ role: 'user', content: textInput })
      advance(updates)
      return
    }

    const field = currentStep.field
    addMessage({ role: 'user', content: textInput })
    advance(field ? { [field]: textInput } : {})
  }

  // ── Handle measurement card ─────────────────────────────
  function handleMeasurements(measurements: Record<string, string>) {
    addMessage({ role: 'user', content: isRTL ? `✓ تم تسجيل القياسات` : `✓ Measurements recorded` })
    advance({ measurements })
  }

  // ── Plan generation complete ────────────────────────────
  function handlePlanReady() {
    router.push('/dashboard')
  }

  // ── Toggle multi ────────────────────────────────────────
  function toggleMulti(value: string) {
    setSelectedMulti(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  // ── Render ──────────────────────────────────────────────
  if (generating) {
    return (
      <PlanGenerating
        lang={lang}
        name={data.name || 'you'}
        data={data}
        onComplete={handlePlanReady}
      />
    )
  }

  if (!started) {
    return <StartScreen lang={lang} ionGender={ionGender} onStart={() => setStarted(true)} onLangChange={setLang} />
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: '#080808' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#080808' }}>
        <SynapLogo size="sm" />

        <div className="flex flex-col items-center gap-1">
          {/* Phase label */}
          <span className="font-heading text-xs tracking-widest uppercase" style={{ color: '#BB5CF6', letterSpacing: '0.12em', fontSize: '0.6rem' }}>
            {currentStep ? getPhaseLabel(currentStep.phase, lang) : ''}
          </span>
          {/* Progress bar */}
          <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #BB5CF6, #9B3CD6)' }}
            />
          </div>
          <span className="font-heading text-[10px]" style={{ color: '#475569' }}>
            {progress}%
          </span>
        </div>

        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-heading text-xs font-semibold tracking-wider transition-all"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#64748B' }}
        >
          <Globe size={12} />
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-3 chat-bubble ${msg.role === 'user' ? (isRTL ? 'justify-end' : 'flex-row-reverse') : ''}`}
          >
            {/* Ion avatar */}
            {msg.role === 'ion' && (
              <div className="flex-shrink-0 mb-1">
                <IonAvatar gender={ionGender} size="sm" />
              </div>
            )}

            {/* Bubble */}
            <div
              className="max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-3"
              style={msg.role === 'ion'
                ? {
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderBottomLeftRadius: isRTL ? '1rem' : '4px',
                    borderBottomRightRadius: isRTL ? '4px' : '1rem',
                  }
                : {
                    background: 'rgba(187,92,246,0.15)',
                    border: '1px solid rgba(187,92,246,0.25)',
                    borderBottomRightRadius: isRTL ? '1rem' : '4px',
                    borderBottomLeftRadius: isRTL ? '4px' : '1rem',
                  }
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#E2E8F0' }}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-3">
            <IonAvatar gender={ionGender} size="sm" />
            <div className="rounded-2xl px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Measurement card (inline) */}
        {!isTyping && currentStep?.responseType === 'measurement_card' && (
          <div className="flex items-start gap-3">
            <IonAvatar gender={ionGender} size="sm" />
            <div className="flex-1 max-w-sm">
              <MeasurementCard onSubmit={handleMeasurements} lang={lang} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      {!isTyping && currentStep && currentStep.responseType !== 'done' && currentStep.responseType !== 'measurement_card' && (
        <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#080808' }}>

          {/* Quick replies */}
          {(currentStep.responseType === 'quickreply' || currentStep.responseType === 'multiselect') && currentStep.quickReplies && (
            <div className="flex flex-wrap gap-2 mb-3">
              {currentStep.quickReplies.map(reply => {
                const label = isRTL ? reply.labelAr : reply.label
                const isSelected = selectedMulti.includes(reply.value)
                return (
                  <button
                    key={reply.value}
                    onClick={() => {
                      if (currentStep.responseType === 'multiselect') {
                        toggleMulti(reply.value)
                      } else {
                        handleQuickReply(reply.value, label)
                      }
                    }}
                    className="px-4 py-2 rounded-full text-sm font-heading font-semibold tracking-wider transition-all duration-150"
                    style={{
                      border: `1px solid ${isSelected ? '#BB5CF6' : 'rgba(187,92,246,0.25)'}`,
                      background: isSelected ? 'rgba(187,92,246,0.2)' : 'rgba(187,92,246,0.06)',
                      color: isSelected ? '#CC80FF' : '#94A3B8',
                      boxShadow: isSelected ? '0 0 10px rgba(187,92,246,0.2)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                )
              })}

              {/* Multiselect confirm */}
              {currentStep.responseType === 'multiselect' && selectedMulti.length > 0 && (
                <button
                  onClick={handleMultiConfirm}
                  className="px-4 py-2 rounded-full text-sm font-heading font-black tracking-wider flex items-center gap-1.5 transition-all"
                  style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.08em', boxShadow: '0 0 16px rgba(187,92,246,0.4)' }}
                >
                  {isRTL ? 'تأكيد' : 'CONFIRM'}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* Text input */}
          {(currentStep.responseType === 'text' || currentStep.responseType === 'number') && (
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type={currentStep.responseType === 'number' ? 'text' : 'text'}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={isRTL ? 'اكتب ردّك...' : 'Type your reply...'}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#E2E8F0',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.4)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
                autoFocus
              />
              {currentStep.optional && !textInput.trim() && (
                <button
                  type="button"
                  onClick={() => { addMessage({ role: 'user', content: isRTL ? 'تخطي' : 'Skip' }); advance({}) }}
                  className="px-4 py-3 rounded-xl font-heading text-xs font-semibold tracking-wider transition-all"
                  style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {isRTL ? 'تخطي' : 'Skip'}
                </button>
              )}
              <button
                type="submit"
                disabled={!textInput.trim() && !currentStep.optional}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: textInput.trim() ? '#BB5CF6' : 'rgba(255,255,255,0.05)',
                  boxShadow: textInput.trim() ? '0 0 16px rgba(187,92,246,0.35)' : 'none',
                }}
              >
                <Send size={15} style={{ color: textInput.trim() ? 'white' : '#333' }} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ── Start Screen ───────────────────────────────────────────
function StartScreen({
  lang,
  ionGender,
  onStart,
  onLangChange,
}: {
  lang: 'en' | 'ar'
  ionGender: 'male' | 'female'
  onStart: () => void
  onLangChange: (l: 'en' | 'ar') => void
}) {
  const isRTL = lang === 'ar'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ background: '#050505' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background */}
      <div className="orb w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(187,92,246,0.1)' }} />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full text-center">
        <SynapLogo size="lg" variant="stacked" showTagline />

        <div className="flex flex-col items-center gap-4">
          <IonAvatar gender={ionGender} size="xl" animated />
          <div>
            <p className="font-heading font-black text-xl text-white tracking-wider mb-1" style={{ letterSpacing: '0.1em' }}>
              ION
            </p>
            <p className="font-heading text-sm tracking-wider" style={{ color: '#BB5CF6', letterSpacing: '0.12em' }}>
              {isRTL ? 'مدرّبك الشخصي بالذكاء الاصطناعي' : 'YOUR AI PERSONAL TRAINER'}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 w-full" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
            {isRTL
              ? 'سأسألك أسئلة كمدرّب حقيقي — عن جدولك، طعامك، أهدافك وصحتك. ثم أبني خطتك الكاملة.'
              : "I'll ask you questions like a real trainer — your schedule, food, goals, health. Then I build your complete plan."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {['8 min', '100% free', 'No templates'].map(tag => (
              <span
                key={tag}
                className="font-heading text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wider"
                style={{ background: 'rgba(187,92,246,0.1)', border: '1px solid rgba(187,92,246,0.2)', color: '#BB5CF6' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Language toggle */}
        <div className="flex gap-2">
          {(['en', 'ar'] as const).map(l => (
            <button
              key={l}
              onClick={() => onLangChange(l)}
              className="px-5 py-2 rounded-xl font-heading font-bold text-sm tracking-widest transition-all"
              style={{
                background: lang === l ? '#BB5CF6' : 'rgba(255,255,255,0.04)',
                color: lang === l ? 'white' : '#475569',
                border: `1px solid ${lang === l ? '#BB5CF6' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: lang === l ? '0 0 16px rgba(187,92,246,0.35)' : 'none',
                letterSpacing: '0.1em',
              }}
            >
              {l === 'en' ? 'ENGLISH' : 'العربية'}
            </button>
          ))}
        </div>

        <button
          onClick={onStart}
          className="btn-primary w-full py-4 font-heading font-black text-sm group"
          style={{ letterSpacing: '0.12em' }}
        >
          {isRTL ? 'ابدأ مع Ion' : "LET'S GO"}
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  )
}
