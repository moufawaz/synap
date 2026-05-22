import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
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

  return (
    <Screen>
      <PageHeader eyebrow="PROGRESS" title={text.progress} subtitle="Measurement history synced through Supabase." />

      {measurements.loading ? (
        <ActivityIndicator color={color.spark} />
      ) : measurements.error ? (
        <Card>
          <Text style={[styles.body, { color: color.danger, textAlign: isRtl ? 'right' : 'left' }]}>{measurements.error}</Text>
        </Card>
      ) : (
        <>
          <View ref={shareCardRef} collapsable={false}>
            <Card>
              <Text style={[styles.label, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>Latest</Text>
              <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
                {latest?.weight_kg ? `${latest.weight_kg} kg` : text.noWeightYet}
              </Text>
              <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {latest?.date ?? 'Log your first measurement to start the trend.'}
              </Text>
              {weightDelta !== null ? (
                <Text style={[styles.delta, { color: weightDelta <= 0 ? color.pulse : color.flame, textAlign: isRtl ? 'right' : 'left' }]}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg from previous
                </Text>
              ) : null}
              <Text style={[styles.watermark, { color: color.dim, textAlign: isRtl ? 'right' : 'left' }]}>SYNAP</Text>
            </Card>
          </View>

          <Pressable onPress={shareProgressCard} style={[styles.secondaryFull, { borderColor: color.border, backgroundColor: color.elevated }]}>
            <Text style={[styles.secondaryText, { color: color.text }]}>{text.shareProgressCard}</Text>
          </Pressable>

          <Card>
            <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.quickLog}</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Weight kg"
                placeholderTextColor={color.dim}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
                style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text }]}
              />
              <TextInput
                placeholder="Waist cm"
                placeholderTextColor={color.dim}
                keyboardType="decimal-pad"
                value={waist}
                onChangeText={setWaist}
                style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text }]}
              />
            </View>
            <Pressable disabled={saving} onPress={saveMeasurement} style={[styles.button, { backgroundColor: color.spark }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{text.saveMeasurement}</Text>}
            </Pressable>
            <Pressable disabled={analyzing} onPress={analyzeInBody} style={[styles.secondaryFull, { borderColor: color.spark, backgroundColor: color.elevated }]}>
              {analyzing ? <ActivityIndicator color={color.spark} /> : <Text style={[styles.secondaryText, { color: color.spark }]}>{text.analyzeInBody}</Text>}
            </Pressable>
          </Card>

          {(measurements.data?.measurements ?? []).slice(0, 8).map(item => (
            <Card key={item.id} style={styles.historyCard}>
              <Text style={[styles.body, { color: color.text, fontWeight: '900', textAlign: isRtl ? 'right' : 'left' }]}>
                {item.date}
              </Text>
              <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
                {item.weight_kg ? `${item.weight_kg} kg` : text.noWeightYet} {item.waist_cm ? `- ${item.waist_cm} cm waist` : ''}
              </Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  delta: {
    marginTop: 12,
    fontWeight: '900',
  },
  watermark: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
  row: {
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
  button: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryFull: {
    marginTop: 10,
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
    marginTop: 10,
  },
})
