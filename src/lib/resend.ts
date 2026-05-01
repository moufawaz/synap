import { Resend } from 'resend'

const resendKey = process.env.RESEND_API_KEY

export const resend = resendKey && resendKey !== 'your_resend_api_key'
  ? new Resend(resendKey)
  : null

export const FROM_EMAIL = 'Ion at SYNAP <ion@synapfit.app>'

export type EmailType =
  | 'welcome'
  | 'weekly_summary'
  | 'plan_renewal_warning'
  | 'new_plan'
  | 'milestone'

interface SendEmailOptions {
  to: string
  type: EmailType
  data: Record<string, any>
}

export async function sendEmail({ to, type, data }: SendEmailOptions) {
  if (!resend) {
    console.log('[Resend] API key not set — email skipped:', type)
    return { ok: false, reason: 'no_key' }
  }

  const templates: Record<EmailType, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to SYNAP — Ion is ready for you',
      html: `
        <div style="background:#0D0D1A;color:#F0F0FF;font-family:system-ui,sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto">
          <h1 style="color:#A78BFA;font-size:28px;margin-bottom:8px">Welcome, ${data.name}!</h1>
          <p style="color:#94A3B8;font-size:16px;line-height:1.6">Ion has reviewed everything you shared and built your personalised plan. Let's get to work.</p>
          <a href="https://synapfit.app/dashboard" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#7C3AED;color:white;border-radius:10px;text-decoration:none;font-weight:600">Open Dashboard</a>
          <p style="margin-top:40px;color:#475569;font-size:12px">SYNAP · The Intelligence of Sport · synapfit.app</p>
        </div>`,
    },
    weekly_summary: {
      subject: `Your weekly summary is ready — ${data.week}`,
      html: `
        <div style="background:#0D0D1A;color:#F0F0FF;font-family:system-ui,sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto">
          <h1 style="color:#22D3EE;font-size:24px">Week ${data.week} Summary</h1>
          <p style="color:#94A3B8;line-height:1.6">${data.name}, here's what you accomplished this week:</p>
          <div style="margin:24px 0;padding:20px;background:#121220;border-radius:10px;border:1px solid #1E1E35">
            <p style="color:#A78BFA;margin:0 0 8px">🏋️ Workouts: <strong style="color:white">${data.workouts || 0}</strong></p>
            <p style="color:#A78BFA;margin:0 0 8px">🥗 Meals logged: <strong style="color:white">${data.meals || 0}</strong></p>
            <p style="color:#A78BFA;margin:0">⚖️ Current weight: <strong style="color:white">${data.weight || '—'} kg</strong></p>
          </div>
          <a href="https://synapfit.app/progress" style="display:inline-block;padding:12px 28px;background:#7C3AED;color:white;border-radius:10px;text-decoration:none;font-weight:600">View Progress</a>
          <p style="margin-top:40px;color:#475569;font-size:12px">SYNAP · synapfit.app</p>
        </div>`,
    },
    plan_renewal_warning: {
      subject: `${data.name}, your ${data.planType} plan renews in 3 days`,
      html: `
        <div style="background:#0D0D1A;color:#F0F0FF;font-family:system-ui,sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto">
          <h1 style="color:#F59E0B;font-size:24px">Plan Renewal Coming Up</h1>
          <p style="color:#94A3B8;line-height:1.6">Your ${data.planType} plan ends in 3 days. Ion will generate a fresh plan based on your latest progress.</p>
          <a href="https://synapfit.app/chat" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#7C3AED;color:white;border-radius:10px;text-decoration:none;font-weight:600">Chat with Ion</a>
          <p style="margin-top:40px;color:#475569;font-size:12px">SYNAP · synapfit.app</p>
        </div>`,
    },
    new_plan: {
      subject: `Your new ${data.planType} plan is ready`,
      html: `
        <div style="background:#0D0D1A;color:#F0F0FF;font-family:system-ui,sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto">
          <h1 style="color:#10B981;font-size:24px">New Plan Ready 🎉</h1>
          <p style="color:#94A3B8;line-height:1.6">Ion has generated your updated ${data.planType} plan based on your progress over the last ${data.weeks} weeks.</p>
          <a href="https://synapfit.app/plan" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#7C3AED;color:white;border-radius:10px;text-decoration:none;font-weight:600">View New Plan</a>
          <p style="margin-top:40px;color:#475569;font-size:12px">SYNAP · synapfit.app</p>
        </div>`,
    },
    milestone: {
      subject: `🏆 Milestone unlocked — ${data.milestone}`,
      html: `
        <div style="background:#0D0D1A;color:#F0F0FF;font-family:system-ui,sans-serif;padding:40px;border-radius:12px;max-width:600px;margin:auto">
          <h1 style="color:#A78BFA;font-size:24px">🏆 ${data.milestone}</h1>
          <p style="color:#94A3B8;line-height:1.6">${data.message || 'You hit a new milestone. Ion is tracking every win.'}</p>
          <a href="https://synapfit.app/progress" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#7C3AED;color:white;border-radius:10px;text-decoration:none;font-weight:600">View Progress</a>
          <p style="margin-top:40px;color:#475569;font-size:12px">SYNAP · synapfit.app</p>
        </div>`,
    },
  }

  const template = templates[type]
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
    })
    return { ok: true, id: result.data?.id }
  } catch (err) {
    console.error('[Resend] Send failed:', err)
    return { ok: false, error: err }
  }
}
