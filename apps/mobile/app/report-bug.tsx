import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { BackButton } from '@/components/BackButton'
import { submitBugReport } from '@/features/support'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function ReportBugScreen() {
  const { color } = useTheme()
  const { isRtl, language } = useLanguage()
  const align = isRtl ? 'right' : 'left'
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<{ uri: string; base64: string; mime: string } | null>(null)
  const [sending, setSending] = useState(false)

  async function pickScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(isRtl ? 'مطلوب إذن الصور' : 'Photos permission needed', isRtl ? 'اسمح بالوصول للصور لإرفاق لقطة شاشة.' : 'Allow photo access to attach a screenshot.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 })
    const asset = result.canceled ? null : result.assets[0]
    if (asset?.base64) setScreenshot({ uri: asset.uri, base64: asset.base64, mime: asset.mimeType || 'image/jpeg' })
  }

  async function send() {
    const text = message.trim()
    if (text.length < 5) {
      Alert.alert(isRtl ? 'صف المشكلة' : 'Describe the problem', isRtl ? 'اكتب بضع كلمات عمّا حدث.' : 'Write a few words about what happened.')
      return
    }
    if (sending) return
    setSending(true)
    try {
      await submitBugReport({
        message: text,
        screenshotBase64: screenshot?.base64,
        screenshotMime: screenshot?.mime,
        language,
      })
      Alert.alert(
        isRtl ? 'شكراً لك ✓' : 'Thank you ✓',
        isRtl ? 'وصلنا البلاغ وسنعمل على إصلاحه.' : "We got your report and we'll look into it.",
        [{ text: isRtl ? 'حسناً' : 'OK', onPress: () => router.back() }],
      )
    } catch (error) {
      Alert.alert(isRtl ? 'تعذّر الإرسال' : 'Could not send', error instanceof Error ? error.message : (isRtl ? 'حاول مرة أخرى.' : 'Try again.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen>
      <BackButton />
      <PageHeader
        eyebrow={isRtl ? 'الدعم' : 'SUPPORT'}
        title={isRtl ? 'الإبلاغ عن مشكلة' : 'Report a problem'}
        subtitle={isRtl ? 'أخبرنا بما حدث وما كنت تحاول فعله.' : 'Tell us what happened and what you were trying to do.'}
      />
      <Card>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={isRtl ? 'مثال: عند حفظ التمرين ظهرت رسالة خطأ…' : 'e.g. When I save my workout I get an error…'}
          placeholderTextColor={color.dim}
          multiline
          maxLength={4000}
          textAlignVertical="top"
          style={[styles.input, { color: color.text, backgroundColor: color.elevated, borderColor: color.border, textAlign: align }]}
        />

        {screenshot ? (
          <View style={[styles.shotRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Image source={{ uri: screenshot.uri }} style={styles.shot} />
            <Pressable onPress={() => setScreenshot(null)} hitSlop={10}>
              <Text style={[styles.link, { color: color.flame }]}>{isRtl ? 'إزالة' : 'Remove'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickScreenshot} style={[styles.secondary, { borderColor: color.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Feather name="image" size={16} color={color.text} />
            <Text style={[styles.secondaryText, { color: color.text }]}>{isRtl ? 'إرفاق لقطة شاشة (اختياري)' : 'Attach a screenshot (optional)'}</Text>
          </Pressable>
        )}

        <Pressable onPress={send} disabled={sending} style={[styles.primary, { backgroundColor: color.spark, opacity: sending ? 0.7 : 1 }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRtl ? 'إرسال البلاغ' : 'Send report'}</Text>}
        </Pressable>

        <Text style={[styles.note, { color: color.muted, textAlign: align }]}>
          {isRtl
            ? 'نرسل مع البلاغ إصدار التطبيق ونوع جهازك لمساعدتنا في إصلاح المشكلة.'
            : 'Your app version and device model are included to help us fix it.'}
        </Text>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: { minHeight: 150, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, fontWeight: '700' },
  secondary: { minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  secondaryText: { fontWeight: '800' },
  shotRow: { alignItems: 'center', gap: 12, marginTop: 12 },
  shot: { width: 64, height: 110, borderRadius: 10 },
  link: { fontWeight: '900' },
  primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '900' },
  note: { fontSize: 12, fontWeight: '600', marginTop: 10, lineHeight: 18 },
})
