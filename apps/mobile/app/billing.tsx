import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { IonAvatar } from '@/components/IonAvatar'
import { Screen } from '@/components/Screen'
import { getSubscriptionStatus } from '@/features/subscription'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const WEB_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: 'message-circle', label: 'Ion AI Coach',       labelAr: 'كوتش آيون',          desc: 'Unlimited coaching chat',  descAr: 'محادثة غير محدودة' },
  { icon: 'coffee',         label: 'Nutrition Plans',    labelAr: 'خطط التغذية',         desc: 'Daily meals & macros',     descAr: 'وجبات ومغذيات يومية' },
  { icon: 'activity',       label: 'Workout Programme',  labelAr: 'برامج التمرين',       desc: 'Built for your goals',     descAr: 'مصممة لأهدافك' },
  { icon: 'trending-up',    label: 'Progress Tracking',  labelAr: 'تتبع التقدم',         desc: 'Charts & body metrics',    descAr: 'رسوم بيانية وقياسات' },
  { icon: 'map-pin',        label: 'Eating Out Guide',   labelAr: 'دليل الأكل بالخارج', desc: 'AI food logging anywhere', descAr: 'تسجيل الطعام بالذكاء' },
  { icon: 'list',           label: 'Grocery Lists',      labelAr: 'قوائم التسوق',        desc: 'Auto-generated weekly',    descAr: 'تُولَّد أسبوعياً تلقائياً' },
] as const

// ─────────────────────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const subscription = useAsyncData(getSubscriptionStatus, [])
  const sub = subscription.data
  const hasAccess = !subscription.loading && !!sub && sub.tier !== 'starter'

  const tierLabel =
    sub?.tier === 'elite' ? 'Elite' :
    sub?.tier === 'pro'   ? 'Pro'   :
    sub?.tier === 'trial' ? 'Trial' : null

  const tierColor =
    sub?.tier === 'elite' ? color.flame :
    sub?.tier === 'pro'   ? color.spark : color.muted

  const align = isRtl ? 'right' : 'left'
  const dir   = isRtl ? 'row-reverse' : 'row'

  function contactSupport() {
    Alert.alert(
      isRtl ? 'الدعم' : 'Support',
      isRtl
        ? 'للمساعدة بخصوص حسابك أو خطتك راسلنا على:\nion@synapfit.app'
        : 'For help with your account or plan, email us at:\nion@synapfit.app',
      [
        {
          text: isRtl ? 'مركز المساعدة' : 'Help center',
          onPress: () => Linking.openURL(`${WEB_BASE_URL}/contact`).catch(() => {}),
        },
        { text: isRtl ? 'إغلاق' : 'Close', style: 'cancel' },
      ],
    )
  }

  return (
    <Screen>

      {/* ── Back ────────────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { flexDirection: dir }]}
        hitSlop={12}
      >
        <Feather name={isRtl ? 'arrow-right' : 'arrow-left'} size={18} color={color.muted} />
        <Text style={[styles.backText, { color: color.muted }]}>
          {isRtl ? 'رجوع' : 'Back'}
        </Text>
      </Pressable>

      {/* ══════════════════════════════════════════════════════════════════
          NON-SUBSCRIBER VIEW — neutral plan status. No purchase CTA, no
          website, no external steering (App Store Guideline 3.1.1 / 3.1.3).
          The app only reflects entitlement granted by the account.
      ══════════════════════════════════════════════════════════════════ */}
      {!hasAccess ? (
        <>
          {/* Neutral status hero */}
          <LinearGradient
            colors={['rgba(187,92,246,0.18)', 'rgba(187,92,246,0.05)', 'transparent']}
            style={[styles.heroCard, { borderColor: 'rgba(187,92,246,0.25)' }]}
          >
            <IonAvatar size="lg" />
            <Text style={[styles.heroTitle, { color: color.text }]}>
              {isRtl ? 'لا توجد خطة نشطة' : 'No active plan'}
            </Text>
            <Text style={[styles.heroSub, { color: color.muted }]}>
              {isRtl
                ? 'لا يوجد لهذا الحساب اشتراك نشط في SYNAP حالياً.'
                : "This account doesn't have an active SYNAP plan yet."}
            </Text>
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.seePlansBtn, { backgroundColor: color.spark }]}
            >
              <Feather name="star" size={14} color="#fff" />
              <Text style={styles.seePlansText}>{isRtl ? 'عرض الخطط والاشتراك' : 'See plans & subscribe'}</Text>
            </Pressable>
          </LinearGradient>

          {/* Already subscribed? — restore via correct account */}
          <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.border }]}>
            <View style={[styles.cardRow, { flexDirection: dir }]}>
              <Feather name="refresh-cw" size={14} color={color.muted} />
              <Text style={[styles.cardTitle, { color: color.text }]}>
                {isRtl ? 'لديك اشتراك بالفعل؟' : 'Already have a plan?'}
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: color.muted, textAlign: align }]}>
              {isRtl
                ? 'إذا كان لديك اشتراك بحساب آخر، سجّل الخروج ثم سجّل الدخول بنفس البريد الإلكتروني — يُفعَّل وصولك تلقائياً.'
                : 'If you have a plan on a different account, sign out and sign back in with that email — your access activates automatically.'}
            </Text>
            <Pressable
              style={[styles.supportBtn, { borderColor: color.border, backgroundColor: color.elevated }]}
              onPress={contactSupport}
            >
              <Feather name="message-circle" size={14} color={color.dim} />
              <Text style={[styles.supportBtnText, { color: color.dim }]}>
                {isRtl ? 'تواصل مع الدعم' : 'Contact support'}
              </Text>
            </Pressable>
          </View>

          {/* What SYNAP includes — informational only */}
          <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align, marginTop: 24 }]}>
            {isRtl ? 'ميزات SYNAP' : 'SYNAP FEATURES'}
          </Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.icon} style={[styles.featureCard, { backgroundColor: color.surface, borderColor: color.border }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: color.sparkSoft }]}>
                  <Feather name={f.icon as any} size={17} color={color.spark} />
                </View>
                <Text style={[styles.featureTitle, { color: color.text, textAlign: align }]}>
                  {isRtl ? f.labelAr : f.label}
                </Text>
                <Text style={[styles.featureDesc, { color: color.muted, textAlign: align }]}>
                  {isRtl ? f.descAr : f.desc}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (

        /* ════════════════════════════════════════════════════════════════
           SUBSCRIBER VIEW — show their plan + features
        ════════════════════════════════════════════════════════════════ */
        <>
          {/* Active plan hero */}
          <LinearGradient
            colors={[`${tierColor}22`, `${tierColor}06`, 'transparent']}
            style={[styles.planHero, { borderColor: `${tierColor}30` }]}
          >
            <IonAvatar size="lg" />
            <View style={[styles.planBadge, { backgroundColor: `${tierColor}20`, borderColor: `${tierColor}40` }]}>
              <Feather name="check-circle" size={14} color={tierColor} />
              <Text style={[styles.planBadgeText, { color: tierColor }]}>
                {isRtl ? `مشترك — ${tierLabel}` : `Subscribed — ${tierLabel}`}
              </Text>
            </View>
            <Text style={[styles.planHeroTitle, { color: color.text }]}>
              {isRtl ? 'وصول كامل مفعّل' : 'Full access active'}
            </Text>
            <Text style={[styles.planHeroSub, { color: color.muted }]}>
              {isRtl
                ? 'يمكنك الاستمتاع بجميع ميزات SYNAP بما فيها كوتش آيون وخطط التغذية والتمرين.'
                : 'You have full access to all SYNAP features including your Ion coach, nutrition plans, and workout programme.'}
            </Text>
          </LinearGradient>

          {/* What's included */}
          <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align }]}>
            {isRtl ? 'ما يتضمنه اشتراكك' : 'INCLUDED IN YOUR PLAN'}
          </Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.icon} style={[styles.featureCard, { backgroundColor: color.surface, borderColor: color.border }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: color.sparkSoft }]}>
                  <Feather name={f.icon as any} size={17} color={color.spark} />
                </View>
                <Text style={[styles.featureTitle, { color: color.text, textAlign: align }]}>
                  {isRtl ? f.labelAr : f.label}
                </Text>
                <Text style={[styles.featureDesc, { color: color.muted, textAlign: align }]}>
                  {isRtl ? f.descAr : f.desc}
                </Text>
              </View>
            ))}
          </View>

          {/* View all plans — keep the In-App Purchase paywall reachable even for
              active subscribers (so users can change plan and App Review can
              always find the IAP offering). */}
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[styles.seePlansBtn, { backgroundColor: color.spark, marginTop: 14 }]}
          >
            <Feather name="grid" size={14} color="#fff" />
            <Text style={styles.seePlansText}>{isRtl ? 'عرض كل الخطط' : 'View all plans'}</Text>
          </Pressable>

          {/* Manage / support */}
          <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.border, marginTop: 14 }]}>
            <Text style={[styles.cardTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'إدارة الاشتراك' : 'Manage subscription'}
            </Text>
            <Text style={[styles.cardBody, { color: color.muted, textAlign: align }]}>
              {isRtl
                ? 'لإدارة خطتك أو إلغائها، تواصل مع فريق الدعم.'
                : 'To manage or cancel your plan, contact our support team.'}
            </Text>
            <Pressable
              style={[styles.supportBtn, { borderColor: color.border, backgroundColor: color.elevated }]}
              onPress={contactSupport}
            >
              <Feather name="message-circle" size={14} color={color.dim} />
              <Text style={[styles.supportBtnText, { color: color.dim }]}>
                {isRtl ? 'تواصل مع الدعم' : 'Contact support'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  // Back
  backBtn: { alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '700' },

  // Neutral status hero
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  heroSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 21 },
  seePlansBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14 },
  seePlansText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },

  // Feature grid
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  featureCard: { width: '47.5%', borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  featureTitle: { fontSize: 13, fontWeight: '900' },
  featureDesc: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  // Generic card (already-subscribed / manage)
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  cardRow: { alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  cardBody: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  supportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, minHeight: 46, borderRadius: 14, borderWidth: 1, marginTop: 2,
  },
  supportBtnText: { fontSize: 13, fontWeight: '900' },

  // Subscriber plan hero
  planHero: {
    borderRadius: 24, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 10, marginBottom: 24,
  },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  planBadgeText: { fontSize: 13, fontWeight: '900' },
  planHeroTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  planHeroSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
})
