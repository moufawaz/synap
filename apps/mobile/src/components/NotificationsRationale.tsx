import { useEffect, useState } from 'react'
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Feather from '@expo/vector-icons/Feather'
import { getNotificationPermissionState, syncSynapReminders } from '@/features/notifications'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Smart notification rationale. iOS only lets `requestPermissionsAsync` show
 * the system sheet ONCE, ever. So we never call it cold:
 *   1. If permission is already granted → nothing to do.
 *   2. If we can still ask (first run or never-prompted) → show a warm
 *      explanation, and on "Enable" call request. If denied, the system sheet
 *      is now spent — we fall through to (3) on future launches.
 *   3. If we can NOT ask again (user said No to the system sheet) → the modal
 *      tells the user how to flip it on in iOS Settings and offers a deep link.
 *
 * Mounted from the root layout; runs once per app session, snoozes for a week
 * if dismissed so users don't get nagged. Once granted, the snooze is cleared.
 */

const SNOOZE_KEY = 'synap.notif_rationale_snoozed_until'
const SNOOZE_DAYS = 7

export function NotificationsRationale({ enabled }: { enabled: boolean }) {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [canAskAgain, setCanAskAgain] = useState(true)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    ;(async () => {
      try {
        const perm = await getNotificationPermissionState()
        if (!alive) return
        // Already granted → nothing to do, clear any old snooze.
        if (perm.granted) {
          await AsyncStorage.removeItem(SNOOZE_KEY)
          return
        }
        // Check snooze
        const snoozeRaw = await AsyncStorage.getItem(SNOOZE_KEY)
        if (snoozeRaw && Number(snoozeRaw) > Date.now()) return
        setCanAskAgain(perm.canAskAgain)
        setVisible(true)
      } catch { /* non-fatal */ }
    })()
    return () => { alive = false }
  }, [enabled])

  async function snooze() {
    try { await AsyncStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)) } catch {}
    setVisible(false)
  }

  async function enable() {
    setVisible(false)
    if (canAskAgain) {
      // First time — fire the OS prompt via the sync helper. If user grants,
      // reminders are scheduled immediately and a quick confirmation fires.
      const res = await syncSynapReminders(true)
      if (!res.granted) await snooze()
    } else {
      // OS prompt is spent — open iOS Settings so the user can flip the
      // notifications switch for SYNAP.
      try { await Linking.openSettings() }
      catch {
        Alert.alert(
          isRtl ? 'الإشعارات' : 'Notifications',
          isRtl ? 'فعّلها من: الإعدادات ← الإشعارات ← سناب.' : 'Turn them on in: Settings → Notifications → SYNAP.',
        )
      }
      await snooze()
    }
  }

  const align = isRtl ? 'right' : 'left'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={snooze}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: color.elevated, borderColor: color.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: color.sparkSoft, borderColor: color.spark }]}>
            <Feather name="bell" size={26} color={color.spark} />
          </View>
          <Text style={[styles.title, { color: color.text, textAlign: 'center' }]}>
            {canAskAgain
              ? (isRtl ? 'فعّل تذكيرات آيون' : 'Turn on Ion’s reminders')
              : (isRtl ? 'الإشعارات معطّلة' : 'Notifications are off')}
          </Text>
          <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
            {canAskAgain
              ? (isRtl
                  ? 'يرسل لك آيون تذكيرات قصيرة في وقتها: الماء، وجباتك، تمرينك، ومراجعة اليوم. كلها ضرورية لتطبيق منظمة فعّال.'
                  : "Ion sends short, well-timed nudges: water, meals at their times, training, and an evening check-in. They're the difference between a plan you forget and a plan you follow.")
              : (isRtl
                  ? 'لا يستطيع آيون إرسال التذكيرات بدون إذن الإشعارات. افتح الإعدادات وفعّل الإشعارات لتطبيق سناب.'
                  : "Ion can't send reminders without notification permission. Open Settings and enable notifications for SYNAP.")}
          </Text>
          <Pressable onPress={enable} style={[styles.primary, { backgroundColor: color.spark }]}>
            <Text style={styles.primaryText}>
              {canAskAgain
                ? (isRtl ? 'تفعيل الإشعارات' : 'Enable notifications')
                : (isRtl ? 'افتح الإعدادات' : 'Open Settings')}
            </Text>
          </Pressable>
          <Pressable onPress={snooze} style={styles.dismiss}>
            <Text style={[styles.dismissText, { color: color.muted }]}>
              {isRtl ? 'لاحقاً' : 'Not now'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', gap: 12 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 19, fontWeight: '900' },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  primary: { width: '100%', minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  dismiss: { paddingVertical: 8 },
  dismissText: { fontSize: 13, fontWeight: '700' },
})
