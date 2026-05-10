'use client'

import { useEffect, useState } from 'react'
import { Camera, CheckCircle2, Loader2, ShieldAlert, Sparkles, Upload } from 'lucide-react'
import { useLanguage } from '@/lib/useLanguage'

export const dynamic = 'force-dynamic'

export default function FormCheckPage() {
  const { isRTL } = useLanguage()
  const [exercise, setExercise] = useState('Squat')
  const [preview, setPreview] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<any>(null)

  useEffect(() => {
    if (isRTL && exercise === 'Squat') setExercise('سكوات')
    if (!isRTL && exercise === 'سكوات') setExercise('Squat')
  }, [exercise, isRTL])

  function handleFile(file?: File) {
    if (!file) return
    setError(null)
    setFeedback(null)
    setMimeType(file.type || 'image/jpeg')

    if (!file.type.startsWith('image/')) {
      setError(isRTL ? 'ارفع صورة واضحة أو لقطة شاشة من التمرين. اختيار إطار من الفيديو قادم لاحقاً.' : 'Upload a clear photo or screenshot frame from your lift. Video frame selection is coming next.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      setPreview(result)
      setImage(result.replace(/^data:[^,]+,/, ''))
    }
    reader.readAsDataURL(file)
  }

  async function runCheck() {
    if (!image) {
      setError(isRTL ? 'اختر صورة تمرين واضحة أولاً.' : 'Choose a clear lift photo first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise, image, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || (isRTL ? 'فشل فحص الأداء' : 'Form check failed'))
      setFeedback(data.feedback)
    } catch (err: any) {
      setError(err?.message || (isRTL ? 'فشل فحص الأداء' : 'Form check failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto pb-24 md:pb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>{isRTL ? 'فحص الأداء بالذكاء الاصطناعي' : 'AI FORM CHECK'}</p>
        <h1 className="font-heading font-bold text-2xl text-white">{isRTL ? 'مراجعة أداء الرفعة' : 'Lift Form Review'}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748B' }}>
          {isRTL
            ? 'ارفع صورة واضحة أو لقطة شاشة من المجموعة. سيقيّم آيون الإطار، ويحدد التصحيح الأكثر أماناً، ويعطيك ملاحظة واحدة للمجموعة التالية.'
            : 'Upload a clear photo or screenshot from a set. Ion will score the frame, flag the safest correction, and give you one cue for the next set.'}
        </p>
      </div>

      <div className="glass-card p-5 mb-5">
        <label className="block mb-4">
          <span className="font-heading text-xs font-bold tracking-widest uppercase" style={{ color: '#94A3B8' }}>{isRTL ? 'التمرين' : 'Exercise'}</span>
          <input
            value={exercise}
            onChange={event => setExercise(event.target.value)}
            className="mt-2 w-full rounded-xl px-4 py-3 font-heading text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
            placeholder={isRTL ? 'بنش برس، سكوات، ديدلفت...' : 'Bench press, squat, deadlift...'}
          />
        </label>

        <label
          className="flex flex-col items-center justify-center rounded-2xl min-h-64 cursor-pointer transition-all overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(187,92,246,0.35)' }}
        >
          {preview ? (
            <img src={preview} alt="Selected form frame" className="w-full max-h-[420px] object-contain" />
          ) : (
            <div className="text-center p-8">
              <Camera size={34} className="mx-auto mb-3" style={{ color: '#BB5CF6' }} />
              <p className="font-heading text-sm font-bold text-white">{isRTL ? 'اختر صورة الأداء' : 'Choose form photo'}</p>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>{isRTL ? 'أفضل زاوية: الجسم كامل، من الجانب أو 45 درجة، مع إضاءة جيدة.' : 'Best angle: full body, side or 45 degrees, good lighting.'}</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={event => handleFile(event.target.files?.[0])}
          />
        </label>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={runCheck}
          disabled={loading || !image}
          className="mt-4 w-full rounded-xl py-3 font-heading font-bold tracking-widest flex items-center justify-center gap-2 transition-all"
          style={{ background: image ? 'linear-gradient(135deg,#BB5CF6,#7B2FFF)' : 'rgba(255,255,255,0.06)', color: image ? '#fff' : '#64748B' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? (isRTL ? 'جارٍ فحص الأداء...' : 'CHECKING FORM...') : (isRTL ? 'افحص الأداء' : 'CHECK FORM')}
        </button>
      </div>

      {feedback && (
        <div className="glass-card p-5" style={{ borderColor: 'rgba(16,185,129,0.22)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} style={{ color: '#10B981' }} />
            <p className="font-heading text-sm font-bold text-white">{isRTL ? 'ملاحظات آيون على الأداء' : 'Ion Form Feedback'}</p>
            <span className="ml-auto font-heading text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              {feedback.score}/10
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#CBD5E1' }}>{feedback.summary}</p>
          <div className="space-y-2">
            {(feedback.fixes || []).map((fix: string, index: number) => (
              <div key={index} className="flex gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: '#10B981' }} />
                <p className="text-sm" style={{ color: '#CBD5E1' }}>{fix}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="font-heading text-xs font-bold mb-1" style={{ color: '#F59E0B' }}>{isRTL ? 'ملاحظة المجموعة التالية' : 'NEXT SET CUE'}</p>
            <p className="text-sm" style={{ color: '#CBD5E1' }}>{feedback.next_set_cue}</p>
          </div>
        </div>
      )}
    </div>
  )
}
