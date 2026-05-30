import AsyncStorage from '@react-native-async-storage/async-storage'
import { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import Constants from 'expo-constants'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/auth/AuthProvider'
import { deleteAccount } from '@/features/account'
import { HealthSummary, requestHealthAccessAndRead, setHealthConnected } from '@/features/health'
import { createMeasurement } from '@/features/measurements'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

// Bump this every build so we can confirm the installed binary matches the
// latest code (shown in the More tab footer). Current: web-aligned train day
// count + legible chat chips.
const BUILD_TAG = 'fixpack-11'

type NavRow = { label: string; labelAr?: string; href: Href; icon: string; color?: string }

const NAV_ROWS: NavRow[] = [
  { label: 'Settings',         labelAr: 'الإعدادات',     href: '/settings',          icon: 'settings'      },
  { label: 'Plan',             labelAr: 'الخطة',         href: '/plan',              icon: 'layers'        },
  { label: 'Programme',        labelAr: 'البرنامج',      href: '/programme',         icon: 'list'          },
  { label: 'Measurements',     labelAr: 'القياسات',      href: '/measurements',      icon: 'bar-chart-2'   },
  { label: 'Reports',          labelAr: 'التقارير',      href: '/reports',           icon: 'file-text'     },
  { label: 'Grocery list',     labelAr: 'قائمة التسوق',  href: '/grocery',           icon: 'shopping-bag'  },
  { label: 'Eating out',       labelAr: 'الأكل خارجاً', href: '/eating-out',        icon: 'map-pin'       },
  { label: 'Form check',       labelAr: 'تحقق الشكل',   href: '/form-check',        icon: 'camera'        },
  { label: 'Supplements',      labelAr: 'المكملات',      href: '/supplements',       icon: 'package'       },
  { label: 'Macro adjustment', labelAr: 'تعديل الماكرو', href: '/macro-adjustment',  icon: 'sliders'       },
  { label: 'Billing',          labelAr: 'الفوترة',       href: '/billing',           icon: 'credit-card'   },
  { label: 'Notifications',    labelAr: 'الإشعارات',     href: '/notifications',     icon: 'bell'          },
]

export default function MoreScreen() {
  const { signOut } = useAuth()
  const { color, mode, toggleMode } = useTheme()
  const { text, language, setLanguage, isRtl } = useLanguage()
  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const webBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'
  const align = isRtl ? 'right' : 'left'
  const rowDir = isRtl ? 'row-reverse' : 'row'

  async function connectHealth() {
    setHealthLoading(true)
    try {
      const summary = await requestHealthAccessAndRead()
      setHealth(summary)
      if (!summary.available) {
        Alert.alert('Apple Health unavailable', 'HealthKit is available on iPhone and supported iPad devices only.')
      } else if (!summary.authorized) {
        Alert.alert('Apple Health not authorized', 'You can enable access later from iOS Settings → Privacy → Health → SYNAP.')
      } else {
        // Remember the connection so the dashboard can silently re-read on launch
        await setHealthConnected(true)
        // Auto-sync today's weight to SYNAP measurements if Apple Health has one
        if (summary.latestWeightKg) {
          try {
            await createMeasurement({
              date: new Date().toISOString().slice(0, 10),
              weight_kg: summary.latestWeightKg,
            })
          } catch { /* non-fatal — maybe already logged today */ }
        }
        const lines: string[] = []
        if (summary.stepsToday != null) lines.push(`Steps today: ${summary.stepsToday.toLocaleString()}`)
        if (summary.activeEnergyToday != null) lines.push(`Active calories: ${summary.activeEnergyToday} kcal`)
        if (summary.latestWeightKg != null) lines.push(`Weight: ${summary.latestWeightKg.toFixed(1)} kg${summary.latestWeightKg ? ' (synced to progress)' : ''}`)
        if (summary.restingHeartRate != null) lines.push(`Resting HR: ${Math.round(summary.restingHeartRate)} bpm`)
        Alert.alert('Apple Health connected ✓', lines.length ? lines.join('\n') : 'Ion now has access to your health data.')
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
      <IonPageHeader eyebrow="SETTINGS" title={text.more} subtitle={text.healthSubtitle} />

      {/* Preferences */}
      <Card>
        <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>{text.preferences}</Text>
        <View style={[styles.prefRow, { flexDirection: rowDir }]}>
          <Pressable
            onPress={toggleMode}
            style={[styles.prefChip, { borderColor: color.border, backgroundColor: color.elevated }]}
          >
            <Feather name={mode === 'dark' ? 'moon' : 'sun'} size={15} color={color.spark} />
            <Text style={[styles.prefText, { color: color.text }]}>{text.theme}: {mode}</Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            style={[styles.prefChip, { borderColor: color.border, backgroundColor: color.elevated }]}
          >
            <Feather name="globe" size={15} color={color.spark} />
            <Text style={[styles.prefText, { color: color.text }]}>{language === 'ar' ? 'English' : 'العربية'}</Text>
          </Pressable>
        </View>

        <NavRowItem
          icon="refresh-cw"
          label={text.rebuildPlan}
          color={color}
          onPress={() => router.push('/onboarding')}
          rowDir={rowDir}
        />
        <NavRowItem
          icon="log-out"
          label={text.logout}
          color={{ ...color, spark: color.spark }}
          onPress={async () => {
            await signOut()
            // Clear dashboard cache so next user doesn't see stale data
            const keys = await AsyncStorage.getAllKeys()
            const dashKeys = keys.filter(k => k.startsWith('@sdc:'))
            if (dashKeys.length) await AsyncStorage.multiRemove(dashKeys)
            router.replace('/(auth)/login')
          }}
          rowDir={rowDir}
          accent={color.spark}
        />
        <NavRowItem
          icon="trash-2"
          label={text.deleteAccount}
          color={color}
          onPress={confirmDeleteAccount}
          rowDir={rowDir}
          accent={color.danger}
          loading={deleting}
        />
      </Card>

      {/* Feature navigation */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>Features</Text>
        {NAV_ROWS.map(row => (
          <NavRowItem
            key={String(row.href)}
            icon={row.icon}
            label={isRtl && row.labelAr ? row.labelAr : row.label}
            color={color}
            onPress={() => router.push(row.href)}
            rowDir={rowDir}
            showDivider
          />
        ))}
      </Card>

      {/* Apple Health */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>{text.appleHealth}</Text>
        <Text style={[styles.body, { color: color.muted, textAlign: align, marginBottom: 12 }]}>
          {text.healthSubtitle}
        </Text>
        <NavRowItem
          icon="heart"
          label={text.connectAppleHealth}
          color={color}
          onPress={connectHealth}
          rowDir={rowDir}
          accent={color.spark}
          loading={healthLoading}
        />
        {health ? (
          <View style={[styles.healthGrid, { flexDirection: rowDir }]}>
            <HealthPill label="Steps" value={String(health.stepsToday ?? '—')} color={color} />
            <HealthPill label="Kcal" value={String(health.activeEnergyToday ?? '—')} color={color} />
            <HealthPill label="Weight" value={health.latestWeightKg ? `${health.latestWeightKg.toFixed(1)} kg` : '—'} color={color} />
            <HealthPill label="HR" value={health.restingHeartRate ? `${Math.round(health.restingHeartRate)} bpm` : '—'} color={color} />
          </View>
        ) : null}
      </Card>

      {/* Support links */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>{text.support}</Text>
        <NavRowItem icon="shield" label={text.privacy} color={color} onPress={() => Linking.openURL(`${webBaseUrl}/privacy`)} rowDir={rowDir} showDivider />
        <NavRowItem icon="file-text" label={text.terms} color={color} onPress={() => Linking.openURL(`${webBaseUrl}/terms`)} rowDir={rowDir} showDivider />
        <NavRowItem icon="life-buoy" label={text.support} color={color} onPress={() => Linking.openURL(`${webBaseUrl}/contact`)} rowDir={rowDir} />
      </Card>

      {/* Build marker — lets us confirm exactly which binary is installed */}
      <Text style={{ color: color.dim, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
        SYNAP v{Constants.expoConfig?.version ?? '1.0.0'} · build {Constants.nativeBuildVersion ?? '?'} · {BUILD_TAG}
      </Text>
    </Screen>
  )
}

function NavRowItem({
  icon, label, color, onPress, rowDir, accent, loading = false, showDivider = false,
}: {
  icon: string
  label: string
  color: any
  onPress: () => void
  rowDir: 'row' | 'row-reverse'
  accent?: string
  loading?: boolean
  showDivider?: boolean
}) {
  const accentColor = accent ?? color.text
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, showDivider && { borderTopWidth: 1, borderTopColor: color.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.navRowInner, { flexDirection: rowDir }]}>
        <View style={[styles.navIcon, { backgroundColor: `${accentColor}14`, borderColor: `${accentColor}30` }]}>
          <Feather name={icon as any} size={15} color={accentColor} />
        </View>
        {loading ? (
          <ActivityIndicator color={accentColor} style={{ flex: 1 }} />
        ) : (
          <Text style={[styles.navLabel, { color: accentColor, flex: 1 }]}>{label}</Text>
        )}
        <Feather name="chevron-right" size={15} color={color.dim} />
      </View>
    </Pressable>
  )
}

function HealthPill({ label, value, color }: { label: string; value: string; color: any }) {
  return (
    <View style={[styles.healthPill, { backgroundColor: color.elevated, borderColor: color.border }]}>
      <Text style={[styles.healthLabel, { color: color.dim }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.healthValue, { color: color.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 14,
  },
  prefRow: {
    gap: 10,
    marginBottom: 14,
  },
  prefChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  prefText: {
    fontWeight: '800',
    fontSize: 13,
  },
  navRow: {
    paddingVertical: 12,
  },
  navRowInner: {
    alignItems: 'center',
    gap: 12,
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  healthGrid: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  healthPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: '22%',
  },
  healthLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
})
