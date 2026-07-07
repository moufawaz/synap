import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useFocusEffect } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { DataError } from '@/components/DataError'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer'
import { VideoModal } from '@/components/VideoModal'
import { getPlanHistory, logWorkout, swapExercise, TodayWorkout, type ExerciseAlternative } from '@/features/workout'
import { notifyError, notifySuccess, tapLight, tapMedium } from '@/lib/haptics'
import { endWorkoutActivity, startWorkoutActivity, updateWorkoutActivity } from '@/lib/liveActivity'
import { recordWorkoutCompletedAndMaybeAskForReview } from '@/lib/storeReview'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

// Local session helpers — persisted in AsyncStorage, instant, no network needed
const SESSION_KEY = (date: string) => `@synap:workout-session:${date}`

/** Today-only exercise replacement chosen via the swap button (machine taken,
 *  joint niggle). Keyed by the exercise's index in the plan day. The PLAN is
 *  untouched — permanent swaps go through Ion chat; this heals one session. */
type ExerciseOverride = { name: string; sets: number; reps: string; rest_sec: number; original: string }

async function loadLocalSession(date: string) {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY(date))
    if (!raw) return null
    return JSON.parse(raw) as {
      completedExercises: number[]
      exercisePerformance: Record<string, { weight?: string; reps?: string }>
      exerciseOverrides?: Record<string, ExerciseOverride>
    }
  } catch { return null }
}

async function saveLocalSession(
  date: string,
  completedExercises: number[],
  exercisePerformance: Record<string, { weight?: string; reps?: string }>,
  exerciseOverrides?: Record<string, ExerciseOverride>,
) {
  try {
    await AsyncStorage.setItem(SESSION_KEY(date), JSON.stringify({ completedExercises, exercisePerformance, exerciseOverrides: exerciseOverrides || {} }))
  } catch {}
}

// ── Day helpers ───────────────────────────────────────────────────────────────

const CANONICAL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
type CanonicalDay = typeof CANONICAL_DAYS[number]

const DAY_SHORT: Record<CanonicalDay, string> = {
  Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
}

const DAY_ALIASES: Record<string, CanonicalDay> = {
  sunday: 'Sunday', sun: 'Sunday',
  monday: 'Monday', mon: 'Monday',
  tuesday: 'Tuesday', tue: 'Tuesday', tues: 'Tuesday',
  wednesday: 'Wednesday', wed: 'Wednesday',
  thursday: 'Thursday', thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday',
  friday: 'Friday', fri: 'Friday',
  saturday: 'Saturday', sat: 'Saturday',
  'الأحد': 'Sunday', 'الاحد': 'Sunday',
  'الإثنين': 'Monday', 'الاثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday', 'الاربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday', 'الجمعه': 'Friday',
  'السبت': 'Saturday',
}

function canonicalDay(value: unknown): CanonicalDay | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const exact = CANONICAL_DAYS.find(d => d.toLowerCase() === raw.toLowerCase())
  if (exact) return exact
  const key = raw.toLowerCase().replace(/^يوم\s+/, '').replace(/[ً-ٟ]/g, '')
  return DAY_ALIASES[key] ?? null
}

function dayNameOf(day: any): CanonicalDay | null {
  return canonicalDay(day?.day_name ?? day?.day ?? day?.name ?? '')
}

function getPlanDays(plan: any): any[] {
  // Match the web plan page exactly: prefer a weeks[] array (weeks[0].days),
  // otherwise fall back to the top-level days[]. The web reads `weeks` first;
  // reading `days` first here was the source of the "5 days vs 4" mismatch when
  // a plan carried both a legacy days[] and the current weeks[].
  if (Array.isArray(plan?.weeks) && plan.weeks.length > 0) {
    const first = plan.weeks.find((w: any) => Array.isArray(w?.days) && w.days.length > 0)
    if (first?.days) return first.days
  }
  if (Array.isArray(plan?.days)) return plan.days
  return []
}

function getDayWorkout(plan: any, day: CanonicalDay): any | null {
  return getPlanDays(plan).find((d: any) => dayNameOf(d) === day) ?? null
}

// Same rule as the web plan page (DayList): a day with no exercises is a rest
// day; a day with exercises is a training day. No label/placeholder heuristics —
// keep it identical to the web so the count and rest-day card always match.
function isRestDayData(dayData: any): boolean {
  return !Array.isArray(dayData?.exercises) || dayData.exercises.length === 0
}

function buildTodayWorkout(dayData: any): TodayWorkout | null {
  if (!dayData) return null
  const restDay = isRestDayData(dayData)
  const exercises = restDay ? [] : (dayData.exercises ?? []).map((ex: any, i: number) => ({
    index: i,
    name: ex.name || ex.exercise || String(ex),
    sets: ex.sets ?? null,
    reps: ex.reps ?? null,
    rest_sec: ex.rest_sec ?? ex.rest ?? null,
    muscle_group: ex.muscle_group ?? null,
    weight_guidance: ex.weight_guidance ?? null,
    form_tip: ex.form_tip ?? null,
    progression_note: ex.progression_note ?? null,
    video_id: ex.video_id ?? null,
  }))
  return {
    day_name: dayNameOf(dayData) ?? dayData.day_name ?? 'Workout',
    muscle_focus: dayData.muscle_focus ?? null,
    duration_min: dayData.duration_min ?? null,
    is_rest_day: restDay,
    exercises,
  }
}

// ── Timer helpers ─────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Misc helpers ──────────────────────────────────────────────────────────────

function todayKey() { return new Date().toISOString().slice(0, 10) }

function exerciseMeta(exercise: TodayWorkout['exercises'][number]) {
  const parts = []
  if (exercise.sets) parts.push(`${exercise.sets} sets`)
  if (exercise.reps) parts.push(`${exercise.reps} reps`)
  if (exercise.rest_sec) parts.push(`${exercise.rest_sec}s rest`)
  return parts.join('  ·  ')
}

// ── TrainLink sub-component ───────────────────────────────────────────────────

function TrainLink({ icon, label, labelAr, color: c, accentColor, onPress, isRtl }: {
  icon: string; label: string; labelAr?: string; color: any; accentColor: string; onPress: () => void; isRtl: boolean
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.trainLink, { backgroundColor: c.surface, borderColor: accentColor + '33', opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.trainLinkIcon, { backgroundColor: accentColor + '1A', borderColor: accentColor + '33' }]}>
        <Feather name={icon as any} size={15} color={accentColor} />
      </View>
      <Text style={[styles.trainLinkText, { color: c.text }]} numberOfLines={1}>{isRtl && labelAr ? labelAr : label}</Text>
      <Feather name="chevron-right" size={14} color={c.dim} />
    </Pressable>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TrainScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const plan = useAsyncData(getPlanHistory, [])

  const todayCanonical = CANONICAL_DAYS[new Date().getDay()] as CanonicalDay
  const [selectedDay, setSelectedDay] = useState<CanonicalDay>(todayCanonical)
  const [completed, setCompleted] = useState<number[]>([])
  const [performance, setPerformance] = useState<Record<string, { weight?: string; reps?: string }>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)

  // ── Video modal ──────────────────────────────────────────
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  // ── Exercise swap (today only) ───────────────────────────
  const [overrides, setOverrides] = useState<Record<string, ExerciseOverride>>({})
  const [swapTarget, setSwapTarget] = useState<{ index: number; name: string } | null>(null)
  const [swapAlternatives, setSwapAlternatives] = useState<ExerciseAlternative[] | null>(null)
  const [swapLoading, setSwapLoading] = useState(false)

  // ── Timer state ──────────────────────────────────────────
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)   // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)        // timestamp when timer last (re)started

  const date = todayKey()
  const align = isRtl ? 'right' : 'left'

  // On focus: reload the local session AND silently re-fetch the plan, so plan
  // changes made elsewhere (e.g. Ion swapping a training day) show up without an
  // app restart — otherwise the tab keeps the plan it loaded on first mount.
  useFocusEffect(
    useCallback(() => {
      plan.silentRefresh()
      loadLocalSession(date).then(session => {
        if (session) {
          setCompleted(session.completedExercises ?? [])
          setPerformance(session.exercisePerformance ?? {})
          setOverrides(session.exerciseOverrides ?? {})
        }
      })
    }, [date])
  )

  // Clean up interval on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // ── Plan / workout derivation ─────────────────────────────
  const planJson = plan.data?.activeWorkoutPlan?.plan_json ?? null
  const workout: TodayWorkout | null = useMemo(() => {
    // A weekday that isn't one of the plan's training days is a REST day — show
    // the rest card, not "No workout plan" (which is only for having no plan).
    const restDay = (d: CanonicalDay): TodayWorkout => ({
      day_name: d, muscle_focus: null, duration_min: null, is_rest_day: true, exercises: [],
    })
    let base: TodayWorkout | null
    if (!planJson) base = plan.data?.todayWorkout ?? null
    else if (selectedDay === todayCanonical) {
      base = plan.data?.todayWorkout ?? buildTodayWorkout(getDayWorkout(planJson, selectedDay)) ?? restDay(selectedDay)
    } else {
      base = buildTodayWorkout(getDayWorkout(planJson, selectedDay)) ?? restDay(selectedDay)
    }
    // Apply today-only swap overrides (machine taken etc.) so the rendered
    // list, the completion log, and PR detection all use the swapped exercise.
    if (base && selectedDay === todayCanonical && Object.keys(overrides).length) {
      base = {
        ...base,
        exercises: base.exercises.map(ex => {
          const o = overrides[String(ex.index)]
          if (!o) return ex
          return { ...ex, name: o.name, sets: o.sets, reps: o.reps, rest_sec: o.rest_sec, video_id: null, swapped_from: o.original } as any
        }),
      }
    }
    return base
  }, [plan.data, planJson, selectedDay, todayCanonical, overrides])

  const workoutDays = useMemo(() => {
    if (!planJson) return []
    return getPlanDays(planJson)
      // A weekday lights up a workout dot only if its plan day has exercises —
      // the web's rest rule. Combined with reading the same day source as the
      // web (getPlanDays), the count now matches the web exactly.
      .filter((d: any) => !isRestDayData(d))
      .map((d: any) => dayNameOf(d))
      .filter((d): d is CanonicalDay => d !== null)
  }, [planJson])

  const completedSet = useMemo(() => new Set(completed), [completed])
  const totalExercises = workout?.exercises.length ?? 0
  const completedCount = completed.length
  const allDone = totalExercises > 0 && completedCount >= totalExercises

  // ── Timer controls ────────────────────────────────────────

  function startTimer() {
    if (timerState === 'running') return
    tapMedium()
    startTimeRef.current = Date.now() - elapsed * 1000
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)
    setTimerState('running')
    // Surface the timer on the Lock Screen / Dynamic Island (no-op until the
    // native Live Activity extension is present — see src/lib/liveActivity.ts).
    startWorkoutActivity({
      title: workout?.day_name || workout?.muscle_focus || (isRtl ? 'تمرين' : 'Workout'),
      startedAtMs: startTimeRef.current,
      completed: completedCount,
      total: totalExercises,
    })
  }

  function pauseTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setTimerState('paused')
    updateWorkoutActivity({ paused: true, elapsedSec: elapsed, completed: completedCount, total: totalExercises })
  }

  function resumeTimer() {
    startTimeRef.current = Date.now() - elapsed * 1000
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)
    setTimerState('running')
    updateWorkoutActivity({ paused: false, elapsedSec: elapsed, completed: completedCount, total: totalExercises })
  }

  function resetTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setElapsed(0)
    setTimerState('idle')
    endWorkoutActivity()
  }

  // ── Exercise actions ──────────────────────────────────────

  async function toggleExercise(index: number) {
    // Auto-start timer on first checkbox tap
    if (timerState === 'idle') startTimer()
    const isCompleting = !completedSet.has(index)
    if (isCompleting) tapLight()
    const next = completedSet.has(index) ? completed.filter(i => i !== index) : [...completed, index]
    setCompleted(next)
    // Keep the Live Activity progress ring in sync (no-op when unsupported).
    updateWorkoutActivity({ paused: timerState === 'paused', elapsedSec: elapsed, completed: next.length, total: totalExercises })
    if (selectedDay === todayCanonical) {
      await saveLocalSession(date, next, performance, overrides)
    }
  }

  async function updatePerformance(index: number, key: 'weight' | 'reps', value: string) {
    const next = { ...performance, [index]: { ...(performance[index] || {}), [key]: value } }
    setPerformance(next)
    if (selectedDay === todayCanonical) {
      await saveLocalSession(date, completed, next, overrides)
    }
  }

  function toggleExpand(index: number) {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }))
  }

  // ── Exercise swap ─────────────────────────────────────────
  async function openSwap(exercise: TodayWorkout['exercises'][number]) {
    tapLight()
    setSwapTarget({ index: exercise.index, name: exercise.name })
    setSwapAlternatives(null)
    setSwapLoading(true)
    try {
      const res = await swapExercise(
        { name: exercise.name, sets: exercise.sets, reps: exercise.reps, muscle_group: exercise.muscle_group },
        workout?.muscle_focus,
      )
      setSwapAlternatives(res.alternatives)
    } catch (e) {
      setSwapTarget(null)
      Alert.alert('SYNAP', e instanceof Error ? e.message : (isRtl ? 'تعذّر إيجاد بدائل.' : 'Could not find alternatives.'))
    } finally {
      setSwapLoading(false)
    }
  }

  async function applySwap(alt: ExerciseAlternative) {
    if (!swapTarget) return
    tapMedium()
    const next: Record<string, ExerciseOverride> = {
      ...overrides,
      [String(swapTarget.index)]: { name: alt.name, sets: alt.sets, reps: alt.reps, rest_sec: alt.rest_sec, original: swapTarget.name },
    }
    setOverrides(next)
    setSwapTarget(null)
    setSwapAlternatives(null)
    if (selectedDay === todayCanonical) {
      await saveLocalSession(date, completed, performance, next)
    }
  }

  async function undoSwap(index: number) {
    tapLight()
    const next = { ...overrides }
    delete next[String(index)]
    setOverrides(next)
    if (selectedDay === todayCanonical) {
      await saveLocalSession(date, completed, performance, next)
    }
  }

  function selectDay(day: CanonicalDay) {
    setSelectedDay(day)
    setExpanded({})
    if (day !== todayCanonical) {
      setCompleted([])
      setPerformance({})
    } else {
      loadLocalSession(date).then(session => {
        setCompleted(session?.completedExercises ?? [])
        setPerformance(session?.exercisePerformance ?? {})
      })
    }
  }

  async function finishWorkout() {
    if (!workout || totalExercises === 0 || selectedDay !== todayCanonical) return
    if (timerState === 'running') pauseTimer()
    setSaving(true)
    try {
      const durationMin = elapsed > 0 ? Math.max(1, Math.round(elapsed / 60)) : (workout.duration_min ?? 0)
      const logRes = await logWorkout({
        date,
        day_name: workout.day_name,
        duration_min: durationMin,
        exercises_completed: completed.length,
        total_exercises: totalExercises,
        exercises: workout.exercises.map(ex => ({
          name: ex.name,
          completed: completedSet.has(ex.index),
          performance: performance[ex.index] || null,
        })),
        exercisePerformance: performance,
        notes: workout.muscle_focus,
      })
      resetTimer()
      notifySuccess()

      // PR celebration — the server compares today's sets against all history
      // (Epley est-1RM) and returns any records. Lead the alert with them:
      // this is the single best feel-good moment the app has.
      const prs = logRes.prs || []
      const sparksLine = (logRes.sparksEarned ?? 0) > 0
        ? (isRtl ? `\n+${logRes.sparksEarned} ⚡ شرارة` : `\n+${logRes.sparksEarned} ⚡ Sparks earned`)
        : ''
      const summaryLine = (isRtl
        ? `تمارين مكتملة: ${completed.length}/${totalExercises}  ·  المدة: ${formatTime(elapsed > 0 ? elapsed : (workout.duration_min ?? 0) * 60)}`
        : `${completed.length}/${totalExercises} exercises  ·  ${formatTime(elapsed > 0 ? elapsed : (workout.duration_min ?? 0) * 60)}`) + sparksLine
      const prLines = prs.map(pr => isRtl
        ? `🏆 ${pr.exercise}: ${pr.weight_kg} كغ × ${pr.reps} (سابقاً ${pr.prev_weight_kg} كغ)`
        : `🏆 ${pr.exercise}: ${pr.weight_kg}kg × ${pr.reps} (was ${pr.prev_weight_kg}kg)`)
      Alert.alert(
        prs.length
          ? (isRtl ? `🏆 رقم قياسي جديد${prs.length > 1 ? ' — أرقام قياسية' : ''}!` : `🏆 New personal record${prs.length > 1 ? 's' : ''}!`)
          : (isRtl ? '🏁 تم حفظ التمرين' : '🏁 Workout saved'),
        prs.length ? `${prLines.join('\n')}\n\n${summaryLine}` : summaryLine,
        [{
          text: isRtl ? 'حسناً' : 'OK',
          // Ask for an App Store rating at the 3rd/20th completed workout —
          // a positive moment (even better right after a PR), after the alert
          // is dismissed so the review card never competes with it.
          onPress: () => { recordWorkoutCompletedAndMaybeAskForReview() },
        }]
      )
    } catch (error) {
      notifyError()
      Alert.alert(isRtl ? 'تعذر حفظ التمرين' : 'Could not save workout', error instanceof Error ? error.message : 'Try again.')
      if (timerState === 'paused') resumeTimer()
    } finally {
      setSaving(false)
    }
  }

  const isBrowsing = selectedDay !== todayCanonical

  return (
    <Screen>
      <VideoModal videoId={activeVideoId} onClose={() => setActiveVideoId(null)} />

      {/* Exercise swap sheet — Ion suggests 3 same-muscle alternatives that
          respect the user's equipment/injuries. Today-only override; permanent
          swaps still go through Ion chat. */}
      <Modal visible={!!swapTarget} transparent animationType="slide" onRequestClose={() => setSwapTarget(null)}>
        <View style={styles.swapBackdrop}>
          <View style={[styles.swapSheet, { backgroundColor: color.bg, borderColor: color.border }]}>
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.swapTitle, { color: color.text, textAlign: align }]}>
                {isRtl ? `بديل عن ${swapTarget?.name ?? ''}` : `Swap ${swapTarget?.name ?? ''}`}
              </Text>
              <Pressable onPress={() => setSwapTarget(null)} hitSlop={12}>
                <Feather name="x" size={22} color={color.muted} />
              </Pressable>
            </View>
            <Text style={[styles.swapSub, { color: color.muted, textAlign: align }]}>
              {isRtl
                ? 'بدائل تستهدف نفس العضلات بمعداتك المتاحة — لجلسة اليوم فقط.'
                : 'Same-muscle alternatives with your equipment — for today\'s session only.'}
            </Text>
            {swapLoading ? (
              <ActivityIndicator color={color.spark} style={{ marginVertical: 28 }} />
            ) : (
              (swapAlternatives || []).map((alt, i) => (
                <Pressable
                  key={i}
                  onPress={() => applySwap(alt)}
                  style={[styles.swapOption, { borderColor: color.border, backgroundColor: color.elevated }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.swapOptionName, { color: color.text, textAlign: align }]}>{alt.name}</Text>
                    <Text style={[styles.swapOptionMeta, { color: color.spark, textAlign: align }]}>
                      {alt.sets} × {alt.reps} · {alt.rest_sec}s
                    </Text>
                    {alt.why ? (
                      <Text style={[styles.swapOptionWhy, { color: color.muted, textAlign: align }]}>{alt.why}</Text>
                    ) : null}
                  </View>
                  <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={16} color={color.dim} />
                </Pressable>
              ))
            )}
          </View>
        </View>
      </Modal>

      <IonPageHeader
        eyebrow="WORKOUT"
        title={text.train}
        subtitle={plan.data?.timing?.workout?.label ?? (isRtl ? 'جلسة التمرين وتتبع التمارين' : 'Session tracking and exercise browser.')}
      />

      {plan.loading ? (
        <ActivityIndicator color={color.spark} />
      ) : plan.error ? (
        <DataError error={plan.error} status={plan.errorStatus} isRtl={isRtl} />
      ) : (
        <>
          {/* ── 7-day selector ──────────────────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
            {CANONICAL_DAYS.map(day => {
              const isSelected = day === selectedDay
              const isToday = day === todayCanonical
              const hasWorkout = workoutDays.includes(day)
              return (
                <Pressable
                  key={day}
                  onPress={() => selectDay(day)}
                  style={[styles.dayChip, {
                    backgroundColor: isSelected ? color.spark : color.elevated,
                    borderColor: isSelected ? color.spark : (isToday ? color.spark + '55' : color.border),
                  }]}
                >
                  <Text style={[styles.dayChipText, { color: isSelected ? '#fff' : (isToday ? color.spark : color.text) }]}>
                    {DAY_SHORT[day]}
                  </Text>
                  {isToday ? (
                    <View style={[styles.todayDot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : color.spark }]} />
                  ) : hasWorkout ? (
                    <View style={[styles.workoutDot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.4)' : color.pulse }]} />
                  ) : null}
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Browsing banner */}
          {isBrowsing ? (
            <View style={[styles.browsingBanner, { backgroundColor: `${color.spark}15`, borderColor: `${color.spark}30` }]}>
              <Feather name="calendar" size={13} color={color.spark} />
              <Text style={[styles.browsingText, { color: color.spark }]}>
                {isRtl ? `عرض ${selectedDay} — معاينة فقط` : `Viewing ${selectedDay} — preview only`}
              </Text>
              <Pressable onPress={() => selectDay(todayCanonical)}>
                <Text style={[styles.browsingBack, { color: color.spark }]}>{isRtl ? 'اليوم' : 'Today'}</Text>
              </Pressable>
            </View>
          ) : null}

          {!workout ? (
            <Card>
              <Text style={[styles.title, { color: color.text, textAlign: align }]}>{isRtl ? 'لا توجد خطة تمرين' : 'No workout plan'}</Text>
              <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
                {isRtl ? 'اطلب من آيون إنشاء خطة تمرين.' : 'Ask Ion to create a workout plan.'}
              </Text>
            </Card>
          ) : (
            <>
              {/* ── Summary / timer card ─────────────────── */}
              <Card accent>
                <Text style={[styles.eyebrow, { color: color.spark }]}>
                  {isBrowsing ? selectedDay.toUpperCase() : 'TODAY'}
                </Text>
                <Text style={[styles.title, { color: color.text, textAlign: align }]}>{workout.day_name}</Text>
                {workout.muscle_focus ? (
                  <Text style={[styles.body, { color: color.muted, textAlign: align, marginBottom: 10 }]}>
                    {workout.muscle_focus}
                  </Text>
                ) : null}

                {/* Stats row */}
                <View style={[styles.stats, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  {!workout.is_rest_day ? (
                    <View style={[styles.statChip, {
                      backgroundColor: allDone ? `${color.pulse}1A` : `${color.spark}1A`,
                      borderColor: allDone ? `${color.pulse}33` : `${color.spark}33`,
                    }]}>
                      <Feather name={allDone ? 'check-circle' : 'circle'} size={13} color={allDone ? color.pulse : color.spark} />
                      <Text style={[styles.statText, { color: allDone ? color.pulse : color.spark }]}>
                        {isBrowsing ? `${totalExercises} exercises` : `${completedCount}/${totalExercises}`}
                      </Text>
                    </View>
                  ) : null}
                  {workout.duration_min ? (
                    <View style={[styles.statChip, { backgroundColor: color.elevated, borderColor: color.border }]}>
                      <Feather name="clock" size={13} color={color.muted} />
                      <Text style={[styles.statText, { color: color.muted }]}>{workout.duration_min} min plan</Text>
                    </View>
                  ) : null}
                </View>

                {/* Progress bar */}
                {!isBrowsing && !workout.is_rest_day && totalExercises > 0 ? (
                  <View style={[styles.progressBarTrack, { backgroundColor: color.elevated, marginTop: 12 }]}>
                    <View style={[styles.progressBarFill, {
                      width: `${(completedCount / totalExercises) * 100}%`,
                      backgroundColor: allDone ? color.pulse : color.spark,
                    }]} />
                  </View>
                ) : null}

                {/* ── Timer ────────────────────────────────── */}
                {!isBrowsing && !workout.is_rest_day ? (
                  <View style={[styles.timerSection, { borderTopColor: color.border }]}>
                    {/* Elapsed display */}
                    <View style={styles.timerRow}>
                      <View style={styles.timerDisplay}>
                        <Text style={[styles.timerValue, { color: timerState === 'running' ? color.spark : color.text }]}>
                          {formatTime(elapsed)}
                        </Text>
                        <Text style={[styles.timerLabel, { color: color.dim }]}>
                          {timerState === 'idle'
                            ? (isRtl ? 'لم يبدأ' : 'NOT STARTED')
                            : timerState === 'paused'
                              ? (isRtl ? 'متوقف مؤقتاً' : 'PAUSED')
                              : (isRtl ? 'جارٍ التمرين' : 'IN PROGRESS')}
                        </Text>
                      </View>

                      {/* Timer controls */}
                      <View style={styles.timerControls}>
                        {timerState === 'idle' ? (
                          <Pressable onPress={startTimer} style={[styles.timerBtn, { backgroundColor: color.spark }]}>
                            <Feather name="play" size={16} color="#fff" />
                            <Text style={styles.timerBtnText}>{isRtl ? 'ابدأ' : 'Start'}</Text>
                          </Pressable>
                        ) : timerState === 'running' ? (
                          <Pressable onPress={pauseTimer} style={[styles.timerBtn, { backgroundColor: color.elevated, borderWidth: 1, borderColor: color.border }]}>
                            <Feather name="pause" size={16} color={color.text} />
                            <Text style={[styles.timerBtnText, { color: color.text }]}>{isRtl ? 'إيقاف مؤقت' : 'Pause'}</Text>
                          </Pressable>
                        ) : (
                          <View style={styles.pausedControls}>
                            <Pressable onPress={resumeTimer} style={[styles.timerBtnSmall, { backgroundColor: color.spark }]}>
                              <Feather name="play" size={14} color="#fff" />
                              <Text style={styles.timerBtnText}>{isRtl ? 'استمر' : 'Resume'}</Text>
                            </Pressable>
                            <Pressable onPress={() => Alert.alert(
                              isRtl ? 'إعادة ضبط الوقت' : 'Reset timer',
                              isRtl ? 'هل تريد إعادة ضبط الوقت إلى الصفر؟' : 'Reset the timer back to zero?',
                              [
                                { text: isRtl ? 'إلغاء' : 'Cancel', style: 'cancel' },
                                { text: isRtl ? 'إعادة' : 'Reset', onPress: resetTimer, style: 'destructive' },
                              ]
                            )} style={[styles.timerBtnSmall, { backgroundColor: color.elevated, borderWidth: 1, borderColor: color.danger + '66' }]}>
                              <Feather name="rotate-ccw" size={14} color={color.danger} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ) : null}
              </Card>

              {/* Quick links */}
              <View style={styles.quickLinks}>
                <TrainLink icon="list" label="Programme" labelAr="البرنامج الأسبوعي" color={color} accentColor={color.spark} onPress={() => router.push('/programme')} isRtl={isRtl} />
                <TrainLink icon="bar-chart-2" label="Measurements" labelAr="القياسات" color={color} accentColor={color.pulse} onPress={() => router.push('/measurements')} isRtl={isRtl} />
                <TrainLink icon="camera" label="Form Check" labelAr="تحقق الشكل" color={color} accentColor={color.flame} onPress={() => router.push('/form-check')} isRtl={isRtl} />
              </View>

              {/* Rest day */}
              {workout.is_rest_day ? (
                <Card style={{ marginTop: 12 }}>
                  <Text style={[styles.title, { color: color.text, textAlign: align }]}>{isRtl ? 'يوم راحة' : 'Rest day'}</Text>
                  <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
                    {isRtl ? 'نم جيداً، اشرب الماء، وحافظ على خطة التغذية.' : 'Sleep, hydrate, and keep the nutrition plan steady.'}
                  </Text>
                </Card>
              ) : (
                <>
                  {workout.exercises.map(exercise => {
                    const done = !isBrowsing && completedSet.has(exercise.index)
                    const isExpandedEx = expanded[exercise.index] ?? false
                    const hasVideo = !!exercise.video_id

                    return (
                      <View key={`${exercise.index}-${exercise.name}`} style={[
                        styles.exerciseCard,
                        { backgroundColor: color.surface, borderColor: done ? color.pulse : color.border },
                      ]}>
                        {/* Main row */}
                        <View style={[styles.exerciseRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                          {/* Checkbox / number */}
                          {!isBrowsing ? (
                            <Pressable
                              onPress={() => toggleExercise(exercise.index)}
                              style={[styles.check, {
                                borderColor: done ? color.pulse : color.dim,
                                backgroundColor: done ? color.pulse : 'transparent',
                              }]}
                            >
                              {done ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                            </Pressable>
                          ) : (
                            <View style={[styles.check, { borderColor: color.border, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
                              <Text style={{ fontSize: 10, color: color.dim, fontWeight: '700' }}>{exercise.index + 1}</Text>
                            </View>
                          )}

                          {/* Exercise info — tap to expand */}
                          <Pressable onPress={() => toggleExpand(exercise.index)} style={styles.exerciseText}>
                            <Text style={[styles.exerciseName, {
                              color: done ? color.pulse : color.text,
                              textAlign: align,
                              textDecorationLine: done ? 'line-through' : 'none',
                            }]}>{exercise.name}</Text>
                            <Text style={[styles.body, { color: color.muted, textAlign: align }]}>{exerciseMeta(exercise)}</Text>
                            {exercise.weight_guidance ? (
                              <Text style={[styles.body, { color: color.spark, textAlign: align }]}>{exercise.weight_guidance}</Text>
                            ) : null}
                            {exercise.muscle_group ? (
                              <Text style={[styles.muscleTag, { color: color.dim }]}>{exercise.muscle_group}</Text>
                            ) : null}
                          </Pressable>

                          {/* Right buttons */}
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            {!isBrowsing && !done ? (
                              <Pressable onPress={() => openSwap(exercise)} style={[styles.videoBtn, { backgroundColor: `${color.spark}14`, borderColor: `${color.spark}33` }]}>
                                <Feather name="refresh-cw" size={13} color={color.spark} />
                              </Pressable>
                            ) : null}
                            {hasVideo ? (
                              <Pressable onPress={() => setActiveVideoId(exercise.video_id ?? null)} style={[styles.videoBtn, { backgroundColor: '#FF000018', borderColor: '#FF000033' }]}>
                                <Feather name="youtube" size={14} color="#FF4444" />
                              </Pressable>
                            ) : null}
                            <Pressable onPress={() => toggleExpand(exercise.index)} style={styles.chevronBtn}>
                              <Feather name={isExpandedEx ? 'chevron-up' : 'chevron-down'} size={15} color={color.dim} />
                            </Pressable>
                          </View>
                        </View>

                        {/* Swapped-for-today indicator + undo */}
                        {overrides[String(exercise.index)] && !isBrowsing ? (
                          <View style={[styles.swappedRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderTopColor: color.border }]}>
                            <Feather name="refresh-cw" size={11} color={color.spark} />
                            <Text style={[styles.swappedText, { color: color.muted, textAlign: align }]} numberOfLines={1}>
                              {isRtl
                                ? `بديل اليوم عن ${overrides[String(exercise.index)].original}`
                                : `Today's swap for ${overrides[String(exercise.index)].original}`}
                            </Text>
                            <Pressable onPress={() => undoSwap(exercise.index)} hitSlop={8}>
                              <Text style={[styles.swappedUndo, { color: color.spark }]}>{isRtl ? 'تراجع' : 'Undo'}</Text>
                            </Pressable>
                          </View>
                        ) : null}

                        {/* Expanded section */}
                        {isExpandedEx ? (
                          <View style={[styles.expandSection, { borderTopColor: color.border }]}>
                            {exercise.form_tip ? (
                              <View style={[styles.tipBox, { backgroundColor: `${color.spark}0D`, borderColor: `${color.spark}26` }]}>
                                <Feather name="info" size={12} color={color.sparkLight} />
                                <Text style={[styles.body, { color: color.muted, flex: 1, lineHeight: 18 }]}>{exercise.form_tip}</Text>
                              </View>
                            ) : null}
                            {exercise.progression_note ? (
                              <View style={[styles.tipBox, { backgroundColor: `${color.pulse}0D`, borderColor: `${color.pulse}26` }]}>
                                <Feather name="trending-up" size={12} color={color.pulse} />
                                <Text style={[styles.body, { color: color.muted, flex: 1, lineHeight: 18 }]}>{exercise.progression_note}</Text>
                              </View>
                            ) : null}

                            {/* Performance inputs — today only */}
                            {!isBrowsing ? (
                              <View style={styles.performanceRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.perfLabel, { color: color.dim }]}>{isRtl ? 'الوزن (كغ)' : 'Weight (kg)'}</Text>
                                  <TextInput
                                    value={performance[exercise.index]?.weight || ''}
                                    onChangeText={val => updatePerformance(exercise.index, 'weight', val)}
                                    placeholder="—"
                                    placeholderTextColor={color.dim}
                                    keyboardType="decimal-pad"
                                    style={[styles.performanceInput, { color: color.text, borderColor: color.border, backgroundColor: color.elevated }]}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.perfLabel, { color: color.dim }]}>{isRtl ? 'التكرارات' : 'Reps done'}</Text>
                                  <TextInput
                                    value={performance[exercise.index]?.reps || ''}
                                    onChangeText={val => updatePerformance(exercise.index, 'reps', val)}
                                    placeholder="—"
                                    placeholderTextColor={color.dim}
                                    keyboardType="number-pad"
                                    style={[styles.performanceInput, { color: color.text, borderColor: color.border, backgroundColor: color.elevated }]}
                                  />
                                </View>
                              </View>
                            ) : null}

                            {hasVideo ? (
                              <Pressable onPress={() => setActiveVideoId(exercise.video_id ?? null)} style={[styles.watchVideoBtn, { borderColor: '#FF444433', backgroundColor: '#FF44441A' }]}>
                                <Feather name="youtube" size={15} color="#FF4444" />
                                <Text style={[styles.watchVideoText, { color: '#FF4444' }]}>{isRtl ? 'شاهد الفيديو التعليمي' : 'Watch exercise video'}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    )
                  })}

                  {/* ── Finish button ─────────────────────── */}
                  {!isBrowsing && totalExercises > 0 ? (
                    <Pressable
                      style={[styles.finishButton, {
                        backgroundColor: allDone ? color.pulse : color.spark,
                        opacity: saving ? 0.7 : 1,
                      }]}
                      onPress={finishWorkout}
                      disabled={saving}
                    >
                      {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Feather name={allDone ? 'award' : 'check-circle'} size={18} color="#FFFFFF" />
                          <View>
                            <Text style={styles.finishText}>
                              {allDone
                                ? (isRtl ? 'أنهيت كل التمارين! سجّل التمرين' : 'All done! Save workout')
                                : (isRtl ? 'إنهاء وتسجيل التمرين' : 'Finish and log workout')}
                            </Text>
                            {elapsed > 0 ? (
                              <Text style={styles.finishSub}>{formatTime(elapsed)}</Text>
                            ) : null}
                          </View>
                        </View>
                      )}
                    </Pressable>
                  ) : null}
                </>
              )}
            </>
          )}
        </>
      )}

      <MedicalDisclaimer context="training" />
    </Screen>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20 },
  // day selector
  daySelector: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 46 },
  dayChipText: { fontSize: 13, fontWeight: '800' },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  workoutDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  // browsing banner
  browsingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  browsingText: { flex: 1, fontSize: 12, fontWeight: '700' },
  browsingBack: { fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },
  // summary card stats
  stats: { gap: 8, marginTop: 10 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  statText: { fontSize: 13, fontWeight: '800' },
  progressBarTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 999 },
  // timer
  timerSection: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 14 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerDisplay: {},
  timerValue: { fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  timerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  timerControls: { alignItems: 'flex-end' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  timerBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  pausedControls: { flexDirection: 'row', gap: 8 },
  timerBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  // quick links
  quickLinks: { marginTop: 10, gap: 6 },
  trainLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  trainLinkIcon: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  trainLinkText: { flex: 1, fontSize: 14, fontWeight: '800' },
  // exercise cards
  exerciseCard: { marginTop: 10, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  exerciseRow: { alignItems: 'center', gap: 12, padding: 14 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exerciseText: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '900', marginBottom: 3 },
  muscleTag: { fontSize: 11, fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  videoBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chevronBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  swappedRow: { alignItems: 'center', gap: 6, paddingTop: 8, marginTop: 8, borderTopWidth: 1 },
  swappedText: { flex: 1, fontSize: 11, fontWeight: '600' },
  swappedUndo: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  swapBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  swapSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 34 },
  swapTitle: { fontSize: 18, fontWeight: '900', flex: 1, marginRight: 8 },
  swapSub: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 12 },
  swapOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  swapOptionName: { fontSize: 14, fontWeight: '900' },
  swapOptionMeta: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  swapOptionWhy: { fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: 3 },
  // expanded
  expandSection: { borderTopWidth: 1, padding: 12, gap: 8 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  performanceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  perfLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase' },
  performanceInput: { borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  watchVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  watchVideoText: { fontSize: 13, fontWeight: '900' },
  // finish
  finishButton: { marginTop: 18, borderRadius: 18, padding: 18, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: 'white', fontSize: 16, fontWeight: '900' },
  finishSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 2 },
})
