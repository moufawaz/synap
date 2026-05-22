import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { cancelWebSubscription, getMobileBillingStatus } from '@/features/billing'
import { useTheme } from '@/theme/ThemeProvider'

export default function BillingScreen() {
  const { color } = useTheme()
  const status = getMobileBillingStatus()
  const webBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'

  async function cancel() {
    try {
      const res = await cancelWebSubscription()
      Alert.alert('Billing', res.message || 'Cancelled.')
    } catch (error) {
      Alert.alert('Billing', error instanceof Error ? error.message : 'Could not cancel.')
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="BILLING" title="Subscription" subtitle="Native IAP setup status and web billing links." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Native IAP</Text>
        <Text style={[styles.body, { color: color.muted }]}>{status.reason}</Text>
        <Text style={[styles.body, { color: color.flame }]}>Issue: Apple IAP products must be created in App Store Connect before real in-app purchases can be enabled.</Text>
        <Pressable onPress={() => Linking.openURL(`${webBaseUrl}/pricing`)} style={[styles.primary, { backgroundColor: color.spark }]}><Text style={styles.primaryText}>Open pricing</Text></Pressable>
        <Pressable onPress={cancel} style={[styles.secondary, { borderColor: color.danger }]}><Text style={[styles.secondaryText, { color: color.danger }]}>Cancel web subscription</Text></Pressable>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 8 }, primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, primaryText: { color: '#fff', fontWeight: '900' }, secondary: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, secondaryText: { fontWeight: '900' } })
