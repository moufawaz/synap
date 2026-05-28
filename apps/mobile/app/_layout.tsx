import { Component, useEffect, useRef, type ReactNode } from 'react'
import { Platform, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { registerDeviceToken } from '@/features/tools'
import { scheduleSynapReminders } from '@/features/notifications'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error: error?.message || 'An unexpected error occurred.' }
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#050507' }}>
          <Text style={{ color: '#BB5CF6', fontSize: 16, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>SYNAP</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>{this.state.error}</Text>
        </View>
      )
    }
    return this.props.children
  }
}

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

/** Silently register push token if permission is already granted — no prompt shown */
async function tryAutoRegisterPush() {
  try {
    if (!Device.isDevice) return
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return  // don't prompt here; user can enable in Notifications screen

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || (Constants as any).easConfig?.projectId
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    await registerDeviceToken({ token, platform: Platform.OS })
    await scheduleSynapReminders()   // ensure daily reminders are scheduled
  } catch { /* non-fatal */ }
}

function RootNavigator() {
  const { mode, color } = useTheme()
  const { session, loading } = useAuth()
  const pushRegistered = useRef(false)

  // Safety net: any sign-out path (signOut(), token expiry, etc.) redirects to login
  useEffect(() => {
    if (!loading && session === null) {
      pushRegistered.current = false
      router.replace('/(auth)/login')
    }
    // Auto-register push token once per session when user is authenticated
    if (!loading && session !== null && !pushRegistered.current) {
      pushRegistered.current = true
      tryAutoRegisterPush()
    }
  }, [session, loading])

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
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
