import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

// Lazy import — react-native-youtube-iframe uses Old Architecture WebView APIs
// that crash under New Architecture if imported at module scope.
async function getYoutubePlayer() {
  const mod = await import('react-native-youtube-iframe')
  return mod.default
}

export default function ProgrammeScreen() {
  const { color } = useTheme()
  const plan = useAsyncData(getPlanHistory, [])
  const workout = plan.data?.activeWorkoutPlan?.plan_json
  const weeks = Array.isArray(workout?.weeks) ? workout.weeks : [{ week: 1, days: workout?.days || [] }]
  const [videoId, setVideoId] = useState<string | null>(null)
  const [YoutubePlayer, setYoutubePlayer] = useState<any>(null)

  async function openVideo(id: string) {
    if (!YoutubePlayer) {
      try {
        const Player = await getYoutubePlayer()
        setYoutubePlayer(() => Player)
      } catch {
        // youtube-iframe failed to load — ignore, video won't play
      }
    }
    setVideoId(id)
  }

  return (
    <Screen>
      <IonPageHeader eyebrow="PROGRAMME" title={workout?.program_name || workout?.name || 'Programme'} subtitle={plan.data?.timing?.workout?.label || 'Full workout browser'} />
      {plan.loading ? <ActivityIndicator color={color.spark} /> : null}
      {videoId && YoutubePlayer ? (
        <Card style={styles.videoCard}>
          <YoutubePlayer height={210} play={false} videoId={videoId} />
          <Pressable onPress={() => setVideoId(null)}><Text style={[styles.link, { color: color.spark }]}>Close video</Text></Pressable>
        </Card>
      ) : null}
      {weeks.map((week: any, weekIndex: number) => (
        <Card key={weekIndex} style={styles.cardGap}>
          <Text style={[styles.title, { color: color.text }]}>Week {week.week ?? weekIndex + 1}</Text>
          {(week.days || []).map((day: any, dayIndex: number) => (
            <View key={dayIndex} style={[styles.day, { borderColor: color.border }]}>
              <Text style={[styles.dayTitle, { color: color.text }]}>{day.day_name || day.day || `Day ${dayIndex + 1}`}</Text>
              <Text style={[styles.body, { color: color.muted }]}>{day.muscle_focus || day.focus || 'Training day'}</Text>
              {(day.exercises || []).length ? (day.exercises || []).map((exercise: any, exIndex: number) => (
                <View key={exIndex} style={styles.exercise}>
                  <Text style={[styles.body, { color: color.text, fontWeight: '900' }]}>{exercise.name || exercise.title}</Text>
                  <Text style={[styles.body, { color: color.muted }]}>{exercise.sets ?? '-'} sets x {exercise.reps ?? '-'} - {exercise.rest_seconds ?? exercise.rest_sec ?? '-'}s rest</Text>
                  {exercise.video_id ? (
                    <Pressable onPress={() => openVideo(exercise.video_id)}><Text style={[styles.link, { color: color.flame }]}>Watch inside app</Text></Pressable>
                  ) : null}
                </View>
              )) : <Text style={[styles.body, { color: color.muted }]}>Rest day</Text>}
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cardGap: { marginTop: 14 },
  videoCard: { marginBottom: 14, overflow: 'hidden' },
  title: { fontSize: 22, fontWeight: '900' },
  day: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  dayTitle: { fontSize: 18, fontWeight: '900' },
  body: { fontSize: 15, lineHeight: 22 },
  exercise: { marginTop: 10 },
  link: { fontWeight: '900', marginTop: 6 },
})
