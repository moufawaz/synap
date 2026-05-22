import { ReactNode } from 'react'
import { ScrollView, StyleSheet, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { color } = useTheme()
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, style]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
})
