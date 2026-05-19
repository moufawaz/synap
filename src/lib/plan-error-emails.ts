/**
 * plan-error-emails.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatic apology + resolution emails for plan generation failures.
 *
 * Flow:
 *   1. Plan fails  → sendPlanErrorEmailIfNeeded()
 *                    Sends the apology once (deduped within 7 days).
 *                    Records app_event: plan_error_email_sent
 *
 *   2. Plan succeeds later → sendPlanResolvedEmailIfNeeded()
 *                    Checks if we previously sent an error email.
 *                    If yes, sends the "it's fixed, your plan is ready" email.
 *                    Records app_event: plan_resolved_email_sent
 *
 * Both functions are fire-and-forget safe — they never throw.
 */

import { createAdminClient } from './supabase-server'
import { sendEmail } from './resend'
import { recordAppEvent } from './app-events'

// How far back to look for prior error / resolved emails (7 days)
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000

async function countRecentEvents(
  userId: string,
  eventType: string,
  sinceIso: string,
): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('app_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', sinceIso)
  return count ?? 0
}

/**
 * Send an apology email when plan generation fails.
 * Deduplicates — only sends once per 7-day window per user.
 * Safe to call at every failure point; extras are silently dropped.
 */
export async function sendPlanErrorEmailIfNeeded(
  userId: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  try {
    const since = new Date(Date.now() - LOOKBACK_MS).toISOString()

    // Already sent an error email this week — don't spam
    const alreadySent = await countRecentEvents(userId, 'plan_error_email_sent', since)
    if (alreadySent > 0) return

    await sendEmail({
      to: userEmail,
      type: 'onboarding_error',
      data: { name: userName },
    })

    await recordAppEvent({
      userId,
      eventType: 'plan_error_email_sent',
      severity: 'info',
      source: 'plan-error-emails',
      message: `Apology email sent to ${userEmail} after plan generation failure`,
    })
  } catch (e) {
    // Never propagate — email is best-effort, must not affect the API response
    console.warn('[plan-error-emails] sendPlanErrorEmailIfNeeded failed silently:', e)
  }
}

/**
 * Send a "your plan is now ready" email after a successful generation,
 * but ONLY if we previously sent an error email to this user.
 * This replaces the generic welcome email in the retry-after-error scenario.
 * Returns true if the resolved email was sent (so the caller can skip the welcome email).
 */
export async function sendPlanResolvedEmailIfNeeded(
  userId: string,
  userEmail: string,
  userName: string,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - LOOKBACK_MS).toISOString()

    // Only act if we previously told this user about an error
    const priorErrorEmail = await countRecentEvents(userId, 'plan_error_email_sent', since)
    if (priorErrorEmail === 0) return false

    // Don't send the resolved email twice
    const alreadyResolved = await countRecentEvents(userId, 'plan_resolved_email_sent', since)
    if (alreadyResolved > 0) return false

    await sendEmail({
      to: userEmail,
      type: 'plan_error_resolved',
      data: { name: userName },
    })

    await recordAppEvent({
      userId,
      eventType: 'plan_resolved_email_sent',
      severity: 'info',
      source: 'plan-error-emails',
      message: `Resolution email sent to ${userEmail} after successful plan generation`,
    })

    return true
  } catch (e) {
    console.warn('[plan-error-emails] sendPlanResolvedEmailIfNeeded failed silently:', e)
    return false
  }
}
