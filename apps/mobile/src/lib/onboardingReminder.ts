import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

/**
 * Local "finish your onboarding" reminder.
 *
 * Complements the server-side cron (email + Ion chat message at 24h and 7d)
 * with an actual device notification — the thing most likely to bring someone
 * back. Scheduled once, 24h after we first see a signed-in user without a
 * plan; cancelled the moment a plan exists (dashboard) or onboarding
 * completes.
 *
 * Permission-gated but never permission-PROMPTING: if the user hasn't granted
 * notifications yet we simply skip — the NotificationsRationale flow owns the
 * permission ask, and a reminder is not worth interrupting for.
 */

const SCHEDULED_KEY = 'synap.onboardingReminder.scheduledId'

export async function scheduleOnboardingReminder(language: 'en' | 'ar') {
  try {
    // Already scheduled → nothing to do (survives app restarts).
    const existing = await AsyncStorage.getItem(SCHEDULED_KEY)
    if (existing) return

    const perm = await Notifications.getPermissionsAsync()
    if (perm.status !== 'granted') return

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'ar' ? 'خطتك في انتظارك 💪' : 'Your plan is waiting 💪',
        body: language === 'ar'
          ? 'أكمل الإعداد — 3 دقائق ويبني آيون خطة تمرين وتغذية مخصصة لك.'
          : 'Finish setup — 3 minutes and Ion builds your custom training + nutrition plan.',
        data: { url: '/onboarding' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 60 * 60, // 24h from first no-plan sighting
      },
    })
    await AsyncStorage.setItem(SCHEDULED_KEY, id)
  } catch { /* reminders are best-effort — never surface an error for one */ }
}

export async function cancelOnboardingReminder() {
  try {
    const id = await AsyncStorage.getItem(SCHEDULED_KEY)
    if (!id) return
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    await AsyncStorage.removeItem(SCHEDULED_KEY)
  } catch { /* ignore */ }
}
