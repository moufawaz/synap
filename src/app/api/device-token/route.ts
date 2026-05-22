import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const provider = typeof body.provider === 'string' ? body.provider.trim() : 'expo'
    const platform = typeof body.platform === 'string' ? body.platform.trim() : null

    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          provider,
          platform,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider,token' }
      )

    if (error) {
      return NextResponse.json(
        {
          error: 'Push token table is not ready',
          detail: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not register device token' }, { status: 500 })
  }
}
