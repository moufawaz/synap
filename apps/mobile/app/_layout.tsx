import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '@/auth/AuthProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

function routeFromNotification(response: Notifications.NotificationResponse | null | undefined) {
  const data = response?.notification.request.content.data || {}
  const url = typeof data.url === 'string' ? data.url : null
  const type = typeof data.type === 'string' ? data.type : ''

  if (url) return url
  if (type.includes('meal') || type.includes('nutrition')) return '/(tabs)/nutrition'
  if (type.includes('workout') || type.includes('training')) return '/(tabs)/train'
  if (type.includes('measurement') || type.includes('progress')) return '/(tabs)/progress'
  if (type.includes('report')) return '/reports'
  if (type.includes('plan')) return '/plan'
  return '/(tabs)'
}

function RootNavigator() {
  const { mode, color } = useTheme()

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(response => {
      const target = routeFromNotification(response)
      if (response && target) setTimeout(() => router.push(target as any), 300)
    }).catch(() => {})

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const target = routeFromNotification(response)
      if (target) router.push(target as any)
    })
    return () => sub.remove()
  }, [])

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
        }}
      />
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
