import { Tabs } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function TabLayout() {
  const { color } = useTheme()
  const { text } = useLanguage()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.spark,
        tabBarInactiveTintColor: color.dim,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          minHeight: 72,
          paddingTop: 8,
        },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: text.dashboard, tabBarIcon: ({ color: iconColor }) => <Feather name="grid" color={iconColor} size={22} /> }} />
      <Tabs.Screen name="chat" options={{ title: text.chat, tabBarIcon: ({ color: iconColor }) => <Feather name="message-circle" color={iconColor} size={23} /> }} />
      <Tabs.Screen name="train" options={{ title: text.train, tabBarIcon: ({ color: iconColor }) => <Feather name="activity" color={iconColor} size={22} /> }} />
      <Tabs.Screen name="nutrition" options={{ title: text.nutrition, tabBarIcon: ({ color: iconColor }) => <Feather name="coffee" color={iconColor} size={22} /> }} />
      <Tabs.Screen name="progress" options={{ title: text.progress, tabBarIcon: ({ color: iconColor }) => <Feather name="trending-up" color={iconColor} size={22} /> }} />
      <Tabs.Screen name="more" options={{ title: text.more, tabBarIcon: ({ color: iconColor }) => <Feather name="more-horizontal" color={iconColor} size={22} /> }} />
    </Tabs>
  )
}
