import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendPushNotification, type PushType } from '@/lib/onesignal'

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, overrides }: { type: PushType; overrides?: any } = await req.json()
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    const result = await sendPushNotification({ userId: user.id, type, overrides })

    // Log
    await supabase.from('notifications').insert({
      user_id: user.id,
      type,
      title: overrides?.title || type,
      body: overrides?.body || '',
      channel: 'push',
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
