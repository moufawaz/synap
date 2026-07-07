import { createAdminClient } from './supabase-server'

/**
 * ⚡ Sparks — behavior-based loyalty points.
 *
 * Users earn Sparks for the BEHAVIORS that cause progress (never outcomes
 * like kg lost — that's gameable and a health-risk incentive). Redemptions
 * convert Sparks into free Elite days via profiles.bonus_elite_until.
 *
 * The ledger (loyalty_points) is append-only; balance = SUM(points).
 * Redemptions are negative rows. Idempotency comes from the unique
 * (user_id, event_type, ref_id) constraint — hooks pick ref_id so natural
 * caps fall out of it (workout ref = date → once/day).
 */

export const SPARK_EVENTS = {
  workout_completed:  { points: 10 },  // ref: date            → 1/day
  meal_logged:        { points: 2  },  // ref: meal log id     → capped 3/day by count
  streak_week:        { points: 30 },  // ref: week-start date → 1/week
  pr:                 { points: 15 },  // ref: date:exercise   → capped 2/week by count
  renewal_fresh:      { points: 20 },  // ref: preview id      → 1/preview
  progress_photo:     { points: 10 },  // ref: YYYY-MM         → 1/month
  measurement_logged: { points: 5  },  // ref: week-start date → 1/week
} as const

export type SparkEventType = keyof typeof SPARK_EVENTS

export const SPARK_REWARDS = {
  elite_3d:  { cost: 150,  days: 3  },
  elite_7d:  { cost: 300,  days: 7  },
  elite_30d: { cost: 1000, days: 30 },
} as const

export type SparkRewardType = keyof typeof SPARK_REWARDS

type Admin = ReturnType<typeof createAdminClient>

/**
 * Award Sparks for an event. Idempotent: a duplicate (user, event, ref)
 * silently awards nothing. Returns the points actually awarded (0 on dup or
 * error) — hooks surface this in responses for the "+10 ⚡" toast.
 * NEVER throws: earning must not break the endpoint it rides on.
 */
export async function awardSparks(
  admin: Admin,
  userId: string,
  eventType: SparkEventType,
  refId: string,
): Promise<number> {
  try {
    const points = SPARK_EVENTS[eventType].points
    const { error } = await admin.from('loyalty_points').insert({
      user_id: userId,
      event_type: eventType,
      points,
      ref_id: refId,
    })
    if (error) {
      // 23505 = unique violation → already awarded. Anything else (e.g. the
      // migration hasn't been run yet) is logged and swallowed.
      if (error.code !== '23505' && !/duplicate/i.test(error.message)) {
        console.warn('[sparks] award failed:', eventType, error.message)
      }
      return 0
    }
    return points
  } catch (e) {
    console.warn('[sparks] award threw:', e instanceof Error ? e.message : e)
    return 0
  }
}

/** Award with a rolling-window count cap (e.g. PRs: max 2/week). */
export async function awardSparksCapped(
  admin: Admin,
  userId: string,
  eventType: SparkEventType,
  refId: string,
  cap: number,
  windowMs: number,
): Promise<number> {
  try {
    const since = new Date(Date.now() - windowMs).toISOString()
    const { count } = await admin.from('loyalty_points')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .gte('created_at', since)
    if ((count ?? 0) >= cap) return 0
    return awardSparks(admin, userId, eventType, refId)
  } catch {
    return 0
  }
}

export async function getSparksBalance(admin: Admin, userId: string): Promise<number> {
  try {
    // Ledger stays small per-user (a few hundred rows/year); summing in app
    // code keeps us off DB functions the migration would otherwise need.
    const { data } = await admin.from('loyalty_points')
      .select('points')
      .eq('user_id', userId)
      .limit(5000)
    return (data || []).reduce((sum, r) => sum + (r.points || 0), 0)
  } catch {
    return 0
  }
}

/** Sunday-start week key (matches the streak endpoint's week model). */
export function sundayWeekStart(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay())
  return copy.toISOString().slice(0, 10)
}
