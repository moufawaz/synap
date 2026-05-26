import { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  /** Pass true when the user has an active subscription. When false, shows the gate. */
  hasAccess: boolean
  children: ReactNode
  /** Override the feature name shown in the gate label */
  featureName?: string
  featureNameAr?: string
}

/**
 * Wraps premium content. Renders children when hasAccess is true.
 * When false, renders a clean lock gate that navigates to the billing screen.
 * No prices, no links — Apple App Review safe.
 */
export function UpgradeGate({ hasAccess, children, featureName, featureNameAr }: Props) {
  const { color } = useTheme()
  const { isRtl } = useLanguage()

  if (hasAccess) return <>{children}</>

  const name = isRtl
    ? (featureNameAr ?? 'هذه الميزة')
    : (featureName ?? 'This feature')

  return (
    <View style={[styles.gate, { backgroundColor: color.surface, borderColor: color.border }]}>
      {/* Lock icon */}
      <View style={[styles.iconWrap, { backgroundColor: color.sparkSoft }]}>
        <Feather name="lock" size={22} color={color.spark} />
      </View>

      {/* Copy */}
      <Text style={[styles.title, { color: color.text }]}>
        {isRtl ? `${name} حصرية` : `${name} is Premium`}
      </Text>
      <Text style={[styles.body, { color: color.muted }]}>
        {isRtl
          ? 'اشترك في SYNAP للوصول الكامل لكوتش آيون وخطط التغذية وبرامج التمرين.'
          : 'Subscribe to SYNAP for full access to your Ion coach, nutrition plans, and workout programmes.'}
      </Text>

      {/* CTA — navigates to the billing screen (no external URL) */}
      <Pressable
        style={[styles.btn, { backgroundColor: color.spark }]}
        onPress={() => router.push('/billing')}
      >
        <Feather name="star" size={14} color="#fff" />
        <Text style={styles.btnText}>
          {isRtl ? 'كيفية الاشتراك' : 'How to subscribe'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  gate: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  body: { fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
})
