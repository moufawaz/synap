import { useEffect, useRef } from 'react'
import { Animated, StyleProp, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

/** A pulsing placeholder block shown while data loads, so screens render their
 *  structure immediately instead of a lone spinner. */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const { color } = useTheme()
  const pulse = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: color.elevated, opacity: pulse },
        style,
      ]}
    />
  )
}
