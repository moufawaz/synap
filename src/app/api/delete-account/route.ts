import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const admin = createAdminClient()

    // Some tables cascade from auth.users, but App Store review expects account
    // deletion to remove user data predictably. Delete explicitly and tolerate
    // optional tables that may not exist in every environment.
    const userOwnedTables = [
      'notifications',
      'weekly_reports',
      'supplement_recommendations',
      'billing_events',
      'message_usage',
      'chat_messages',
      'workout_sessions',
      'exercise_logs',
      'workout_logs',
      'meals_log',
      'measurements',
      'workout_plans',
      'diet_plans',
      'subscriptions',
      'profiles',
    ]

    for (const table of userOwnedTables) {
      const { error } = await admin.from(table).delete().eq('user_id', userId)
      if (error && !isMissingTableError(error.message)) {
        console.warn(`[delete-account] Could not delete ${table}:`, error.message)
      }
    }

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

function isMissingTableError(message?: string) {
  return !!message && (
    message.includes('Could not find the table') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  )
}
