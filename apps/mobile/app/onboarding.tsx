import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { generateMobilePlan, MobileProfileInput, saveMobileProfile } from '@/features/onboarding'
import { analyzeInBodyPhoto } from '@/features/measurements'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const initialProfile: MobileProfileInput = {
  name: '', age: '25', gender: 'male', ion_gender: 'male', language: 'en',
  weight_kg: '', height_cm: '',
  goal: 'lose_fat', goal_speed: 'moderate', goal_target: '', goal_date: '',
  work_schedule: 'work', work_hours: '', wake_time: '7:30', sleep_time: '23:00',
  lunch_break: '', stress_level: 'moderate', sleep_quality: 'average',
  currently_training: 'fresh', current_training_desc: '', gym_access: 'gym',
  equipment: '', training_days: '4', session_duration: '60', training_time: 'evening',
  training_style: 'mix', exercises_hated: '', strength_levels: '',
  foods_loved: '', foods_hated: '', dietary_preference: '', allergies: '',
  meals_per_day: '3', cooking_ability: 'cook', food_budget: 'moderate',
  injuries: '', medical_conditions: '', supplements: '',
}

const STRENGTH_LIFTS: Array<[string, string]> = [
  ['squat', 'Squat'], ['bench', 'Bench press'], ['deadlift', 'Deadlift'],
  ['ohp', 'Overhead press'], ['row', 'Barbell row'],
]

const STEPS = ['You', 'Goal', 'Lifestyle', 'Training', 'Nutrition', 'Health'] as const

export default function OnboardingScreen() {
  const { color } = useTheme()
  const { language, isRtl } = useLanguage()
  const [profile, setProfile] = useState<MobileProfileInput>({ ...initialProfile, language })
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scanningInbody, setScanningInbody] = useState(false)
  const [inbodyDone, setInbodyDone] = useState(false)
  const [strength, setStrength] = useState<Record<string, string>>({})

  function update<K extends keyof MobileProfileInput>(key: K, value: MobileProfileInput[K]) {
    setProfile(current => ({ ...current, [key]: value }))
  }

  // ── CSV multi-select helpers ──────────────────────────────
  function toggleCsv(field: keyof MobileProfileInput, value: string) {
    const list = String(profile[field] || '').split(',').filter(Boolean)
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
    update(field, next.join(',') as MobileProfileInput[typeof field])
  }
  function csvHas(field: keyof MobileProfileInput, value: string) {
    return String(profile[field] || '').split(',').filter(Boolean).includes(value)
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!profile.name.trim()) return 'Please enter your name.'
      if (!profile.weight_kg.trim() || !profile.height_cm.trim()) return 'Weight and height are required.'
    }
    if (step === 4 && !profile.foods_loved.trim()) return 'Tell Ion at least a few foods you enjoy.'
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { Alert.alert('SYNAP', err); return }
    if (step < STEPS.length - 1) setStep(step + 1)
    else submit()
  }
  function back() { if (step > 0) setStep(step - 1) }

  async function scanInBody() {
    setScanningInbody(true)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      let asset
      if (perm.granted) {
        const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        if (shot.canceled) { setScanningInbody(false); return }
        asset = shot.assets[0]
      } else {
        const lib = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 })
        if (lib.canceled) { setScanningInbody(false); return }
        asset = lib.assets[0]
      }
      if (!asset?.base64) { Alert.alert('SYNAP', 'Could not read the image.'); return }
      const res = await analyzeInBodyPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      if (res.success) {
        setInbodyDone(true)
        Alert.alert('InBody scan added ✓', 'Ion will use your measured body composition to fine-tune your plan.')
      } else {
        Alert.alert('SYNAP', 'Could not read that scan — you can add it later in Measurements.')
      }
    } catch (e) {
      Alert.alert('InBody', e instanceof Error ? e.message : 'Could not analyze the scan.')
    } finally {
      setScanningInbody(false)
    }
  }

  async function submit() {
    setLoading(true)
    try {
      // Serialize the optional strength inputs into the strength_levels JSON the
      // plan generator expects (e.g. {"squat":"100kg"}).
      const filledStrength = Object.fromEntries(
        Object.entries(strength).filter(([, v]) => String(v).trim()).map(([k, v]) => [k, `${String(v).trim()}kg`]),
      )
      const next: MobileProfileInput = {
        ...profile,
        language,
        strength_levels: Object.keys(filledStrength).length ? JSON.stringify(filledStrength) : '',
      }
      await saveMobileProfile(next)
      await generateMobilePlan(next)
      Alert.alert('SYNAP', 'Your personalised plan is ready.')
      router.replace('/(tabs)')
    } catch (error) {
      Alert.alert('Could not create plan', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const showStrength = profile.gym_access === 'gym' || profile.currently_training === 'already'

  return (
    <Screen>
      <IonPageHeader
        eyebrow={`STEP ${step + 1} OF ${STEPS.length} · ${STEPS[step].toUpperCase()}`}
        title="Build your plan"
        subtitle="The more Ion knows, the more personal your plan."
      />

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressDot, { backgroundColor: i <= step ? color.spark : color.elevated }]} />
        ))}
      </View>

      <Card>
        {/* ── STEP 0: You ── */}
        {step === 0 ? (
          <>
            <Field label="Name" value={profile.name} onChangeText={v => update('name', v)} />
            <View style={styles.row}>
              <Field label="Age" value={profile.age} keyboardType="number-pad" onChangeText={v => update('age', v)} />
              <Field label="Weight (kg)" value={profile.weight_kg} keyboardType="decimal-pad" onChangeText={v => update('weight_kg', v)} />
            </View>
            <Field label="Height (cm)" value={profile.height_cm} keyboardType="decimal-pad" onChangeText={v => update('height_cm', v)} />
            <Segment label="Gender" value={profile.gender} options={[['male', 'Male'], ['female', 'Female']]} onChange={v => update('gender', v as MobileProfileInput['gender'])} />
            <Segment label="Ion avatar" value={profile.ion_gender} options={[['male', 'Male'], ['female', 'Female']]} onChange={v => update('ion_gender', v as MobileProfileInput['ion_gender'])} />
          </>
        ) : null}

        {/* ── STEP 1: Goal ── */}
        {step === 1 ? (
          <>
            <Segment label="Main goal" value={profile.goal} wrap
              options={[['lose_fat', 'Lose fat'], ['build_muscle', 'Build muscle'], ['recomposition', 'Recomp'], ['improve_fitness', 'Fitness'], ['be_healthier', 'Be healthier']]}
              onChange={v => update('goal', v)} />
            <Segment label="How aggressive?" value={profile.goal_speed}
              options={[['slow', 'Slow & steady'], ['moderate', 'Moderate'], ['aggressive', 'Aggressive']]}
              onChange={v => update('goal_speed', v)} />
            <Field label="Specific target (optional)" value={profile.goal_target} onChangeText={v => update('goal_target', v)} placeholder="e.g. reach 80kg, fit into a suit" />
            <Field label="Timeframe (optional)" value={profile.goal_date} onChangeText={v => update('goal_date', v)} placeholder="e.g. 3 months, by summer" />
          </>
        ) : null}

        {/* ── STEP 2: Lifestyle ── */}
        {step === 2 ? (
          <>
            <Segment label="Work / study" value={profile.work_schedule} wrap
              options={[['work', 'Work'], ['study', 'Study'], ['both', 'Both'], ['neither', 'Neither']]}
              onChange={v => update('work_schedule', v)} />
            {profile.work_schedule !== 'neither' ? (
              <Field label="Your hours (optional)" value={profile.work_hours} onChangeText={v => update('work_hours', v)} placeholder="e.g. 9–5, rotating shifts" />
            ) : null}
            <Segment label="Wake up" value={profile.wake_time} wrap
              options={[['5:30', '5–6 AM'], ['6:30', '6–7 AM'], ['7:30', '7–8 AM'], ['8:30', '8–9 AM'], ['9:30', '9 AM+']]}
              onChange={v => update('wake_time', v)} />
            <Segment label="Sleep" value={profile.sleep_time} wrap
              options={[['22:00', 'Before 10 PM'], ['22:30', '10–11 PM'], ['23:30', '11 PM–12'], ['01:00', 'After 12']]}
              onChange={v => update('sleep_time', v)} />
            <Segment label="Stress level" value={profile.stress_level}
              options={[['low', 'Calm'], ['moderate', 'Moderate'], ['high', 'High']]}
              onChange={v => update('stress_level', v)} />
            <Segment label="Sleep quality" value={profile.sleep_quality}
              options={[['solid', 'Sleep well'], ['average', 'Hit or miss'], ['struggling', 'Struggle']]}
              onChange={v => update('sleep_quality', v)} />
          </>
        ) : null}

        {/* ── STEP 3: Training ── */}
        {step === 3 ? (
          <>
            <Segment label="Currently training?" value={profile.currently_training}
              options={[['already', 'Already training'], ['fresh', 'Starting fresh']]}
              onChange={v => update('currently_training', v)} />
            {profile.currently_training === 'already' ? (
              <Field label="Your current routine" value={profile.current_training_desc} onChangeText={v => update('current_training_desc', v)} placeholder="gym, home, sports, cardio…" />
            ) : null}
            <Segment label="Where?" value={profile.gym_access} options={[['gym', 'Gym'], ['home', 'Home']]} onChange={v => update('gym_access', v as MobileProfileInput['gym_access'])} />
            {profile.gym_access === 'home' ? (
              <MultiSelect label="Equipment" field="equipment"
                options={[['bodyweight', 'Bodyweight'], ['bands', 'Bands'], ['dumbbells', 'Dumbbells'], ['pullup_bar', 'Pull-up bar'], ['mixed', 'Mixed']]} />
            ) : (
              <Segment label="Training style" value={profile.training_style} wrap
                options={[['heavy_compound', 'Heavy compound'], ['machines', 'Machines'], ['cables', 'Cables'], ['mix', 'Mix']]}
                onChange={v => update('training_style', v)} />
            )}
            <Segment label="Days / week" value={profile.training_days} wrap
              options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} onChange={v => update('training_days', v)} />
            <Segment label="Session length" value={profile.session_duration} wrap
              options={[['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '90 min']]} onChange={v => update('session_duration', v)} />
            <Segment label="Train when?" value={profile.training_time} wrap
              options={[['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['late_night', 'Late night']]}
              onChange={v => update('training_time', v)} />
            <Field label="Exercises to avoid (optional)" value={profile.exercises_hated} onChangeText={v => update('exercises_hated', v)} placeholder="anything painful or disliked" />
            {showStrength ? (
              <View style={styles.field}>
                <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>Current strength (optional, kg for ~5 reps)</Text>
                {STRENGTH_LIFTS.map(([key, lbl]) => (
                  <View key={key} style={[styles.row, { alignItems: 'center', marginBottom: 8 }]}>
                    <Text style={[styles.strengthLabel, { color: color.text }]}>{lbl}</Text>
                    <TextInput
                      value={strength[key] || ''}
                      onChangeText={v => setStrength(s => ({ ...s, [key]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="kg"
                      placeholderTextColor={color.dim}
                      style={[styles.input, { flex: 1, backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── STEP 4: Nutrition ── */}
        {step === 4 ? (
          <>
            <Field label="Foods you love" value={profile.foods_loved} onChangeText={v => update('foods_loved', v)} placeholder="be specific — these go in your meals" />
            <Field label="Foods to avoid (optional)" value={profile.foods_hated} onChangeText={v => update('foods_hated', v)} />
            <MultiSelect label="Dietary rules" field="dietary_preference"
              options={[['none', 'None'], ['halal', 'Halal'], ['no_pork', 'No pork'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['lactose_free', 'Lactose-free'], ['gluten_free', 'Gluten-free']]} />
            <Field label="Allergies (optional)" value={profile.allergies} onChangeText={v => update('allergies', v)} />
            <Segment label="Meals / day" value={profile.meals_per_day} wrap
              options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} onChange={v => update('meals_per_day', v)} />
            <Segment label="Cooking" value={profile.cooking_ability} wrap
              options={[['cook', 'I cook'], ['quick', 'Quick & simple'], ['eat_out', 'Eat out']]} onChange={v => update('cooking_ability', v)} />
            <Segment label="Food budget" value={profile.food_budget}
              options={[['tight', 'Tight'], ['moderate', 'Moderate'], ['flexible', 'Flexible']]} onChange={v => update('food_budget', v)} />
          </>
        ) : null}

        {/* ── STEP 5: Health ── */}
        {step === 5 ? (
          <>
            <Field label="Injuries / limitations (optional)" value={profile.injuries} onChangeText={v => update('injuries', v)} />
            <Field label="Medical conditions (optional)" value={profile.medical_conditions} onChangeText={v => update('medical_conditions', v)} placeholder="diabetes, blood pressure, etc." />
            <MultiSelect label="Supplements" field="supplements"
              options={[['none', 'None'], ['protein', 'Protein'], ['creatine', 'Creatine'], ['vitamins', 'Vitamins'], ['multiple', 'Multiple']]} />
            <View style={styles.field}>
              <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>InBody scan (optional)</Text>
              <Pressable
                disabled={scanningInbody}
                onPress={scanInBody}
                style={[styles.inbodyBtn, { borderColor: inbodyDone ? color.pulse : color.spark, backgroundColor: color.elevated }]}
              >
                {scanningInbody ? <ActivityIndicator color={color.spark} /> : (
                  <>
                    <Feather name={inbodyDone ? 'check-circle' : 'camera'} size={16} color={inbodyDone ? color.pulse : color.spark} />
                    <Text style={[styles.inbodyText, { color: inbodyDone ? color.pulse : color.spark }]}>
                      {inbodyDone ? 'InBody added — exact body composition' : 'Scan InBody for precise targets'}
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={[styles.hint, { color: color.dim, textAlign: isRtl ? 'right' : 'left' }]}>
                Gives Ion your real muscle/fat for more accurate calories. You can also add it later in Measurements.
              </Text>
            </View>
          </>
        ) : null}
      </Card>

      {/* ── Nav buttons ── */}
      <View style={[styles.navRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        {step > 0 ? (
          <Pressable disabled={loading} onPress={back} style={[styles.backBtn, { borderColor: color.border, backgroundColor: color.elevated }]}>
            <Text style={[styles.backText, { color: color.text }]}>Back</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={loading} onPress={next} style={[styles.nextBtn, { backgroundColor: color.spark }]}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.nextText}>{step === STEPS.length - 1 ? 'Generate my plan' : 'Continue'}</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  )

  // ── Reusable inputs ───────────────────────────────────────
  function Field(props: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'default' | 'number-pad' | 'decimal-pad'; placeholder?: string }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{props.label}</Text>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          keyboardType={props.keyboardType}
          placeholder={props.placeholder}
          placeholderTextColor={color.dim}
          style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
        />
      </View>
    )
  }

  function Segment(props: { label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void; wrap?: boolean }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{props.label}</Text>
        <View style={[styles.segmentRow, props.wrap && { flexWrap: 'wrap' }]}>
          {props.options.map(([value, lbl]) => {
            const active = props.value === value
            return (
              <Pressable key={value} onPress={() => props.onChange(value)}
                style={[styles.segment, { borderColor: active ? color.spark : color.border, backgroundColor: active ? color.sparkSoft : color.elevated }]}>
                <Text style={[styles.segmentText, { color: active ? color.spark : color.text }]}>{lbl}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  function MultiSelect(props: { label: string; field: keyof MobileProfileInput; options: Array<[string, string]> }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{props.label}</Text>
        <View style={[styles.segmentRow, { flexWrap: 'wrap' }]}>
          {props.options.map(([value, lbl]) => {
            const active = csvHas(props.field, value)
            return (
              <Pressable key={value} onPress={() => toggleCsv(props.field, value)}
                style={[styles.segment, { borderColor: active ? color.spark : color.border, backgroundColor: active ? color.sparkSoft : color.elevated }]}>
                <Text style={[styles.segmentText, { color: active ? color.spark : color.text }]}>{lbl}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 12, paddingHorizontal: 4 },
  progressDot: { flex: 1, height: 4, borderRadius: 999 },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  segmentText: { fontWeight: '900', fontSize: 13 },
  strengthLabel: { width: 120, fontSize: 14, fontWeight: '700' },
  inbodyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderWidth: 1, borderRadius: 14 },
  inbodyText: { fontWeight: '900', fontSize: 13 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  navRow: { gap: 10, marginTop: 4 },
  backBtn: { minHeight: 54, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backText: { fontSize: 14, fontWeight: '900' },
  nextBtn: { flex: 1, minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
})
