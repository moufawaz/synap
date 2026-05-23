import { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/auth/AuthProvider'
import { deleteAccount } from '@/features/account'
import { HealthSummary, requestHealthAccessAndRead } from '@/features/health'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const featureLinks: Array<[string, Href]> = [
  ['Settings', '/settings'],
  ['Plan', '/plan'],
  ['Programme', '/programme'],
  ['Measurements', '/measurements'],
  ['Grocery list', '/grocery'],
  ['Eating out', '/eating-out'],
  ['Form check', '/form-check'],
  ['Supplements', '/supplements'],
  ['Macro adjustment', '/macro-adjustment'],
  ['Reports', '/reports'],
  ['Billing', '/billing'],
  ['Notifications', '/notifications'],
] as const

export default function MoreScreen() {
  const { signOut } = useAuth()
  const { color, mode, toggleMode } = useTheme()
  const { text, language, setLanguage, isRtl } = useLanguage()
  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const webBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'

  async function connectHealth() {
    setHealthLoading(true)
    try {
      const summary = await requestHealthAccessAndRead()
      setHealth(summary)
      if (!summary.available) {
        Alert.alert('Apple Health unavailable', 'HealthKit is available on iPhone and supported iPad devices only.')
      } else if (!summary.authorized) {
        Alert.alert('Apple Health not authorized', 'You can enable access later from iOS Settings.')
      }
    } catch (error) {
      Alert.alert('Apple Health', error instanceof Error ? error.message : 'Could not read Health data.')
    } finally {
      setHealthLoading(false)
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(text.deleteAccount, text.deleteAccountConfirm, [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.deleteAccount,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteAccount()
            await signOut()
            router.replace('/(auth)/login')
          } catch (error) {
            Alert.alert(text.deleteAccount, error instanceof Error ? error.message : text.deleteAccountFailed)
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <PageHeader eyebrow="SETTINGS" title={text.more} subtitle={text.healthSubtitle} />
      <Card>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.preferences}</Text>
        <View style={styles.row}>
          <Pressable onPress={toggleMode} style={[styles.action, { borderColor: color.border, backgroundColor: color.elevated }]}>
            <Text style={[styles.actionText, { color: color.text }]}>{text.theme}: {mode}</Text>
          </Pressable>
          <Pressable onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')} style={[styles.action, { borderColor: color.border, backgroundColor: color.elevated }]}>
            <Text style={[styles.actionText, { color: color.text }]}>{language === 'ar' ? 'English' : 'العربية'}</Text>
          </Pressable>
        </View>
        <Pressable onPress={signOut} style={[styles.logout, { backgroundColor: color.sparkSoft, borderColor: color.spark }]}>
          <Text style={[styles.logoutText, { color: color.spark }]}>{text.logout}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/onboarding')} style={[styles.logout, { backgroundColor: color.elevated, borderColor: color.border }]}>
          <Text style={[styles.logoutText, { color: color.text }]}>{text.rebuildPlan}</Text>
        </Pressable>
        <Pressable
          onPress={confirmDeleteAccount}
          style={[styles.logout, { backgroundColor: color.dangerSoft, borderColor: color.danger }]}
          disabled={deleting}
        >
          {deleting ? <ActivityIndicator color={color.danger} /> : <Text style={[styles.logoutText, { color: color.danger }]}>{text.deleteAccount}</Text>}
        </Pressable>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>Features</Text>
        <View style={styles.linkList}>
          {featureLinks.map(([label, href]) => (
            <Pressable key={String(href)} onPress={() => router.push(href)}>
              <Text style={[styles.link, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.appleHealth}</Text>
        <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
          {text.healthSubtitle}
        </Text>
        <Pressable onPress={connectHealth} style={[styles.logout, { backgroundColor: color.sparkSoft, borderColor: color.spark }]} disabled={healthLoading}>
          {healthLoading ? <ActivityIndicator color={color.spark} /> : <Text style={[styles.logoutText, { color: color.spark }]}>{text.connectAppleHealth}</Text>}
        </Pressable>
        {health ? (
          <View style={styles.healthGrid}>
            <Text style={[styles.healthText, { color: color.text }]}>Steps: {health.stepsToday ?? '-'}</Text>
            <Text style={[styles.healthText, { color: color.text }]}>Active kcal: {health.activeEnergyToday ?? '-'}</Text>
            <Text style={[styles.healthText, { color: color.text }]}>Weight: {health.latestWeightKg ? `${health.latestWeightKg.toFixed(1)} kg` : '-'}</Text>
            <Text style={[styles.healthText, { color: color.text }]}>Resting HR: {health.restingHeartRate ? `${Math.round(health.restingHeartRate)} bpm` : '-'}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.support}</Text>
        <View style={styles.linkList}>
          <Pressable onPress={() => Linking.openURL(`${webBaseUrl}/privacy`)}>
            <Text style={[styles.link, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{text.privacy}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`${webBaseUrl}/terms`)}>
            <Text style={[styles.link, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{text.terms}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`${webBaseUrl}/support`)}>
            <Text style={[styles.link, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{text.support}</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '800',
  },
  logout: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontWeight: '900',
  },
  section: {
    marginTop: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  healthGrid: {
    gap: 8,
    marginTop: 12,
  },
  healthText: {
    fontWeight: '800',
  },
  linkList: {
    gap: 12,
  },
  link: {
    fontSize: 16,
    fontWeight: '900',
  },
})
