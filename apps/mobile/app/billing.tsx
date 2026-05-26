import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native'
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

  // Opens the iOS native share sheet — includes "Copy" as a standard option.
  // Using Share instead of Linking.openURL keeps us Apple-compliant (no external URL button).
  function shareWebsite() {
    Share.share({
      message: isRtl
        ? 'اشترك في SYNAP على: synapfit.app'
        : 'Subscribe to SYNAP at: synapfit.app',
      url: 'https://synapfit.app',
    }).catch(() => {})
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
          NON-SUBSCRIBER VIEW — subscribe CTA is the very first thing
      ══════════════════════════════════════════════════════════════════ */}
      {!hasAccess ? (
        <>
          {/* Main subscribe card */}
          <LinearGradient
            colors={['rgba(187,92,246,0.22)', 'rgba(187,92,246,0.06)']}
            style={[styles.subscribeCard, { borderColor: 'rgba(187,92,246,0.30)' }]}
          >
            <IonAvatar size="lg" />

            <Text style={[styles.subscribeTitle, { color: color.text }]}>
              {isRtl ? 'اشترك في SYNAP' : 'Subscribe to SYNAP'}
            </Text>
            <Text style={[styles.subscribeSub, { color: color.muted }]}>
              {isRtl
                ? 'احصل على وصول كامل لكوتش آيون، خطط التغذية، وبرامج التمرين المخصصة.'
                : 'Get full access to your Ion coach, personalised nutrition plans, and custom workout programmes.'}
            </Text>

            {/* Website address — big and obvious */}
            <View style={[styles.urlDisplay, { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(187,92,246,0.40)' }]}>
              <Feather name="globe" size={16} color={color.sparkLight} />
              <Text style={[styles.urlDisplayText, { color: '#fff' }]}>synapfit.app</Text>
            </View>

            {/* Copy address — opens native share sheet (includes Copy option) */}
            <Pressable
              style={[styles.copyBtn, { backgroundColor: color.spark }]}
              onPress={shareWebsite}
            >
              <Feather name="copy" size={15} color="#fff" />
              <Text style={styles.copyBtnText}>
                {isRtl ? 'نسخ عنوان الموقع' : 'Copy website address'}
              </Text>
            </Pressable>

            {/* Plain-text flow instruction */}
            <Text style={[styles.flowHint, { color: color.muted }]}>
              {isRtl
                ? 'انسخ العنوان ← افتح Safari ← الصق العنوان ← اختر خطتك ← عد وسجّل الدخول'
                : 'Copy ← open Safari ← paste the address ← choose a plan ← log in here'}
            </Text>
          </LinearGradient>

          {/* What you get */}
          <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align }]}>
            {isRtl ? 'ما الذي تحصل عليه' : 'WHAT YOU GET'}
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

          {/* Steps */}
          <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align, marginTop: 24 }]}>
            {isRtl ? 'الخطوات' : 'HOW IT WORKS'}
          </Text>
          <View style={[styles.stepsCard, { backgroundColor: color.surface, borderColor: color.border }]}>
            {[
              {
                n: '1', icon: 'globe' as const,
                en: 'Go to synapfit.app in any browser and choose your plan.',
                ar: 'افتح synapfit.app في أي متصفح واختر خطتك.',
              },
              {
                n: '2', icon: 'user-check' as const,
                en: 'Complete sign-up in a couple of minutes.',
                ar: 'أكمل إنشاء حسابك في دقيقتين.',
              },
              {
                n: '3', icon: 'unlock' as const,
                en: 'Come back to this app and log in — your access activates instantly.',
                ar: 'عد إلى التطبيق وسجّل الدخول — يُفعَّل وصولك فوراً.',
              },
            ].map((step, i, arr) => (
              <View
                key={step.n}
                style={[
                  styles.stepRow,
                  { flexDirection: dir },
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
                ]}
              >
                <View style={[styles.stepCircle, { backgroundColor: color.sparkSoft, borderColor: `${color.spark}40` }]}>
                  <Text style={[styles.stepNum, { color: color.spark }]}>{step.n}</Text>
                </View>
                <View style={[styles.stepBody, { flexDirection: dir, gap: 8, flex: 1 }]}>
                  <Feather name={step.icon} size={14} color={color.spark} style={{ marginTop: 2 }} />
                  <Text style={[styles.stepDesc, { color: color.text, flex: 1, textAlign: align }]}>
                    {isRtl ? step.ar : step.en}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Already subscribed? */}
          <View style={[styles.restoreCard, { backgroundColor: color.surface, borderColor: color.border }]}>
            <View style={[styles.restoreRow, { flexDirection: dir }]}>
              <Feather name="refresh-cw" size={14} color={color.muted} />
              <Text style={[styles.restoreTitle, { color: color.text }]}>
                {isRtl ? 'اشتركت بالفعل؟' : 'Already subscribed?'}
              </Text>
            </View>
            <Text style={[styles.restoreBody, { color: color.muted, textAlign: align }]}>
              {isRtl
                ? 'سجّل الخروج من التطبيق ثم سجّل الدخول مرة أخرى بنفس البريد الإلكتروني — يُفعَّل وصولك تلقائياً.'
                : 'Log out of the app then log back in with the same email address — your access will activate automatically.'}
            </Text>
            <Pressable
              style={[styles.supportBtn, { borderColor: color.border, backgroundColor: color.elevated }]}
              onPress={() => Alert.alert(
                isRtl ? 'الدعم' : 'Support',
                isRtl
                  ? 'للمساعدة راسلنا على:\nion@synapfit.app'
                  : 'For help, email us at:\nion@synapfit.app',
                [{ text: 'OK' }],
              )}
            >
              <Feather name="message-circle" size={14} color={color.dim} />
              <Text style={[styles.supportBtnText, { color: color.dim }]}>
                {isRtl ? 'تواصل مع الدعم' : 'Contact support'}
              </Text>
            </Pressable>
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

          {/* Manage / support */}
          <View style={[styles.restoreCard, { backgroundColor: color.surface, borderColor: color.border }]}>
            <Text style={[styles.restoreTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'إدارة الاشتراك' : 'Manage subscription'}
            </Text>
            <Text style={[styles.restoreBody, { color: color.muted, textAlign: align }]}>
              {isRtl
                ? 'لإلغاء الاشتراك أو تغيير خطتك، قم بزيارة synapfit.app من متصفح الويب.'
                : 'To cancel or change your plan, visit synapfit.app from a web browser.'}
            </Text>
            <Pressable
              style={[styles.supportBtn, { borderColor: color.border, backgroundColor: color.elevated }]}
              onPress={() => Alert.alert(
                isRtl ? 'الدعم' : 'Support',
                isRtl
                  ? 'للمساعدة راسلنا على:\nion@synapfit.app'
                  : 'For help, email us at:\nion@synapfit.app',
                [{ text: 'OK' }],
              )}
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

  // Subscribe card (non-subscriber hero)
  subscribeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  subscribeTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subscribeSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 21 },

  // URL display inside subscribe card
  urlDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 4,
    width: '100%',
    justifyContent: 'center',
  },
  urlDisplayText: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },

  // Copy button
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
  copyBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Flow hint
  flowHint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 2,
  },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },

  // Feature grid
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  featureCard: { width: '47.5%', borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  featureTitle: { fontSize: 13, fontWeight: '900' },
  featureDesc: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  // Steps
  stepsCard: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  stepRow: { alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  stepCircle: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNum: { fontSize: 14, fontWeight: '900' },
  stepBody: { alignItems: 'flex-start' },
  stepDesc: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  // Restore / already subscribed card
  restoreCard: { borderWidth: 1, borderRadius: 20, padding: 20, marginTop: 14, gap: 10 },
  restoreRow: { alignItems: 'center', gap: 8 },
  restoreTitle: { fontSize: 16, fontWeight: '900' },
  restoreBody: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
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
