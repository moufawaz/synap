import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

/** Which local reminders the user has enabled. Persisted from the Settings screen. */
export type NotifPrefs = {
  workout_reminder: boolean
  meal_reminder: boolean
  hydration_reminder: boolean
  checkin_reminder: boolean
  weekly_report: boolean
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  workout_reminder: true,
  meal_reminder: true,
  hydration_reminder: true,
  checkin_reminder: true,
  weekly_report: false,
}

export const NOTIF_PREFS_KEY = 'synap_notif_prefs_v1'

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY)
    if (raw) return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) }
  } catch { /* fall through to defaults */ }
  return DEFAULT_NOTIF_PREFS
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs))
  } catch { /* non-fatal */ }
}

export type ReminderSettings = {
  /** Hour (0-23) for workout reminder — falls back to 18 */
  workoutHour?: number
  workoutMinute?: number
  /** Meal times extracted from the user's active diet plan */
  mealTimes?: Array<{ hour: number; minute: number; name: string }>
  hydrationHour?: number
  /** User toggles — when omitted, defaults are loaded from storage */
  prefs?: NotifPrefs
}

type Reminder = {
  id: string
  title: string
  body: string
  hour: number
  minute: number
  url: string
}

const REMINDER_IDS_KEY_PREFIX = 'synap.local.'

/** Parse a time string like "7:30 AM", "13:00", "8am" → { hour, minute } | null */
export function parseMealTime(raw: string | undefined): { hour: number; minute: number } | null {
  if (!raw) return null
  const s = String(raw).trim()
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3]?.toLowerCase()
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0
  if (hour < 0 || hour > 23) return null
  return { hour, minute }
}

/** Build a list of reminders from the user's plan meal times. */
function buildMealReminders(mealTimes: Array<{ hour: number; minute: number; name: string }>): Reminder[] {
  return mealTimes.map((mt, i) => ({
    id: `${REMINDER_IDS_KEY_PREFIX}meal_${i}`,
    title: `🥗 ${mt.name || 'Meal'} time`,
    body: 'Log your meal while the details are still fresh.',
    hour: mt.hour,
    minute: mt.minute,
    url: '/(tabs)/nutrition',
  }))
}

export async function scheduleSynapReminders(settings: ReminderSettings = {}) {
  await cancelSynapReminders()

  const prefs = settings.prefs ?? (await loadNotifPrefs())
  const toSchedule: Reminder[] = []

  // Workout reminder
  if (prefs.workout_reminder) {
    toSchedule.push({
      id: `${REMINDER_IDS_KEY_PREFIX}workout`,
      title: '💪 Workout check-in',
      body: "Open today's session and keep your plan moving.",
      hour: settings.workoutHour ?? 18,
      minute: settings.workoutMinute ?? 0,
      url: '/(tabs)/train',
    })
  }

  // Meal reminders — use plan times if provided, else one generic reminder at 1 PM
  if (prefs.meal_reminder) {
    if (settings.mealTimes && settings.mealTimes.length > 0) {
      toSchedule.push(...buildMealReminders(settings.mealTimes))
    } else {
      toSchedule.push({
        id: `${REMINDER_IDS_KEY_PREFIX}meal`,
        title: '🥗 Nutrition check-in',
        body: 'Log your meals while the details are still fresh.',
        hour: 13,
        minute: 0,
        url: '/(tabs)/nutrition',
      })
    }
  }

  // Hydration reminder
  if (prefs.hydration_reminder) {
    toSchedule.push({
      id: `${REMINDER_IDS_KEY_PREFIX}hydration`,
      title: '💧 Hydration nudge',
      body: 'Water target still counts. Add a glass now.',
      hour: settings.hydrationHour ?? 16,
      minute: 0,
      url: '/(tabs)/nutrition',
    })
  }

  const ids: string[] = []
  for (const reminder of toSchedule) {
    try {
      const scheduledId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { url: reminder.url, reminderId: reminder.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
        },
      })
      ids.push(scheduledId)
    } catch { /* skip invalid times */ }
  }
  return ids
}

export async function cancelSynapReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter(item => String(item.content.data?.reminderId || '').startsWith(REMINDER_IDS_KEY_PREFIX))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  )
}

export async function getSynapScheduledReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return scheduled.filter(item => String(item.content.data?.reminderId || '').startsWith(REMINDER_IDS_KEY_PREFIX))
}
