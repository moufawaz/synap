import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  try {
    // 1. Verify the requesting user is authenticated
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // 2. Delete user data — profiles, etc. cascade via FK if set up,
    //    otherwise delete explicitly here before removing the auth user.
    const admin = createAdminClient()

    // Delete profile row (may already cascade, but be explicit)
    await admin.from('profiles').delete().eq('user_id', userId)

    // 3. Delete the auth user — this removes the login entirely
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[delete-account] Failed to delete auth user:', deleteError.message)
      return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-account] Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 })
  }
}
