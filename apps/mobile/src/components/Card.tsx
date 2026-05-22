import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { color } = useTheme()
  return <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.border }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
})
