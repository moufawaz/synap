import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '@/auth/AuthProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'

function RootNavigator() {
  const { mode, color } = useTheme()

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
