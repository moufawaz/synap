import { Pressable, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Standard iOS-style back affordance for screens pushed from the More tab (or
 * anywhere that isn't a tab root). Required so every feature has a visible
 * back/cancel control — App Store Guideline 4. Falls back to the More tab if
 * there's no navigation history (e.g. deep link).
 */
export function BackButton() {
  const { isRtl } = useLanguage()
  const { color } = useTheme()
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'))}
      style={[styles.btn, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={isRtl ? 'رجوع' : 'Back'}
    >
      <Feather name={isRtl ? 'arrow-right' : 'arrow-left'} size={18} color={color.muted} />
      <Text style={[styles.text, { color: color.muted }]}>{isRtl ? 'رجوع' : 'Back'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 10 },
  text: { fontSize: 14, fontWeight: '700' },
})
