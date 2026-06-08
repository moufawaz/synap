import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'
import { IonAvatar } from '@/components/IonAvatar'
import { Screen } from '@/components/Screen'
import {
  buyPackage,
  getCurrentOffering,
  isUserCancelled,
  purchasesReady,
  restore,
  tierFromCustomerInfo,
} from '@/features/purchases'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const TERMS_URL = 'https://www.synapfit.app/terms'
const PRIVACY_URL = 'https://www.synapfit.app/privacy'

const FEATURES_EN = [
  'Unlimited Ion AI coaching chat',
  'Personalized workout & nutrition plans',
  'Food scan & eating-out guide',
  'Progress tracking & body metrics',
  'Form check, auto macro-tuning & supplement guidance (Elite)',
]
const FEATURES_AR = [
  'محادثة غير محدودة مع مدرب آيون',
  'خطط تمارين وتغذية مخصصة',
  'مسح الطعام ودليل الأكل بالخارج',
  'تتبع التقدم وقياسات الجسم',
  'فحص الأداء وضبط الماكروز وتوصيات المكملات (Elite)',
]

export default function PaywallScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'

  const [offering, setOffering] = useState<PurchasesOffering | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const features = isRtl ? FEATURES_AR : FEATURES_EN

  useEffect(() => {
    let alive = true
    ;(async () => {
      const o = await getCurrentOffering()
      if (alive) { setOffering(o); setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  async function onBuy(pkg: PurchasesPackage) {
    setBusyId(pkg.identifier)
    try {
      const info = await buyPackage(pkg)
      const tier = tierFromCustomerInfo(info)
      Alert.alert(
        isRtl ? 'تم التفعيل ✓' : 'You’re in ✓',
        isRtl
          ? `تم تفعيل اشتراك ${tier === 'elite' ? 'Elite' : 'Pro'}. استمتع بكامل ميزات سناب.`
          : `Your ${tier === 'elite' ? 'Elite' : 'Pro'} plan is active. Enjoy full access to SYNAP.`,
      )
      router.back()
    } catch (e: any) {
      if (!isUserCancelled(e)) {
        Alert.alert(isRtl ? 'تعذّر الشراء' : 'Purchase failed', e?.message || (isRtl ? 'حاول مرة أخرى.' : 'Please try again.'))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function onRestore() {
    setBusyId('restore')
    try {
      const info = await restore()
      const tier = tierFromCustomerInfo(info)
      if (tier) {
        Alert.alert(isRtl ? 'تمت الاستعادة ✓' : 'Restored ✓', isRtl ? 'تم استرجاع اشتراكك.' : 'Your subscription has been restored.')
        router.back()
      } else {
        Alert.alert(isRtl ? 'لا يوجد اشتراك' : 'Nothing to restore', isRtl ? 'لم نعثر على اشتراك نشط على هذا الحساب.' : 'We didn’t find an active subscription on this Apple ID.')
      }
    } catch {
      Alert.alert(
        isRtl ? 'تعذّرت الاستعادة' : 'Restore failed',
        isRtl ? 'تعذّر الوصول إلى المتجر. حاول مرة أخرى لاحقاً.' : "Couldn't reach the store. Please try again later.",
      )
    } finally {
      setBusyId(null)
    }
  }

  const packages = offering?.availablePackages ?? []

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={[styles.back, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} hitSlop={12}>
        <Feather name={isRtl ? 'arrow-right' : 'arrow-left'} size={18} color={color.muted} />
        <Text style={[styles.backText, { color: color.muted }]}>{isRtl ? 'رجوع' : 'Back'}</Text>
      </Pressable>

      <View style={styles.hero}>
        <IonAvatar size="lg" />
        <Text style={[styles.title, { color: color.text }]}>{isRtl ? 'اختر خطة سناب' : 'Choose your SYNAP plan'}</Text>
        <Text style={[styles.sub, { color: color.muted }]}>
          {isRtl ? 'اشترك لإطلاق كامل إمكانات مدربك الذكي.' : 'Subscribe to unlock the full power of your AI coach.'}
        </Text>
      </View>

      <View style={styles.features}>
        {features.map(f => (
          <View key={f} style={[styles.featureRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Feather name="check-circle" size={15} color={color.spark} />
            <Text style={[styles.featureText, { color: color.text, textAlign: align }]}>{f}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={color.spark} style={{ marginTop: 28 }} />
      ) : !purchasesReady() || packages.length === 0 ? (
        <View style={[styles.card, { backgroundColor: color.elevated, borderColor: color.border }]}>
          <Text style={[styles.unavailable, { color: color.muted, textAlign: align }]}>
            {isRtl
              ? 'المتجر غير متاح حالياً. تأكد من اتصالك وحاول لاحقاً، أو أدِر اشتراكك من موقعنا.'
              : 'The store isn’t available right now. Check your connection and try again, or manage your plan on our website.'}
          </Text>
        </View>
      ) : (
        <View style={styles.plans}>
          {packages.map(pkg => {
            const p = pkg.product
            const busy = busyId === pkg.identifier
            return (
              <Pressable
                key={pkg.identifier}
                disabled={!!busyId}
                onPress={() => onBuy(pkg)}
                style={[styles.plan, { borderColor: color.spark, backgroundColor: color.sparkSoft }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, { color: color.text, textAlign: align }]}>{p.title}</Text>
                  {p.description ? (
                    <Text style={[styles.planDesc, { color: color.muted, textAlign: align }]}>{p.description}</Text>
                  ) : null}
                </View>
                {busy ? <ActivityIndicator color={color.spark} /> : (
                  <Text style={[styles.planPrice, { color: color.spark }]}>{p.priceString}</Text>
                )}
              </Pressable>
            )
          })}
        </View>
      )}

      <Pressable disabled={!!busyId} onPress={onRestore} style={styles.restore} hitSlop={8}>
        <Text style={[styles.restoreText, { color: color.muted }]}>
          {busyId === 'restore' ? (isRtl ? 'جارٍ الاستعادة…' : 'Restoring…') : (isRtl ? 'استعادة المشتريات' : 'Restore purchases')}
        </Text>
      </Pressable>

      {/* Required subscription disclosures + legal links */}
      <Text style={[styles.legal, { color: color.dim, textAlign: align }]}>
        {isRtl
          ? 'الاشتراكات تتجدد تلقائياً ما لم يتم إلغاء التجديد قبل 24 ساعة من نهاية الفترة الحالية. يُدار الدفع عبر حساب Apple الخاص بك، ويمكنك إدارة اشتراكك أو إلغاؤه من إعدادات App Store.'
          : 'Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Payment is charged to your Apple ID. Manage or cancel anytime in your App Store account settings.'}
      </Text>
      <View style={[styles.legalLinks, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} hitSlop={8}>
          <Text style={[styles.legalLink, { color: color.muted }]}>{isRtl ? 'شروط الاستخدام' : 'Terms of Use'}</Text>
        </Pressable>
        <Text style={[styles.legalDot, { color: color.dim }]}>·</Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} hitSlop={8}>
          <Text style={[styles.legalLink, { color: color.muted }]}>{isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '700' },
  hero: { alignItems: 'center', gap: 8, marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  features: { gap: 10, marginBottom: 22 },
  featureRow: { alignItems: 'center', gap: 9 },
  featureText: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  plans: { gap: 12 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 18, padding: 18 },
  planTitle: { fontSize: 16, fontWeight: '900' },
  planDesc: { fontSize: 12.5, fontWeight: '500', marginTop: 3, lineHeight: 17 },
  planPrice: { fontSize: 17, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 12 },
  unavailable: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  restore: { alignSelf: 'center', paddingVertical: 16 },
  restoreText: { fontSize: 14, fontWeight: '800' },
  legal: { fontSize: 11, lineHeight: 16, fontWeight: '500', marginTop: 4 },
  legalLinks: { alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  legalLink: { fontSize: 12, fontWeight: '700' },
  legalDot: { fontSize: 12 },
})
