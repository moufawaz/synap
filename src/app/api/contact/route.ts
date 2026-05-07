import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 })
    }

    await resend.emails.send({
      from:    'SYNAP Contact <ion@synapfit.app>',
      to:      'ion@synapfit.app',
      replyTo: email,
      subject: subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
          <h2 style="color: #BB5CF6; font-size: 20px; margin-bottom: 24px;">New Contact Message — SYNAP</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 100px; vertical-align: top;">Name</td>
              <td style="padding: 8px 0; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #BB5CF6;">${email}</a></td>
            </tr>
            ${subject ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Subject</td>
              <td style="padding: 8px 0;">${subject}</td>
            </tr>` : ''}
          </table>
          <div style="margin-top: 24px; padding: 20px; background: #111; border-radius: 8px; border-left: 3px solid #BB5CF6;">
            <p style="margin: 0; line-height: 1.7; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #334155;">Sent via synapfit.app contact form</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[contact]', err?.message)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }
}
