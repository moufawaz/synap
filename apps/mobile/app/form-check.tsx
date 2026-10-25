import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { BackButton } from '@/components/BackButton'
import { checkExerciseForm } from '@/features/tools'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function FormCheckScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'
  const [exercise, setExercise] = useState('Squat')
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function analyze() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return Alert.alert(isRtl ? 'مطلوب إذن الكاميرا' : 'Camera permission needed', isRtl ? 'اسمح للكاميرا لفحص أداء التمرين.' : 'Allow camera access to check form.')
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled || !result.assets[0]?.base64) return
    setLoading(true)
    try {
      const res = await checkExerciseForm({ exercise, image: result.assets[0].base64, mimeType: result.assets[0].mimeType || 'image/jpeg' })
      setFeedback(res.feedback)
    } catch (error) {
      Alert.alert(isRtl ? 'فحص الأداء' : 'Form check', error instanceof Error ? error.message : (isRtl ? 'تعذّر فحص الأداء.' : 'Could not check form.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <BackButton />
      <PageHeader
        eyebrow={isRtl ? 'فحص الأداء بالذكاء الاصطناعي' : 'AI FORM CHECK'}
        title={isRtl ? 'فحص الأداء' : 'Form Check'}
        subtitle={isRtl ? 'التقط صورة واضحة واحدة أثناء المجموعة.' : 'Upload one clear frame or photo from a set.'}
      />
      <Card>
        <TextInput value={exercise} onChangeText={setExercise} placeholder={isRtl ? 'التمرين' : 'Exercise'} placeholderTextColor={color.dim} style={[styles.input, { color: color.text, backgroundColor: color.elevated, borderColor: color.border, textAlign: align }]} />
        <Pressable onPress={analyze} disabled={loading} style={[styles.primary, { backgroundColor: color.spark }]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRtl ? 'حلّل الأداء' : 'Analyze form'}</Text>}</Pressable>
      </Card>
      {feedback ? <Card style={styles.cardGap}><Text style={[styles.title, { color: color.text, textAlign: align }]}>{isRtl ? 'التقييم' : 'Score'} {feedback.score}/10</Text><Text style={[styles.body, { color: color.text, textAlign: align }]}>{feedback.summary}</Text>{(feedback.fixes || []).map((fix: string, i: number) => <Text key={i} style={[styles.body, { color: color.text, textAlign: align }]}>• {fix}</Text>)}<Text style={[styles.body, { color: color.flame, textAlign: align }]}>{feedback.safety}</Text><Text style={[styles.body, { color: color.spark, textAlign: align }]}>{feedback.next_set_cue}</Text></Card> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({ input: { minHeight: 54, borderWidth: 1, borderRadius: 14, padding: 14, fontWeight: '800' }, primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, primaryText: { color: '#fff', fontWeight: '900' }, cardGap: { marginTop: 14 }, title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 23, fontWeight: '700' } })
