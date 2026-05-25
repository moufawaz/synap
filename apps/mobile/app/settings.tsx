import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Card } from '@/components/Card'
import { IonAvatar } from '@/components/IonAvatar'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getProfile, saveProfile } from '@/features/profile'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const fields = [
  ['name', 'Name', 'default'],
  ['age', 'Age', 'number-pad'],
  ['weight_kg', 'Weight kg', 'decimal-pad'],
  ['height_cm', 'Height cm', 'decimal-pad'],
  ['goal', 'Goal', 'default'],
  ['training_days', 'Training days/week', 'number-pad'],
  ['session_duration', 'Session duration min', 'number-pad'],
  ['training_time', 'Training time', 'default'],
  ['injuries', 'Injuries', 'default'],
  ['medical_conditions', 'Medical conditions', 'default'],
  ['foods_loved', 'Foods loved', 'default'],
  ['foods_hated', 'Foods hated', 'default'],
  ['allergies', 'Allergies', 'default'],
  ['meals_per_day', 'Meals/day', 'number-pad'],
] as const

export default function SettingsScreen() {
  const { color } = useTheme()
  const { language, setLanguage, isRtl } = useLanguage()
  const profile = useAsyncData(getProfile, [])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile.data?.profile) return
    const next: Record<string, string> = {}
    fields.forEach(([key]) => {
      const value = profile.data?.profile?.[key]
      next[key] = value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value)
    })
    next.ion_gender = profile.data.profile.ion_gender || 'male'
    setValues(next)
  }, [profile.data])

  function update(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      await saveProfile({
        ...values,
        language,
        gym_access: profile.data?.profile?.gym_access ? 'gym' : 'home',
        currently_training: profile.data?.profile?.training_experience === 'beginner' ? 'new' : 'already',
        ion_gender: values.ion_gender || profile.data?.profile?.ion_gender || 'male',
      })
      await profile.reload()
      Alert.alert('Settings', 'Profile saved.')
    } catch (error) {
      Alert.alert('Settings', error instanceof Error ? error.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <IonPageHeader eyebrow="SETTINGS" title="Profile Settings" subtitle="Keep Ion's coaching data accurate across web and iOS." />
      {profile.loading ? <ActivityIndicator color={color.spark} /> : null}
      {profile.error ? <Text style={[styles.body, { color: color.danger }]}>{profile.error}</Text> : null}

      <Card>
        <Text style={[styles.title, { color: color.text }]}>Language</Text>
        <View style={styles.row}>
          {(['en', 'ar'] as const).map(item => (
            <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.choice, { borderColor: language === item ? color.spark : color.border, backgroundColor: language === item ? color.sparkSoft : color.elevated }]}>
              <Text style={[styles.choiceText, { color: language === item ? color.spark : color.text }]}>{item === 'ar' ? 'العربية' : 'English'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: color.text }]}>Ion avatar</Text>
        <View style={[styles.avatarRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <IonAvatar size="md" />
          <View style={styles.avatarText}>
            <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              Choose how Ion appears across coaching surfaces.
            </Text>
            <View style={[styles.row, { marginTop: 10 }]}>
              {(['male', 'female'] as const).map(item => (
                <Pressable key={item} onPress={() => update('ion_gender', item)} style={[styles.choice, { borderColor: values.ion_gender === item ? color.spark : color.border, backgroundColor: values.ion_gender === item ? color.sparkSoft : color.elevated }]}>
                  <Text style={[styles.choiceText, { color: values.ion_gender === item ? color.spark : color.text }]}>{item === 'male' ? 'Male' : 'Female'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: color.text }]}>Profile</Text>
        {fields.map(([key, label, keyboardType]) => (
          <TextInput
            key={key}
            value={values[key] || ''}
            onChangeText={value => update(key, value)}
            placeholder={label}
            placeholderTextColor={color.dim}
            keyboardType={keyboardType}
            style={[styles.input, { color: color.text, borderColor: color.border, backgroundColor: color.elevated }]}
          />
        ))}
        <Pressable disabled={saving} onPress={save} style={[styles.primary, { backgroundColor: color.spark }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save profile</Text>}
        </Pressable>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  cardGap: { marginTop: 14 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  avatarRow: { alignItems: 'center', gap: 12 },
  avatarText: { flex: 1 },
  choice: { flex: 1, borderWidth: 1, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontWeight: '900' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, fontWeight: '800' },
  primary: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
})
