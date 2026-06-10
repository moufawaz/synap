'use client'

import { useEffect, useRef, useState } from 'react'
import IonAvatar from '@/components/ui/IonAvatar'
import { type Language } from '@/lib/i18n'

/**
 * Live auto-playing Ion conversation — types a real coaching exchange on loop
 * (EN/AR) so visitors see the product working instead of a static mockup.
 */

type Line = { role: 'user' | 'ion'; text: string }

const SCRIPT_EN: Line[] = [
  { role: 'user', text: 'I had koshary for lunch 😅' },
  { role: 'ion', text: 'Logged — a medium plate is ~780 kcal. You have 940 kcal left today, so let’s make dinner protein-heavy: shish tawook with salad.' },
  { role: 'user', text: 'Can we move leg day to Friday?' },
  { role: 'ion', text: 'Done. Thursday is now your rest day and Friday is legs — your plan and reminders are updated. 💪' },
]

const SCRIPT_AR: Line[] = [
  { role: 'user', text: 'أكلت كشري على الغداء 😅' },
  { role: 'ion', text: 'سجّلته — الطبق الوسط ~780 سعرة. باقي لك 940 سعرة اليوم، فخلّينا نخلي العشاء بروتين: شيش طاووق مع سلطة.' },
  { role: 'user', text: 'ممكن ننقل يوم الأرجل للجمعة؟' },
  { role: 'ion', text: 'تم. الخميس صار راحة والجمعة أرجل — حدّثت خطتك وتذكيراتك. 💪' },
]

export default function IonDemo({ lang }: { lang: Language }) {
  const isRTL = lang === 'ar'
  const script = isRTL ? SCRIPT_AR : SCRIPT_EN
  const [shown, setShown] = useState<Line[]>([])
  const [typing, setTyping] = useState<string>('')
  const [isIonTyping, setIsIonTyping] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    let idx = 0

    function playNext() {
      if (!alive) return
      if (idx >= script.length) {
        // Hold the finished conversation, then restart the loop.
        timer.current = setTimeout(() => {
          if (!alive) return
          setShown([]); setTyping(''); idx = 0
          playNext()
        }, 6000)
        return
      }
      const line = script[idx]
      if (line.role === 'ion') {
        setIsIonTyping(true)
        timer.current = setTimeout(() => {
          if (!alive) return
          setIsIonTyping(false)
          typeOut(line, 14)
        }, 900)
      } else {
        typeOut(line, 28)
      }
    }

    function typeOut(line: Line, speed: number) {
      let i = 0
      function tick() {
        if (!alive) return
        i += 2
        setTyping(line.text.slice(0, i))
        if (i < line.text.length) {
          timer.current = setTimeout(tick, speed)
        } else {
          setShown(prev => [...prev, line])
          setTyping('')
          idx += 1
          timer.current = setTimeout(playNext, 700)
        }
      }
      tick()
    }

    timer.current = setTimeout(playNext, 800)
    return () => { alive = false; if (timer.current) clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const currentRole: 'user' | 'ion' | null = typing
    ? (script[shown.length]?.role ?? null)
    : null

  return (
    <div className="relative glass-card overflow-hidden gradient-border" style={{ background: 'rgba(10,10,12,0.92)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <IonAvatar gender="male" size="sm" animated />
          <div>
            <p className="text-white text-sm font-heading font-bold tracking-wider">ION</p>
            <p className="text-[10px] font-heading tracking-widest" style={{ color: '#22C55E' }}>
              ● {isRTL ? 'يدرّبك الآن' : 'COACHING LIVE'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-heading tracking-widest text-silver-muted/50 uppercase">SYNAP</span>
      </div>

      {/* Conversation */}
      <div className="px-4 py-4 flex flex-col gap-2.5" style={{ minHeight: 300 }}>
        {shown.map((line, i) => (
          <Bubble key={i} line={line} isRTL={isRTL} />
        ))}
        {typing && currentRole ? <Bubble line={{ role: currentRole, text: typing }} isRTL={isRTL} caret /> : null}
        {isIonTyping ? (
          <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="px-4 py-2.5 rounded-2xl flex gap-1.5 items-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {[0, 1, 2].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-silver-muted/60 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Bubble({ line, isRTL, caret = false }: { line: Line; isRTL: boolean; caret?: boolean }) {
  const isIon = line.role === 'ion'
  const alignSelf = isIon ? (isRTL ? 'flex-end' : 'flex-start') : (isRTL ? 'flex-start' : 'flex-end')
  return (
    <div style={{ display: 'flex', justifyContent: alignSelf === 'flex-start' ? 'flex-start' : 'flex-end' }}>
      <div
        className="px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed max-w-[85%]"
        style={
          isIon
            ? { background: 'rgba(187,92,246,0.14)', border: '1px solid rgba(187,92,246,0.25)', color: '#EDE6F7' }
            : { background: 'rgba(255,255,255,0.07)', color: '#D7DCE3' }
        }
      >
        {line.text}
        {caret ? <span className="inline-block w-[2px] h-[1em] align-middle ms-0.5 animate-pulse" style={{ background: '#BB5CF6' }} /> : null}
      </div>
    </div>
  )
}
