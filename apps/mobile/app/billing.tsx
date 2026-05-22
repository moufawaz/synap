import { StyleSheet, Text } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { getMobileBillingStatus } from '@/features/billing'
import { getSubscriptionStatus } from '@/features/subscription'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

export default function BillingScreen() {
  const { color } = useTheme()
  const status = getMobileBillingStatus()
  const subscription = useAsyncData(getSubscriptionStatus, [])

  return (
    <Screen>
      <PageHeader eyebrow="BILLING" title="Subscription" subtitle="Manage your current access." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Current access</Text>
        <Text style={[styles.body, { color: color.text }]}>
          {subscription.loading ? 'Checking subscription...' : `${(subscription.data?.tier ?? 'starter').toUpperCase()} ${subscription.data?.status ?? ''}`}
        </Text>
        {subscription.data?.planName ? <Text style={[styles.body, { color: color.muted }]}>{subscription.data.planName}</Text> : null}
        <Text style={[styles.body, { color: color.muted }]}>{status.reason}</Text>
        <Text style={[styles.body, { color: color.flame }]}>For subscription or billing help, contact SYNAP support from the More tab.</Text>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 8 } })
