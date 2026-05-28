import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonAvatar } from '@/components/IonAvatar'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getProfile, saveProfile } from '@/features/profile'
import {
  DEFAULT_NOTIF_PREFS,
  loadNotifPrefs,
  saveNotifPrefs,
  scheduleSynapReminders,
  type NotifPrefs,
} from '@/features/notifications'
import { apiFetch } from '@/lib/api'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

// ── Section tab type ──────────────────────────────────────────────────────────

type Section = 'profile' | 'billing' | 'notifications'

// ── Profile fields ────────────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  ['name', 'Name', 'الاسم', 'default'],
  ['age', 'Age', 'العمر', 'number-pad'],
  ['weight_kg', 'Weight kg', 'الوزن (كغ)', 'decimal-pad'],
  ['height_cm', 'Height cm', 'الطول (سم)', 'decimal-pad'],
  ['goal', 'Goal', 'الهدف', 'default'],
  ['training_days', 'Training days/week', 'أيام التدريب/أسبوع', 'number-pad'],
  ['session_duration', 'Session duration min', 'مدة الجلسة (دقيقة)', 'number-pad'],
  ['training_time', 'Training time', 'وقت التدريب', 'default'],
  ['injuries', 'Injuries', 'الإصابات', 'default'],
  ['medical_conditions', 'Medical conditions', 'الحالات الطبية', 'default'],
  ['foods_loved', 'Foods loved', 'الأطعمة المفضلة', 'default'],
  ['foods_hated', 'Foods hated', 'الأطعمة غير المفضلة', 'default'],
  ['allergies', 'Allergies', 'الحساسية', 'default'],
  ['meals_per_day', 'Meals/day', 'وجبات/يوم', 'number-pad'],
] as const

// ── Notification labels (types/defaults live in @/features/notifications) ──────

const NOTIF_LABELS: Record<keyof NotifPrefs, { en: string; ar: string; icon: string }> = {
  workout_reminder: { en: 'Workout reminder', ar: 'تذكير التمرين', icon: 'activity' },
  meal_reminder: { en: 'Meal reminder', ar: 'تذكير الوجبة', icon: 'coffee' },
  hydration_reminder: { en: 'Hydration reminder', ar: 'تذكير الماء', icon: 'droplet' },
  checkin_reminder: { en: 'Daily check-in', ar: 'تسجيل يومي', icon: 'check-circle' },
  weekly_report: { en: 'Weekly report', ar: 'تقرير أسبوعي', icon: 'file-text' },
}

async function getSubscription() {
  return apiFetch<{ tier: string; status: string; plan_type?: string; renewal_date?: string; trial_ends_at?: string; access: boolean }>('/api/me/subscription')
}

export default function SettingsScreen() {
  const { color } = useTheme()
  const { language, setLanguage, isRtl } = useLanguage()
  const profile = useAsyncData(getProfile, [])
  const subscription = useAsyncData(getSubscription, [])

  const [activeSection, setActiveSection] = useState<Section>('profile')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)

  const align = isRtl ? 'right' : 'left'

  // Load persisted notification preferences
  useEffect(() => {
    loadNotifPrefs().then(setNotifPrefs).catch(() => {})
  }, [])

  // Load profile fields
  useEffect(() => {
    if (!profile.data?.profile) return
    const next: Record<string, string> = {}
    PROFILE_FIELDS.forEach(([key]) => {
      const value = profile.data?.profile?.[key]
      next[key] = value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value)
    })
    next.ion_gender = profile.data.profile.ion_gender || 'male'
    setValues(next)
  }, [profile.data])

  function update(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      await saveProfile({
        ...values,
        language,
        gym_access: profile.data?.profile?.gym_access ? 'gym' : 'home',
        currently_training: profile.data?.profile?.training_experience === 'beginner' ? 'new' : 'already',
        ion_gender: values.ion_gender || profile.data?.profile?.ion_gender || 'male',
      })
      await profile.reload()
      Alert.alert('Settings', isRtl ? 'تم حفظ الملف الشخصي.' : 'Profile saved.')
    } catch (error) {
      Alert.alert('Settings', error instanceof Error ? error.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  function toggleNotif(key: keyof NotifPrefs) {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Persist immediately and re-apply the local reminder schedule so the
      // toggle takes real effect (workout/meal/hydration are local reminders).
      saveNotifPrefs(next)
      scheduleSynapReminders({ prefs: next }).catch(() => {})
      return next
    })
  }

  const sub = subscription.data
  const tierLabel = sub?.tier === 'elite' ? 'Elite' : sub?.tier === 'pro' ? 'Pro' : sub?.tier === 'launch' ? 'Launch Access' : 'Starter'
  const tierColor = sub?.tier === 'elite' ? color.flame : sub?.tier === 'pro' ? color.spark : sub?.tier === 'launch' ? color.pulse : color.muted

  // Section tabs
  const TABS: { key: Section; label: string; labelAr: string; icon: string }[] = [
    { key: 'profile', label: 'Profile', labelAr: 'الملف', icon: 'user' },
    { key: 'billing', label: 'Billing', labelAr: 'الاشتراك', icon: 'credit-card' },
    { key: 'notifications', label: 'Notifications', labelAr: 'الإشعارات', icon: 'bell' },
  ]

  return (
    <Screen>
      <IonPageHeader eyebrow="SETTINGS" title={isRtl ? 'الإعدادات' : 'Settings'} subtitle={isRtl ? 'تحديث بيانات ملفك الشخصي وتفضيلات الإشعارات.' : 'Update your profile and notification preferences.'} />

      {/* Section tab bar */}
      <View style={[styles.tabBar, { backgroundColor: color.elevated, borderColor: color.border }]}>
        {TABS.map(tab => {
          const active = activeSection === tab.key
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveSection(tab.key)}
              style={[styles.tab, { backgroundColor: active ? color.spark : 'transparent' }]}
            >
              <Feather name={tab.icon as any} size={13} color={active ? '#fff' : color.muted} />
              <Text style={[styles.tabText, { color: active ? '#fff' : color.muted }]}>
                {isRtl ? tab.labelAr : tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* ═══ Profile section ═══════════════════════════════════════════════════ */}
      {activeSection === 'profile' ? (
        <>
          <Card style={styles.cardGap}>
            <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'اللغة' : 'Language'}</Text>
            <View style={styles.row}>
              {(['en', 'ar'] as const).map(item => (
                <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.choice, { borderColor: language === item ? color.spark : color.border, backgroundColor: language === item ? color.sparkSoft : color.elevated }]}>
                  <Text style={[styles.choiceText, { color: language === item ? color.spark : color.text }]}>{item === 'ar' ? 'العربية' : 'English'}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'مظهر آيون' : 'Ion avatar'}</Text>
            <View style={[styles.avatarRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <IonAvatar size="md" />
              <View style={styles.avatarText}>
                <View style={[styles.row, { marginTop: 6 }]}>
                  {(['male', 'female'] as const).map(item => (
                    <Pressable key={item} onPress={() => update('ion_gender', item)} style={[styles.choice, { borderColor: values.ion_gender === item ? color.spark : color.border, backgroundColor: values.ion_gender === item ? color.sparkSoft : color.elevated }]}>
                      <Text style={[styles.choiceText, { color: values.ion_gender === item ? color.spark : color.text }]}>{item === 'male' ? (isRtl ? 'ذكر' : 'Male') : (isRtl ? 'أنثى' : 'Female')}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'الملف الشخصي' : 'Profile'}</Text>
            {profile.loading ? <ActivityIndicator color={color.spark} /> : null}
            {profile.error ? <Text style={[styles.body, { color: color.danger }]}>{profile.error}</Text> : null}
            {PROFILE_FIELDS.map(([key, labelEn, labelAr, keyboardType]) => (
              <TextInput
                key={key}
                value={values[key] || ''}
                onChangeText={value => update(key, value)}
                placeholder={isRtl ? labelAr : labelEn}
                placeholderTextColor={color.dim}
                keyboardType={keyboardType as any}
                style={[styles.input, { color: color.text, borderColor: color.border, backgroundColor: color.elevated, textAlign: align }]}
              />
            ))}
            <Pressable disabled={saving} onPress={save} style={[styles.primary, { backgroundColor: color.spark }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRtl ? 'حفظ الملف الشخصي' : 'Save profile'}</Text>}
            </Pressable>
          </Card>
        </>
      ) : null}

      {/* ═══ Billing section ═══════════════════════════════════════════════════ */}
      {activeSection === 'billing' ? (
        <>
          {/* Current plan status */}
          <Card style={styles.cardGap}>
            <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'اشتراكك' : 'Your plan'}</Text>
            {subscription.loading ? <ActivityIndicator color={color.spark} /> : null}
            {subscription.error ? <Text style={[styles.body, { color: color.danger }]}>{subscription.error}</Text> : null}

            {!subscription.loading && sub ? (
              <>
                {/* Plan badge */}
                <View style={[styles.planBadge, { backgroundColor: `${tierColor}15`, borderColor: `${tierColor}33` }]}>
                  <Feather name="award" size={13} color={tierColor} />
                  <Text style={[styles.planBadgeText, { color: tierColor }]}>{tierLabel}</Text>
                </View>

                {/* Access status indicator */}
                {sub.access ? (
                  <View style={[styles.accessRow, { borderColor: color.border }]}>
                    <Feather name="check-circle" size={15} color={color.pulse} />
                    <Text style={[styles.accessRowText, { color: color.pulse }]}>
                      {isRtl ? 'وصول نشط' : 'Active access'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.accessRow, { borderColor: color.border }]}>
                    <Feather name="lock" size={15} color={color.muted} />
                    <Text style={[styles.accessRowText, { color: color.muted }]}>
                      {isRtl ? 'لا يوجد وصول نشط' : 'No active access'}
                    </Text>
                  </View>
                )}

                {/* Renewal / trial dates */}
                {sub.renewal_date ? (
                  <Text style={[styles.subMeta, { color: color.muted, textAlign: align }]}>
                    {isRtl ? `التجديد: ${sub.renewal_date.slice(0, 10)}` : `Renews: ${sub.renewal_date.slice(0, 10)}`}
                  </Text>
                ) : null}
                {sub.trial_ends_at ? (
                  <Text style={[styles.subMeta, { color: color.flame, textAlign: align }]}>
                    {isRtl ? `تنتهي الفترة التجريبية: ${sub.trial_ends_at.slice(0, 10)}` : `Trial ends: ${sub.trial_ends_at.slice(0, 10)}`}
                  </Text>
                ) : null}
              </>
            ) : null}
          </Card>

          {/* Full details / upgrade CTA — navigates to the dedicated billing screen */}
          <Pressable
            style={[styles.billingNavBtn, { backgroundColor: color.spark, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/billing')}
          >
            <Feather name="star" size={16} color="#fff" />
            <Text style={styles.billingNavBtnText}>
              {isRtl
                ? (sub?.access ? 'تفاصيل الاشتراك والميزات' : 'كيفية الاشتراك في SYNAP')
                : (sub?.access ? 'View plan details & features' : 'How to subscribe to SYNAP')}
            </Text>
            <Feather name={isRtl ? 'arrow-left' : 'arrow-right'} size={16} color="#fff" />
          </Pressable>
        </>
      ) : null}

      {/* ═══ Notifications section ═════════════════════════════════════════════ */}
      {activeSection === 'notifications' ? (
        <>
          <Card style={styles.cardGap}>
            <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'تفضيلات الإشعارات' : 'Notification preferences'}</Text>
            <Text style={[styles.body, { color: color.muted, textAlign: align, marginBottom: 14 }]}>
              {isRtl
                ? 'فعّل أو أوقف كل نوع من أنواع الإشعارات.'
                : 'Enable or disable each type of notification.'}
            </Text>

            {(Object.keys(notifPrefs) as (keyof NotifPrefs)[]).map(key => {
              const info = NOTIF_LABELS[key]
              const enabled = notifPrefs[key]
              return (
                <View key={key} style={[styles.notifRow, { borderTopColor: color.border, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.notifIcon, { backgroundColor: enabled ? `${color.spark}1A` : color.elevated, borderColor: enabled ? `${color.spark}33` : color.border }]}>
                    <Feather name={info.icon as any} size={14} color={enabled ? color.spark : color.dim} />
                  </View>
                  <Text style={[styles.notifLabel, { color: color.text, flex: 1, textAlign: align }]}>
                    {isRtl ? info.ar : info.en}
                  </Text>
                  <Switch
                    value={enabled}
                    onValueChange={() => toggleNotif(key)}
                    trackColor={{ false: color.border, true: color.spark }}
                    thumbColor="#fff"
                  />
                </View>
              )
            })}
          </Card>

          <Card style={styles.cardGap}>
            <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'التذكيرات المحلية' : 'Local reminders'}</Text>
            <Text style={[styles.body, { color: color.muted, textAlign: align, marginBottom: 12 }]}>
              {isRtl
                ? 'التذكيرات اليومية تعمل على هذا الجهاز حتى بدون اتصال بالإنترنت.'
                : 'Daily reminders run on this device and work offline.'}
            </Text>
            <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
              {isRtl
                ? 'لإدارة جدول التذكيرات المتقدم، انتقل إلى المزيد ← الإشعارات.'
                : 'To manage the advanced reminder schedule, go to More → Notifications.'}
            </Text>
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  // Section tabs
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabText: { fontSize: 12, fontWeight: '800' },
  // Cards
  cardGap: { marginTop: 12 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  body: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  avatarRow: { alignItems: 'center', gap: 12 },
  avatarText: { flex: 1 },
  choice: { flex: 1, borderWidth: 1, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontWeight: '900' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, fontWeight: '800' },
  primary: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  // Billing
  planBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  planBadgeText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  accessRowText: { fontSize: 14, fontWeight: '800' },
  subMeta: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  billingNavBtn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  billingNavBtnText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '900' },
  // Notifications
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  notifIcon: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifLabel: { fontSize: 14, fontWeight: '800' },
})
