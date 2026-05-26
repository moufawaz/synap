import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { IonAvatar } from '@/components/IonAvatar'
import { Screen } from '@/components/Screen'
import { getSubscriptionStatus } from '@/features/subscription'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: 'message-circle', label: 'Ion AI Coach',        labelAr: 'كوتش آيون',       desc: 'Unlimited coaching chat',  descAr: 'محادثة غير محدودة' },
  { icon: 'coffee',         label: 'Nutrition Plans',     labelAr: 'خطط التغذية',      desc: 'Daily meals & macros',     descAr: 'وجبات ومغذيات يومية' },
  { icon: 'activity',       label: 'Workout Programmes',  labelAr: 'برامج التمرين',    desc: 'Built for your goals',     descAr: 'مصممة لأهدافك' },
  { icon: 'trending-up',    label: 'Progress Tracking',   labelAr: 'تتبع التقدم',      desc: 'Charts & body metrics',    descAr: 'رسوم بيانية وقياسات' },
  { icon: 'map-pin',        label: 'Eating Out Guide',    labelAr: 'دليل الأكل بالخارج', desc: 'AI food logging anywhere', descAr: 'تسجيل الطعام بالذكاء' },
  { icon: 'list',           label: 'Grocery Lists',       labelAr: 'قوائم التسوق',     desc: 'Auto-generated weekly',    descAr: 'تُولَّد أسبوعياً تلقائياً' },
] as const

// ── How-to steps ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '1',
    icon: 'globe' as const,
    title: 'Open synapfit.app',
    titleAr: 'افتح synapfit.app',
    desc: 'Type the address into any browser on your phone, tablet, or computer.',
    descAr: 'اكتب العنوان في أي متصفح على هاتفك أو حاسوبك.',
  },
  {
    n: '2',
    icon: 'star' as const,
    title: 'Choose your plan',
    titleAr: 'اختر خطتك',
    desc: 'Pick Pro or Elite and complete sign-up in a couple of minutes.',
    descAr: 'اختر Pro أو Elite وأكمل التسجيل في دقيقتين.',
  },
  {
    n: '3',
    icon: 'unlock' as const,
    title: 'Come back here',
    titleAr: 'عد إلى التطبيق',
    desc: 'Log in with the same email address — your access activates instantly.',
    descAr: 'سجّل الدخول بنفس البريد الإلكتروني، يُفعَّل وصولك فوراً.',
  },
]

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

  return (
    <Screen>
      {/* ── Back button ─────────────────────────────────────────────────── */}
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

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(187,92,246,0.18)', 'rgba(187,92,246,0.04)', 'transparent']}
        style={styles.hero}
      >
        <IonAvatar size="xl" />
        <View style={styles.heroText}>
          <Text style={[styles.eyebrow, { color: color.spark }]}>
            {isRtl ? 'سيناب بريميوم' : 'SYNAP PREMIUM'}
          </Text>
          <Text style={[styles.heroTitle, { color: color.text }]}>
            {isRtl
              ? 'مدربك الشخصي\nبالذكاء الاصطناعي'
              : 'Your personal AI\nfitness coach'}
          </Text>
          <Text style={[styles.heroSub, { color: color.muted }]}>
            {isRtl
              ? 'تغذية ذكية · تمارين مخصصة · كوتش لا يتوقف'
              : 'Smart nutrition · Custom training · Always-on coach'}
          </Text>
        </View>

        {/* Active plan badge — only shown when subscribed */}
        {hasAccess && tierLabel ? (
          <View style={[styles.activeBadge, { backgroundColor: `${tierColor}20`, borderColor: `${tierColor}40` }]}>
            <Feather name="check-circle" size={13} color={tierColor} />
            <Text style={[styles.activeBadgeText, { color: tierColor }]}>
              {isRtl ? `مشترك — ${tierLabel}` : `Subscribed — ${tierLabel}`}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* ── Feature grid ────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align }]}>
        {isRtl ? 'ما الذي تحصل عليه' : 'WHAT YOU GET'}
      </Text>

      <View style={styles.featureGrid}>
        {FEATURES.map((f) => (
          <View
            key={f.icon}
            style={[styles.featureCard, { backgroundColor: color.surface, borderColor: color.border }]}
          >
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

      {/* ── How to subscribe ─────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align, marginTop: 28 }]}>
        {isRtl ? 'كيفية الاشتراك' : 'HOW TO SUBSCRIBE'}
      </Text>

      <View style={[styles.stepsCard, { backgroundColor: color.surface, borderColor: color.border }]}>
        {STEPS.map((step, i) => (
          <View
            key={step.n}
            style={[styles.stepRow, { flexDirection: dir, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: color.border }]}
          >
            {/* Step number circle */}
            <View style={[styles.stepCircle, { backgroundColor: color.sparkSoft, borderColor: `${color.spark}33` }]}>
              <Text style={[styles.stepNum, { color: color.spark }]}>{step.n}</Text>
            </View>

            {/* Connector line — not on last item */}
            <View style={styles.stepContent}>
              <View style={[styles.stepTitleRow, { flexDirection: dir }]}>
                <Feather name={step.icon} size={14} color={color.spark} />
                <Text style={[styles.stepTitle, { color: color.text }]}>
                  {isRtl ? step.titleAr : step.title}
                </Text>
              </View>
              <Text style={[styles.stepDesc, { color: color.muted, textAlign: align }]}>
                {isRtl ? step.descAr : step.desc}
              </Text>
            </View>
          </View>
        ))}

        {/* Website display — prominent, non-tappable */}
        <View style={[styles.urlBox, { backgroundColor: color.elevated, borderColor: `${color.spark}30` }]}>
          <Feather name="globe" size={14} color={color.spark} />
          <Text style={[styles.urlText, { color: color.spark }]}>synapfit.app</Text>
        </View>
        <Text style={[styles.urlCaption, { color: color.dim, textAlign: 'center' }]}>
          {isRtl
            ? 'اكتب هذا العنوان في متصفح الويب للاشتراك'
            : 'Type this address into your web browser to subscribe'}
        </Text>
      </View>

      {/* ── Already subscribed / restore access ─────────────────────────── */}
      <View style={[styles.restoreCard, { backgroundColor: color.surface, borderColor: color.border }]}>
        <View style={[styles.restoreHeader, { flexDirection: dir }]}>
          <Feather name="refresh-cw" size={15} color={color.muted} />
          <Text style={[styles.restoreTitle, { color: color.text }]}>
            {isRtl ? 'مشترك بالفعل؟' : 'Already subscribed?'}
          </Text>
        </View>
        <Text style={[styles.restoreBody, { color: color.muted, textAlign: align }]}>
          {isRtl
            ? 'إذا اشتركت مسبقاً من موقع synapfit.app، فقط سجّل الخروج ثم سجّل الدخول مجدداً بنفس البريد الإلكتروني وسيتم تفعيل وصولك تلقائياً.'
            : 'If you already subscribed at synapfit.app, log out then log back in with the same email address — your access will activate automatically.'}
        </Text>
        <Pressable
          style={[styles.supportBtn, { borderColor: color.border, backgroundColor: color.elevated }]}
          onPress={() => Alert.alert(
            isRtl ? 'الدعم' : 'Support',
            isRtl
              ? 'هل تحتاج مساعدة؟ راسلنا على:\nsupport@synapfit.app'
              : 'Need help? Reach us at:\nsupport@synapfit.app',
            [{ text: isRtl ? 'حسناً' : 'OK' }],
          )}
        >
          <Feather name="message-circle" size={14} color={color.muted} />
          <Text style={[styles.supportBtnText, { color: color.muted }]}>
            {isRtl ? 'تواصل مع الدعم' : 'Contact support'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  // Back
  backBtn: { alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 4 },
  backText: { fontSize: 14, fontWeight: '700' },

  // Hero
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  heroText: { alignItems: 'center', gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 34 },
  heroSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  activeBadgeText: { fontSize: 13, fontWeight: '900' },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },

  // Feature grid
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: {
    width: '47.5%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  featureTitle: { fontSize: 13, fontWeight: '900' },
  featureDesc: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  // Steps
  stepsCard: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 0 },
  stepRow: {
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: { fontSize: 15, fontWeight: '900' },
  stepContent: { flex: 1, gap: 4 },
  stepTitleRow: { alignItems: 'center', gap: 7 },
  stepTitle: { fontSize: 15, fontWeight: '900' },
  stepDesc: { fontSize: 13, fontWeight: '600', lineHeight: 19 },

  // URL box
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  urlText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  urlCaption: { fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 8 },

  // Restore / support
  restoreCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginTop: 14,
    gap: 10,
  },
  restoreHeader: { alignItems: 'center', gap: 8 },
  restoreTitle: { fontSize: 16, fontWeight: '900' },
  restoreBody: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  supportBtnText: { fontSize: 13, fontWeight: '900' },
})
