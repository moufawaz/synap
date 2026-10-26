import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { recordAppEvent } from '@/lib/app-events'
import { FROM_EMAIL, resend } from '@/lib/resend'

// POST /api/bug-report
// In-app "Report a problem". Stored in app_events (shows on /admin) and emailed
// to ADMIN_EMAIL. The app also sends the same report to Sentry as user feedback
// (with device context and breadcrumbs); sentry_event_id links the two.

const MAX_MESSAGE = 4000
const MAX_PER_HOUR = 5

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function shortString(value: unknown, max = 120): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

export async function POST(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE) : ''
  if (message.length < 5) {
    return NextResponse.json({ error: 'Please describe the problem in a few words.' }, { status: 400 })
  }

  // Light abuse guard: a handful of reports per user per hour.
  const admin = createAdminClient()
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await admin
    .from('app_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'bug_report')
    .gte('created_at', since)
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json({ error: 'Thanks — we already have your recent reports. Please try again later.' }, { status: 429 })
  }

  const metadata = {
    app_version: shortString(body.app_version, 40),
    build: shortString(body.build, 40),
    platform: shortString(body.platform, 40),
    os_version: shortString(body.os_version, 40),
    device: shortString(body.device, 80),
    screen: shortString(body.screen, 120),
    language: shortString(body.language, 10),
    has_screenshot: !!body.has_screenshot,
    sentry_event_id: shortString(body.sentry_event_id, 64),
    email: user.email ?? null,
  }

  await recordAppEvent({
    userId: user.id,
    eventType: 'bug_report',
    severity: 'warning',
    source: 'mobile/report-bug',
    message,
    metadata,
  })

  const adminEmail = process.env.ADMIN_EMAIL
  if (resend && adminEmail) {
    const rows = Object.entries({ user: `${user.email ?? '—'} (${user.id})`, ...metadata })
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#888">${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`)
      .join('')
    const sentryLink = metadata.sentry_event_id
      ? `<p><a href="https://synap-x9.sentry.io/issues/?query=${encodeURIComponent(metadata.sentry_event_id)}">Open in Sentry</a> (device context, recent actions${metadata.has_screenshot ? ', screenshot' : ''})</p>`
      : ''
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      replyTo: user.email || undefined,
      subject: `[SYNAP bug] ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
      html: `<h2>New in-app bug report</h2><p style="white-space:pre-wrap">${escapeHtml(message)}</p><table>${rows}</table>${sentryLink}`,
    }).catch(err => console.error('[bug-report] email failed', err))
  }

  return NextResponse.json({ ok: true })
}
