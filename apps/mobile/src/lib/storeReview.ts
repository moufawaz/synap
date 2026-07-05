import AsyncStorage from '@react-native-async-storage/async-storage'
import * as StoreReview from 'expo-store-review'
import { reportError } from '@/lib/sentry'

/**
 * In-app App Store rating prompt (SKStoreReviewController via
 * expo-store-review), asked at POSITIVE moments only.
 *
 * Strategy:
 *  - Count completed workouts locally (AsyncStorage). The count is a proxy
 *    for "this user is invested" — we never ask on launch, after errors, or
 *    mid-flow.
 *  - Ask at the 3rd and 20th completed workout. Two milestones give a second
 *    chance months later without being naggy. iOS itself enforces a hard cap
 *    of 3 prompts per user per 365 days and silently ignores extra requests,
 *    so worst case is a no-op.
 *  - Each milestone is only ever requested once (tracked in AsyncStorage).
 *  - requestReview() is fire-and-forget: iOS decides whether the card
 *    actually appears. Never gate anything on it, never await it in a way
 *    that can block the UI, and never crash if the native module is missing
 *    (e.g. Expo Go).
 */

const COUNT_KEY = 'synap.review.completedWorkouts'
const ASKED_KEY = 'synap.review.askedMilestones'

/** Completed-workout milestones at which we request a review. */
const MILESTONES = [3, 20]

/**
 * Record one completed workout and, if a milestone is crossed for the first
 * time, request the native rating prompt. Call AFTER the success UI (e.g.
 * from the "workout saved" alert's OK button) so the iOS review card never
 * fights with an Alert for presentation.
 */
export async function recordWorkoutCompletedAndMaybeAskForReview() {
  try {
    const raw = await AsyncStorage.getItem(COUNT_KEY)
    const count = (parseInt(raw || '0', 10) || 0) + 1
    await AsyncStorage.setItem(COUNT_KEY, String(count))

    if (!MILESTONES.includes(count)) return

    const askedRaw = await AsyncStorage.getItem(ASKED_KEY)
    const asked: number[] = askedRaw ? JSON.parse(askedRaw) : []
    if (asked.includes(count)) return
    await AsyncStorage.setItem(ASKED_KEY, JSON.stringify([...asked, count]))

    if (await StoreReview.isAvailableAsync()) {
      // iOS decides whether to actually show the card; this is a request.
      await StoreReview.requestReview()
    }
  } catch (err) {
    // A failed review request must never surface to the user.
    reportError(err, { source: 'storeReview.recordWorkoutCompleted' })
  }
}
