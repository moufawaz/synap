import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, StyleSheet, Image, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'

/**
 * Full-screen branded loading screen shown while the app resolves auth + cached
 * data. It displays the same artwork as the native splash (assets/splash.png),
 * so the handoff from the OS splash to this JS view is seamless — but unlike the
 * static native splash, this one shows a live loading spinner near the bottom.
 *
 * On first layout it hides the native splash, so the user sees: native splash
 * (instant) → this view with spinner (while loading) → app. When `visible`
 * flips to false it fades out and unmounts.
 */
export default function LoadingSplash({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current
  const [mounted, setMounted] = useState(true)
  const handedOff = useRef(false)

  const handoffFromNativeSplash = () => {
    if (handedOff.current) return
    handedOff.current = true
    SplashScreen.hideAsync().catch(() => {})
  }

  useEffect(() => {
    if (visible) return
    Animated.timing(opacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => setMounted(false))
  }, [visible, opacity])

  if (!mounted) return null

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.fill, { opacity }]}
      onLayout={handoffFromNativeSplash}
    >
      <Image
        source={require('../../assets/splash.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="small" color="#BB5CF6" />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
    elevation: 9999,
  },
  spinnerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72,
    alignItems: 'center',
  },
})
