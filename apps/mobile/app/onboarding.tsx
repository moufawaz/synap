import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/auth/AuthProvider'
import { PlanGenerating } from '@/components/PlanGenerating'
import { generateMobilePlan, MobileProfileInput, saveMobileProfile } from '@/features/onboarding'
import { syncSynapReminders } from '@/features/notifications'
import { cancelOnboardingReminder } from '@/lib/onboardingReminder'
import { analyzeInBodyPhoto, createMeasurement } from '@/features/measurements'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { localDateKey } from '@/lib/date'

const initialProfile: MobileProfileInput = {
  // Age intentionally starts EMPTY. It used to default to '25', which meant
  // most users never changed it and every plan was built for a 25-year-old —
  // age drives recovery, volume, and intensity in calculateWorkoutParams and
  // both plan prompts, so it must be real. Step 0 validates it.
  name: '', age: '', gender: 'male', ion_gender: 'male', language: 'en',
  weight_kg: '', height_cm: '',
  goal: 'lose_fat', goal_speed: 'moderate', goal_target: '', goal_date: '',
  work_schedule: 'work', work_hours: '', wake_time: '7:30', sleep_time: '23:00',
  lunch_break: '', stress_level: 'moderate', sleep_quality: 'average',
  // activity_level and training_experience start EMPTY on purpose (same
  // reasoning as age): both materially change the plan, so the user must
  // pick — their steps validate the choice.
  activity_level: '',
  currently_training: 'fresh', training_experience: '', current_training_desc: '', gym_access: 'gym',
  equipment: '', training_days: '4', session_duration: '60', training_time: 'evening',
  training_style: 'mix', exercises_hated: '', strength_levels: '',
  foods_loved: '', foods_hated: '', dietary_preference: '', allergies: '',
  meals_per_day: '3', cooking_ability: 'cook', food_budget: 'moderate',
  injuries: '', medical_conditions: '', supplements: '',
}

const STRENGTH_LIFTS: Array<[string, string, string]> = [
  ['squat', 'Squat', 'سكوات'], ['bench', 'Bench press', 'بنش برس'], ['deadlift', 'Deadlift', 'ديدلفت'],
  ['ohp', 'Overhead press', 'ضغط عسكري'], ['row', 'Barbell row', 'تجديف بار'],
]

// Step ids stay English internally; display names are bilingual.
const STEPS: Array<{ en: string; ar: string }> = [
  { en: 'You', ar: 'أنت' },
  { en: 'Goal', ar: 'الهدف' },
  { en: 'Lifestyle', ar: 'نمط الحياة' },
  { en: 'Training', ar: 'التمرين' },
  { en: 'Nutrition', ar: 'التغذية' },
  { en: 'Body', ar: 'الجسم' },
  { en: 'Health', ar: 'الصحة' },
]

// One-line context per step so users know WHY Ion asks — makes the form feel
// like a coach interview instead of paperwork.
const STEP_INTROS: Array<{ en: string; ar: string }> = [
  { en: 'The basics Ion builds everything on.', ar: 'الأساسيات التي يبني عليها آيون كل شيء.' },
  { en: 'This shapes your calories, volume, and pace.', ar: 'هذا يحدد سعراتك وحجم تمرينك وسرعة تقدمك.' },
  { en: 'Your plan fits your real day — not the other way round.', ar: 'خطتك تناسب يومك الحقيقي — وليس العكس.' },
  { en: 'How, where, and when you train.', ar: 'كيف وأين ومتى تتمرن.' },
  { en: 'Meals are built from foods you actually enjoy.', ar: 'وجباتك تُبنى من أطعمة تحبها فعلاً.' },
  { en: 'A baseline today makes progress visible later.', ar: 'قياس اليوم يجعل تقدمك مرئياً لاحقاً.' },
  { en: 'Ion programs around injuries and conditions safely.', ar: 'آيون يبرمج تمارينك بأمان حول الإصابات والحالات الصحية.' },
]

// Body measurements collected at onboarding. Weight + key circumferences match
// the web flow so a baseline exists from day one. All optional except weight
// (already captured on step 0). Persisted via /api/measurements after the user
// taps "Generate my plan".
const MEASUREMENT_FIELDS: Array<[string, string, string]> = [
  ['neck_cm', 'Neck (cm)', 'الرقبة (سم)'],
  ['shoulders_cm', 'Shoulders (cm)', 'الكتفان (سم)'],
  ['chest_cm', 'Chest (cm)', 'الصدر (سم)'],
  ['waist_cm', 'Waist (cm)', 'الخصر (سم)'],
  ['hips_cm', 'Hips (cm)', 'الأرداف (سم)'],
  ['bicep_left_cm', 'Bicep L (cm)', 'العضد يسار (سم)'],
  ['bicep_right_cm', 'Bicep R (cm)', 'العضد يمين (سم)'],
  ['thigh_left_cm', 'Thigh L (cm)', 'الفخذ يسار (سم)'],
  ['thigh_right_cm', 'Thigh R (cm)', 'الفخذ يمين (سم)'],
  ['calf_left_cm', 'Calf L (cm)', 'الساق يسار (سم)'],
  ['calf_right_cm', 'Calf R (cm)', 'الساق يمين (سم)'],
]

// ── Module-level inputs ───────────────────────────────────────────────────────
// IMPORTANT: these MUST live outside the screen component. If they're defined
// inside, every keystroke re-renders the screen, React remounts the TextInput,
// and the keyboard dismisses after one character.

function Field({ label, value, onChangeText, keyboardType, placeholder, color, isRtl }: {
  label: string; value: string; onChangeText: (v: string) => void
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad'; placeholder?: string; color: any; isRtl: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={color.dim}
        style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
      />
    </View>
  )
}

function Segment({ label, value, options, onChange, wrap, color, isRtl }: {
  label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void
  wrap?: boolean; color: any; isRtl: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
      <View style={[styles.segmentRow, wrap && { flexWrap: 'wrap' }]}>
        {options.map(([val, lbl]) => {
          const active = value === val
          return (
            <Pressable key={val} onPress={() => onChange(val)}
              style={[styles.segment, { borderColor: active ? color.spark : color.border, backgroundColor: active ? color.sparkSoft : color.elevated }]}>
              <Text style={[styles.segmentText, { color: active ? color.spark : color.text }]}>{lbl}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function MultiSelect({ label, selected, onToggle, options, color, isRtl }: {
  label: string; selected: string; onToggle: (v: string) => void; options: Array<[string, string]>; color: any; isRtl: boolean
}) {
  const list = String(selected || '').split(',').filter(Boolean)
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
      <View style={[styles.segmentRow, { flexWrap: 'wrap' }]}>
        {options.map(([val, lbl]) => {
          const active = list.includes(val)
          return (
            <Pressable key={val} onPress={() => onToggle(val)}
              style={[styles.segment, { borderColor: active ? color.spark : color.border, backgroundColor: active ? color.sparkSoft : color.elevated }]}>
              <Text style={[styles.segmentText, { color: active ? color.spark : color.text }]}>{lbl}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { color } = useTheme()
  const { language, isRtl } = useLanguage()
  const { session } = useAuth()
  const [profile, setProfile] = useState<MobileProfileInput>({ ...initialProfile, language })
  const [step, setStep] = useState(0)

  // Bilingual helper — every user-facing string goes through this so Arabic
  // users onboard fully in Arabic (previously onboarding was English-only,
  // the one screen in the app that wasn't localized).
  const t = (en: string, ar: string) => (language === 'ar' ? ar : en)

  // Pre-fill the name from the signed-in account (Sign in with Apple / Google
  // provide it via the auth framework) so we never re-ask for info the user
  // already supplied — App Store Guideline 4 / Sign in with Apple.
  useEffect(() => {
    const meta = (session?.user?.user_metadata ?? {}) as Record<string, any>
    const authName = String(meta.full_name || meta.name || '').trim()
    if (authName) setProfile(p => (p.name.trim() ? p : { ...p, name: authName }))
  }, [session])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genPayload, setGenPayload] = useState<MobileProfileInput | null>(null)
  // Tracks whether the workout phase already succeeded, so a "Try Again" after a
  // diet-phase failure doesn't needlessly regenerate (and re-charge rate limit
  // for) the workout plan.
  const workoutPhaseDone = useRef(false)
  const [scanningInbody, setScanningInbody] = useState(false)
  const [inbodyDone, setInbodyDone] = useState(false)
  const [strength, setStrength] = useState<Record<string, string>>({})
  const [measurements, setMeasurements] = useState<Record<string, string>>({})

  function update<K extends keyof MobileProfileInput>(key: K, value: MobileProfileInput[K]) {
    setProfile(current => ({ ...current, [key]: value }))
  }

  function toggleCsv(field: keyof MobileProfileInput, value: string) {
    const list = String(profile[field] || '').split(',').filter(Boolean)
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
    update(field, next.join(',') as MobileProfileInput[typeof field])
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!profile.name.trim()) return t('Please enter your name.', 'الرجاء إدخال اسمك.')
      const age = parseInt(profile.age, 10)
      if (!profile.age.trim() || !Number.isFinite(age)) {
        return t('Please enter your age — Ion uses it to set recovery and intensity.', 'الرجاء إدخال عمرك — يستخدمه آيون لضبط التعافي وشدة التمرين.')
      }
      if (age < 13 || age > 90) {
        return t('Please enter an age between 13 and 90.', 'الرجاء إدخال عمر بين 13 و90.')
      }
      if (!profile.weight_kg.trim() || !profile.height_cm.trim()) {
        return t('Weight and height are required.', 'الوزن والطول مطلوبان.')
      }
    }
    if (step === 2 && !profile.activity_level) {
      return t('Pick your daily activity level — it changes your calorie target.', 'اختر مستوى نشاطك اليومي — يغيّر هدف سعراتك.')
    }
    if (step === 3 && !profile.training_experience) {
      return t('Pick your training experience — it sets your volume and progression.', 'اختر خبرتك التدريبية — تحدد حجم تمرينك وتقدمك.')
    }
    if (step === 4 && !profile.foods_loved.trim()) {
      return t('Tell Ion at least a few foods you enjoy.', 'أخبر آيون ببعض الأطعمة التي تحبها على الأقل.')
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { Alert.alert('SYNAP', err); return }
    if (step < STEPS.length - 1) setStep(step + 1)
    else beginGeneration()
  }
  function back() { if (step > 0) setStep(step - 1) }

  async function scanInBody() {
    setScanningInbody(true)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      let asset
      if (perm.granted) {
        const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        if (shot.canceled) { setScanningInbody(false); return }
        asset = shot.assets[0]
      } else {
        const lib = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 })
        if (lib.canceled) { setScanningInbody(false); return }
        asset = lib.assets[0]
      }
      if (!asset?.base64) { Alert.alert('SYNAP', t('Could not read the image.', 'تعذّرت قراءة الصورة.')); return }
      const res = await analyzeInBodyPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      if (res.success) {
        setInbodyDone(true)
        Alert.alert(
          t('InBody scan added ✓', 'تمت إضافة فحص InBody ✓'),
          t('Ion will use your measured body composition to fine-tune your plan.', 'سيستخدم آيون تكوين جسمك المقاس لضبط خطتك بدقة.'),
        )
      } else {
        Alert.alert('SYNAP', t('Could not read that scan — you can add it later in Measurements.', 'تعذّرت قراءة الفحص — يمكنك إضافته لاحقاً من القياسات.'))
      }
    } catch (e) {
      Alert.alert('InBody', e instanceof Error ? e.message : t('Could not analyze the scan.', 'تعذّر تحليل الفحص.'))
    } finally {
      setScanningInbody(false)
    }
  }

  // Build the final payload and hand off to the full-screen PlanGenerating
  // overlay, which animates real progress while save-profile + generate-plan run
  // (and offers Try Again on error) — instead of a static spinner that reads as
  // a frozen screen during the 30–60s generation.
  function beginGeneration() {
    const filledStrength = Object.fromEntries(
      Object.entries(strength).filter(([, v]) => String(v).trim()).map(([k, v]) => [k, `${String(v).trim()}kg`]),
    )
    const payload: MobileProfileInput = {
      ...profile,
      language,
      strength_levels: Object.keys(filledStrength).length ? JSON.stringify(filledStrength) : '',
    }
    setGenPayload(payload)
    setGenerating(true)
  }

  const showStrength = profile.gym_access === 'gym' || profile.currently_training === 'already'
  const align = isRtl ? 'right' : 'left'

  // Full-screen animated progress while the plan is generated (mirrors web).
  if (generating && genPayload) {
    return (
      <PlanGenerating
        lang={language}
        name={(profile.name || '').trim() || (language === 'ar' ? 'بطل' : 'Athlete')}
        task={async () => {
          await saveMobileProfile(genPayload)
          // Body measurements baseline (optional fields, skipped if empty).
          const cleaned: Record<string, number> = {}
          for (const [k, raw] of Object.entries(measurements)) {
            const n = parseFloat(String(raw).trim())
            if (Number.isFinite(n) && n > 0) cleaned[k] = n
          }
          if (Object.keys(cleaned).length) {
            try {
              await createMeasurement({
                date: localDateKey(),
                weight_kg: parseFloat(genPayload.weight_kg) || null,
                ...cleaned,
                notes: 'Onboarding baseline',
              } as any)
            } catch { /* non-fatal */ }
          }
          // Workout is written in two halves so each request stays under the 60s
          // serverless limit; skip already-completed halves on Try Again.
          if (!workoutPhaseDone.current) {
            await generateMobilePlan(genPayload, 'workout')
            await generateMobilePlan(genPayload, 'workout2')
            workoutPhaseDone.current = true
          }
          // Nutrition plan.
          await generateMobilePlan(genPayload, 'diet')
          // Enrich exercise videos (non-fatal — the plan is already complete).
          await generateMobilePlan(genPayload, 'videos').catch(() => {})
        }}
        onComplete={() => {
          // Plan exists now — the pending "finish onboarding" reminder is moot.
          cancelOnboardingReminder()
          // Request notification permission and schedule the full proactive
          // reminder set, then land on the dashboard.
          syncSynapReminders(true).catch(() => {})
          router.replace('/(tabs)')
        }}
        onExit={() => {
          // User backed out (Continue/Cancel) after a phase failed — plan may
          // be partial (e.g. workout saved but diet never generated). Do NOT
          // cancel the onboarding reminder or schedule the full reminder set
          // here; the dashboard re-schedules the reminder itself whenever the
          // workout+diet pair isn't both present, so this just navigates and
          // lets that recovery path do its job.
          router.replace('/(tabs)')
        }}
      />
    )
  }

  return (
    <Screen>
      <IonPageHeader
        eyebrow={t(
          `STEP ${step + 1} OF ${STEPS.length} · ${STEPS[step].en.toUpperCase()}`,
          `الخطوة ${step + 1} من ${STEPS.length} · ${STEPS[step].ar}`,
        )}
        title={t('Build your plan', 'ابنِ خطتك')}
        subtitle={t('The more Ion knows, the more personal your plan.', 'كلما عرف آيون أكثر، كانت خطتك أكثر تخصيصاً.')}
      />

      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressDot, { backgroundColor: i <= step ? color.spark : color.elevated }]} />
        ))}
      </View>

      {/* Per-step context line — why Ion is asking */}
      <Text style={[styles.stepIntro, { color: color.dim, textAlign: align }]}>
        {t(STEP_INTROS[step].en, STEP_INTROS[step].ar)}
      </Text>

      <Card>
        {step === 0 ? (
          <>
            <Field label={t('Name', 'الاسم')} value={profile.name} onChangeText={v => update('name', v)} color={color} isRtl={isRtl} />
            <View style={styles.row}>
              <Field label={t('Age', 'العمر')} value={profile.age} keyboardType="number-pad" placeholder={t('e.g. 27', 'مثال: 27')} onChangeText={v => update('age', v)} color={color} isRtl={isRtl} />
              <Field label={t('Weight (kg)', 'الوزن (كجم)')} value={profile.weight_kg} keyboardType="decimal-pad" placeholder="75" onChangeText={v => update('weight_kg', v)} color={color} isRtl={isRtl} />
            </View>
            <Field label={t('Height (cm)', 'الطول (سم)')} value={profile.height_cm} keyboardType="decimal-pad" placeholder="175" onChangeText={v => update('height_cm', v)} color={color} isRtl={isRtl} />
            <Text style={[styles.hint, { color: color.dim, textAlign: align, marginTop: -6, marginBottom: 12 }]}>
              {t('Age, weight, and height set your calories, recovery, and training intensity.', 'العمر والوزن والطول تحدد سعراتك وتعافيك وشدة تمرينك.')}
            </Text>
            <Segment label={t('Gender', 'الجنس')} value={profile.gender} options={[['male', t('Male', 'ذكر')], ['female', t('Female', 'أنثى')]]} onChange={v => update('gender', v as MobileProfileInput['gender'])} color={color} isRtl={isRtl} />
            <Segment label={t('Ion avatar', 'شكل آيون')} value={profile.ion_gender} options={[['male', t('Male', 'ذكر')], ['female', t('Female', 'أنثى')]]} onChange={v => update('ion_gender', v as MobileProfileInput['ion_gender'])} color={color} isRtl={isRtl} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Segment label={t('Main goal', 'هدفك الرئيسي')} value={profile.goal} wrap color={color} isRtl={isRtl}
              options={[['lose_fat', t('Lose fat', 'خسارة دهون')], ['build_muscle', t('Build muscle', 'بناء عضل')], ['recomposition', t('Recomp', 'إعادة تشكيل')], ['improve_fitness', t('Fitness', 'لياقة')], ['be_healthier', t('Be healthier', 'صحة أفضل')]]}
              onChange={v => update('goal', v)} />
            <Segment label={t('How aggressive?', 'ما مدى السرعة؟')} value={profile.goal_speed} color={color} isRtl={isRtl}
              options={[['slow', t('Slow & steady', 'بطيء وثابت')], ['moderate', t('Moderate', 'متوسط')], ['aggressive', t('Aggressive', 'سريع')]]}
              onChange={v => update('goal_speed', v)} />
            <Field label={t('Specific target (optional)', 'هدف محدد (اختياري)')} value={profile.goal_target} onChangeText={v => update('goal_target', v)} placeholder={t('e.g. reach 80kg, fit into a suit', 'مثال: الوصول إلى 80 كجم')} color={color} isRtl={isRtl} />
            <Field label={t('Timeframe (optional)', 'الإطار الزمني (اختياري)')} value={profile.goal_date} onChangeText={v => update('goal_date', v)} placeholder={t('e.g. 3 months, by summer', 'مثال: 3 أشهر، قبل الصيف')} color={color} isRtl={isRtl} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Segment label={t('Work / study', 'عمل / دراسة')} value={profile.work_schedule} wrap color={color} isRtl={isRtl}
              options={[['work', t('Work', 'عمل')], ['study', t('Study', 'دراسة')], ['both', t('Both', 'كلاهما')], ['neither', t('Neither', 'لا شيء')]]}
              onChange={v => update('work_schedule', v)} />
            {profile.work_schedule !== 'neither' ? (
              <Field label={t('Your hours (optional)', 'ساعاتك (اختياري)')} value={profile.work_hours} onChangeText={v => update('work_hours', v)} placeholder={t('e.g. 9–5, rotating shifts', 'مثال: 9-5، ورديات')} color={color} isRtl={isRtl} />
            ) : null}
            <Segment label={t('Daily activity (outside training)', 'نشاطك اليومي (خارج التمرين)')} value={profile.activity_level} wrap color={color} isRtl={isRtl}
              options={[['desk', t('Mostly sitting', 'جالس غالباً')], ['mixed', t('On my feet sometimes', 'أتحرك أحياناً')], ['on_feet', t('On my feet all day', 'واقف طوال اليوم')]]}
              onChange={v => update('activity_level', v)} />
            <Segment label={t('Wake up', 'الاستيقاظ')} value={profile.wake_time} wrap color={color} isRtl={isRtl}
              options={[['5:30', t('5–6 AM', '5-6 ص')], ['6:30', t('6–7 AM', '6-7 ص')], ['7:30', t('7–8 AM', '7-8 ص')], ['8:30', t('8–9 AM', '8-9 ص')], ['9:30', t('9 AM+', 'بعد 9 ص')]]}
              onChange={v => update('wake_time', v)} />
            <Segment label={t('Sleep', 'النوم')} value={profile.sleep_time} wrap color={color} isRtl={isRtl}
              options={[['22:00', t('Before 10 PM', 'قبل 10 م')], ['22:30', t('10–11 PM', '10-11 م')], ['23:30', t('11 PM–12', '11-12 م')], ['01:00', t('After 12', 'بعد 12')]]}
              onChange={v => update('sleep_time', v)} />
            <Segment label={t('Stress level', 'مستوى التوتر')} value={profile.stress_level} color={color} isRtl={isRtl}
              options={[['low', t('Calm', 'هادئ')], ['moderate', t('Moderate', 'متوسط')], ['high', t('High', 'مرتفع')]]}
              onChange={v => update('stress_level', v)} />
            <Segment label={t('Sleep quality', 'جودة النوم')} value={profile.sleep_quality} color={color} isRtl={isRtl}
              options={[['solid', t('Sleep well', 'أنام جيداً')], ['average', t('Hit or miss', 'متقلب')], ['struggling', t('Struggle', 'أعاني')]]}
              onChange={v => update('sleep_quality', v)} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Segment label={t('Currently training?', 'هل تتمرن حالياً؟')} value={profile.currently_training} color={color} isRtl={isRtl}
              options={[['already', t('Already training', 'أتمرن بالفعل')], ['fresh', t('Starting fresh', 'أبدأ من جديد')]]}
              onChange={v => update('currently_training', v)} />
            <Segment label={t('Training experience', 'خبرتك التدريبية')} value={profile.training_experience} wrap color={color} isRtl={isRtl}
              options={[['beginner', t('Under 1 year', 'أقل من سنة')], ['intermediate', t('1–3 years', '1-3 سنوات')], ['advanced', t('3+ years', 'أكثر من 3 سنوات')]]}
              onChange={v => update('training_experience', v)} />
            {profile.currently_training === 'already' ? (
              <Field label={t('Your current routine', 'روتينك الحالي')} value={profile.current_training_desc} onChangeText={v => update('current_training_desc', v)} placeholder={t('gym, home, sports, cardio…', 'جيم، منزل، رياضات، كارديو…')} color={color} isRtl={isRtl} />
            ) : null}
            <Segment label={t('Where?', 'أين؟')} value={profile.gym_access} options={[['gym', t('Gym', 'جيم')], ['home', t('Home', 'المنزل')]]} onChange={v => update('gym_access', v as MobileProfileInput['gym_access'])} color={color} isRtl={isRtl} />
            {profile.gym_access === 'home' ? (
              <MultiSelect label={t('Equipment', 'المعدات')} selected={profile.equipment} onToggle={v => toggleCsv('equipment', v)} color={color} isRtl={isRtl}
                options={[['bodyweight', t('Bodyweight', 'وزن الجسم')], ['bands', t('Bands', 'أحزمة مقاومة')], ['dumbbells', t('Dumbbells', 'دمبلات')], ['pullup_bar', t('Pull-up bar', 'عقلة')], ['mixed', t('Mixed', 'متنوعة')]]} />
            ) : (
              <Segment label={t('Training style', 'أسلوب التمرين')} value={profile.training_style} wrap color={color} isRtl={isRtl}
                options={[['heavy_compound', t('Heavy compound', 'مركب ثقيل')], ['machines', t('Machines', 'أجهزة')], ['cables', t('Cables', 'كيبلات')], ['mix', t('Mix', 'مزيج')]]}
                onChange={v => update('training_style', v)} />
            )}
            <Segment label={t('Days / week', 'أيام / أسبوع')} value={profile.training_days} wrap color={color} isRtl={isRtl}
              options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} onChange={v => update('training_days', v)} />
            <Segment label={t('Session length', 'مدة الجلسة')} value={profile.session_duration} wrap color={color} isRtl={isRtl}
              options={[['30', t('30 min', '30 د')], ['45', t('45 min', '45 د')], ['60', t('1 hour', 'ساعة')], ['90', t('90 min', '90 د')]]} onChange={v => update('session_duration', v)} />
            <Segment label={t('Train when?', 'متى تتمرن؟')} value={profile.training_time} wrap color={color} isRtl={isRtl}
              options={[['morning', t('Morning', 'صباحاً')], ['afternoon', t('Afternoon', 'ظهراً')], ['evening', t('Evening', 'مساءً')], ['late_night', t('Late night', 'ليلاً متأخراً')]]}
              onChange={v => update('training_time', v)} />
            <Field label={t('Exercises to avoid (optional)', 'تمارين تتجنبها (اختياري)')} value={profile.exercises_hated} onChangeText={v => update('exercises_hated', v)} placeholder={t('anything painful or disliked', 'أي تمرين مؤلم أو غير محبب')} color={color} isRtl={isRtl} />
            {showStrength ? (
              <View style={styles.field}>
                <Text style={[styles.label, { color: color.muted, textAlign: align }]}>
                  {t('Current strength (optional, kg for ~5 reps)', 'قوتك الحالية (اختياري، كجم لـ~5 تكرارات)')}
                </Text>
                {STRENGTH_LIFTS.map(([key, en, ar]) => (
                  <View key={key} style={[styles.row, { alignItems: 'center', marginBottom: 8 }]}>
                    <Text style={[styles.strengthLabel, { color: color.text, textAlign: align }]}>{t(en, ar)}</Text>
                    <TextInput
                      value={strength[key] || ''}
                      onChangeText={v => setStrength(s => ({ ...s, [key]: v }))}
                      keyboardType="decimal-pad"
                      placeholder={t('kg', 'كجم')}
                      placeholderTextColor={color.dim}
                      style={[styles.input, { flex: 1, backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: align }]}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Field label={t('Foods you love', 'أطعمة تحبها')} value={profile.foods_loved} onChangeText={v => update('foods_loved', v)} placeholder={t('be specific — these go in your meals', 'كن محدداً — ستدخل في وجباتك')} color={color} isRtl={isRtl} />
            <Field label={t('Foods to avoid (optional)', 'أطعمة تتجنبها (اختياري)')} value={profile.foods_hated} onChangeText={v => update('foods_hated', v)} color={color} isRtl={isRtl} />
            <MultiSelect label={t('Dietary rules', 'قواعد غذائية')} selected={profile.dietary_preference} onToggle={v => toggleCsv('dietary_preference', v)} color={color} isRtl={isRtl}
              options={[['none', t('None', 'لا شيء')], ['halal', t('Halal', 'حلال')], ['no_pork', t('No pork', 'بدون خنزير')], ['vegetarian', t('Vegetarian', 'نباتي')], ['vegan', t('Vegan', 'نباتي صرف')], ['lactose_free', t('Lactose-free', 'بدون لاكتوز')], ['gluten_free', t('Gluten-free', 'بدون غلوتين')]]} />
            <Field label={t('Allergies (optional)', 'حساسية (اختياري)')} value={profile.allergies} onChangeText={v => update('allergies', v)} color={color} isRtl={isRtl} />
            <Segment label={t('Meals / day', 'وجبات / يوم')} value={profile.meals_per_day} wrap color={color} isRtl={isRtl}
              options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} onChange={v => update('meals_per_day', v)} />
            <Segment label={t('Cooking', 'الطبخ')} value={profile.cooking_ability} wrap color={color} isRtl={isRtl}
              options={[['cook', t('I cook', 'أطبخ')], ['quick', t('Quick & simple', 'سريع وبسيط')], ['eat_out', t('Eat out', 'آكل خارجاً')]]} onChange={v => update('cooking_ability', v)} />
            <Segment label={t('Food budget', 'ميزانية الطعام')} value={profile.food_budget} color={color} isRtl={isRtl}
              options={[['tight', t('Tight', 'محدودة')], ['moderate', t('Moderate', 'متوسطة')], ['flexible', t('Flexible', 'مرنة')]]} onChange={v => update('food_budget', v)} />
          </>
        ) : null}

        {step === 5 ? (
          <>
            <Text style={[styles.label, { color: color.muted, textAlign: align, marginBottom: 10 }]}>
              {t(
                'Body measurements (all optional). Every value you add today becomes a baseline so Ion can show progress over time.',
                'قياسات الجسم (اختيارية). كل قياس تضيفه اليوم يصبح قاعدة لعرض التقدم لاحقاً.',
              )}
            </Text>
            {MEASUREMENT_FIELDS.map(([key, en, ar]) => (
              <Field
                key={key}
                label={t(en, ar)}
                value={measurements[key] || ''}
                onChangeText={v => setMeasurements(m => ({ ...m, [key]: v }))}
                keyboardType="decimal-pad"
                color={color}
                isRtl={isRtl}
              />
            ))}
            <Text style={[styles.hint, { color: color.dim, textAlign: align }]}>
              {t(
                'Unsure about one? Leave it blank — you can fill it in later from Measurements.',
                'لست متأكداً من قياس؟ اتركه فارغاً — يمكنك إضافته لاحقاً من القياسات.',
              )}
            </Text>
          </>
        ) : null}

        {step === 6 ? (
          <>
            <Field label={t('Injuries / limitations (optional)', 'إصابات / قيود (اختياري)')} value={profile.injuries} onChangeText={v => update('injuries', v)} color={color} isRtl={isRtl} />
            <Field label={t('Medical conditions (optional)', 'حالات طبية (اختياري)')} value={profile.medical_conditions} onChangeText={v => update('medical_conditions', v)} placeholder={t('diabetes, blood pressure, etc.', 'سكري، ضغط دم، إلخ')} color={color} isRtl={isRtl} />
            <MultiSelect label={t('Supplements', 'المكملات')} selected={profile.supplements} onToggle={v => toggleCsv('supplements', v)} color={color} isRtl={isRtl}
              options={[['none', t('None', 'لا شيء')], ['protein', t('Protein', 'بروتين')], ['creatine', t('Creatine', 'كرياتين')], ['vitamins', t('Vitamins', 'فيتامينات')], ['multiple', t('Multiple', 'متعددة')]]} />
            <View style={styles.field}>
              <Text style={[styles.label, { color: color.muted, textAlign: align }]}>{t('InBody scan (optional)', 'فحص InBody (اختياري)')}</Text>
              <Pressable disabled={scanningInbody} onPress={scanInBody}
                style={[styles.inbodyBtn, { borderColor: inbodyDone ? color.pulse : color.spark, backgroundColor: color.elevated }]}>
                {scanningInbody ? <ActivityIndicator color={color.spark} /> : (
                  <>
                    <Feather name={inbodyDone ? 'check-circle' : 'camera'} size={16} color={inbodyDone ? color.pulse : color.spark} />
                    <Text style={[styles.inbodyText, { color: inbodyDone ? color.pulse : color.spark }]}>
                      {inbodyDone
                        ? t('InBody added — exact body composition', 'تمت إضافة InBody — تكوين الجسم بدقة')
                        : t('Scan InBody for precise targets', 'امسح فحص InBody لأهداف دقيقة')}
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={[styles.hint, { color: color.dim, textAlign: align }]}>
                {t(
                  'Gives Ion your real muscle/fat for more accurate calories. You can also add it later in Measurements.',
                  'يعطي آيون نسب العضل والدهون الحقيقية لسعرات أدق. يمكنك إضافته لاحقاً من القياسات.',
                )}
              </Text>
            </View>
          </>
        ) : null}
      </Card>

      <View style={[styles.navRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        {step > 0 ? (
          <Pressable disabled={loading} onPress={back} style={[styles.backBtn, { borderColor: color.border, backgroundColor: color.elevated }]}>
            <Text style={[styles.backText, { color: color.text }]}>{t('Back', 'رجوع')}</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={loading} onPress={next} style={[styles.nextBtn, { backgroundColor: color.spark }]}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.nextText}>
              {step === STEPS.length - 1 ? t('Generate my plan', 'ولّد خطتي') : t('Continue', 'متابعة')}
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 10, paddingHorizontal: 4 },
  progressDot: { flex: 1, height: 4, borderRadius: 999 },
  stepIntro: { fontSize: 13, lineHeight: 18, marginBottom: 12, paddingHorizontal: 4, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  segmentText: { fontWeight: '900', fontSize: 13 },
  strengthLabel: { width: 120, fontSize: 14, fontWeight: '700' },
  inbodyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderWidth: 1, borderRadius: 14 },
  inbodyText: { fontWeight: '900', fontSize: 13 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  navRow: { gap: 10, marginTop: 4 },
  backBtn: { minHeight: 54, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backText: { fontSize: 14, fontWeight: '900' },
  nextBtn: { flex: 1, minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
})
