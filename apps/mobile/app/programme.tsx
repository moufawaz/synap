import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { VideoModal } from '@/components/VideoModal'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

export default function ProgrammeScreen() {
  const { color } = useTheme()
  const plan = useAsyncData(getPlanHistory, [])
  const workout = plan.data?.activeWorkoutPlan?.plan_json
  const weeks = Array.isArray(workout?.weeks)
    ? workout.weeks
    : [{ week: 1, days: workout?.days || [] }]

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  return (
    <Screen>
      <VideoModal videoId={activeVideoId} onClose={() => setActiveVideoId(null)} />

      <IonPageHeader
        eyebrow="PROGRAMME"
        title={workout?.program_name || workout?.name || 'Programme'}
        subtitle={plan.data?.timing?.workout?.label || 'Full workout browser'}
      />

      {plan.loading ? <ActivityIndicator color={color.spark} /> : null}

      {weeks.map((week: any, weekIndex: number) => (
        <Card key={weekIndex} style={styles.cardGap}>
          <Text style={[styles.title, { color: color.text }]}>
            Week {week.week ?? weekIndex + 1}
          </Text>

          {(week.days || []).map((day: any, dayIndex: number) => (
            <View key={dayIndex} style={[styles.day, { borderColor: color.border }]}>
              <Text style={[styles.dayTitle, { color: color.text }]}>
                {day.day_name || day.day || `Day ${dayIndex + 1}`}
              </Text>
              <Text style={[styles.body, { color: color.muted }]}>
                {day.muscle_focus || day.focus || 'Training day'}
              </Text>

              {(day.exercises || []).length
                ? (day.exercises || []).map((ex: any, exIndex: number) => (
                  <View key={exIndex} style={[styles.exercise, { borderColor: color.border }]}>
                    <View style={styles.exHeader}>
                      <Text style={[styles.exName, { color: color.text }]}>
                        {ex.name || ex.title}
                      </Text>
                      {ex.video_id ? (
                        <Pressable
                          onPress={() => setActiveVideoId(ex.video_id)}
                          style={[styles.videoChip, { backgroundColor: '#FF00001A', borderColor: '#FF000033' }]}
                        >
                          <Feather name="youtube" size={12} color="#FF4444" />
                          <Text style={styles.videoChipText}>Video</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={[styles.body, { color: color.muted }]}>
                      {ex.sets ?? '-'} sets × {ex.reps ?? '-'}
                      {ex.rest_seconds ?? ex.rest_sec ? `  ·  ${ex.rest_seconds ?? ex.rest_sec}s rest` : ''}
                    </Text>
                    {ex.muscle_group ? (
                      <Text style={[styles.tag, { color: color.dim }]}>{ex.muscle_group}</Text>
                    ) : null}
                    {ex.form_tip ? (
                      <Text style={[styles.tip, { color: color.muted }]} numberOfLines={2}>
                        💡 {ex.form_tip}
                      </Text>
                    ) : null}
                  </View>
                ))
                : <Text style={[styles.body, { color: color.muted, marginTop: 6 }]}>Rest day</Text>}
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cardGap: { marginTop: 14 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  day: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 12 },
  dayTitle: { fontSize: 17, fontWeight: '900', marginBottom: 2 },
  body: { fontSize: 14, lineHeight: 21 },
  exercise: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  exName: { fontSize: 15, fontWeight: '900', flex: 1 },
  videoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  videoChipText: { fontSize: 11, fontWeight: '900', color: '#FF4444' },
  tag: { fontSize: 11, fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  tip: { fontSize: 12, lineHeight: 17, marginTop: 5, fontStyle: 'italic' },
})
