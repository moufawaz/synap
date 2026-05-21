/**
 * notifications.ts — SYNAP NotificationScheduler
 * ────────────────────────────────────────────────
 * Centralised service for scheduling, cancelling, and managing all local
 * notifications via @capacitor/local-notifications.
 *
 * This module is safe to import everywhere — all Capacitor calls are
 * dynamically imported and guarded by isNativePlatform() so the web bundle
 * is never affected.
 *
 * NOTIFICATION ID MAP
 * ───────────────────
 * 1001   Workout daily reminder
 * 2001   Meal — Breakfast
 * 2002   Meal — Lunch
 * 2003   Meal — Dinner
 * 3001   Hydration — 08:00
 * 3002   Hydration — 10:00
 * 3003   Hydration — 12:00
 * 3004   Hydration — 14:00
 * 3005   Hydration — 16:00
 * 3006   Hydration — 18:00
 * 3007   Hydration — 20:00
 * 3008   Hydration — 22:00
 * 4001   Ion coaching nudge
 * 5001   Streak protection (fires at user-set time)
 *
 * DEEP LINKS
 * ──────────
 * Each notification carries `extra: { url: '/path' }`.
 * DeepLinkHandler picks this up via `localNotificationActionPerformed`
 * and forwards to Next.js router.push(url).
 */

import { isNativePlatform, getPlatform } from './platform'
import type { NotificationPrefs } from './notification-prefs'

// ── Stable notification IDs ──────────────────────────────────────────────────
export const NOTIF_IDS = {
  WORKOUT: 1001,
  MEAL_BREAKFAST: 2001,
  MEAL_LUNCH: 2002,
  MEAL_DINNER: 2003,
  HYDRATION: [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008],
  COACHING: 4001,
  STREAK: 5001,
} as const

// Hydration schedule: [hour, minute] pairs, 08:00–22:00 every 2 hours
const HYDRATION_TIMES: [number, number][] = [
  [8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0],
]

// Android channel IDs — must match channels created in setupChannels()
const CHANNELS = {
  workout:   'synap_workout',
  meal:      'synap_meal',
  hydration: 'synap_hydration',
  coaching:  'synap_coaching',
  streak:    'synap_streak',
} as const

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Parse "HH:MM" → { hour, minute } */
function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number)
  return { hour: h || 0, minute: m || 0 }
}

/** Dynamically import Capacitor local notifications — returns null on web */
async function getPlugin() {
  if (!isNativePlatform()) return null
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    return LocalNotifications
  } catch {
    return null
  }
}

/** Wrap a promise with a timeout — resolves with fallback value if it hangs */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Request notification permission from the OS.
 * On iOS this shows the system prompt the first time.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const plugin = await getPlugin()
  if (!plugin) return false
  try {
    const { display } = await plugin.requestPermissions()
    return display === 'granted'
  } catch {
    return false
  }
}

/**
 * Check current permission status without prompting.
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const plugin = await getPlugin()
  if (!plugin) return 'prompt'
  try {
    const result = await withTimeout(plugin.checkPermissions(), 3000, { display: 'prompt' as const })
    return result.display as 'granted' | 'denied' | 'prompt'
  } catch {
    return 'prompt'
  }
}

/**
 * Create Android notification channels.
 * Safe to call multiple times (Capacitor ignores duplicate channel IDs).
 * Should be called once on app start before any scheduling.
 */
export async function setupNotificationChannels(): Promise<void> {
  const plugin = await getPlugin()
  if (!plugin) return
  try {
    await plugin.createChannel({
      id: CHANNELS.workout,
      name: 'Workout Reminders',
      description: 'Daily training session reminders',
      importance: 4, // IMPORTANCE_DEFAULT
      vibration: true,
      sound: 'default',
    })
    await plugin.createChannel({
      id: CHANNELS.meal,
      name: 'Meal Reminders',
      description: 'Breakfast, lunch and dinner logging nudges',
      importance: 3, // IMPORTANCE_LOW — no sound/vibration, less intrusive
      vibration: false,
    })
    await plugin.createChannel({
      id: CHANNELS.hydration,
      name: 'Hydration Reminders',
      description: 'Periodic water intake reminders',
      importance: 2, // IMPORTANCE_MIN — silent, no icon in tray by default
      vibration: false,
    })
    await plugin.createChannel({
      id: CHANNELS.coaching,
      name: 'Ion Coaching',
      description: 'Motivational nudges and progress updates from Ion',
      importance: 4,
      vibration: true,
      sound: 'default',
    })
    await plugin.createChannel({
      id: CHANNELS.streak,
      name: 'Streak Protection',
      description: "Don't break your streak reminders",
      importance: 4,
      vibration: true,
      sound: 'default',
    })
  } catch (e) {
    console.warn('[Notifications] Channel setup failed:', e)
  }
}

/**
 * Cancel notifications by category.
 * Call this when the user completes a relevant action:
 *   - After logging workout: cancelCategory('workout')
 *   - After logging any meal: cancelCategory('meal')  (for today's reminders)
 *   - After logging anything: cancelCategory('streak')
 */
export async function cancelCategory(
  category: keyof typeof CHANNELS,
): Promise<void> {
  const plugin = await getPlugin()
  if (!plugin) return
  const idsToCancel: { id: number }[] = []
  switch (category) {
    case 'workout':   idsToCancel.push({ id: NOTIF_IDS.WORKOUT }); break
    case 'meal':
      idsToCancel.push(
        { id: NOTIF_IDS.MEAL_BREAKFAST },
        { id: NOTIF_IDS.MEAL_LUNCH },
        { id: NOTIF_IDS.MEAL_DINNER },
      )
      break
    case 'hydration': NOTIF_IDS.HYDRATION.forEach(id => idsToCancel.push({ id })); break
    case 'coaching':  idsToCancel.push({ id: NOTIF_IDS.COACHING }); break
    case 'streak':    idsToCancel.push({ id: NOTIF_IDS.STREAK }); break
  }
  try {
    await plugin.cancel({ notifications: idsToCancel })
  } catch {
    // Ignore — notification may not exist
  }
}

/** Cancel ALL SYNAP notifications */
export async function cancelAllNotifications(): Promise<void> {
  const plugin = await getPlugin()
  if (!plugin) return
  try {
    const all = [
      { id: NOTIF_IDS.WORKOUT },
      { id: NOTIF_IDS.MEAL_BREAKFAST },
      { id: NOTIF_IDS.MEAL_LUNCH },
      { id: NOTIF_IDS.MEAL_DINNER },
      ...NOTIF_IDS.HYDRATION.map(id => ({ id })),
      { id: NOTIF_IDS.COACHING },
      { id: NOTIF_IDS.STREAK },
    ]
    await withTimeout(plugin.cancel({ notifications: all }), 3000, undefined)
  } catch {/* ignore */}
}

/**
 * Master scheduler — call this:
 *   1. On app start (via NotificationManager component)
 *   2. Whenever preferences change (Settings → Notifications → any toggle)
 *
 * Cancels all existing schedules first, then re-schedules only what
 * the current prefs allow.  This keeps the notification tray clean.
 */
export async function applyNotificationSchedule(
  prefs: NotificationPrefs,
): Promise<void> {
  const plugin = await getPlugin()
  if (!plugin) return

  // 1. Check permission FIRST — bail immediately if denied so we don't
  //    burn through the cancel + schedule timeouts for nothing
  if (prefs.enabled) {
    const status = await checkNotificationPermission()
    if (status === 'denied') return
    if (status === 'prompt') {
      const granted = await requestNotificationPermission()
      if (!granted) return
    }
  }

  // 2. Always cancel everything first — clean slate
  await cancelAllNotifications()

  // 3. Master switch off → done
  if (!prefs.enabled) return

  // 4. Ensure Android channels exist (iOS doesn't use channels — skip)
  if (getPlatform() === 'android') await setupNotificationChannels()

  // Typed as any[] to avoid complex conditional Capacitor type resolution on the
  // web build (Vercel TypeScript check).  All fields are validated at runtime
  // by the Capacitor plugin anyway.
  const notifications: any[] = []

  // ── Workout ────────────────────────────────────────────────────────────────
  if (prefs.workout) {
    const { hour, minute } = parseTime(prefs.workoutTime)
    notifications.push({
      id: NOTIF_IDS.WORKOUT,
      title: '💪 Time to train',
      body: "Your session is ready. Ion has your programme loaded — let's go.",
      schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      channelId: CHANNELS.workout,
      smallIcon: 'ic_notification',
      extra: { url: '/workout/today', category: 'workout' },
      actionTypeId: 'SYNAP_TAP',
    })
  }

  // ── Meal reminders ─────────────────────────────────────────────────────────
  if (prefs.meal) {
    if (prefs.mealBreakfast) {
      const { hour, minute } = parseTime(prefs.mealBreakfastTime)
      notifications.push({
        id: NOTIF_IDS.MEAL_BREAKFAST,
        title: '🌅 Breakfast time',
        body: "Log your breakfast so Ion can track your macros for the day.",
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        channelId: CHANNELS.meal,
        smallIcon: 'ic_notification',
        extra: { url: '/nutrition', category: 'meal' },
      })
    }
    if (prefs.mealLunch) {
      const { hour, minute } = parseTime(prefs.mealLunchTime)
      notifications.push({
        id: NOTIF_IDS.MEAL_LUNCH,
        title: '🥗 Lunch logged?',
        body: "Don't forget to track your lunch. Every entry helps Ion optimise your plan.",
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        channelId: CHANNELS.meal,
        smallIcon: 'ic_notification',
        extra: { url: '/nutrition', category: 'meal' },
      })
    }
    if (prefs.mealDinner) {
      const { hour, minute } = parseTime(prefs.mealDinnerTime)
      notifications.push({
        id: NOTIF_IDS.MEAL_DINNER,
        title: '🍽 Dinner time',
        body: "Log your evening meal and close out your nutrition for today.",
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        channelId: CHANNELS.meal,
        smallIcon: 'ic_notification',
        extra: { url: '/nutrition', category: 'meal' },
      })
    }
  }

  // ── Hydration ──────────────────────────────────────────────────────────────
  if (prefs.hydration) {
    const hydrationBodies = [
      "Starting the day right. Drink a glass of water now. 💧",
      "Staying hydrated keeps your performance sharp. Drink up. 💧",
      "Midday hydration check. A glass of water goes a long way. 💧",
      "Afternoon slump? Water first, coffee second. 💧",
      "You're past the halfway point. Keep the hydration going. 💧",
      "Evening session coming? Hydrate now for better performance. 💧",
      "After-dinner water. Your muscles will thank you tomorrow. 💧",
      "Last hydration check of the day. Finish strong. 💧",
    ]
    HYDRATION_TIMES.forEach(([hour, minute], i) => {
      notifications.push({
        id: NOTIF_IDS.HYDRATION[i],
        title: '💧 Hydration check',
        body: hydrationBodies[i] || 'Time to drink some water.',
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        channelId: CHANNELS.hydration,
        smallIcon: 'ic_notification',
        extra: { url: '/dashboard', category: 'hydration' },
      })
    })
  }

  // ── Ion Coaching nudge ─────────────────────────────────────────────────────
  if (prefs.coaching) {
    const { hour, minute } = parseTime(prefs.coachingTime)
    const coachingMessages = [
      { title: '⚡ Morning check-in from Ion', body: "Good morning. Tell Ion how you're feeling and let's plan today." },
      { title: '⚡ Ion has something for you', body: 'A quick look at your progress is ready. Open to see what Ion noticed.' },
      { title: '⚡ Ion: check your plan', body: "New week, new targets. Your programme is ready — let's review it together." },
    ]
    // Rotate message based on day of week
    const msg = coachingMessages[new Date().getDay() % coachingMessages.length]
    notifications.push({
      id: NOTIF_IDS.COACHING,
      title: msg.title,
      body: msg.body,
      schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      channelId: CHANNELS.coaching,
      smallIcon: 'ic_notification',
      extra: { url: '/chat', category: 'coaching' },
    })
  }

  // ── Streak protection ──────────────────────────────────────────────────────
  if (prefs.streak) {
    const { hour, minute } = parseTime(prefs.streakTime)
    notifications.push({
      id: NOTIF_IDS.STREAK,
      title: "🔥 Don't break your streak",
      body: "You haven't logged today. Open SYNAP and keep the chain alive.",
      schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      channelId: CHANNELS.streak,
      smallIcon: 'ic_notification',
      extra: { url: '/dashboard', category: 'streak' },
    })
  }

  // 5. Schedule everything in one batch call (3 s timeout — never hang the UI)
  if (notifications.length === 0) return
  try {
    await withTimeout(plugin.schedule({ notifications }), 5000, undefined)
  } catch (e) {
    console.warn('[Notifications] Schedule failed:', e)
  }
}
