import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function Index() {
  const { session, loading } = useAuth()
  const { color } = useTheme()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
        <ActivityIndicator color={color.spark} />
      </View>
    )
  }

  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />
}
