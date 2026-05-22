import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { generateMobilePlan, MobileProfileInput, saveMobileProfile } from '@/features/onboarding'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const initialProfile: MobileProfileInput = {
  name: '',
  age: '25',
  gender: 'male',
  weight_kg: '',
  height_cm: '',
  goal: 'lose_fat',
  currently_training: 'already',
  gym_access: 'gym',
  training_days: '4',
  session_duration: '60',
  meals_per_day: '3',
  foods_loved: '',
  foods_hated: '',
  injuries: '',
  language: 'en',
}

export default function OnboardingScreen() {
  const { color } = useTheme()
  const { language, isRtl } = useLanguage()
  const [profile, setProfile] = useState<MobileProfileInput>({ ...initialProfile, language })
  const [loading, setLoading] = useState(false)

  function update<K extends keyof MobileProfileInput>(key: K, value: MobileProfileInput[K]) {
    setProfile(current => ({ ...current, [key]: value }))
  }

  async function submit() {
    if (!profile.name.trim() || !profile.weight_kg.trim() || !profile.height_cm.trim()) {
      Alert.alert('SYNAP', 'Name, weight, and height are required.')
      return
    }

    setLoading(true)
    try {
      const next = { ...profile, language }
      await saveMobileProfile(next)
      await generateMobilePlan(next)
      Alert.alert('SYNAP', 'Your plan is ready.')
      router.replace('/(tabs)')
    } catch (error) {
      Alert.alert('Could not create plan', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="ONBOARDING" title="Build your plan" subtitle="A compact native intake for App Review and real mobile users." />
      <Card>
        <Field label="Name" value={profile.name} onChangeText={value => update('name', value)} />
        <View style={styles.row}>
          <Field label="Age" value={profile.age} keyboardType="number-pad" onChangeText={value => update('age', value)} />
          <Field label="Weight kg" value={profile.weight_kg} keyboardType="decimal-pad" onChangeText={value => update('weight_kg', value)} />
        </View>
        <Field label="Height cm" value={profile.height_cm} keyboardType="decimal-pad" onChangeText={value => update('height_cm', value)} />

        <Segment
          label="Goal"
          value={profile.goal}
          options={[['lose_fat', 'Lose fat'], ['build_muscle', 'Build muscle'], ['recomposition', 'Recomp']]}
          onChange={value => update('goal', value)}
        />
        <Segment
          label="Training place"
          value={profile.gym_access}
          options={[['gym', 'Gym'], ['home', 'Home']]}
          onChange={value => update('gym_access', value as MobileProfileInput['gym_access'])}
        />

        <View style={styles.row}>
          <Field label="Days/week" value={profile.training_days} keyboardType="number-pad" onChangeText={value => update('training_days', value)} />
          <Field label="Minutes" value={profile.session_duration} keyboardType="number-pad" onChangeText={value => update('session_duration', value)} />
        </View>
        <Field label="Foods you like" value={profile.foods_loved} onChangeText={value => update('foods_loved', value)} />
        <Field label="Foods to avoid" value={profile.foods_hated} onChangeText={value => update('foods_hated', value)} />
        <Field label="Injuries or limits" value={profile.injuries} onChangeText={value => update('injuries', value)} />

        <Pressable disabled={loading} onPress={submit} style={[styles.button, { backgroundColor: color.spark }]}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save and generate plan</Text>}
        </Pressable>
      </Card>
    </Screen>
  )

  function Field(props: {
    label: string
    value: string
    onChangeText: (value: string) => void
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad'
  }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{props.label}</Text>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          keyboardType={props.keyboardType}
          placeholderTextColor={color.dim}
          style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
        />
      </View>
    )
  }

  function Segment(props: {
    label: string
    value: string
    options: Array<[string, string]>
    onChange: (value: string) => void
  }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{props.label}</Text>
        <View style={styles.segmentRow}>
          {props.options.map(([value, label]) => {
            const active = props.value === value
            return (
              <Pressable
                key={value}
                onPress={() => props.onChange(value)}
                style={[styles.segment, { borderColor: active ? color.spark : color.border, backgroundColor: active ? color.sparkSoft : color.elevated }]}
              >
                <Text style={[styles.segmentText, { color: active ? color.spark : color.text }]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  segment: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentText: {
    fontWeight: '900',
  },
  button: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
