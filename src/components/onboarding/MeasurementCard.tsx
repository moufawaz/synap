'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

interface MeasurementCardProps {
  onSubmit: (data: Record<string, string>) => void
  lang: 'en' | 'ar'
}

const FIELDS = [
  { key: 'weight_kg', label: 'Weight', labelAr: 'الوزن', unit: 'kg', required: true },
  { key: 'neck_cm', label: 'Neck', labelAr: 'الرقبة', unit: 'cm' },
  { key: 'shoulders_cm', label: 'Shoulders', labelAr: 'الكتفان', unit: 'cm' },
  { key: 'chest_cm', label: 'Chest', labelAr: 'الصدر', unit: 'cm' },
  { key: 'waist_cm', label: 'Waist', labelAr: 'الخصر', unit: 'cm' },
  { key: 'hips_cm', label: 'Hips', labelAr: 'الأرداف', unit: 'cm' },
  { key: 'bicep_left_cm', label: 'Bicep (L)', labelAr: 'العضلة الثنائية (يسار)', unit: 'cm' },
  { key: 'bicep_right_cm', label: 'Bicep (R)', labelAr: 'العضلة الثنائية (يمين)', unit: 'cm' },
  { key: 'forearm_left_cm', label: 'Forearm (L)', labelAr: 'الساعد (يسار)', unit: 'cm' },
  { key: 'forearm_right_cm', label: 'Forearm (R)', labelAr: 'الساعد (يمين)', unit: 'cm' },
  { key: 'thigh_left_cm', label: 'Thigh (L)', labelAr: 'الفخذ (يسار)', unit: 'cm' },
  { key: 'thigh_right_cm', label: 'Thigh (R)', labelAr: 'الفخذ (يمين)', unit: 'cm' },
  { key: 'calf_left_cm', label: 'Calf (L)', labelAr: 'الساق (يسار)', unit: 'cm' },
  { key: 'calf_right_cm', label: 'Calf (R)', labelAr: 'الساق (يمين)', unit: 'cm' },
  { key: 'wrist_cm', label: 'Wrist', labelAr: 'المعصم', unit: 'cm' },
  { key: 'ankle_cm', label: 'Ankle', labelAr: 'الكاحل', unit: 'cm' },
  { key: 'body_fat_pct', label: 'Body Fat %', labelAr: 'نسبة الدهون %', unit: '%' },
]

export default function MeasurementCard({ onSubmit, lang }: MeasurementCardProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const isRTL = lang === 'ar'

  const handleSubmit = () => {
    if (!values.weight_kg) return
    onSubmit(values)
  }

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

      {/* Fields grid */}
      <div className="p-4 grid grid-cols-2 gap-2.5" dir={isRTL ? 'rtl' : 'ltr'}>
        {FIELDS.map(field => (
          <div key={field.key} className={`flex flex-col gap-1 ${field.key === 'weight_kg' ? 'col-span-2' : ''}`}>
            <label className="font-heading text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#475569' }}>
              {isRTL ? field.labelAr : field.label}
              {field.required && <span style={{ color: '#BB5CF6' }}> *</span>}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="—"
                value={values[field.key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 pr-10 text-sm font-heading outline-none transition-all"
                style={{
                  background: '#080808',
                  border: `1px solid ${values[field.key] ? 'rgba(187,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#E2E8F0',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(187,92,246,0.08)' }}
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
          onClick={handleSubmit}
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
