import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface CardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Highlight the top edge in the brand spark colour — matches web glass-card treatment */
  accent?: boolean
}

export function Card({ children, style, accent = false }: CardProps) {
  const { color } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.border }, style]}>
      {/* Subtle top-edge highlight that mimics the web glass-card inner glow */}
      <View
        style={[
          styles.topHighlight,
          { backgroundColor: accent ? color.spark : 'rgba(255,255,255,0.055)' },
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderRadius: 20,
  },
})
