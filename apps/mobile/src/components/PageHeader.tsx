import { StyleSheet, Text, View } from 'react-native'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const { color } = useTheme()
  const { isRtl } = useLanguage()

  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
})
