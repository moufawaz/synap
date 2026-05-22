import { createRouteClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createRouteClient(req)
  const { user, error } = await getAuthenticatedUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('weekly_reports')
    .select('id, week_start, week_end, report_md, sent_at')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })
    .limit(4)

  return NextResponse.json({ reports: data || [] })
}
