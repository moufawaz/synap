import { Platform } from 'react-native'
import SynapLiveActivity from '../../modules/synap-live-activity'

/**
 * Thin, crash-safe wrapper around an iOS ActivityKit "Live Activity" used to
 * surface the running workout timer on the Lock Screen and Dynamic Island.
 *
 * IMPORTANT — graceful degradation:
 * This layer is intentionally a no-op unless the native module
 * (`SynapLiveActivity`) is linked AND the OS supports Live Activities
 * (iOS 16.2+). `requireOptionalNativeModule` returns null when the module is
 * absent, so it is safe to ship and call from anywhere today:
 *   - Android / web                  → no-op
 *   - iOS < 16.2                      → no-op (areActivitiesEnabled → false)
 *   - iOS build without the widget   → no-op (module not linked)
 * The native pieces live in `modules/synap-live-activity` (the ActivityKit
 * bridge) and `targets/widget` (the WidgetKit UI), generated into the Xcode
 * project at prebuild by `@bacons/apple-targets`.
 *
 * Design: the widget renders a *self-updating* timer via `Text(_, style:
 * .timer)`, so JS does NOT push an update every second. We only push state
 * transitions — start, pause/resume, progress changes, end — which keeps us
 * well inside ActivityKit's update budget.
 */

const native = Platform.OS === 'ios' ? SynapLiveActivity : null

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
