import { Image, StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

type IonAvatarProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
}

const sizes = {
  sm: 34,
  md: 48,
  lg: 66,
  xl: 96,
}

export function IonAvatar({ size = 'md', showStatus = true }: IonAvatarProps) {
  const { color } = useTheme()
  const px = sizes[size]
  const status = Math.max(8, Math.round(px * 0.18))

  return (
    <View
      style={[
        styles.wrap,
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          borderColor: color.spark,
          shadowColor: color.spark,
        },
      ]}
    >
      <View style={[styles.aura, { borderRadius: px / 2, backgroundColor: color.sparkSoft }]} />
      <Image source={require('../../assets/ion-avatar.png')} style={styles.image} resizeMode="cover" />
      {showStatus ? (
        <View
          style={[
            styles.status,
            {
              width: status,
              height: status,
              borderRadius: status / 2,
              borderColor: color.bg,
              backgroundColor: color.pulse,
            },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#050510',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  aura: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  status: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    borderWidth: 2,
  },
})
