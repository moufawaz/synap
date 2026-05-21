import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import AdaptationChecker from '@/components/dashboard/AdaptationChecker'
import TrialBanner from '@/components/dashboard/TrialBanner'
import OneSignalInit from '@/components/OneSignalInit'
import DeepLinkHandler from '@/components/DeepLinkHandler'
import NotificationManager from '@/components/NotificationManager'
import ArabicUiTranslator from '@/components/i18n/ArabicUiTranslator'
import { getUserSubscription, getTrialDaysRemaining, isFreeTrial } from '@/lib/subscription'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: userData }, sub] = await Promise.all([
    supabase.from('profiles').select('name, gender').eq('user_id', user.id).maybeSingle(),
    supabase.from('users').select('language').eq('id', user.id).maybeSingle(),
    getUserSubscription(user.id),
  ])

  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = user.email === adminEmail
  const lang = (userData?.language || 'en') as 'en' | 'ar'

  const userInfo = {
    name: profile?.name || user.email?.split('@')[0] || 'Athlete',
    email: user.email || '',
    gender: profile?.gender || 'male',
    isAdmin,
  }

  const trialDaysLeft = getTrialDaysRemaining(sub)
  const isFreeTrialActive = isFreeTrial(sub)

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: 'var(--void)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
    >
      <Sidebar user={userInfo} lang={lang} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0 flex flex-col">
        {isFreeTrialActive && trialDaysLeft !== null && (
          <TrialBanner
            daysLeft={trialDaysLeft}
            isFreeTrial={isFreeTrialActive}
            lang={lang}
          />
        )}
        <div className="flex-1">
          {children}
        </div>
      </main>
      <MobileNav lang={lang} />
      <ArabicUiTranslator lang={lang} />
      <AdaptationChecker />
      <OneSignalInit userId={user.id} />
      <DeepLinkHandler />
      <NotificationManager />
    </div>
  )
}
