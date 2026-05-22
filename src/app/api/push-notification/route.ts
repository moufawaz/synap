import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { sendPushNotification, VALID_PUSH_TYPES, type PushType } from '@/lib/onesignal'

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, overrides }: { type: PushType; overrides?: any } = await req.json()
    if (!type || !VALID_PUSH_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid or missing type' }, { status: 400 })

    const result = await sendPushNotification({ userId: user.id, type, overrides })

    const admin = createAdminClient()
    await admin.from('notifications').insert({
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
