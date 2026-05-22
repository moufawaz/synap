import { StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { getSubscriptionStatus } from '@/features/subscription'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function DashboardScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const subscription = useAsyncData(getSubscriptionStatus, [])
  const tier = subscription.data?.tier ?? 'starter'

  return (
    <Screen>
      <PageHeader eyebrow="SYNAP" title={text.dashboard} subtitle={text.launchAccess} />
      <View style={styles.grid}>
        <Card style={{ borderColor: tier === 'elite' ? color.spark : color.border }}>
          <Text style={[styles.label, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>Access</Text>
          <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {subscription.loading ? 'Checking access...' : `${tier.toUpperCase()} access`}
          </Text>
          <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
            {subscription.error || subscription.data?.planName || text.launchAccess}
          </Text>
        </Card>
        <Card>
          <Text style={[styles.label, { color: color.flame, textAlign: isRtl ? 'right' : 'left' }]}>{text.todayWorkout}</Text>
          <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.comingNext}</Text>
          <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>Workout plan, session timer, set logging, and progression suggestions will connect here.</Text>
        </Card>
        <Card>
          <Text style={[styles.label, { color: color.pulse, textAlign: isRtl ? 'right' : 'left' }]}>{text.todaysMeals}</Text>
          <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>Nutrition sync</Text>
          <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>Meals, macros, water, barcode, and food photo logging will use the existing Supabase-backed APIs.</Text>
        </Card>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: {
    gap: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
})
