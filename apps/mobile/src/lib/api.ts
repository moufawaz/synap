import { supabase } from './supabase'
import { reportError } from './sentry'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'

/** Extra options layered on top of fetch's RequestInit. */
type ApiFetchOptions = RequestInit & {
  /** Abort the request after this many ms and throw a friendly timeout error.
   *  Defaults to 45s; long AI endpoints (plan generation) pass a larger value. */
  timeoutMs?: number
}

/**
 * Root-caused production incident: a user hit "Unauthorized" mid-onboarding
 * during the InBody scan → plan generation flow. Cause: React Native
 * suspends JS timers while backgrounded, and ImagePicker's native camera
 * sheet backgrounds the JS runtime — so Supabase's proactive background
 * token-refresh ticker can miss its window while the user is in the camera.
 * They return with a stale access token, and the very next request 401s.
 *
 * Fixed at the root in lib/supabase.ts (AppState-driven start/stopAutoRefresh
 * so the ticker actually runs / catches up correctly around backgrounding).
 * This is the second, defense-in-depth layer: ANY 401 — from that scenario,
 * clock skew, or anything else that leaves us holding a stale token — gets
 * one silent refresh-and-retry before the user ever sees an error. Most
 * users should never see "Unauthorized" again; if they do, it's a REAL auth
 * problem (e.g. the account was deleted) and reportError gives us visibility
 * instead of a silent dead end.
 */
async function performFetch(path: string, fetchInit: RequestInit, timeoutMs: number, token: string | null | undefined) {
  const headers = new Headers(fetchInit.headers)
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...fetchInit, headers, signal: controller.signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('That took too long. Please check your connection and try again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function friendlyErrorFrom(response: Response): Promise<ApiFetchError> {
  // Try to pull a friendly message out of the server's error body. Server
  // routes return shapes like {"error":"Unauthorized"} or {"message":"…"};
  // without this parsing the UI ended up rendering raw JSON
  // ('{"error":"Unauthorized"}') as if it were a user-facing message.
  const text = await response.text().catch(() => '')
  let message = text
  if (text) {
    try {
      const parsed = JSON.parse(text)
      // Some routes pair a machine code (error: 'daily_limit_reached') with a
      // human sentence in `message` — show the sentence when there is one.
      message = parsed?.message || parsed?.error || text
    } catch { /* not JSON — leave as raw text */ }
  }
  const err = new Error(message || `Request failed: ${response.status}`) as ApiFetchError
  err.status = response.status
  return err
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = 45_000, ...fetchInit } = init
  const { data } = await supabase.auth.getSession()
  let token = data.session?.access_token

  let response = await performFetch(path, fetchInit, timeoutMs, token)

  if (response.status === 401) {
    // One silent recovery attempt: force a refresh (bypasses the getSession()
    // cache) and retry exactly once. If the refresh itself fails (e.g. the
    // refresh token was revoked — a real logout, not a transient hiccup),
    // fall through to the normal error path below with the ORIGINAL 401,
    // which is the more accurate error for that case.
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession().catch(
      (e) => ({ data: null, error: e }) as any,
    )
    token = refreshed?.session?.access_token
    if (!refreshErr && token) {
      response = await performFetch(path, fetchInit, timeoutMs, token)
    }
    if (response.status === 401) {
      // Still unauthorized after a genuine refresh attempt — this is no
      // longer the "stale token from backgrounding" scenario, it's worth
      // knowing about. Non-fatal: reporting must never block the error path.
      reportError(new Error(`apiFetch 401 persisted after refresh: ${path}`), {
        path, hadRefreshToken: !!data.session?.refresh_token, refreshError: refreshErr?.message,
      })
    }
  }

  if (!response.ok) {
    throw await friendlyErrorFrom(response)
  }

  return response.json() as Promise<T>
}

/** Error thrown by apiFetch on non-OK responses. Carries the HTTP status so
 *  screens can branch on 401 / 404 / 5xx without parsing the message string. */
export type ApiFetchError = Error & { status?: number }
