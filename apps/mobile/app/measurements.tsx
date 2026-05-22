import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { analyzeInBodyPhoto, createMeasurement, getMeasurements } from '@/features/measurements'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

const fields = [
  ['weight_kg', 'Weight kg'], ['body_fat_pct', 'Body fat %'], ['muscle_mass_kg', 'Muscle kg'],
  ['neck_cm', 'Neck'], ['shoulders_cm', 'Shoulders'], ['chest_cm', 'Chest'], ['waist_cm', 'Waist'], ['hips_cm', 'Hips'],
  ['bicep_left_cm', 'Left bicep'], ['bicep_right_cm', 'Right bicep'], ['forearm_left_cm', 'Left forearm'], ['forearm_right_cm', 'Right forearm'],
  ['thigh_left_cm', 'Left thigh'], ['thigh_right_cm', 'Right thigh'], ['calf_left_cm', 'Left calf'], ['calf_right_cm', 'Right calf'],
  ['wrist_cm', 'Wrist'], ['ankle_cm', 'Ankle'],
] as const

function num(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export default function MeasurementsScreen() {
  const { color } = useTheme()
  const data = useAsyncData(getMeasurements, [])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const latest = data.data?.measurements?.[0]
  const symmetry = useMemo(() => {
    if (!latest) return []
    return [
      ['Biceps', latest.bicep_left_cm, latest.bicep_right_cm],
      ['Forearms', latest.forearm_left_cm, latest.forearm_right_cm],
      ['Thighs', latest.thigh_left_cm, latest.thigh_right_cm],
      ['Calves', latest.calf_left_cm, latest.calf_right_cm],
    ].filter(([, l, r]) => typeof l === 'number' && typeof r === 'number')
  }, [latest])

  async function save() {
    const payload: Record<string, unknown> = { date: new Date().toISOString().slice(0, 10) }
    fields.forEach(([key]) => {
      const parsed = num(values[key] || '')
      if (parsed !== undefined) payload[key] = parsed
    })
    if (Object.keys(payload).length < 2) return Alert.alert('Measurements', 'Add at least one value.')
    setSaving(true)
    try {
      await createMeasurement(payload as any)
      setValues({})
      await data.reload()
    } catch (error) {
      Alert.alert('Measurements', error instanceof Error ? error.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function inbody() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return Alert.alert('Camera permission needed', 'Allow camera access to analyze InBody.')
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled || !result.assets[0]?.base64) return
    try {
      const res = await analyzeInBodyPhoto(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg')
      Alert.alert('InBody analyzed', JSON.stringify(res.data, null, 2).slice(0, 900))
      await data.reload()
    } catch (error) {
      Alert.alert('InBody', error instanceof Error ? error.message : 'Could not analyze.')
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="BODY TRACKING" title="Measurements" subtitle="Full body fields, symmetry, history, and InBody upload." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Log body measurements</Text>
        <View style={styles.grid}>
          {fields.map(([key, label]) => (
            <TextInput key={key} value={values[key] || ''} onChangeText={v => setValues(prev => ({ ...prev, [key]: v }))} placeholder={label} placeholderTextColor={color.dim} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text }]} />
          ))}
        </View>
        <Pressable disabled={saving} onPress={save} style={[styles.primary, { backgroundColor: color.spark }]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save measurements</Text>}</Pressable>
        <Pressable onPress={inbody} style={[styles.secondary, { borderColor: color.spark }]}><Text style={[styles.secondaryText, { color: color.spark }]}>Analyze InBody photo</Text></Pressable>
      </Card>
      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: color.text }]}>Symmetry</Text>
        {symmetry.length ? symmetry.map(([name, l, r]) => {
          const gap = Math.abs(Number(l) - Number(r))
          return <Text key={String(name)} style={[styles.body, { color: gap > 1 ? color.flame : color.pulse }]}>{name}: {gap.toFixed(1)} cm gap</Text>
        }) : <Text style={[styles.body, { color: color.muted }]}>Add left/right measurements to see balance.</Text>}
      </Card>
      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: color.text }]}>History</Text>
        {data.loading ? <ActivityIndicator color={color.spark} /> : null}
        {(data.data?.measurements || []).map(item => <Text key={item.id} style={[styles.body, { color: color.text }]}>{item.date}: {item.weight_kg ?? '-'} kg, waist {item.waist_cm ?? '-'} cm</Text>)}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, fontWeight: '700' },
  grid: { gap: 10 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontWeight: '800' },
  primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { fontWeight: '900' },
  cardGap: { marginTop: 14 },
})
