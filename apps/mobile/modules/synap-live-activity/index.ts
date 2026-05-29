import { requireOptionalNativeModule } from 'expo-modules-core'

/**
 * Native ActivityKit bridge for the workout-timer Live Activity.
 * Returns `null` when the native module isn't linked (Android, web, or an iOS
 * build without the extension) so callers can degrade to a no-op.
 */
export interface SynapLiveActivityModule {
  areActivitiesEnabled(): Promise<boolean>
  startWorkoutActivity(args: { title: string; startedAtMs: number; completed: number; total: number }): Promise<void>
  updateWorkoutActivity(args: { paused: boolean; elapsedSec: number; completed: number; total: number }): Promise<void>
  endWorkoutActivity(): Promise<void>
}

const SynapLiveActivity = requireOptionalNativeModule<SynapLiveActivityModule>('SynapLiveActivity')

export default SynapLiveActivity
