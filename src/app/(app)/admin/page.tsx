import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Users, Dumbbell, UtensilsCrossed, MessageCircle, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmail = process.env.ADMIN_EMAIL
  if (user.email !== adminEmail) redirect('/dashboard')

  // Load stats
  const [usersRes, profilesRes, workoutPlansRes, dietPlansRes, chatRes, logsRes] = await Promise.all([
    supabase.from('users').select('id, email, created_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('user_id, name, goal, created_at').order('created_at', { ascending: false }),
    supabase.from('workout_plans').select('id', { count: 'exact' }).eq('active', true),
    supabase.from('diet_plans').select('id', { count: 'exact' }).eq('active', true),
    supabase.from('chat_messages').select('id', { count: 'exact' }),
    supabase.from('workout_log').select('id', { count: 'exact' }),
  ])

  const users = usersRes.data || []
  const profiles = profilesRes.data || []

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: '#BB5CF6' },
    { label: 'Active Plans', value: (workoutPlansRes.count || 0), icon: Dumbbell, color: '#108981' },
    { label: 'Diet Plans', value: (dietPlansRes.count || 0), icon: UtensilsCrossed, color: '#F97316' },
    { label: 'Chat Messages', value: (chatRes.count || 0), icon: MessageCircle, color: '#3B82F6' },
    { label: 'Workouts Logged', value: (logsRes.count || 0), icon: TrendingUp, color: '#10B981' },
  ]

  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Fat',
    build_muscle: 'Build Muscle',
    recomposition: 'Recomp',
    improve_fitness: 'Fitness',
    be_healthier: 'Health',
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-5xl mx-auto">

      <div className="mb-8">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>
          ADMINISTRATION
        </p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
          SYNAP Admin
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="font-heading text-[10px] tracking-wider" style={{ color: '#475569' }}>{s.label}</span>
            </div>
            <span className="font-heading font-black text-2xl text-white">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
            ALL USERS ({users.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>EMAIL</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>NAME</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>GOAL</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const profile = profiles.find(p => p.user_id === u.id)
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs text-white">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs" style={{ color: '#94A3B8' }}>
                        {profile?.name || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {profile?.goal ? (
                        <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6' }}>
                          {goalLabels[profile.goal] || profile.goal}
                        </span>
                      ) : <span style={{ color: '#2D3748' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs" style={{ color: '#475569' }}>
                        {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goal breakdown */}
      <div className="glass-card p-5">
        <p className="font-heading font-black text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.06em' }}>
          GOAL BREAKDOWN
        </p>
        <div className="flex flex-col gap-3">
          {Object.entries(goalLabels).map(([key, label]) => {
            const count = profiles.filter(p => p.goal === key).length
            const pct = profiles.length > 0 ? (count / profiles.length) * 100 : 0
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="font-heading text-xs text-white">{label}</span>
                  <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({Math.round(pct)}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: '#BB5CF6', transition: 'width 0.5s ease' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
