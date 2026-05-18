/**
 * notification-prefs.ts
 * ─────────────────────
 * Type definition + localStorage persistence for per-user notification
 * preferences.  All values are nullable/optional so defaults are applied
 * at the scheduler layer — the pref store only records what the user
 * explicitly changed.
 */

const STORAGE_KEY = 'synap_notification_prefs'

export interface NotificationPrefs {
  /** Master switch — if false no notifications are ever scheduled */
  enabled: boolean

  // ── Workout ──────────────────────────────────────────────────────────
  workout: boolean
  /** 24-h "HH:MM" string, default "19:00" */
  workoutTime: string

  // ── Meal / Nutrition ─────────────────────────────────────────────────
  meal: boolean
  mealBreakfast: boolean
  /** 24-h "HH:MM" string */
  mealBreakfastTime: string
  mealLunch: boolean
  mealLunchTime: string
  mealDinner: boolean
  mealDinnerTime: string

  // ── Hydration ────────────────────────────────────────────────────────
  hydration: boolean

  // ── Ion Coaching / Motivational nudges ───────────────────────────────
  coaching: boolean
  /** 24-h "HH:MM", default "09:00" */
  coachingTime: string

  // ── Streak protection ────────────────────────────────────────────────
  streak: boolean
  /** 24-h "HH:MM", default "21:00" */
  streakTime: string
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  workout: true,
  workoutTime: '19:00',
  meal: true,
  mealBreakfast: true,
  mealBreakfastTime: '08:00',
  mealLunch: true,
  mealLunchTime: '13:00',
  mealDinner: true,
  mealDinnerTime: '19:30',
  hydration: false, // off by default — user must opt-in
  coaching: true,
  coachingTime: '09:00',
  streak: true,
  streakTime: '21:00',
}

export function loadNotifPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveNotifPrefs(prefs: NotificationPrefs): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Storage quota exceeded — ignore
  }
}
