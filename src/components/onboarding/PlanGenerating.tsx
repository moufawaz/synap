'use client'

import { useEffect, useState, useRef } from 'react'
import SynapLogo from '@/components/ui/SynapLogo'

interface PlanGeneratingProps {
  lang: 'en' | 'ar'
  name: string
  data: Record<string, any>
  onComplete: () => void
}

const STEPS_EN = [
  'Analyzing your body composition...',
  'Calculating your calorie targets...',
  'Building your nutrition plan...',
  'Timing meals to your schedule...',
  'Programming your training split...',
  'Applying progressive overload...',
  'Personalizing to your preferences...',
  'Your plan is ready.',
]

const STEPS_AR = [
  'تحليل تركيبة جسمك...',
  'حساب أهداف السعرات الحرارية...',
  'بناء خطة التغذية...',
  'توقيت الوجبات حسب جدولك...',
  'برمجة تقسيم التدريب...',
  'تطبيق التحميل التدريجي...',
  'تخصيص كل شيء لتفضيلاتك...',
  'خطتك جاهزة.',
]

export default function PlanGenerating({ lang, name, data, onComplete }: PlanGeneratingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const isRTL = lang === 'ar'
  const steps = isRTL ? STEPS_AR : STEPS_EN
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true
    runGeneration()
  }, [])

  async function runGeneration() {
    // Animate steps while API calls happen
    let stepIndex = 0
    const stepInterval = setInterval(() => {
      stepIndex++
      if (stepIndex < steps.length - 1) {
        setCurrentStep(stepIndex)
        setProgress(Math.round((stepIndex / (steps.length - 1)) * 90))
      }
    }, 900)

    try {
      // 1. Save profile to Supabase
      await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })

      // 2. Generate plan with Claude
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: data }),
      })

      clearInterval(stepInterval)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Plan generation failed')
      }

      // Show final step
      setCurrentStep(steps.length - 1)
      setProgress(100)
      setTimeout(onComplete, 1500)
    } catch (err: any) {
      clearInterval(stepInterval)
      console.error('Plan generation error:', err)
      setError(err.message || 'Something went wrong. You can retry from your dashboard.')
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 overflow-hidden"
      style={{ background: '#050505' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background orb */}
      <div className="orb w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(187,92,246,0.12)' }} />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(187,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(187,92,246,1) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 max-w-md w-full text-center">
        <SynapLogo size="md" variant="stacked" showTagline />

        {/* Progress ring */}
        <div className="relative w-28 h-28">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(187,92,246,0.1)" strokeWidth="3" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke="#BB5CF6" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 8px rgba(187,92,246,0.6))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading font-black text-2xl" style={{ color: '#BB5CF6' }}>{progress}%</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-3">
          <p className="font-heading font-bold text-white text-lg tracking-wider" style={{ letterSpacing: '0.06em' }}>
            {isRTL ? `جارٍ البناء، ${name}` : `Building yours, ${name}`}
          </p>
          <div className="flex flex-col items-center gap-3">
            {error ? (
              <>
                <p className="font-heading text-sm text-center max-w-xs" style={{ color: '#F87171' }}>{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { called.current = false; setError(null); setProgress(0); setCurrentStep(0); runGeneration() }}
                    className="px-4 py-2 rounded-xl font-heading text-xs font-bold tracking-wider transition-all"
                    style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.35)', color: '#CC80FF' }}
                  >
                    {isRTL ? 'إعادة المحاولة' : 'Try Again'}
                  </button>
                  <button
                    onClick={onComplete}
                    className="px-4 py-2 rounded-xl font-heading text-xs font-semibold tracking-wider transition-all"
                    style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {isRTL ? 'متابعة' : 'Continue Anyway'}
                  </button>
                </div>
              </>
            ) : null}
            {!error && (
              <p key={currentStep} className="font-heading text-sm tracking-wider" style={{ color: '#64748B', letterSpacing: '0.06em', animation: 'fadeIn 0.4s ease' }}>
                {steps[Math.min(currentStep, steps.length - 1)]}
              </p>
            )}
          </div>
        </div>

        {/* Step dots */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === currentStep ? '20px' : '6px',
                height: '6px',
                background: i <= currentStep ? '#BB5CF6' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        <p className="font-heading text-xs tracking-widest uppercase" style={{ color: '#1E293B', letterSpacing: '0.2em' }}>
          PERFORMANCE CONNECTED.
        </p>
      </div>
    </div>
  )
}
