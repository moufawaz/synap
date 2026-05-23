import * as Notifications from 'expo-notifications'

export type ReminderSettings = {
  workoutHour?: number
  mealHour?: number
  hydrationHour?: number
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

const defaultReminders: Reminder[] = [
  {
    id: `${REMINDER_IDS_KEY_PREFIX}workout`,
    title: 'Workout check-in',
    body: "Open today's session and keep your plan moving.",
    hour: 18,
    minute: 0,
    url: '/(tabs)/train',
  },
  {
    id: `${REMINDER_IDS_KEY_PREFIX}meal`,
    title: 'Nutrition check-in',
    body: 'Log your meals while the details are still fresh.',
    hour: 13,
    minute: 0,
    url: '/(tabs)/nutrition',
  },
  {
    id: `${REMINDER_IDS_KEY_PREFIX}hydration`,
    title: 'Hydration nudge',
    body: 'Water target still counts. Add a glass now.',
    hour: 16,
    minute: 0,
    url: '/(tabs)/nutrition',
  },
]

export async function scheduleSynapReminders(settings: ReminderSettings = {}) {
  await cancelSynapReminders()

  const reminders = defaultReminders.map(reminder => ({
    ...reminder,
    hour: reminder.id.endsWith('workout')
      ? settings.workoutHour ?? reminder.hour
      : reminder.id.endsWith('meal')
        ? settings.mealHour ?? reminder.hour
        : settings.hydrationHour ?? reminder.hour,
  }))

  const ids: string[] = []
  for (const reminder of reminders) {
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
