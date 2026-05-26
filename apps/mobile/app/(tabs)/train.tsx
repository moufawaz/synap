import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getPlanHistory, getWorkoutSession, logWorkout, saveWorkoutSession, TodayWorkout } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function exerciseMeta(exercise: TodayWorkout['exercises'][number]) {
  const parts = []
  if (exercise.sets) parts.push(`${exercise.sets} sets`)
  if (exercise.reps) parts.push(`${exercise.reps} reps`)
  if (exercise.rest_sec) parts.push(`${exercise.rest_sec}s rest`)
  return parts.join('  ·  ')
}

function openVideo(videoId: string | null | undefined) {
  if (!videoId) return
  // Try to open in YouTube app, fall back to browser
  const appUrl = `youtube://www.youtube.com/watch?v=${videoId}`
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`
  Linking.canOpenURL(appUrl)
    .then(supported => Linking.openURL(supported ? appUrl : webUrl))
    .catch(() => Linking.openURL(webUrl))
}

// ── Quick action button ───────────────────────────────────

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

export default function TrainScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const plan = useAsyncData(getPlanHistory, [])
  const workout = plan.data?.todayWorkout ?? null
  const [completed, setCompleted] = useState<number[]>([])
  const [performance, setPerformance] = useState<Record<string, { weight?: string; reps?: string }>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)
  const date = todayKey()
  const align = isRtl ? 'right' : 'left'

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
    const next = completedSet.has(index)
      ? completed.filter(item => item !== index)
      : [...completed, index]
    setCompleted(next)
    if (workout) {
      await saveWorkoutSession({ date, dayName: workout.day_name, completedExercises: next, exercisePerformance: performance }).catch(() => {})
    }
  }

  async function updatePerformance(index: number, key: 'weight' | 'reps', value: string) {
    const next = { ...performance, [index]: { ...(performance[index] || {}), [key]: value } }
    setPerformance(next)
    if (workout) {
      await saveWorkoutSession({ date, dayName: workout.day_name, completedExercises: completed, exercisePerformance: next }).catch(() => {})
    }
  }

  function toggleExpand(index: number) {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }))
  }

  async function finishWorkout() {
    if (!workout || totalExercises === 0) return
    setSaving(true)
    try {
      await logWorkout({
        date,
        day_name: workout.day_name,
        duration_min: workout.duration_min ?? 0,
        exercises_completed: completed.length,
        total_exercises: totalExercises,
        exercises: workout.exercises.map(exercise => ({
          name: exercise.name,
          completed: completedSet.has(exercise.index),
          performance: performance[exercise.index] || null,
        })),
        exercisePerformance: performance,
        notes: workout.muscle_focus,
      })
      Alert.alert(isRtl ? 'تم حفظ التمرين' : 'Workout saved', isRtl ? 'تم تسجيل جلستك بنجاح.' : 'Your session was logged successfully.')
    } catch (error) {
      Alert.alert(isRtl ? 'تعذر حفظ التمرين' : 'Could not save workout', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <IonPageHeader
        eyebrow="WORKOUT"
        title={text.train}
        subtitle={plan.data?.timing?.workout?.label ?? (isRtl ? 'جلسة اليوم وتتبع التمارين' : "Today's session and exercise tracking.")}
      />

      {plan.loading ? (
        <ActivityIndicator color={color.spark} />
      ) : plan.error ? (
        <Card>
          <Text style={[styles.body, { color: color.danger, textAlign: align }]}>{plan.error}</Text>
        </Card>
      ) : !workout ? (
        <Card>
          <Text style={[styles.title, { color: color.text, textAlign: align }]}>{isRtl ? 'لا توجد خطة تمرين بعد' : 'No workout plan yet'}</Text>
          <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
            {isRtl ? 'أكمل الإعداد أو اطلب من آيون إنشاء خطة تمرين.' : 'Finish onboarding or ask Ion to create a workout plan.'}
          </Text>
        </Card>
      ) : (
        <>
          {/* Summary card */}
          <Card accent>
            <Text style={[styles.eyebrow, { color: color.spark }]}>TODAY</Text>
            <Text style={[styles.title, { color: color.text, textAlign: align }]}>{workout.day_name}</Text>
            <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
              {workout.muscle_focus || (workout.is_rest_day ? (isRtl ? 'يوم تعافي' : 'Recovery day') : (isRtl ? 'يوم تدريب' : 'Training day'))}
            </Text>
            <View style={[styles.stats, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {!workout.is_rest_day ? (
                <View style={[styles.statChip, { backgroundColor: `${color.spark}1A`, borderColor: `${color.spark}33` }]}>
                  <Feather name="check-circle" size={13} color={color.spark} />
                  <Text style={[styles.statText, { color: color.spark }]}>{completedCount}/{totalExercises}</Text>
                </View>
              ) : null}
              {workout.duration_min ? (
                <View style={[styles.statChip, { backgroundColor: color.elevated, borderColor: color.border }]}>
                  <Feather name="clock" size={13} color={color.muted} />
                  <Text style={[styles.statText, { color: color.muted }]}>{workout.duration_min} min</Text>
                </View>
              ) : null}
            </View>
            {!workout.is_rest_day && totalExercises > 0 ? (
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
              const done = completedSet.has(exercise.index)
              const isExpanded = expanded[exercise.index] ?? false
              const hasVideo = !!exercise.video_id
              const hasTip = !!exercise.form_tip

              return (
                <View key={`${exercise.index}-${exercise.name}`} style={[styles.exerciseCard, { backgroundColor: color.surface, borderColor: done ? color.pulse : color.border }]}>
                  {/* Main row: checkbox + info + video */}
                  <View style={[styles.exerciseRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <Pressable onPress={() => toggleExercise(exercise.index)} style={[styles.check, { borderColor: done ? color.pulse : color.dim, backgroundColor: done ? color.pulse : 'transparent' }]}>
                      {done ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                    </Pressable>

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
                        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={color.dim} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Expanded: form tip + performance inputs */}
                  {isExpanded ? (
                    <View style={[styles.expandSection, { borderTopColor: color.border }]}>
                      {hasTip ? (
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
                      <View style={styles.performanceRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.perfLabel, { color: color.dim }]}>{isRtl ? 'الوزن (كغ)' : 'Weight (kg)'}</Text>
                          <TextInput
                            value={performance[exercise.index]?.weight || ''}
                            onChangeText={value => updatePerformance(exercise.index, 'weight', value)}
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
                            onChangeText={value => updatePerformance(exercise.index, 'reps', value)}
                            placeholder="—"
                            placeholderTextColor={color.dim}
                            keyboardType="number-pad"
                            style={[styles.performanceInput, { color: color.text, borderColor: color.border, backgroundColor: color.elevated }]}
                          />
                        </View>
                      </View>
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

          {!workout.is_rest_day && totalExercises > 0 ? (
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
    </Screen>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  stats: {
    gap: 8,
    marginTop: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  // Quick links
  quickLinks: {
    marginTop: 10,
    gap: 6,
  },
  trainLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  trainLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trainLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  // Exercise cards
  exerciseCard: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  exerciseRow: {
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exerciseText: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 3,
  },
  muscleTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  videoBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Expanded section
  expandSection: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  formTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  perfLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  performanceInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  watchVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  watchVideoText: {
    fontSize: 13,
    fontWeight: '900',
  },
  finishButton: {
    marginTop: 18,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
})
