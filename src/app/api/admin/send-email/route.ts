import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail, resend, FROM_EMAIL, VALID_EMAIL_TYPES, type EmailType } from '@/lib/resend'

// ── Admin-only email sending endpoint ───────────────────────────
// Supports:
//   1. Template email: { to, type, data }
//   2. Custom email:   { to, subject, message } — plain text body wrapped in SYNAP layout
//   3. Bulk email:     { toAll: true, tier?, status? } + template/custom fields

function adminLayout(content: string): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://synapfit.app'
  return `
    <div style="background:#0A0A0A;color:#F0F0FF;font-family:system-ui,-apple-system,sans-serif;padding:0;margin:0">
      <div style="max-width:580px;margin:0 auto;padding:40px 24px">
        <div style="margin-bottom:32px">
          <span style="font-size:18px;font-weight:900;letter-spacing:0.15em;color:#BB5CF6">SYNAP</span>
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;color:#334155;margin-left:12px;text-transform:uppercase">Admin Message</span>
        </div>
        ${content}
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #1E1E35">
          <p style="color:#334155;font-size:12px;margin:0">
            SYNAP · The Intelligence of Sport ·
            <a href="${APP_URL}" style="color:#475569">${APP_URL.replace('https://', '')}</a>
          </p>
          <p style="color:#334155;font-size:11px;margin:4px 0 0">
            You received this message from the SYNAP team.
            <a href="${APP_URL}/settings" style="color:#475569">Manage preferences</a>
          </p>
        </div>
      </div>
    </div>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

export async function POST(req: NextRequest) {
  // ── Auth guard: admin only ───────────────────────────────────
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { to, type, data: templateData, subject, message, toAll, tier, status } = body

  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 500 })
  }

  // ── Build recipient list ─────────────────────────────────────
  let recipients: string[] = []

  if (toAll) {
    // Bulk: send to all users matching optional tier/status filter
    const { createAdminClient } = await import('@/lib/supabase-server')
    const admin = createAdminClient()

    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const allEmails = (authUsers?.users || []).map((u: any) => u.email).filter(Boolean) as string[]

    if (tier || status) {
      const { data: subs } = await admin.from('subscriptions').select('user_id, plan_name, status')
      const { data: authMap } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const userById = Object.fromEntries((authMap?.users || []).map((u: any) => [u.id, u.email]))

      recipients = (subs || [])
        .filter((s: any) => {
          if (tier && !s.plan_name?.toLowerCase().includes(tier.toLowerCase())) return false
          if (status && s.status !== status) return false
          return true
        })
        .map((s: any) => userById[s.user_id])
        .filter(Boolean) as string[]
    } else {
      recipients = allEmails
    }
  } else if (to) {
    recipients = Array.isArray(to) ? to : [to]
  } else {
    return NextResponse.json({ error: 'Provide to (email or array) or toAll: true' }, { status: 400 })
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // ── Send ─────────────────────────────────────────────────────
  const results: { email: string; ok: boolean; id?: string; error?: string }[] = []

  for (const email of recipients) {
    try {
      if (type && VALID_EMAIL_TYPES.includes(type as EmailType)) {
        // Template-based email
        const result = await sendEmail({ to: email, type: type as EmailType, data: templateData || {} })
        results.push({ email, ok: result.ok, id: (result as any).id, error: (result as any).reason })
      } else if (subject && message) {
        // Custom composed email
        const html = adminLayout(`
          <h2 style="color:#BB5CF6;font-size:20px;font-weight:800;margin:0 0 16px;letter-spacing:0.04em">${escapeHtml(subject)}</h2>
          <div style="color:#94A3B8;font-size:15px;line-height:1.7">${escapeHtml(message)}</div>
        `)
        const result = await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html })
        results.push({ email, ok: !result.error, id: result.data?.id, error: result.error?.message })
      } else {
        results.push({ email, ok: false, error: 'Provide type (template) or subject + message (custom)' })
      }
    } catch (err: any) {
      results.push({ email, ok: false, error: err.message })
    }
  }

  const succeeded = results.filter(r => r.ok).length
  const failed    = results.filter(r => !r.ok).length

  return NextResponse.json({ ok: failed === 0, succeeded, failed, results })
}
