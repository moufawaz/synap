import { ReactNode } from 'react'
import { ScrollView, StyleSheet, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'

export function Screen({ children, style, scroll = true }: { children: ReactNode; style?: ViewStyle; scroll?: boolean }) {
  const { color } = useTheme()
  // Only inset the top/sides — the bottom is owned by the tab bar (which adds its
  // own safe-area inset). Insetting the bottom here left an empty bg-colored band
  // between the content and the tab bar on every screen.
  const edges = ['top', 'left', 'right'] as const
  if (!scroll) {
    return (
      <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: color.bg }]}>
        {children}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: color.bg }]}>
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
