import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

/**
 * Sentry init — crash + error reporting for SYNAP iOS.
 *
 * What we capture:
 *  - Unhandled JS errors (auto, React Native default)
 *  - Native iOS crashes (auto, via the Sentry pod)
 *  - Caught errors we explicitly report() with context
 *  - User id (attached after auth)
 *
 * What we DON'T capture:
 *  - User PII beyond user_id (no email, no names, no body data)
 *  - Network bodies (PII risk — only URLs + status codes)
 *  - Breadcrumbs from console.log (too noisy)
 *
 * No-op when EXPO_PUBLIC_SENTRY_DSN is unset (e.g. dev builds without secrets).
 */

const DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim()
const ENV = __DEV__ ? 'development' : 'production'
const RELEASE = `synap@${Constants.expoConfig?.version ?? '0'}+${Constants.nativeBuildVersion ?? 'dev'}`

let initialized = false

export function initSentry() {
  if (initialized) return
  if (!DSN) return // dev / no-secret build → no-op
  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE,
      // Keep it light — no performance tracing, no profiling, no replays.
      // We only want crash + error reports.
      tracesSampleRate: 0,
      enableAutoSessionTracking: true,
      // Strip URL params and only keep host+path so we don't leak query secrets
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
          try {
            const url = new URL(String(breadcrumb.data?.url || ''))
            breadcrumb.data = { ...breadcrumb.data, url: url.origin + url.pathname }
          } catch { /* ignore */ }
        }
        return breadcrumb
      },
    })
    initialized = true
  } catch {
    /* non-fatal — Sentry must never crash the app */
  }
}

/** Attach the signed-in user so crashes can be traced. Only user_id — no PII. */
export function identifySentryUser(userId: string | null | undefined) {
  if (!initialized) return
  try {
    if (userId) Sentry.setUser({ id: userId })
    else Sentry.setUser(null)
  } catch { /* ignore */ }
}

/**
 * Send an in-app bug report to Sentry as user feedback. Sentry attaches the
 * device, release, user id and recent breadcrumbs automatically. Returns the
 * event id (to link the server-side copy), or null when Sentry is off.
 */
export function sendUserFeedback(
  message: string,
  options?: { screenshotBase64?: string | null; screenshotMime?: string; tags?: Record<string, string> },
): string | null {
  if (!initialized) return null
  try {
    const attachments = options?.screenshotBase64
      ? [{
          filename: options.screenshotMime === 'image/png' ? 'screenshot.png' : 'screenshot.jpg',
          data: base64ToBytes(options.screenshotBase64),
          contentType: options.screenshotMime || 'image/jpeg',
        }]
      : undefined
    return Sentry.captureFeedback(
      { message, source: 'in_app_report', tags: options?.tags },
      attachments ? { attachments } : undefined,
    )
  } catch {
    return null
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Manually report a caught error with extra context. */
export function reportError(error: unknown, context?: Record<string, any>) {
  if (!initialized) {
    if (__DEV__) console.error('[reportError]', error, context)
    return
  }
  try {
    Sentry.withScope(scope => {
      if (context) {
        for (const [k, v] of Object.entries(context)) scope.setExtra(k, v)
      }
      Sentry.captureException(error)
    })
  } catch { /* ignore */ }
}
