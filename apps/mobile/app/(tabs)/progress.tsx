import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import Feather from '@expo/vector-icons/Feather'
import { useFocusEffect } from 'expo-router'
import { Card } from '@/components/Card'
import { DataError } from '@/components/DataError'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { analyzeInBodyPhoto, createMeasurement, getMeasurements } from '@/features/measurements'
import { apiFetch } from '@/lib/api'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const METRICS = [
  { key: 'weight_kg', label: 'Weight', labelAr: 'الوزن', unit: 'kg' },
  { key: 'waist_cm', label: 'Waist', labelAr: 'الخصر', unit: 'cm' },
  { key: 'chest_cm', label: 'Chest', labelAr: 'الصدر', unit: 'cm' },
  { key: 'bicep_right_cm', label: 'Bicep', labelAr: 'العضلة', unit: 'cm' },
  { key: 'body_fat_pct', label: 'Body Fat', labelAr: 'الدهون', unit: '%' },
] as const

type MetricKey = typeof METRICS[number]['key']

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function numberOrNull(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getStreak(logs: any[]): number {
  if (!logs.length) return 0
  const sorted = [...logs]
    .map(l => l.logged_at?.slice(0, 10) || l.date || '')
    .filter(Boolean)
    .sort()
    .reverse()
  const unique = [...new Set(sorted)]
  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (const day of unique) {
    const d = new Date(day + 'T00:00:00')
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
    if (diff <= 1) {
      streak++
      cursor = d
    } else break
  }
  return streak
}

// Generalised mini chart — works with any numeric metric
function MetricMiniChart({ values, unit, color }: { values: { date: string; value: number }[]; unit: string; color: any }) {
  if (values.length < 2) return null
  const W = 280; const H = 56
  const nums = values.map(v => v.value)
  const min = Math.min(...nums) - 0.2
  const max = Math.max(...nums) + 0.2
  const range = max - min || 1

  const points = nums.map((v, i) => ({
    x: (i / (nums.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }))

  const lineColor = color.spark

  return (
    <View style={{ height: H + 24, marginTop: 14 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1]
          const dx = next.x - pt.x; const dy = next.y - pt.y
          const length = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          return (
            <View key={i} style={{
              position: 'absolute', left: pt.x, top: pt.y - 1,
              width: length, height: 2, backgroundColor: lineColor, opacity: 0.7,
              transform: [{ rotate: `${angle}deg` }], transformOrigin: '0 50%',
            }} />
          )
        })}
        {points.map((pt, i) => (
          <View key={i} style={{
            position: 'absolute', left: pt.x - 4, top: pt.y - 4,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: lineColor, borderWidth: 1.5, borderColor: color.bg,
          }} />
        ))}
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: color.dim }}>{nums[0]} {unit}</Text>
        <Text style={{ fontSize: 11, fontWeight: '900', color: lineColor }}>{nums[nums.length - 1]} {unit}</Text>
      </View>
    </View>
  )
}

async function getWorkoutLogs() {
  return apiFetch<{ logs: any[] }>('/api/log-workout')
}

async function getCoachFeatures() {
  return apiFetch<{ timeline: any[] }>('/api/coach-features')
}

export default function ProgressScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const measurements = useAsyncData(getMeasurements, [])
  const workoutLogs = useAsyncData(getWorkoutLogs, [])
  const coachFeatures = useAsyncData(getCoachFeatures, [])

  const latest = measurements.data?.measurements?.[0]
  const previous = measurements.data?.measurements?.[1]

  // Reload on focus so new measurements/workouts from other screens appear immediately
  useFocusEffect(
    useCallback(() => {
      measurements.reload()
      workoutLogs.reload()
    }, [])
  )

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight_kg')
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const shareCardRef = useRef<View>(null)

  const align = isRtl ? 'right' : 'left'

  const metric = METRICS.find(m => m.key === selectedMetric)!

  // Build chart data for selected metric (oldest first, last 8)
  const chartData = (measurements.data?.measurements ?? [])
    .slice(0, 10)
    .filter(m => (m as any)[selectedMetric] != null)
    .map(m => ({ date: m.date, value: (m as any)[selectedMetric] as number }))
    .reverse()

  const weightDelta = latest?.weight_kg && previous?.weight_kg
    ? latest.weight_kg - previous.weight_kg
    : null

  const logs = workoutLogs.data?.logs ?? []
  const streak = getStreak(logs)
  const weeklyCount = logs.filter(l => {
    const d = new Date(l.logged_at || l.date || '')
    const now = new Date()
    return (now.getTime() - d.getTime()) < 7 * 86400000
  }).length

  const timeline = coachFeatures.data?.timeline ?? []

  async function saveMeasurement() {
    if (!weight.trim() && !waist.trim()) {
      Alert.alert('SYNAP', 'Add weight or waist before saving.')
      return
    }
    setSaving(true)
    try {
      await createMeasurement({ date: todayKey(), weight_kg: numberOrNull(weight), waist_cm: numberOrNull(waist) })
      setWeight(''); setWaist('')
      await measurements.reload()
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.')
    } finally { setSaving(false) }
  }

  async function analyzeInBody() {
    setAnalyzing(true)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) { Alert.alert('Camera permission needed', 'Allow camera access to analyze InBody.'); return }
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset?.base64) { Alert.alert('InBody', 'Could not read photo.'); return }
      const response = await analyzeInBodyPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      const bodyFat = response.data?.body_fat_pct
      Alert.alert('InBody analyzed', bodyFat ? `Body fat: ${bodyFat}%` : 'Analysis saved.')
      await measurements.reload()
    } catch (error) {
      Alert.alert('InBody failed', error instanceof Error ? error.message : 'Try again.')
    } finally { setAnalyzing(false) }
  }

  async function shareProgressCard() {
    if (!shareCardRef.current) return
    try {
      const { captureRef } = await import('react-native-view-shot')
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 })
      if (!(await Sharing.isAvailableAsync())) { Alert.alert('Sharing unavailable', 'Not available on this device.'); return }
      await Sharing.shareAsync(uri, { dialogTitle: 'Share SYNAP progress', mimeType: 'image/png', UTI: 'public.png' })
    } catch (error) {
      Alert.alert('Could not share', error instanceof Error ? error.message : 'Try again.')
    }
  }

  return (
    <Screen>
      <IonPageHeader eyebrow="PROGRESS" title={text.progress} subtitle={isRtl ? 'سجل القياسات ورصد التقدم' : 'Measurement history and trend tracking.'} />

      {measurements.loading ? <ActivityIndicator color={color.spark} /> : null}
      <DataError
        error={measurements.error}
        status={measurements.errorStatus}
        isRtl={isRtl}
        title={measurements.errorStatus !== 401 ? (isRtl ? 'تعذّر تحميل القياسات' : "Couldn't load your measurements") : undefined}
      />

      {!measurements.loading && !measurements.error ? (
        <>
          {/* Latest snapshot card */}
          <View ref={shareCardRef} collapsable={false}>
            <Card accent>
              <Text style={[styles.eyebrow, { color: color.spark }]}>LATEST</Text>
              <Text style={[styles.bigNumber, { color: color.text }]}>
                {latest?.weight_kg ? `${latest.weight_kg} kg` : (isRtl ? 'لا يوجد بعد' : 'No weight yet')}
              </Text>
              <View style={styles.statsRow}>
                {latest?.waist_cm ? (
                  <View style={[styles.statPill, { backgroundColor: color.elevated, borderColor: color.border }]}>
                    <Text style={[styles.statPillLabel, { color: color.dim }]}>WAIST</Text>
                    <Text style={[styles.statPillValue, { color: color.text }]}>{latest.waist_cm} cm</Text>
                  </View>
                ) : null}
                {(latest as any)?.body_fat_pct ? (
                  <View style={[styles.statPill, { backgroundColor: color.elevated, borderColor: color.border }]}>
                    <Text style={[styles.statPillLabel, { color: color.dim }]}>BODY FAT</Text>
                    <Text style={[styles.statPillValue, { color: color.sparkLight }]}>{(latest as any).body_fat_pct}%</Text>
                  </View>
                ) : null}
                {(latest as any)?.muscle_mass_kg ? (
                  <View style={[styles.statPill, { backgroundColor: color.elevated, borderColor: color.border }]}>
                    <Text style={[styles.statPillLabel, { color: color.dim }]}>MUSCLE</Text>
                    <Text style={[styles.statPillValue, { color: color.pulse }]}>{(latest as any).muscle_mass_kg} kg</Text>
                  </View>
                ) : null}
              </View>
              {weightDelta !== null ? (
                <Text style={[styles.delta, { color: weightDelta <= 0 ? color.pulse : color.flame }]}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg {isRtl ? 'من السابق' : 'from previous'}
                </Text>
              ) : null}
              <Text style={[styles.dateLabel, { color: color.dim }]}>
                {latest?.date ?? (isRtl ? 'سجّل أول قياس للبدء' : 'Log your first measurement to start.')}
              </Text>
              <Text style={[styles.watermark, { color: color.dim }]}>SYNAP</Text>
            </Card>
          </View>

          <Pressable onPress={shareProgressCard} style={[styles.secondaryFull, { borderColor: color.border, backgroundColor: color.elevated, marginTop: 10 }]}>
            <Text style={[styles.secondaryText, { color: color.text }]}>{text.shareProgressCard}</Text>
          </Pressable>

          {/* ─── 5-Metric chart selector ─────────────────── */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'رسم بياني' : 'Progress Chart'}
            </Text>

            {/* Metric chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricChips}>
              {METRICS.map(m => {
                const active = m.key === selectedMetric
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setSelectedMetric(m.key)}
                    style={[styles.metricChip, {
                      backgroundColor: active ? color.spark : color.elevated,
                      borderColor: active ? color.spark : color.border,
                    }]}
                  >
                    <Text style={[styles.metricChipText, { color: active ? '#fff' : color.muted }]}>
                      {isRtl ? m.labelAr : m.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {chartData.length >= 2 ? (
              <MetricMiniChart values={chartData} unit={metric.unit} color={color} />
            ) : (
              <Text style={[styles.body, { color: color.dim, marginTop: 12, textAlign: align }]}>
                {isRtl ? 'لا توجد بيانات كافية لهذا القياس.' : 'Not enough data for this metric yet.'}
              </Text>
            )}
          </Card>

          {/* ─── Workout streak + logs ───────────────────── */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'التمارين' : 'Training Activity'}
            </Text>
            <View style={[styles.statsRow, { marginBottom: 14 }]}>
              <View style={[styles.statPill, { backgroundColor: `${color.spark}1A`, borderColor: `${color.spark}33` }]}>
                <Text style={[styles.statPillLabel, { color: color.spark }]}>{isRtl ? 'الاستمرارية' : 'STREAK'}</Text>
                <Text style={[styles.statPillValue, { color: color.spark }]}>{streak} {isRtl ? 'يوم' : 'days'}</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: `${color.pulse}1A`, borderColor: `${color.pulse}33` }]}>
                <Text style={[styles.statPillLabel, { color: color.pulse }]}>{isRtl ? 'هذا الأسبوع' : 'THIS WEEK'}</Text>
                <Text style={[styles.statPillValue, { color: color.pulse }]}>{weeklyCount} {isRtl ? 'جلسة' : 'sessions'}</Text>
              </View>
            </View>

            {workoutLogs.loading ? <ActivityIndicator color={color.spark} /> : null}
            {logs.slice(0, 5).map((log, i) => (
              <View key={log.id || i} style={[styles.logRow, { borderTopColor: color.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <View style={[styles.logDot, { backgroundColor: i === 0 ? color.spark : color.dim }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.logName, { color: color.text, textAlign: align }]}>{log.day_name || log.name || 'Workout'}</Text>
                  <Text style={[styles.logMeta, { color: color.muted, textAlign: align }]}>
                    {log.logged_at?.slice(0, 10) || log.date || ''}
                    {log.exercises_completed != null ? `  ·  ${log.exercises_completed}/${log.total_exercises ?? log.exercises_total ?? '?'} exercises` : ''}
                    {log.duration_min ? `  ·  ${log.duration_min} min` : ''}
                  </Text>
                </View>
              </View>
            ))}
            {!workoutLogs.loading && logs.length === 0 ? (
              <Text style={[styles.body, { color: color.dim, textAlign: align }]}>
                {isRtl ? 'لا توجد جلسات مسجلة بعد.' : 'No logged sessions yet.'}
              </Text>
            ) : null}
          </Card>

          {/* ─── Coach timeline ──────────────────────────── */}
          {timeline.length > 0 ? (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
                {isRtl ? 'جدول الكوتش' : 'Coach Timeline'}
              </Text>
              {timeline.slice(0, 5).map((item: any, i: number) => (
                <View key={i} style={[styles.timelineRow, { borderTopColor: color.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.timelineDot, { backgroundColor: color.spark }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logName, { color: color.text, textAlign: align }]}>{item.title || item.label || item.type || 'Update'}</Text>
                    {item.summary || item.body ? (
                      <Text style={[styles.logMeta, { color: color.muted, textAlign: align }]} numberOfLines={2}>
                        {item.summary || item.body}
                      </Text>
                    ) : null}
                    {item.date || item.created_at ? (
                      <Text style={[styles.logDate, { color: color.dim, textAlign: align }]}>
                        {(item.date || item.created_at || '').slice(0, 10)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {/* ─── Quick log ─────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>{text.quickLog}</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder={isRtl ? 'الوزن (كغ)' : 'Weight kg'}
                placeholderTextColor={color.dim}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
                style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text }]}
              />
              <TextInput
                placeholder={isRtl ? 'الخصر (سم)' : 'Waist cm'}
                placeholderTextColor={color.dim}
                keyboardType="decimal-pad"
                value={waist}
                onChangeText={setWaist}
                style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text }]}
              />
            </View>
            <Pressable disabled={saving} onPress={saveMeasurement} style={[styles.primaryBtn, { backgroundColor: color.spark }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{text.saveMeasurement}</Text>}
            </Pressable>
            <Pressable disabled={analyzing} onPress={analyzeInBody} style={[styles.secondaryFull, { borderColor: color.spark, backgroundColor: color.elevated, marginTop: 10 }]}>
              {analyzing ? <ActivityIndicator color={color.spark} /> : <Text style={[styles.secondaryText, { color: color.spark }]}>{text.analyzeInBody}</Text>}
            </Pressable>
          </Card>

          {/* ─── Measurement history ────────────────────── */}
          {(measurements.data?.measurements ?? []).slice(0, 10).map((item, i) => (
            <Card key={item.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: i === 0 ? color.spark : color.dim }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyDate, { color: color.text, textAlign: align }]}>{item.date}</Text>
                  <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
                    {item.weight_kg ? `${item.weight_kg} kg` : '—'}
                    {item.waist_cm ? `  ·  ${item.waist_cm} cm` : ''}
                    {(item as any).body_fat_pct ? `  ·  ${(item as any).body_fat_pct}% fat` : ''}
                    {(item as any).chest_cm ? `  ·  chest ${(item as any).chest_cm} cm` : ''}
                    {(item as any).bicep_right_cm ? `  ·  bicep ${(item as any).bicep_right_cm} cm` : ''}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6 },
  bigNumber: { fontSize: 36, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  statPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  statPillLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  statPillValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  delta: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  dateLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  watermark: { marginTop: 14, fontSize: 11, fontWeight: '900', letterSpacing: 5, textTransform: 'uppercase' },
  body: { fontSize: 14, lineHeight: 22 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  // metric selector
  metricChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  metricChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  metricChipText: { fontSize: 13, fontWeight: '800' },
  // inputs
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontWeight: '800' },
  primaryBtn: { marginTop: 12, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  secondaryFull: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  // workout logs
  logRow: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 12, alignItems: 'flex-start' },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  logName: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  logMeta: { fontSize: 12, fontWeight: '600' },
  logDate: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  // coach timeline
  timelineRow: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 12, alignItems: 'flex-start' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  // history
  historyCard: { marginTop: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  historyDate: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
})
