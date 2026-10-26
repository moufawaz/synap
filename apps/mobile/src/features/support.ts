import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { apiFetch } from '@/lib/api'
import { sendUserFeedback } from '@/lib/sentry'

export type BugReportInput = {
  message: string
  screenshotBase64?: string | null
  screenshotMime?: string
  language?: string
}

/**
 * Sends a bug report to Sentry (with device context + optional screenshot)
 * and to the server, which stores it for /admin and emails the team.
 */
export async function submitBugReport(input: BugReportInput) {
  const appVersion = Constants.expoConfig?.version ?? ''
  const build = String(Constants.nativeBuildVersion ?? '')
  const sentryEventId = sendUserFeedback(input.message, {
    screenshotBase64: input.screenshotBase64,
    screenshotMime: input.screenshotMime,
    tags: { app_version: appVersion, build },
  })

  return apiFetch<{ ok: true }>('/api/bug-report', {
    method: 'POST',
    body: JSON.stringify({
      message: input.message,
      app_version: appVersion,
      build,
      platform: Platform.OS,
      os_version: String(Platform.Version ?? ''),
      device: Device.modelName ?? '',
      language: input.language,
      has_screenshot: !!input.screenshotBase64,
      sentry_event_id: sentryEventId,
    }),
  })
}
