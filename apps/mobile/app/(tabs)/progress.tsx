import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { analyzeInBodyPhoto, createMeasurement, getMeasurements } from '@/features/measurements'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function numberOrNull(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Inline mini weight-trend chart drawn with Views — no extra native deps. */
function WeightMiniChart({ weights, goal, color }: { weights: number[]; goal?: string; color: any }) {
  if (weights.length < 2) return null
  const W = 280; const H = 56
  const min = Math.min(...weights) - 0.5
  const max = Math.max(...weights) + 0.5
  const range = max - min || 1
  const trendDown = weights[weights.length - 1] < weights[0]
  const goodTrend = (goal === 'lose_fat' && trendDown) || (goal === 'build_muscle' && !trendDown)
  const lineColor = goodTrend ? color.pulse : color.spark

  const points = weights.map((w, i) => ({
    x: (i / (weights.length - 1)) * W,
    y: H - ((w - min) / range) * H,
  }))

  return (
    <View style={{ height: H + 24, marginTop: 14 }}>
      {/* Draw connecting lines between points as thin absolute-positioned views */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1]
          const dx = next.x - pt.x
          const dy = next.y - pt.y
          const length = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pt.x,
                top: pt.y - 1,
                width: length,
                height: 2,
                backgroundColor: lineColor,
                opacity: 0.7,
                transform: [{ rotate: `${angle}deg` }, { translateX: 0 }, { translateY: 0 }],
                transformOrigin: '0 50%',
              }}
            />
          )
        })}
        {/* Dots */}
        {points.map((pt, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: pt.x - 4,
              top: pt.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: lineColor,
              borderWidth: 1.5,
              borderColor: color.bg,
            }}
          />
        ))}
      </View>
      {/* Labels */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: color.dim }}>{weights[0]} kg</Text>
        <Text style={{ fontSize: 11, fontWeight: '900', color: lineColor }}>{weights[weights.length - 1]} kg</Text>
      </View>
    </View>
  )
}

export default function ProgressScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const measurements = useAsyncData(getMeasurements, [])
  const latest = measurements.data?.measurements?.[0]
  const previous = measurements.data?.measurements?.[1]
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const shareCardRef = useRef<View>(null)

  const align = isRtl ? 'right' : 'left'

  async function saveMeasurement() {
    if (!weight.trim() && !waist.trim()) {
      Alert.alert('SYNAP', 'Add weight or waist before saving.')
      return
    }
    setSaving(true)
    try {
      await createMeasurement({
        date: todayKey(),
        weight_kg: numberOrNull(weight),
        waist_cm: numberOrNull(waist),
      })
      setWeight('')
      setWaist('')
      await measurements.reload()
    } catch (error) {
      Alert.alert('Could not save measurement', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  async function analyzeInBody() {
    setAnalyzing(true)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to analyze an InBody photo.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
      if (result.canceled) return

      const asset = result.assets[0]
      if (!asset?.base64) {
        Alert.alert('InBody', 'Could not read the photo. Please try again.')
        return
      }

      const response = await analyzeInBodyPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      const bodyFat = response.data?.body_fat_pct
      Alert.alert('InBody analyzed', bodyFat ? `Body fat detected: ${bodyFat}%` : 'Analysis saved to your profile.')
      await measurements.reload()
    } catch (error) {
      Alert.alert('InBody analysis failed', error instanceof Error ? error.message : 'Try again with a clearer photo.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function shareProgressCard() {
    if (!shareCardRef.current) return
    try {
      const { captureRef } = await import('react-native-view-shot')
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 })
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Progress sharing is not available on this device.')
        return
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Share SYNAP progress',
        mimeType: 'image/png',
        UTI: 'public.png',
      })
    } catch (error) {
      Alert.alert('Could not share progress', error instanceof Error ? error.message : 'Try again in a moment.')
    }
  }

  const weightDelta = latest?.weight_kg && previous?.weight_kg
    ? latest.weight_kg - previous.weight_kg
    : null

  // Build chart data from last 8 measurements (oldest first)
  const chartWeights = (measurements.data?.measurements ?? [])
    .slice(0, 8)
    .map(m => m.weight_kg)
    .filter((w): w is number => w != null)
    .reverse()

  return (
    <Screen>
      <IonPageHeader eyebrow="PROGRESS" title={text.progress} subtitle={isRtl ? 'سجل القياسات ورصد التقدم' : 'Measurement history and trend tracking.'} />

      {measurements.loading ? (
        <ActivityIndicator color={color.spark} />
      ) : measurements.error ? (
        <Card>
          <Text style={[styles.body, { color: color.danger, textAlign: align }]}>{measurements.error}</Text>
        </Card>
      ) : (
        <>
          {/* Latest snapshot card */}
          <View ref={shareCardRef} collapsable={false}>
            <Card accent>
              <Text style={[styles.eyebrow, { color: color.spark }]}>LATEST</Text>
              <Text style={[styles.bigNumber, { color: color.text }]}>
                {latest?.weight_kg ? `${latest.weight_kg} kg` : text.noWeightYet}
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
                {latest?.date ?? (isRtl ? 'سجّل أول قياس للبدء' : 'Log your first measurement to start the trend.')}
              </Text>
              <Text style={[styles.watermark, { color: color.dim }]}>SYNAP</Text>

              {/* Weight trend chart inside the share card */}
              {chartWeights.length >= 2 ? (
                <WeightMiniChart weights={chartWeights} color={color} />
              ) : null}
            </Card>
          </View>

          <Pressable onPress={shareProgressCard} style={[styles.secondaryFull, { borderColor: color.border, backgroundColor: color.elevated, marginTop: 10 }]}>
            <Text style={[styles.secondaryText, { color: color.text }]}>{text.shareProgressCard}</Text>
          </Pressable>

          {/* Quick log */}
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

          {/* History */}
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
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bigNumber: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  delta: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  watermark: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryBtn: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  secondaryFull: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  historyCard: {
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
})
