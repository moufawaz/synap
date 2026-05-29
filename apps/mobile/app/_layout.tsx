import { Component, useEffect, useRef, type ReactNode } from 'react'
import { Platform, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'
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

// Keep the native splash up until auth has resolved, so users land directly on
// their data instead of a spinner. A safety timeout (below) guarantees it never
// hangs — Apple rejects artificially long splash screens.
SplashScreen.preventAutoHideAsync().catch(() => {})

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

/** Parse a time string "7:30 AM" / "13:00" / "8am" → { hour, minute } | null */
function parsePlanTime(raw: string | undefined): { hour: number; minute: number } | null {
  if (!raw) return null
  const s = String(raw).trim()
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3]?.toLowerCase()
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0
  if (hour < 0 || hour > 23) return null
  return { hour, minute }
}

/** Silently register push token if permission is already granted — no prompt shown */
async function tryAutoRegisterPush() {
  try {
    if (!Device.isDevice) return
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return  // don't prompt here; user can enable in Notifications screen

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId ||
      '5fb169d2-85c2-48ef-990f-960a395e7c6a' // fallback for Direct Builds
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await registerDeviceToken({ token, platform: Platform.OS })

    // Build meal reminders from cached plan times so each meal gets its own reminder
    let mealTimes: Array<{ hour: number; minute: number; name: string }> | undefined
    try {
      const raw = await AsyncStorage.getItem('@sdc:plan-history')
      if (raw) {
        const cached = JSON.parse(raw)
        const meals: any[] = cached?.data?.activeDietPlan?.plan_json?.meals || []
        const parsed = meals
          .map((m: any) => {
            const t = parsePlanTime(m.time || m.meal_time)
            return t ? { ...t, name: m.name || m.meal_name || 'Meal' } : null
          })
          .filter((x): x is { hour: number; minute: number; name: string } => x !== null)
        if (parsed.length) mealTimes = parsed
      }
    } catch {}

    await scheduleSynapReminders({ mealTimes })
  } catch { /* non-fatal */ }
}

function RootNavigator() {
  const { mode, color } = useTheme()
  const { session, loading } = useAuth()
  const pushRegistered = useRef(false)
  const splashHidden = useRef(false)

  // Hide the splash as soon as auth resolves (cached data then paints instantly),
  // with a hard 4s safety cap so a slow network can never strand users on splash.
  useEffect(() => {
    if (splashHidden.current) return
    const hide = () => {
      if (splashHidden.current) return
      splashHidden.current = true
      SplashScreen.hideAsync().catch(() => {})
    }
    if (!loading) hide()
    const safety = setTimeout(hide, 4000)
    return () => clearTimeout(safety)
  }, [loading])

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
