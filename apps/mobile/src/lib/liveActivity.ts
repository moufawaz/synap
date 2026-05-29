import { NativeModules, Platform } from 'react-native'

/**
 * Thin, crash-safe wrapper around an iOS ActivityKit "Live Activity" used to
 * surface the running workout timer on the Lock Screen and Dynamic Island.
 *
 * IMPORTANT — graceful degradation:
 * This layer is intentionally a no-op unless a matching native module
 * (`SynapLiveActivity`) is present AND the OS supports Live Activities
 * (iOS 16.2+). That means it is safe to ship and call from anywhere today:
 *   - Android / web                  → no-op
 *   - iOS < 16.2                      → no-op
 *   - iOS build without the widget   → no-op (module not linked)
 * When the WidgetKit/ActivityKit extension is added (see the native TODO at
 * the bottom of this file), these calls light up automatically with no JS
 * changes required.
 *
 * Design: the native widget renders a *self-updating* timer via
 * `Text(timerInterval:)`, so JS does NOT push an update every second. We only
 * push state transitions — start, pause/resume, progress milestones, end —
 * which keeps us well inside ActivityKit's update budget.
 */

type LiveActivityNativeModule = {
  /** Returns true if the device/OS supports Live Activities and the user has them enabled. */
  areActivitiesEnabled(): Promise<boolean>
  /**
   * Begin a workout Live Activity.
   * @param startedAtMs Unix ms when the timer started (widget computes elapsed from this).
   */
  startWorkoutActivity(payload: {
    title: string
    startedAtMs: number
    completed: number
    total: number
  }): Promise<void>
  /** Update the running activity. `elapsedSec` is used when `paused` so the frozen time shows. */
  updateWorkoutActivity(payload: {
    paused: boolean
    elapsedSec: number
    completed: number
    total: number
  }): Promise<void>
  /** End and dismiss the activity. */
  endWorkoutActivity(): Promise<void>
}

const native: LiveActivityNativeModule | null =
  Platform.OS === 'ios' && NativeModules.SynapLiveActivity
    ? (NativeModules.SynapLiveActivity as LiveActivityNativeModule)
    : null

/** Whether the native Live Activity bridge is linked into this build at all. */
export function isLiveActivitySupported(): boolean {
  return native !== null
}

/** Best-effort check that the OS + user settings allow Live Activities. Never throws. */
export async function areLiveActivitiesEnabled(): Promise<boolean> {
  if (!native) return false
  try {
    return await native.areActivitiesEnabled()
  } catch {
    return false
  }
}

export async function startWorkoutActivity(args: {
  title: string
  startedAtMs: number
  completed: number
  total: number
}): Promise<void> {
  if (!native) return
  try {
    if (!(await native.areActivitiesEnabled())) return
    await native.startWorkoutActivity(args)
  } catch {
    /* non-fatal — the in-app timer is the source of truth */
  }
}

export async function updateWorkoutActivity(args: {
  paused: boolean
  elapsedSec: number
  completed: number
  total: number
}): Promise<void> {
  if (!native) return
  try {
    await native.updateWorkoutActivity(args)
  } catch {
    /* non-fatal */
  }
}

export async function endWorkoutActivity(): Promise<void> {
  if (!native) return
  try {
    await native.endWorkoutActivity()
  } catch {
    /* non-fatal */
  }
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 * NATIVE FOLLOW-UP (requires a Mac + Xcode 26; cannot be authored/verified on
 * Windows CI). To light up the Dynamic Island / Lock Screen timer:
 *
 * 1. Add an Expo config plugin (e.g. `plugins/withLiveActivity.js`) that:
 *      - adds `NSSupportsLiveActivities = true` to Info.plist
 *      - injects a WidgetKit extension target ("SynapWorkoutWidget") into the
 *        Xcode project during `expo prebuild`.
 * 2. In the widget extension (Swift):
 *      - define `WorkoutAttributes: ActivityAttributes` with a
 *        `ContentState { paused, elapsedSec, completed, total }`
 *      - render the Lock Screen + Dynamic Island (compact/expanded) views,
 *        using `Text(timerInterval:)` so the timer ticks natively.
 * 3. Add a native module `SynapLiveActivity` (Swift, exported to RN) exposing
 *      areActivitiesEnabled / startWorkoutActivity / updateWorkoutActivity /
 *      endWorkoutActivity, matching the LiveActivityNativeModule type above.
 *      Use `Activity.request/.update/.end` from ActivityKit (iOS 16.2+).
 *
 * Once linked, `isLiveActivitySupported()` returns true and the calls already
 * wired into train.tsx start driving the live activity — no JS changes needed.
 * ─────────────────────────────────────────────────────────────────────────
 */
