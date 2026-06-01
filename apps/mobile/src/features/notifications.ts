import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { getProfile } from '@/features/profile'
import { getPlanHistory } from '@/features/workout'

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

const REMINDER_PREFIX = 'synap.local.'

// ── Time parsing ──────────────────────────────────────────────────────────────

type HM = { hour: number; minute: number }

/** Parse "7:30 AM", "13:00", "8am", "7:30", "23:00" → { hour, minute } | null */
export function parseClock(raw: string | undefined | null): HM | null {
  if (raw == null) return null
  const s = String(raw).trim()
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) return null
  let hour = parseInt(m[1], 10)
  const minute = m[2] ? parseInt(m[2], 10) : 0
  const ap = m[3]?.toLowerCase()
  if (ap === 'pm' && hour < 12) hour += 12
  if (ap === 'am' && hour === 12) hour = 0
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}
// Back-compat alias
export const parseMealTime = parseClock

const toMin = (t: HM) => t.hour * 60 + t.minute
const fromMin = (n: number): HM => {
  const x = ((n % 1440) + 1440) % 1440
  return { hour: Math.floor(x / 60), minute: x % 60 }
}

/** training_time keyword → clock time */
const TRAINING_TIME_MAP: Record<string, HM> = {
  morning: { hour: 7, minute: 30 },
  afternoon: { hour: 14, minute: 0 },
  evening: { hour: 18, minute: 0 },
  late_night: { hour: 21, minute: 0 },
}

/** Canonical weekday name → expo weekday number (1 = Sunday … 7 = Saturday) */
const WEEKDAY_NUM: Record<string, number> = {
  sunday: 1, monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6, saturday: 7,
}
function weekdayNumberFromName(name: string): number | null {
  const n = String(name || '').toLowerCase()
  for (const key of Object.keys(WEEKDAY_NUM)) if (n.includes(key)) return WEEKDAY_NUM[key]
  return null
}

// ── Reminder shapes ───────────────────────────────────────────────────────────

type DailyReminder = { id: string; title: string; body: string; at: HM; url: string }
type WeeklyReminder = DailyReminder & { weekday: number }

export type ReminderData = {
  prefs: NotifPrefs
  lang: 'en' | 'ar'
  name?: string
  wake: HM
  sleep: HM
  training: HM
  trainingWeekdays: number[]
  trainingFocusByWeekday: Record<number, string>
  meals: Array<{ at: HM; name: string; calories?: number }>
  calorieTarget?: number
  waterLiters?: number
  hydrationCount: number
}

// ── Build the schedule ────────────────────────────────────────────────────────

function buildHydration(data: ReminderData): DailyReminder[] {
  const ar = data.lang === 'ar'
  const count = Math.max(5, data.hydrationCount || 6)
  const start = toMin(data.wake) + 45            // ~45 min after waking
  const end = toMin(data.sleep) - 60             // stop ~1h before sleep
  if (end <= start) return []
  const step = (end - start) / (count - 1)
  const waterMl = data.waterLiters ? Math.round((data.waterLiters * 1000) / count / 50) * 50 : null
  const out: DailyReminder[] = []
  for (let i = 0; i < count; i++) {
    const at = fromMin(Math.round(start + step * i))
    out.push({
      id: `${REMINDER_PREFIX}water_${i}`,
      title: ar ? '💧 ترطيب' : '💧 Hydration',
      body: ar
        ? (waterMl ? `اشرب ~${waterMl} مل الآن — اضغط للتسجيل.` : 'حان وقت شرب الماء — اضغط لتسجيل كوب.')
        : (waterMl ? `Drink ~${waterMl} ml now — tap to log it.` : 'Time to drink water — tap to log a glass.'),
      at,
      url: '/(tabs)/nutrition',
    })
  }
  return out
}

function buildMeals(data: ReminderData): DailyReminder[] {
  const ar = data.lang === 'ar'
  return data.meals.map((mt, i) => {
    const name = mt.name || (ar ? 'وجبة' : 'Meal')
    return {
      id: `${REMINDER_PREFIX}meal_${i}`,
      title: ar ? `🍽️ وقت ${name}` : `🍽️ ${name} time`,
      body: ar
        ? (mt.calories ? `${name} — ~${mt.calories} سعرة. اضغط لتسجيلها الآن.` : `حان وقت ${name}. اضغط لتسجيلها.`)
        : (mt.calories ? `${name} — ~${mt.calories} kcal. Tap to log it while it's fresh.` : `Time for your ${name}. Tap to log it.`),
      at: mt.at,
      url: '/(tabs)/nutrition',
    }
  })
}

function buildTraining(data: ReminderData): WeeklyReminder[] {
  const ar = data.lang === 'ar'
  const out: WeeklyReminder[] = []
  for (const wd of data.trainingWeekdays) {
    const focus = data.trainingFocusByWeekday[wd]
    // Pre-workout (~75 min before)
    out.push({
      id: `${REMINDER_PREFIX}pre_${wd}`, weekday: wd,
      title: ar ? '⚡ وجبة ما قبل التمرين' : '⚡ Pre-workout fuel',
      body: ar
        ? 'تناول وجبة ما قبل التمرين — كربوهيدرات وبروتين معتدل، قبل ~60–90 دقيقة من التمرين.'
        : 'Eat your pre-workout meal — carbs + moderate protein, ~60–90 min before training.',
      at: fromMin(toMin(data.training) - 75),
      url: '/(tabs)/nutrition',
    })
    // Workout
    out.push({
      id: `${REMINDER_PREFIX}workout_${wd}`, weekday: wd,
      title: focus ? `💪 ${focus}` : (ar ? '💪 وقت التمرين' : '💪 Training time'),
      body: ar ? 'حان وقت التمرين. افتح جلسة اليوم ولنبدأ.' : "It's training time. Open today's session and let's move.",
      at: data.training,
      url: '/(tabs)/train',
    })
    // Post-workout (~75 min after)
    out.push({
      id: `${REMINDER_PREFIX}post_${wd}`, weekday: wd,
      title: ar ? '🥤 تعافي ما بعد التمرين' : '🥤 Post-workout recovery',
      body: ar
        ? 'بروتين وكربوهيدرات خلال 45 دقيقة للتعافي والنمو. اضغط للتسجيل.'
        : 'Protein + carbs within 45 min to recover and grow. Tap to log it.',
      at: fromMin(toMin(data.training) + 75),
      url: '/(tabs)/nutrition',
    })
  }
  return out
}

function buildCheckins(data: ReminderData): DailyReminder[] {
  const ar = data.lang === 'ar'
  const out: DailyReminder[] = []
  // Morning brief
  out.push({
    id: `${REMINDER_PREFIX}morning`,
    title: ar ? `☀️ صباح الخير${data.name ? `، ${data.name}` : ''}` : `☀️ Good morning${data.name ? `, ${data.name}` : ''}`,
    body: ar
      ? (data.calorieTarget
          ? `اليوم: ~${data.calorieTarget} سعرة${data.waterLiters ? ` · ${data.waterLiters} لتر ماء` : ''}. لنجعله يوماً مثمراً.`
          : 'لنجعل اليوم مثمراً — تغذّى، اشرب الماء، وراجع خطتك.')
      : (data.calorieTarget
          ? `Today: ~${data.calorieTarget} kcal${data.waterLiters ? ` · ${data.waterLiters}L water` : ''}. Let's make it count.`
          : "Let's make today count — fuel up, hydrate, and check your plan."),
    at: data.wake,
    url: '/(tabs)',
  })
  // Evening check-in (~90 min before sleep)
  out.push({
    id: `${REMINDER_PREFIX}evening`,
    title: ar ? '🌙 مراجعة المساء' : '🌙 Evening check-in',
    body: ar
      ? 'سجّل ما فاتك اليوم — وجبات، ماء، تمرينك. آيون يتابع تقدّمك.'
      : 'Log anything you missed today — meals, water, your workout. Ion is watching your progress.',
    at: fromMin(toMin(data.sleep) - 90),
    url: '/(tabs)/chat',
  })
  return out
}

/** Schedule the full proactive reminder set from gathered data. Cancels old ones first. */
export async function scheduleSynapReminders(data: ReminderData): Promise<string[]> {
  await cancelSynapReminders()
  const { prefs } = data

  const daily: DailyReminder[] = []
  const weekly: WeeklyReminder[] = []

  if (prefs.hydration_reminder) daily.push(...buildHydration(data))
  if (prefs.meal_reminder) daily.push(...buildMeals(data))
  if (prefs.workout_reminder) weekly.push(...buildTraining(data))
  if (prefs.checkin_reminder) daily.push(...buildCheckins(data))

  const ids: string[] = []
  for (const r of daily) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { url: r.url, reminderId: r.id }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.at.hour, minute: r.at.minute },
      })
      ids.push(id)
    } catch { /* skip */ }
  }
  for (const r of weekly) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { url: r.url, reminderId: r.id }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: r.at.hour, minute: r.at.minute },
      })
      ids.push(id)
    } catch { /* skip */ }
  }
  return ids
}

// ── Gather data from the user's plan + profile ────────────────────────────────

const workoutDaysOf = (plan: any): any[] => {
  if (Array.isArray(plan?.days)) return plan.days
  if (Array.isArray(plan?.weeks)) return plan.weeks.flatMap((w: any) => w?.days || [])
  return []
}

export async function gatherReminderData(prefs?: NotifPrefs): Promise<ReminderData> {
  const resolvedPrefs = prefs ?? (await loadNotifPrefs())
  const data: ReminderData = {
    prefs: resolvedPrefs,
    lang: 'en',
    wake: { hour: 7, minute: 30 },
    sleep: { hour: 23, minute: 0 },
    training: { hour: 18, minute: 0 },
    trainingWeekdays: [],
    trainingFocusByWeekday: {},
    meals: [],
    hydrationCount: 6,
  }

  try {
    const [profileRes, planRes] = await Promise.allSettled([getProfile(), getPlanHistory()])
    const profile = profileRes.status === 'fulfilled' ? (profileRes.value as any)?.profile : null
    const plan = planRes.status === 'fulfilled' ? (planRes.value as any) : null

    if (profile) {
      data.name = profile.name || undefined
      data.lang = String(profile.language).toLowerCase() === 'ar' ? 'ar' : 'en'
      data.wake = parseClock(profile.wake_time) ?? data.wake
      data.sleep = parseClock(profile.sleep_time) ?? data.sleep
      data.training = TRAINING_TIME_MAP[String(profile.training_time || '').toLowerCase()] ?? data.training
    }

    const dietJson = plan?.activeDietPlan?.plan_json
    if (dietJson) {
      data.calorieTarget = Number(dietJson.daily_calories ?? dietJson.calories_per_day) || undefined
      data.waterLiters = Number(dietJson.water_l ?? dietJson.hydration_liters) || undefined
      const meals = Array.isArray(dietJson.meals) ? dietJson.meals : []
      data.meals = meals
        .map((m: any) => {
          const at = parseClock(m.time || m.meal_time)
          if (!at) return null
          return { at, name: m.name || m.meal_name || 'Meal', calories: Number(m.calories) || undefined }
        })
        .filter(Boolean) as ReminderData['meals']
    }

    const workoutJson = plan?.activeWorkoutPlan?.plan_json
    if (workoutJson) {
      for (const day of workoutDaysOf(workoutJson)) {
        const hasExercises = Array.isArray(day?.exercises) && day.exercises.length > 0
        if (!hasExercises) continue
        const wd = weekdayNumberFromName(day?.day_name ?? day?.day ?? '')
        if (wd && !data.trainingWeekdays.includes(wd)) {
          data.trainingWeekdays.push(wd)
          data.trainingFocusByWeekday[wd] = String(day?.muscle_focus ?? day?.focus ?? '').trim()
        }
      }
    }
  } catch { /* use defaults */ }

  return data
}

/**
 * One-call sync: ensure permission, gather the user's plan/profile, and (re)schedule
 * everything. Pass requestPermission=true to prompt if not yet granted.
 */
export async function syncSynapReminders(requestPermission = false): Promise<{ granted: boolean; scheduled: number }> {
  try {
    let perm = await Notifications.getPermissionsAsync()
    let granted = perm.granted || perm.status === 'granted'
    if (!granted && requestPermission && perm.canAskAgain !== false) {
      perm = await Notifications.requestPermissionsAsync()
      granted = perm.granted || perm.status === 'granted'
    }
    if (!granted) return { granted: false, scheduled: 0 }

    const data = await gatherReminderData()
    const ids = await scheduleSynapReminders(data)
    return { granted: true, scheduled: ids.length }
  } catch {
    return { granted: false, scheduled: 0 }
  }
}

/** Fire an immediate confirmation so the user gets instant feedback that
 * reminders are on (DAILY/WEEKLY triggers otherwise only fire at their clock
 * times, so a freshly-enabled user would see nothing for hours). */
export async function sendTestReminder(lang: 'en' | 'ar' = 'en', scheduled?: number): Promise<boolean> {
  try {
    const ar = lang === 'ar'
    await Notifications.scheduleNotificationAsync({
      content: {
        title: ar ? '🔔 تم تفعيل التذكيرات' : '🔔 Reminders are on',
        body: ar
          ? `سيذكّرك آيون بالماء والوجبات والتمرين في أوقاتها${scheduled ? ` (${scheduled} تذكيراً مجدولاً)` : ''}.`
          : `Ion will nudge you for water, meals and training at the right times${scheduled ? ` (${scheduled} scheduled)` : ''}.`,
        data: { reminderId: `${REMINDER_PREFIX}test`, url: '/(tabs)' },
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    })
    return true
  } catch {
    return false
  }
}

export async function cancelSynapReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter(item => String(item.content.data?.reminderId || '').startsWith(REMINDER_PREFIX))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  )
}

export async function getSynapScheduledReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return scheduled.filter(item => String(item.content.data?.reminderId || '').startsWith(REMINDER_PREFIX))
}
