import { Text } from 'react-native'
import { Card } from './Card'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Friendly empty-state Card for data-loading errors. Replaces the pattern of
 * rendering apiFetch error strings directly (which used to surface server
 * JSON like '{"error":"Unauthorized"}' to users — see screenshots from the
 * Progress tab).
 *
 * Usage:
 *
 *   <DataError error={data.error} status={data.errorStatus} isRtl={isRtl} />
 *
 * Renders nothing when `error` is null/empty. When error is set:
 *   - status === 401 → "Finish setting up your profile" with a calm
 *     onboarding-style explanation. This is the common case when a screen
 *     loads before the user has completed onboarding / has no session.
 *   - any other status (or no status) → soft "couldn't load this" with a
 *     retry hint. We never show the raw server message — that's already
 *     been logged by apiFetch.
 *
 * Screens can pass `title` / `detail` to override the defaults when they
 * have screen-specific context (e.g. "Couldn't load your nutrition plan").
 */
export function DataError({
  error,
  status,
  isRtl,
  title,
  detail,
}: {
  error: string | null
  status?: number | null
  isRtl?: boolean
  title?: string
  detail?: string
}) {
  const { color } = useTheme()
  if (!error) return null

  const align: 'left' | 'right' = isRtl ? 'right' : 'left'
  const is401 = status === 401

  const finalTitle = title ?? (is401
    ? (isRtl ? 'أكمل ملفك الشخصي أولاً' : 'Finish setting up your profile')
    : (isRtl ? 'تعذّر تحميل البيانات' : "Couldn't load this"))

  const finalDetail = detail ?? (is401
    ? (isRtl ? 'بعد إتمام الإعداد ستظهر بياناتك هنا.' : 'Once onboarding is complete, your data will appear here.')
    : (isRtl ? 'تحقق من الاتصال وحاول مرة أخرى بعد قليل.' : 'Check your connection and try again in a moment.'))

  return (
    <Card>
      <Text style={{ color: color.text, fontWeight: '700', marginBottom: 6, textAlign: align, fontSize: 15 }}>
        {finalTitle}
      </Text>
      <Text style={{ color: color.dim, textAlign: align, fontSize: 13, lineHeight: 18 }}>
        {finalDetail}
      </Text>
    </Card>
  )
}
