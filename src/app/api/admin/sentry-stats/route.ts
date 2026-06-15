import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase-server'

/**
 * GET /api/admin/sentry-stats
 * Returns iOS crash/error counts for the last 24h and 7d so the /admin page can
 * surface a "Crashes" card without leaving the SYNAP dashboard. Reads from
 * Sentry's public REST API.
 *
 * Env vars required (Vercel):
 *   SENTRY_API_TOKEN  — auth token from Sentry → Settings → Auth Tokens
 *                       (needs scope: project:read)
 *   SENTRY_ORG_SLUG   — your Sentry org slug (e.g. "synap")
 *   SENTRY_PROJECT_SLUG — your project slug (e.g. "synap-mobile")
 *
 * If any of those are unset, the endpoint returns { configured: false } so the
 * admin card can show a graceful "Set up Sentry" hint instead of breaking.
 */

const ADMIN_EMAIL = 'mohamedhossam03@gmail.com'

export async function GET(req: Request) {
  const { user, error } = await getAuthenticatedUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.SENTRY_API_TOKEN
  const org = process.env.SENTRY_ORG_SLUG
  const project = process.env.SENTRY_PROJECT_SLUG

  if (!token || !org || !project) {
    return NextResponse.json({ configured: false })
  }

  try {
    // Use the project-scoped issues endpoint. It accepts the project SLUG
    // directly in the URL path. The org-scoped /organizations/{org}/issues/
    // endpoint's `?project=` filter expects a numeric project ID — passing a
    // slug there returns 403, which is what bit us first time around.
    const base = `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/`
    const headers = { Authorization: `Bearer ${token}` }
    const [r24, r7d] = await Promise.all([
      fetch(`${base}?statsPeriod=24h&query=is:unresolved&limit=100`, { headers }),
      fetch(`${base}?statsPeriod=7d&query=is:unresolved&limit=100`, { headers }),
    ])
    if (!r24.ok || !r7d.ok) {
      // TEMP debug — masked token fingerprint so we can confirm Vercel is
      // sending the token we think it is. Safe (no full secret), remove
      // once /admin shows live counts.
      const fp = token.length >= 11 ? `${token.slice(0, 7)}…${token.slice(-4)} (len ${token.length})` : `len ${token.length}`
      let body24 = ''
      try { body24 = (await r24.text()).slice(0, 200) } catch {}
      return NextResponse.json(
        { configured: true, error: `Sentry API ${r24.status}/${r7d.status}`, tokenFp: fp, org, project, sample: body24 },
        { status: 502 },
      )
    }
    const j24 = (await r24.json()) as any[]
    const j7d = (await r7d.json()) as any[]

    // Sum 'count' (event count per issue) so we report actual crashes, not just
    // unique issue groups.
    const count = (rows: any[]) =>
      rows.reduce((sum, i) => sum + (Number(i.count) || 0), 0)

    // Top 3 issues by event count for a quick at-a-glance list
    const top = j7d
      .slice()
      .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
      .slice(0, 3)
      .map(i => ({
        id: i.id,
        title: i.title || i.metadata?.value || 'Unknown error',
        culprit: i.culprit || '',
        count: Number(i.count) || 0,
        lastSeen: i.lastSeen || null,
        permalink: i.permalink || `https://sentry.io/organizations/${org}/issues/${i.id}/`,
      }))

    return NextResponse.json({
      configured: true,
      crashes24h: count(j24),
      crashes7d: count(j7d),
      top,
      projectUrl: `https://sentry.io/organizations/${org}/issues/?project=${project}`,
    })
  } catch (e) {
    return NextResponse.json({ configured: true, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
