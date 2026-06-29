import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

const STEPS_EN = [
  'Analyzing your body composition…',
  'Calculating your calorie targets…',
  'Building your nutrition plan…',
  'Timing meals to your schedule…',
  'Programming your training split…',
  'Applying progressive overload…',
  'Personalizing to your preferences…',
  'Your plan is ready.',
]

const STEPS_AR = [
  'تحليل تركيبة جسمك…',
  'حساب أهداف السعرات الحرارية…',
  'بناء خطة التغذية…',
  'توقيت الوجبات حسب جدولك…',
  'برمجة تقسيم التدريب…',
  'تطبيق التحميل التدريجي…',
  'تخصيص كل شيء لتفضيلاتك…',
  'خطتك جاهزة.',
]

/**
 * Full-screen plan-generation progress overlay — mirrors the web PlanGenerating
 * component. Runs `task` (the real save-profile + generate-plan calls) while
 * animating a 0→100% ring and cycling step messages so the (30–60s) wait reads
 * as intentional progress, never a frozen spinner. Surfaces a Try Again /
 * Continue choice on error.
 */
export function PlanGenerating({
  lang,
  name,
  task,
  onComplete,
}: {
  lang: 'en' | 'ar'
  name: string
  task: () => Promise<void>
  onComplete: () => void
}) {
  const { color } = useTheme()
  const isRtl = lang === 'ar'
  const steps = isRtl ? STEPS_AR : STEPS_EN

  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)
  const barAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [progress, barAnim])

  async function run() {
    if (running.current) return
    running.current = true
    setError(null)
    setProgress(0)
    setStepIndex(0)

    // Climb through the "thinking" steps to ~90% while the generation phases
    // run. Total wall time varies by flow:
    //   - Renewal (4-phase Opus chain): ~115–130s typical
    //   - Initial gen (workout1+workout2+diet+videos): ~110–140s typical
    // Pace ~17s per step so the bar reaches 90% around 120s — close enough
    // to actual completion that users don't see it sitting full for ages.
    // After the task() promise resolves we jump to 100% and dismiss.
    let i = 0
    const ticker = setInterval(() => {
      i++
      if (i < steps.length - 1) {
        setStepIndex(i)
        setProgress(Math.round((i / (steps.length - 1)) * 90))
      }
    }, 17000)

    try {
      await task()
      clearInterval(ticker)
      setStepIndex(steps.length - 1)
      setProgress(100)
      setTimeout(onComplete, 1200)
    } catch (e) {
      clearInterval(ticker)
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      running.current = false
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })

  return (
    <View style={[styles.overlay, { backgroundColor: color.bg }]}>
      <View style={styles.center}>
        {/* Ring */}
        <View style={[styles.ring, { borderColor: color.sparkSoft }]}>
          <View style={[styles.ringInner, { borderColor: color.spark }]}>
            <Text style={[styles.percent, { color: color.spark }]}>{progress}%</Text>
          </View>
          {!error && progress < 100 ? (
            <ActivityIndicator style={styles.ringSpinner} color={color.spark} />
          ) : null}
        </View>

        <Text style={[styles.title, { color: color.text }]}>
          {isRtl ? `جارٍ البناء، ${name}` : `Building yours, ${name}`}
        </Text>

        {/* Progress bar */}
        <View style={[styles.track, { backgroundColor: color.elevated }]}>
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: color.spark }]} />
        </View>

        {error ? (
          <>
            <Text style={[styles.errorText, { color: '#F87171' }]}>{error}</Text>
            <View style={styles.btnRow}>
              <Pressable onPress={run} style={[styles.retryBtn, { backgroundColor: color.sparkSoft, borderColor: color.spark }]}>
                <Text style={[styles.retryText, { color: color.spark }]}>{isRtl ? 'إعادة المحاولة' : 'Try Again'}</Text>
              </Pressable>
              <Pressable onPress={onComplete} style={[styles.continueBtn, { borderColor: color.border }]}>
                <Text style={[styles.continueText, { color: color.muted }]}>{isRtl ? 'متابعة' : 'Continue'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.step, { color: color.muted }]}>{steps[Math.min(stepIndex, steps.length - 1)]}</Text>
            {/* In-progress cancel — gives users an out if they realise the
                renewal is taking too long instead of forcing them to wait
                for the per-phase timeout to fire. Server keeps processing
                the in-flight phase in the background (no clean way to
                cancel a Vercel function mid-flight), but the user is
                returned to the Plan page immediately. */}
            <Pressable
              onPress={onComplete}
              style={[styles.cancelBtn, { borderColor: color.border }]}
              hitSlop={8}
            >
              <Text style={[styles.cancelText, { color: color.muted }]}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Text>
            </Pressable>
          </>
        )}

        {/* Step dots */}
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === stepIndex ? 20 : 6,
                  backgroundColor: i <= stepIndex ? color.spark : color.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 50, paddingHorizontal: 28 },
  center: { alignItems: 'center', gap: 26, width: '100%', maxWidth: 360 },
  ring: { width: 128, height: 128, borderRadius: 64, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ringSpinner: { position: 'absolute', top: -2, alignSelf: 'center' },
  percent: { fontSize: 26, fontWeight: '900' },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  track: { width: '100%', height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999 },
  step: { fontSize: 14, textAlign: 'center', letterSpacing: 0.3 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 12 },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  retryText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  continueBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  continueText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  cancelBtn: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  cancelText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { height: 6, borderRadius: 999 },
})
