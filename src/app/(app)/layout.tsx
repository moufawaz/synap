import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import AdaptationChecker from '@/components/dashboard/AdaptationChecker'
import OneSignalInit from '@/components/OneSignalInit'
import ArabicUiTranslator from '@/components/i18n/ArabicUiTranslator'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase.from('profiles').select('name, gender').eq('user_id', user.id).maybeSingle(),
    supabase.from('users').select('language').eq('id', user.id).maybeSingle(),
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
    <div
      className="flex min-h-screen"
      style={{ background: 'var(--void)' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
    >
      <Sidebar user={userInfo} lang={lang} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav lang={lang} />
      <ArabicUiTranslator lang={lang} />
      <AdaptationChecker />
      <OneSignalInit userId={user.id} />
    </div>
  )
}
