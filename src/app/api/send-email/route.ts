import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail, type EmailType } from '@/lib/resend'

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, data }: { type: EmailType; data: Record<string, any> } = await req.json()
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    const result = await sendEmail({ to: user.email!, type, data })

    // Log notification to DB
    await supabase.from('notifications').insert({
      user_id: user.id,
      type,
      title: `Email: ${type}`,
      body: JSON.stringify(data),
      channel: 'email',
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
