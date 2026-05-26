import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getPlanHistory, getWorkoutSession, logWorkout, saveWorkoutSession, TodayWorkout } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

// ── Day helpers (mirrors web workout-days.ts) ─────────────────────────────────

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
  if (Array.isArray(plan?.days)) return plan.days
  if (Array.isArray(plan?.weeks)) {
    const first = plan.weeks.find((w: any) => Array.isArray(w?.days) && w.days.length > 0)
    return first?.days ?? []
  }
  return []
}

function getDayWorkout(plan: any, day: CanonicalDay): any | null {
  return getPlanDays(plan).find((d: any) => dayNameOf(d) === day) ?? null
}

function buildTodayWorkout(dayData: any): TodayWorkout | null {
  if (!dayData) return null
  const exercises = (dayData.exercises ?? []).map((ex: any, i: number) => ({
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
    is_rest_day: exercises.length === 0,
    exercises,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey() { return new Date().toISOString().slice(0, 10) }

function exerciseMeta(exercise: TodayWorkout['exercises'][number]) {
  const parts = []
  if (exercise.sets) parts.push(`${exercise.sets} sets`)
  if (exercise.reps) parts.push(`${exercise.reps} reps`)
  if (exercise.rest_sec) parts.push(`${exercise.rest_sec}s rest`)
  return parts.join('  ·  ')
}

function openVideo(videoId: string | null | undefined) {
  if (!videoId) return
  const appUrl = `youtube://www.youtube.com/watch?v=${videoId}`
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`
  Linking.canOpenURL(appUrl)
    .then(supported => Linking.openURL(supported ? appUrl : webUrl))
    .catch(() => Linking.openURL(webUrl))
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

  // Figure out today's canonical day
  const todayCanonical = CANONICAL_DAYS[new Date().getDay()] as CanonicalDay

  // Selected day state — defaults to today
  const [selectedDay, setSelectedDay] = useState<CanonicalDay>(todayCanonical)

  // Per-day session state
  const [completed, setCompleted] = useState<number[]>([])
  const [performance, setPerformance] = useState<Record<string, { weight?: string; reps?: string }>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)

  const date = todayKey()
  const align = isRtl ? 'right' : 'left'

  // Build the workout for the selected day from plan_json
  const planJson = plan.data?.activeWorkoutPlan?.plan_json ?? null
  const workout: TodayWorkout | null = useMemo(() => {
    if (!planJson) return plan.data?.todayWorkout ?? null
    // For today, prefer the API-resolved todayWorkout; for other days, parse from plan_json
    if (selectedDay === todayCanonical) return plan.data?.todayWorkout ?? buildTodayWorkout(getDayWorkout(planJson, selectedDay))
    return buildTodayWorkout(getDayWorkout(planJson, selectedDay))
  }, [plan.data, planJson, selectedDay, todayCanonical])

  // Determine which days have workouts
  const workoutDays = useMemo(() => {
    if (!planJson) return []
    return getPlanDays(planJson)
      .map((d: any) => dayNameOf(d))
      .filter((d): d is CanonicalDay => d !== null)
  }, [planJson])

  // Load session for today
  useEffect(() => {
    getWorkoutSession(date)
      .then(({ session }) => {
        setCompleted(session?.completedExercises ?? [])
        setPerformance((session?.exercisePerformance as Record<string, { weight?: string; reps?: string }>) ?? {})
      })
      .catch(() => {})
  }, [date])

  const completedSet = useMemo(() => new Set(completed), [completed])
  const totalExercises = workout?.exercises.length ?? 0
  const completedCount = completed.length

  async function toggleExercise(index: number) {
    const next = completedSet.has(index) ? completed.filter(i => i !== index) : [...completed, index]
    setCompleted(next)
    if (workout && selectedDay === todayCanonical) {
      await saveWorkoutSession({ date, dayName: workout.day_name, completedExercises: next, exercisePerformance: performance }).catch(() => {})
    }
  }

  async function updatePerformance(index: number, key: 'weight' | 'reps', value: string) {
    const next = { ...performance, [index]: { ...(performance[index] || {}), [key]: value } }
    setPerformance(next)
    if (workout && selectedDay === todayCanonical) {
      await saveWorkoutSession({ date, dayName: workout.day_name, completedExercises: completed, exercisePerformance: next }).catch(() => {})
    }
  }

  function toggleExpand(index: number) {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }))
  }

  function selectDay(day: CanonicalDay) {
    setSelectedDay(day)
    setExpanded({})
    // Reset completion state when browsing other days
    if (day !== todayCanonical) { setCompleted([]); setPerformance({}) }
    else {
      getWorkoutSession(date)
        .then(({ session }) => {
          setCompleted(session?.completedExercises ?? [])
          setPerformance((session?.exercisePerformance as Record<string, { weight?: string; reps?: string }>) ?? {})
        })
        .catch(() => {})
    }
  }

  async function finishWorkout() {
    if (!workout || totalExercises === 0 || selectedDay !== todayCanonical) return
    setSaving(true)
    try {
      await logWorkout({
        date,
        day_name: workout.day_name,
        duration_min: workout.duration_min ?? 0,
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
      Alert.alert(isRtl ? 'تم حفظ التمرين' : 'Workout saved', isRtl ? 'تم تسجيل جلستك بنجاح.' : 'Your session was logged successfully.')
    } catch (error) {
      Alert.alert(isRtl ? 'تعذر حفظ التمرين' : 'Could not save workout', error instanceof Error ? error.message : 'Try again.')
    } finally { setSaving(false) }
  }

  const isBrowsing = selectedDay !== todayCanonical

  return (
    <Screen>
      <IonPageHeader
        eyebrow="WORKOUT"
        title={text.train}
        subtitle={plan.data?.timing?.workout?.label ?? (isRtl ? 'جلسة التمرين وتتبع التمارين' : 'Session tracking and exercise browser.')}
      />

      {plan.loading ? (
        <ActivityIndicator color={color.spark} />
      ) : plan.error ? (
        <Card>
          <Text style={[styles.body, { color: color.danger, textAlign: align }]}>{plan.error}</Text>
        </Card>
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
                {isRtl ? `عرض ${selectedDay} — اقتراحات فقط` : `Viewing ${selectedDay} — read-only preview`}
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
              {/* Summary card */}
              <Card accent>
                <Text style={[styles.eyebrow, { color: color.spark }]}>
                  {isBrowsing ? selectedDay.toUpperCase() : 'TODAY'}
                </Text>
                <Text style={[styles.title, { color: color.text, textAlign: align }]}>{workout.day_name}</Text>
                <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
                  {workout.muscle_focus || (workout.is_rest_day ? (isRtl ? 'يوم تعافي' : 'Recovery day') : (isRtl ? 'يوم تدريب' : 'Training day'))}
                </Text>
                <View style={[styles.stats, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  {!workout.is_rest_day ? (
                    <View style={[styles.statChip, { backgroundColor: `${color.spark}1A`, borderColor: `${color.spark}33` }]}>
                      <Feather name="check-circle" size={13} color={color.spark} />
                      <Text style={[styles.statText, { color: color.spark }]}>
                        {isBrowsing ? totalExercises : `${completedCount}/${totalExercises}`}
                      </Text>
                    </View>
                  ) : null}
                  {workout.duration_min ? (
                    <View style={[styles.statChip, { backgroundColor: color.elevated, borderColor: color.border }]}>
                      <Feather name="clock" size={13} color={color.muted} />
                      <Text style={[styles.statText, { color: color.muted }]}>{workout.duration_min} min</Text>
                    </View>
                  ) : null}
                </View>
                {!isBrowsing && !workout.is_rest_day && totalExercises > 0 ? (
                  <View style={[styles.progressBarTrack, { backgroundColor: color.elevated, marginTop: 12 }]}>
                    <View style={[styles.progressBarFill, { width: `${(completedCount / totalExercises) * 100}%`, backgroundColor: color.spark }]} />
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
                workout.exercises.map(exercise => {
                  const done = !isBrowsing && completedSet.has(exercise.index)
                  const isExpandedEx = expanded[exercise.index] ?? false
                  const hasVideo = !!exercise.video_id

                  return (
                    <View key={`${exercise.index}-${exercise.name}`} style={[styles.exerciseCard, { backgroundColor: color.surface, borderColor: done ? color.pulse : color.border }]}>
                      <View style={[styles.exerciseRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                        {!isBrowsing ? (
                          <Pressable onPress={() => toggleExercise(exercise.index)} style={[styles.check, { borderColor: done ? color.pulse : color.dim, backgroundColor: done ? color.pulse : 'transparent' }]}>
                            {done ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                          </Pressable>
                        ) : (
                          <View style={[styles.check, { borderColor: color.border, backgroundColor: 'transparent' }]}>
                            <Text style={{ fontSize: 10, color: color.dim }}>{exercise.index + 1}</Text>
                          </View>
                        )}

                        <Pressable onPress={() => toggleExpand(exercise.index)} style={styles.exerciseText}>
                          <Text style={[styles.exerciseName, { color: color.text, textAlign: align }]}>{exercise.name}</Text>
                          <Text style={[styles.body, { color: color.muted, textAlign: align }]}>{exerciseMeta(exercise)}</Text>
                          {exercise.weight_guidance ? (
                            <Text style={[styles.body, { color: color.spark, textAlign: align }]}>{exercise.weight_guidance}</Text>
                          ) : null}
                          {exercise.muscle_group ? (
                            <Text style={[styles.muscleTag, { color: color.dim }]}>{exercise.muscle_group}</Text>
                          ) : null}
                        </Pressable>

                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          {hasVideo ? (
                            <Pressable onPress={() => openVideo(exercise.video_id)} style={[styles.videoBtn, { backgroundColor: '#FF000018', borderColor: '#FF000033' }]}>
                              <Feather name="youtube" size={14} color="#FF4444" />
                            </Pressable>
                          ) : null}
                          <Pressable onPress={() => toggleExpand(exercise.index)} style={styles.chevronBtn}>
                            <Feather name={isExpandedEx ? 'chevron-up' : 'chevron-down'} size={15} color={color.dim} />
                          </Pressable>
                        </View>
                      </View>

                      {isExpandedEx ? (
                        <View style={[styles.expandSection, { borderTopColor: color.border }]}>
                          {exercise.form_tip ? (
                            <View style={[styles.formTipBox, { backgroundColor: `${color.spark}0D`, borderColor: `${color.spark}26` }]}>
                              <Feather name="info" size={12} color={color.sparkLight} />
                              <Text style={[styles.body, { color: color.muted, flex: 1, lineHeight: 18 }]}>{exercise.form_tip}</Text>
                            </View>
                          ) : null}
                          {exercise.progression_note ? (
                            <View style={[styles.formTipBox, { backgroundColor: `${color.pulse}0D`, borderColor: `${color.pulse}26`, marginTop: 6 }]}>
                              <Feather name="trending-up" size={12} color={color.pulse} />
                              <Text style={[styles.body, { color: color.muted, flex: 1, lineHeight: 18 }]}>{exercise.progression_note}</Text>
                            </View>
                          ) : null}
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
                                <Text style={[styles.perfLabel, { color: color.dim }]}>{isRtl ? 'التكرارات' : 'Reps'}</Text>
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
                            <Pressable onPress={() => openVideo(exercise.video_id)} style={[styles.watchVideoBtn, { borderColor: '#FF444433', backgroundColor: '#FF44441A' }]}>
                              <Feather name="youtube" size={15} color="#FF4444" />
                              <Text style={[styles.watchVideoText, { color: '#FF4444' }]}>{isRtl ? 'شاهد الفيديو التعليمي' : 'Watch exercise video'}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  )
                })
              )}

              {!isBrowsing && !workout.is_rest_day && totalExercises > 0 ? (
                <Pressable style={[styles.finishButton, { backgroundColor: color.spark }]} onPress={finishWorkout} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather name="check-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.finishText}>{isRtl ? 'إنهاء وتسجيل التمرين' : 'Finish and log workout'}</Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </>
          )}
        </>
      )}
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
  // summary card
  stats: { gap: 8, marginTop: 14 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  statText: { fontSize: 13, fontWeight: '800' },
  progressBarTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 999 },
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
  // expanded
  expandSection: { borderTopWidth: 1, padding: 12, gap: 8 },
  formTipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  performanceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  perfLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase' },
  performanceInput: { borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  watchVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  watchVideoText: { fontSize: 13, fontWeight: '900' },
  finishButton: { marginTop: 18, borderRadius: 18, padding: 18, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: 'white', fontSize: 16, fontWeight: '900' },
})
