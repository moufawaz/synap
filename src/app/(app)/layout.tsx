import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import AdaptationChecker from '@/components/dashboard/AdaptationChecker'
import OneSignalInit from '@/components/OneSignalInit'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase.from('profiles').select('name, gender').eq('user_id', user.id).single(),
    supabase.from('users').select('language').eq('id', user.id).single(),
  ])

  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = user.email === adminEmail

  const userInfo = {
    name: profile?.name || user.email?.split('@')[0] || 'Athlete',
    email: user.email || '',
    gender: profile?.gender || 'male',
    isAdmin,
  }

  const lang = (userData?.language || 'en') as 'en' | 'ar'

  return (
    <div className="flex min-h-screen" style={{ background: '#0D0D1A' }}>
      <Sidebar user={userInfo} lang={lang} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
      <AdaptationChecker />
      <OneSignalInit userId={user.id} />
    </div>
  )
}
