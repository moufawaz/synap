'use client'

import { useState } from 'react'
import { ChevronRight, Info, X } from 'lucide-react'

interface MeasurementCardProps {
  onSubmit: (data: Record<string, string>) => void
  lang: 'en' | 'ar'
}

interface Field {
  key: string
  label: string
  labelAr: string
  unit: string
  required?: boolean
  guide: string
  guideAr: string
}

const FIELDS: Field[] = [
  {
    key: 'weight_kg', label: 'Weight', labelAr: 'الوزن', unit: 'kg', required: true,
    guide: 'Weigh yourself in the morning, after using the bathroom, before eating or drinking. Stand still on a flat surface.',
    guideAr: 'زن نفسك صباحاً، بعد استخدام الحمام، قبل الأكل أو الشرب. قف ثابتاً على سطح مستوٍ.',
  },
  {
    key: 'neck_cm', label: 'Neck', labelAr: 'الرقبة', unit: 'cm',
    guide: 'Measure just below your Adam\'s apple. Keep the tape horizontal and snug — don\'t compress the skin.',
    guideAr: 'قس مباشرة تحت تفاحة آدم. اجعل الشريط أفقياً ومحكماً — لا تضغط على الجلد.',
  },
  {
    key: 'shoulders_cm', label: 'Shoulders', labelAr: 'الكتفان', unit: 'cm',
    guide: 'Stand straight, arms relaxed at your sides. Measure around the widest point of your shoulders, over the deltoids.',
    guideAr: 'قف مستقيماً، ذراعاك مسترخيتان. قس حول أعرض نقطة في كتفيك، فوق عضلات الدلتا.',
  },
  {
    key: 'chest_cm', label: 'Chest', labelAr: 'الصدر', unit: 'cm',
    guide: 'Measure around the fullest part of your chest at nipple height. Arms relaxed at sides. Breathe out normally — don\'t puff up.',
    guideAr: 'قس حول الجزء الأكمل من صدرك عند مستوى الحلمات. ذراعاك مسترخيتان. زفر بشكل طبيعي — لا تنتفخ.',
  },
  {
    key: 'waist_cm', label: 'Waist', labelAr: 'الخصر', unit: 'cm',
    guide: 'Measure at the narrowest point — usually 1–2 inches above your belly button. Don\'t suck in or push out. Breathe normally.',
    guideAr: 'قس عند أضيق نقطة — عادةً 2–3 سم فوق السرة. لا تشفط أو تدفع. تنفس بشكل طبيعي.',
  },
  {
    key: 'hips_cm', label: 'Hips', labelAr: 'الأرداف', unit: 'cm',
    guide: 'Stand with feet together. Measure around the widest part of your hips and buttocks. Keep the tape level all the way around.',
    guideAr: 'قف بقدمين متلاصقتين. قس حول أعرض جزء من وركيك ومؤخرتك. حافظ على الشريط مستوياً.',
  },
  {
    key: 'bicep_left_cm', label: 'Bicep (L)', labelAr: 'العضلة الثنائية (يسار)', unit: 'cm',
    guide: 'Flex your left arm at 90°. Measure around the peak of the bicep at its largest point.',
    guideAr: 'اثنِ ذراعك اليسرى بزاوية 90°. قس حول قمة العضلة الثنائية عند أكبر نقطة.',
  },
  {
    key: 'bicep_right_cm', label: 'Bicep (R)', labelAr: 'العضلة الثنائية (يمين)', unit: 'cm',
    guide: 'Flex your right arm at 90°. Measure around the peak of the bicep at its largest point.',
    guideAr: 'اثنِ ذراعك اليمنى بزاوية 90°. قس حول قمة العضلة الثنائية عند أكبر نقطة.',
  },
  {
    key: 'forearm_left_cm', label: 'Forearm (L)', labelAr: 'الساعد (يسار)', unit: 'cm',
    guide: 'Extend your left arm, fist lightly clenched. Measure around the widest part of the forearm.',
    guideAr: 'مد ذراعك اليسرى، قبضتك مضمومة برفق. قس حول أعرض جزء من الساعد.',
  },
  {
    key: 'forearm_right_cm', label: 'Forearm (R)', labelAr: 'الساعد (يمين)', unit: 'cm',
    guide: 'Extend your right arm, fist lightly clenched. Measure around the widest part of the forearm.',
    guideAr: 'مد ذراعك اليمنى، قبضتك مضمومة برفق. قس حول أعرض جزء من الساعد.',
  },
  {
    key: 'thigh_left_cm', label: 'Thigh (L)', labelAr: 'الفخذ (يسار)', unit: 'cm',
    guide: 'Stand with feet slightly apart. Measure around the upper left thigh, about 6 inches (15 cm) below the hip crease.',
    guideAr: 'قف بقدمين متباعدتين قليلاً. قس حول الجزء العلوي من فخذك الأيسر، حوالي 15 سم أسفل طية الورك.',
  },
  {
    key: 'thigh_right_cm', label: 'Thigh (R)', labelAr: 'الفخذ (يمين)', unit: 'cm',
    guide: 'Stand with feet slightly apart. Measure around the upper right thigh, about 6 inches (15 cm) below the hip crease.',
    guideAr: 'قف بقدمين متباعدتين قليلاً. قس حول الجزء العلوي من فخذك الأيمن، حوالي 15 سم أسفل طية الورك.',
  },
  {
    key: 'calf_left_cm', label: 'Calf (L)', labelAr: 'الساق (يسار)', unit: 'cm',
    guide: 'Stand on both feet. Measure around the widest part of the left calf muscle.',
    guideAr: 'قف على كلتا قدميك. قس حول أعرض جزء من عضلة الساق اليسرى.',
  },
  {
    key: 'calf_right_cm', label: 'Calf (R)', labelAr: 'الساق (يمين)', unit: 'cm',
    guide: 'Stand on both feet. Measure around the widest part of the right calf muscle.',
    guideAr: 'قف على كلتا قدميك. قس حول أعرض جزء من عضلة الساق اليمنى.',
  },
  {
    key: 'wrist_cm', label: 'Wrist', labelAr: 'المعصم', unit: 'cm',
    guide: 'Measure just below the wrist bone — below the small bump on the outside of your wrist.',
    guideAr: 'قس أسفل عظمة المعصم مباشرةً — أسفل النتوء الصغير على الجانب الخارجي.',
  },
  {
    key: 'ankle_cm', label: 'Ankle', labelAr: 'الكاحل', unit: 'cm',
    guide: 'Measure just above the ankle bone at the narrowest point, above the joint.',
    guideAr: 'قس فوق عظمة الكاحل عند أضيق نقطة، فوق المفصل.',
  },
  {
    key: 'body_fat_pct', label: 'Body Fat %', labelAr: 'نسبة الدهون %', unit: '%',
    guide: 'Leave blank if unsure — an InBody scan or body fat calipers give the most accurate reading. Rough estimate is fine too.',
    guideAr: 'اتركه فارغاً إذا لم تكن متأكداً — جهاز InBody أو كماشة الدهون تعطي أدق قراءة. تقدير تقريبي مقبول أيضاً.',
  },
]

export default function MeasurementCard({ onSubmit, lang }: MeasurementCardProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [tooltip, setTooltip] = useState<string | null>(null)
  const isRTL = lang === 'ar'

  const activeField = FIELDS.find(f => f.key === tooltip)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.2)' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(187,92,246,0.08)', borderBottom: '1px solid rgba(187,92,246,0.15)' }}>
        <span className="font-heading font-bold text-xs tracking-widest uppercase" style={{ color: '#BB5CF6' }}>
          {isRTL ? '📏 القياسات الأولية' : '📏 Starting Measurements'}
        </span>
        <span className="font-heading text-xs" style={{ color: '#64748B' }}>
          {isRTL ? 'الوزن إلزامي' : 'Weight required'}
        </span>
      </div>

      {/* Guidance tooltip popup */}
      {tooltip && activeField && (
        <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex gap-3" style={{ background: 'rgba(187,92,246,0.08)', border: '1px solid rgba(187,92,246,0.2)' }}>
          <Info size={14} style={{ color: '#BB5CF6', flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1">
            <p className="font-heading text-xs font-bold mb-0.5" style={{ color: '#D88BFF' }}>
              {isRTL ? activeField.labelAr : activeField.label}
            </p>
            <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
              {isRTL ? activeField.guideAr : activeField.guide}
            </p>
          </div>
          <button onClick={() => setTooltip(null)}>
            <X size={13} style={{ color: '#475569' }} />
          </button>
        </div>
      )}

      {/* Fields grid */}
      <div className="p-4 grid grid-cols-2 gap-2.5" dir={isRTL ? 'rtl' : 'ltr'}>
        {FIELDS.map(field => (
          <div key={field.key} className={`flex flex-col gap-1 ${field.key === 'weight_kg' ? 'col-span-2' : ''}`}>
            <div className="flex items-center gap-1">
              <label className="font-heading text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#475569' }}>
                {isRTL ? field.labelAr : field.label}
                {field.required && <span style={{ color: '#BB5CF6' }}> *</span>}
              </label>
              <button
                type="button"
                onClick={() => setTooltip(tooltip === field.key ? null : field.key)}
                className="flex-shrink-0 transition-opacity hover:opacity-100"
                style={{ opacity: tooltip === field.key ? 1 : 0.45 }}
              >
                <Info size={10} style={{ color: tooltip === field.key ? '#BB5CF6' : '#64748B' }} />
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="—"
                value={values[field.key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                onFocus={() => setTooltip(field.key)}
                className="w-full rounded-lg px-3 py-2 pr-10 text-sm font-heading outline-none transition-all"
                style={{
                  background: '#080808',
                  border: `1px solid ${values[field.key] ? 'rgba(187,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#E2E8F0',
                }}
                onBlur={e => { e.target.style.boxShadow = 'none' }}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-heading text-[10px]" style={{ color: '#475569' }}>
                {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="px-4 pb-4">
        <button
          onClick={() => { if (values.weight_kg) onSubmit(values) }}
          disabled={!values.weight_kg}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider transition-all duration-200"
          style={{
            background: values.weight_kg ? '#BB5CF6' : 'rgba(255,255,255,0.05)',
            color: values.weight_kg ? 'white' : '#475569',
            boxShadow: values.weight_kg ? '0 0 20px rgba(187,92,246,0.35)' : 'none',
            letterSpacing: '0.1em',
          }}
        >
          {isRTL ? 'تأكيد القياسات' : 'CONFIRM MEASUREMENTS'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
