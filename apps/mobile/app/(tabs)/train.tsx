import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
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
  return parts.join(' - ')
}

export default function TrainScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const plan = useAsyncData(getPlanHistory, [])
  const workout = plan.data?.todayWorkout ?? null
  const [completed, setCompleted] = useState<number[]>([])
  const [performance, setPerformance] = useState<Record<string, { weight?: string; reps?: string }>>({})
  const [saving, setSaving] = useState(false)
  const date = todayKey()

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

  async function toggleExercise(index: number) {
    const next = completedSet.has(index)
      ? completed.filter(item => item !== index)
      : [...completed, index]
    setCompleted(next)

    if (workout) {
      await saveWorkoutSession({
        date,
        dayName: workout.day_name,
        completedExercises: next,
        exercisePerformance: performance,
      }).catch(() => {})
    }
  }

  async function updatePerformance(index: number, key: 'weight' | 'reps', value: string) {
    const next = {
      ...performance,
      [index]: {
        ...(performance[index] || {}),
        [key]: value,
      },
    }
    setPerformance(next)
    if (workout) {
      await saveWorkoutSession({
        date,
        dayName: workout.day_name,
        completedExercises: completed,
        exercisePerformance: next,
      }).catch(() => {})
    }
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
      Alert.alert('Workout saved', 'Your session was logged successfully.')
    } catch (error) {
      Alert.alert('Could not save workout', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <IonPageHeader
        eyebrow="WORKOUT"
        title={text.train}
        subtitle={plan.data?.timing?.workout?.label ?? 'Today session and exercise tracking.'}
      />

      {plan.loading ? (
        <ActivityIndicator color={color.spark} />
      ) : plan.error ? (
        <Card>
          <Text style={[styles.body, { color: color.danger, textAlign: isRtl ? 'right' : 'left' }]}>
            {plan.error}
          </Text>
        </Card>
      ) : !workout ? (
        <Card>
          <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>No workout plan yet</Text>
          <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
            Finish onboarding or ask Ion to create a workout plan.
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{workout.day_name}</Text>
            <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {workout.muscle_focus || (workout.is_rest_day ? 'Recovery day' : 'Training day')}
            </Text>
            <View style={[styles.stats, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.stat, { color: color.spark }]}>{completed.length}/{totalExercises} done</Text>
              {workout.duration_min ? <Text style={[styles.stat, { color: color.muted }]}>{workout.duration_min} min</Text> : null}
            </View>
          </Card>

          {workout.is_rest_day ? (
            <Card>
              <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>Rest day</Text>
              <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                Sleep, hydrate, and keep the nutrition plan steady.
              </Text>
            </Card>
          ) : (
            workout.exercises.map(exercise => {
              const done = completedSet.has(exercise.index)
              return (
                <Pressable key={`${exercise.index}-${exercise.name}`} onPress={() => toggleExercise(exercise.index)}>
                  <Card style={[styles.exercise, done && { borderColor: color.pulse }]}>
                    <View style={[styles.exerciseRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.check, { borderColor: done ? color.pulse : color.dim, backgroundColor: done ? color.pulse : 'transparent' }]} />
                      <View style={styles.exerciseText}>
                        <Text style={[styles.exerciseName, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{exercise.name}</Text>
                        <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                          {exerciseMeta(exercise)}
                        </Text>
                        {exercise.weight_guidance ? <Text style={[styles.body, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{exercise.weight_guidance}</Text> : null}
                        {exercise.progression_note ? <Text style={[styles.body, { color: color.pulse, textAlign: isRtl ? 'right' : 'left' }]}>{exercise.progression_note}</Text> : null}
                        <View style={styles.performanceRow}>
                          <TextInput
                            value={performance[exercise.index]?.weight || ''}
                            onChangeText={value => updatePerformance(exercise.index, 'weight', value)}
                            placeholder="Weight"
                            placeholderTextColor={color.dim}
                            keyboardType="decimal-pad"
                            style={[styles.performanceInput, { color: color.text, borderColor: color.border, backgroundColor: color.elevated }]}
                          />
                          <TextInput
                            value={performance[exercise.index]?.reps || ''}
                            onChangeText={value => updatePerformance(exercise.index, 'reps', value)}
                            placeholder="Reps"
                            placeholderTextColor={color.dim}
                            keyboardType="number-pad"
                            style={[styles.performanceInput, { color: color.text, borderColor: color.border, backgroundColor: color.elevated }]}
                          />
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              )
            })
          )}

          {!workout.is_rest_day && totalExercises > 0 ? (
            <Pressable style={[styles.finishButton, { backgroundColor: color.spark }]} onPress={finishWorkout} disabled={saving}>
              <Text style={styles.finishText}>{saving ? 'Saving...' : 'Finish and log workout'}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  stats: {
    gap: 14,
    marginTop: 16,
  },
  stat: {
    fontSize: 14,
    fontWeight: '800',
  },
  exercise: {
    marginTop: 12,
  },
  exerciseRow: {
    alignItems: 'center',
    gap: 14,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  exerciseText: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  performanceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    fontWeight: '800',
  },
  finishButton: {
    marginTop: 18,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  finishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
})
