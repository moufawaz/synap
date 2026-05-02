import { Resend } from 'resend'

const resendKey = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.synapfit.app'

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
  | 'trial_started'
  | 'trial_ending_day5'
  | 'trial_ending_day6'
  | 'trial_cancelled'
  | 'subscription_cancelled'
  | 'subscription_renewed'
  | 'payment_failed'
  | 'upgrade_confirmation'

interface SendEmailOptions {
  to: string
  type: EmailType
  data: Record<string, any>
}

// ── Shared layout wrapper ──────────────────────────────────────
function layout(content: string): string {
  return `
    <div style="background:#0D0D1A;color:#F0F0FF;font-family:system-ui,-apple-system,sans-serif;padding:0;margin:0">
      <div style="max-width:580px;margin:0 auto;padding:40px 24px">
        <div style="margin-bottom:32px">
          <span style="font-size:18px;font-weight:900;letter-spacing:0.15em;color:#BB5CF6">SYNAP</span>
        </div>
        ${content}
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #1E1E35">
          <p style="color:#334155;font-size:12px;margin:0">SYNAP · The Intelligence of Sport · <a href="${APP_URL}" style="color:#475569">${APP_URL.replace('https://', '')}</a></p>
          <p style="color:#334155;font-size:11px;margin:4px 0 0">You received this because you have a SYNAP account. <a href="${APP_URL}/settings" style="color:#475569">Manage preferences</a></p>
        </div>
      </div>
    </div>`
}

function btn(text: string, href: string, color = '#7C3AED'): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:${color};color:white;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.05em">${text}</a>`
}

export async function sendEmail({ to, type, data }: SendEmailOptions) {
  if (!resend) {
    console.log('[Resend] API key not set — email skipped:', type)
    return { ok: false, reason: 'no_key' }
  }

  const templates: Record<EmailType, { subject: string; html: string }> = {

    welcome: {
      subject: 'Welcome to SYNAP — Ion is ready for you',
      html: layout(`
        <h1 style="color:#A78BFA;font-size:28px;font-weight:900;margin:0 0 8px">Welcome, ${data.name}!</h1>
        <p style="color:#94A3B8;font-size:16px;line-height:1.6;margin:8px 0 0">Ion has reviewed everything you shared and built your personalised plan. Let's get to work.</p>
        ${btn('Open My Dashboard', `${APP_URL}/dashboard`)}
      `),
    },

    trial_started: {
      subject: '🎯 Your 7-day free trial has started',
      html: layout(`
        <h1 style="color:#10B981;font-size:26px;font-weight:900;margin:0 0 8px">Your trial is live, ${data.name}!</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">You now have full Pro access for 7 days. Here's what you need to know:</p>
        <div style="margin:24px 0;padding:20px;background:#0A1628;border-radius:12px;border:1px solid rgba(16,185,129,0.2)">
          <p style="color:#10B981;font-weight:700;margin:0 0 12px;font-size:14px">✅ ZERO-CHARGE CANCEL GUARANTEE</p>
          <p style="color:#94A3B8;font-size:14px;margin:0;line-height:1.6">If you cancel before Day 7, you will <strong style="color:white">never be charged</strong> — not a single riyal. No catches, no fine print.</p>
        </div>
        <p style="color:#64748B;font-size:14px">Ion will message you on Days 5 and 6 as a reminder. You can cancel anytime from <strong style="color:#94A3B8">Settings → Billing</strong>.</p>
        ${btn('Start Training', `${APP_URL}/dashboard`)}
      `),
    },

    trial_ending_day5: {
      subject: `⏰ ${data.name}, 2 days left in your trial`,
      html: layout(`
        <h1 style="color:#F59E0B;font-size:26px;font-weight:900;margin:0 0 8px">2 days left in your trial</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, your free trial ends in 2 days. If you'd like to keep Ion as your coach, no action needed — you'll be automatically charged on Day 7.</p>
        <div style="margin:24px 0;padding:20px;background:#0A1628;border-radius:12px;border:1px solid rgba(245,158,11,0.2)">
          <p style="color:#F59E0B;font-weight:700;margin:0 0 8px;font-size:14px">Your plan: ${data.planName || 'Pro'}</p>
          <p style="color:#94A3B8;font-size:14px;margin:0">Renews on: <strong style="color:white">${data.renewsOn || 'Day 7'}</strong></p>
        </div>
        <p style="color:#64748B;font-size:13px">Want to cancel? Go to <a href="${APP_URL}/settings?tab=billing" style="color:#BB5CF6">Settings → Billing</a> before Day 7 and you'll never be charged.</p>
        ${btn('Keep My Plan', `${APP_URL}/dashboard`)}
      `),
    },

    trial_ending_day6: {
      subject: `🚨 Last day — trial ends tomorrow`,
      html: layout(`
        <h1 style="color:#EF4444;font-size:26px;font-weight:900;margin:0 0 8px">Trial ends tomorrow</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, this is your last chance to cancel with zero charges. After tomorrow, your subscription activates.</p>
        <div style="margin:24px 0;padding:20px;background:#0A1628;border-radius:12px;border:1px solid rgba(239,68,68,0.2)">
          <p style="color:#EF4444;font-weight:700;margin:0 0 8px;font-size:14px">⚠️ ACTION REQUIRED IF CANCELLING</p>
          <p style="color:#94A3B8;font-size:14px;margin:0">Cancel before midnight tonight at <a href="${APP_URL}/settings?tab=billing" style="color:#BB5CF6">Settings → Billing</a> to avoid any charge.</p>
        </div>
        <p style="color:#64748B;font-size:13px">If you're keeping your plan — great! No action needed. Ion will be here for you.</p>
        ${btn('Manage Subscription', `${APP_URL}/settings?tab=billing`)}
      `),
    },

    trial_cancelled: {
      subject: '✅ Trial cancelled — zero charges confirmed',
      html: layout(`
        <h1 style="color:#10B981;font-size:26px;font-weight:900;margin:0 0 8px">Confirmed: No Charges</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, your trial has been cancelled. As promised — you will never be charged, not even a penny.</p>
        <div style="margin:24px 0;padding:20px;background:#0A1628;border-radius:12px;border:1px solid rgba(16,185,129,0.2)">
          <p style="color:#10B981;font-weight:700;margin:0 0 4px;font-size:14px">✅ Charge status: ZERO</p>
          <p style="color:#64748B;font-size:13px;margin:0">Your free plan remains active with 5 messages/day.</p>
        </div>
        <p style="color:#64748B;font-size:14px">You're always welcome back whenever you're ready. SYNAP will be here.</p>
        ${btn('Return to SYNAP', `${APP_URL}/dashboard`)}
      `),
    },

    subscription_cancelled: {
      subject: 'Subscription cancelled — access continues until period ends',
      html: layout(`
        <h1 style="color:#94A3B8;font-size:24px;font-weight:900;margin:0 0 8px">Subscription Cancelled</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, your subscription has been cancelled. You keep full access until <strong style="color:white">${data.endsAt || 'end of period'}</strong>.</p>
        <p style="color:#64748B;font-size:14px">After that, you'll revert to the free plan (5 messages/day). You can re-subscribe anytime.</p>
        ${btn('Resubscribe', `${APP_URL}/pricing`)}
      `),
    },

    subscription_renewed: {
      subject: `✅ Subscription renewed — ${data.planName}`,
      html: layout(`
        <h1 style="color:#10B981;font-size:24px;font-weight:900;margin:0 0 8px">Renewed! ✅</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, your ${data.planName} subscription has been renewed. Next billing date: <strong style="color:white">${data.nextDate || 'next period'}</strong>.</p>
        ${btn('Open Dashboard', `${APP_URL}/dashboard`)}
      `),
    },

    payment_failed: {
      subject: '⚠️ Payment failed — action required',
      html: layout(`
        <h1 style="color:#EF4444;font-size:24px;font-weight:900;margin:0 0 8px">Payment Failed</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, your recent payment failed. Your account has been set to past-due. Please update your payment method to continue Pro access.</p>
        ${btn('Update Payment Method', `${APP_URL}/settings?tab=billing`, '#EF4444')}
      `),
    },

    upgrade_confirmation: {
      subject: `🚀 Welcome to ${data.planName}!`,
      html: layout(`
        <h1 style="color:#BB5CF6;font-size:26px;font-weight:900;margin:0 0 8px">You're on ${data.planName}!</h1>
        <p style="color:#94A3B8;font-size:15px;line-height:1.6">${data.name}, your subscription is now active. Ion is ready to take your training to the next level.</p>
        ${btn('Start Training', `${APP_URL}/dashboard`)}
      `),
    },

    weekly_summary: {
      subject: `Your weekly summary is ready — ${data.week}`,
      html: layout(`
        <h1 style="color:#22D3EE;font-size:24px;font-weight:900;margin:0 0 8px">Week ${data.week} Summary</h1>
        <p style="color:#94A3B8;line-height:1.6">${data.name}, here's what you accomplished this week:</p>
        <div style="margin:24px 0;padding:20px;background:#0A1628;border-radius:10px;border:1px solid #1E1E35">
          <p style="color:#A78BFA;margin:0 0 8px">🏋️ Workouts: <strong style="color:white">${data.workouts || 0}</strong></p>
          <p style="color:#A78BFA;margin:0 0 8px">🥗 Meals logged: <strong style="color:white">${data.meals || 0}</strong></p>
          <p style="color:#A78BFA;margin:0">⚖️ Current weight: <strong style="color:white">${data.weight || '—'} kg</strong></p>
        </div>
        ${btn('View Progress', `${APP_URL}/progress`)}
      `),
    },

    plan_renewal_warning: {
      subject: `${data.name}, your ${data.planType} plan renews in 3 days`,
      html: layout(`
        <h1 style="color:#F59E0B;font-size:24px;font-weight:900;margin:0 0 8px">Plan Renewal Coming Up</h1>
        <p style="color:#94A3B8;line-height:1.6">Your ${data.planType} plan ends in 3 days. Ion will generate a fresh plan based on your latest progress.</p>
        ${btn('Chat with Ion', `${APP_URL}/chat`)}
      `),
    },

    new_plan: {
      subject: `Your new ${data.planType} plan is ready`,
      html: layout(`
        <h1 style="color:#10B981;font-size:24px;font-weight:900;margin:0 0 8px">New Plan Ready 🎉</h1>
        <p style="color:#94A3B8;line-height:1.6">Ion has generated your updated ${data.planType} plan based on your progress over the last ${data.weeks} weeks.</p>
        ${btn('View New Plan', `${APP_URL}/plan`)}
      `),
    },

    milestone: {
      subject: `🏆 Milestone unlocked — ${data.milestone}`,
      html: layout(`
        <h1 style="color:#A78BFA;font-size:24px;font-weight:900;margin:0 0 8px">🏆 ${data.milestone}</h1>
        <p style="color:#94A3B8;line-height:1.6">${data.message || 'You hit a new milestone. Ion is tracking every win.'}</p>
        ${btn('View Progress', `${APP_URL}/progress`)}
      `),
    },
  }

  const template = templates[type]
  if (!template) {
    console.warn('[Resend] Unknown email type:', type)
    return { ok: false, reason: 'unknown_type' }
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
    })
    return { ok: true, id: result.data?.id }
  } catch (err) {
    console.error('[Resend] Send failed:', type, err)
    return { ok: false, error: err }
  }
}
