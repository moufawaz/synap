import { Image, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

type SynapLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  stacked?: boolean
  showTagline?: boolean
}

const iconSizes = {
  sm: 34,
  md: 48,
  lg: 72,
}

export function SynapLogo({ size = 'md', stacked = false, showTagline = false }: SynapLogoProps) {
  const { color } = useTheme()
  const icon = iconSizes[size]

  return (
    <View style={[styles.wrap, stacked ? styles.stacked : styles.row]}>
      <Image source={require('../../assets/icon.png')} style={{ width: icon, height: icon, borderRadius: icon * 0.22 }} resizeMode="contain" />
      <View style={stacked ? styles.center : undefined}>
        <Text style={[styles.name, { color: color.text, fontSize: size === 'lg' ? 24 : size === 'md' ? 18 : 15 }]}>SYNAP</Text>
        {showTagline ? (
          <Text style={[styles.tagline, { color: color.muted }]}>
            PERFORMANCE <Text style={{ color: color.spark }}>CONNECTED.</Text>
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  stacked: {
    gap: 8,
  },
  center: {
    alignItems: 'center',
  },
  name: {
    fontWeight: '900',
    letterSpacing: 6,
  },
  tagline: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
})
