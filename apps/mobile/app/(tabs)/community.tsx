import { StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const UPCOMING_FEATURES = [
  {
    icon: 'message-square',
    title: 'Training Threads',
    titleAr: 'خيوط التدريب',
    description: 'Share your workouts, tag exercises, and discuss training strategies with the SYNAP community.',
    descriptionAr: 'شارك تمارينك، وضع علامات على التمارين، وناقش استراتيجيات التدريب مع مجتمع SYNAP.',
    color: '#BB5CF6',
  },
  {
    icon: 'award',
    title: 'Weekly Challenges',
    titleAr: 'تحديات أسبوعية',
    description: 'Compete in Ion-curated weekly fitness challenges. Track your rank on the live leaderboard.',
    descriptionAr: 'تنافس في تحديات اللياقة الأسبوعية التي يُعدّها آيون. تابع ترتيبك في لوحة النتائج.',
    color: '#F59E0B',
  },
  {
    icon: 'trending-up',
    title: 'Progress Showcase',
    titleAr: 'عرض التقدم',
    description: 'Share your transformation photos and milestones. Celebrate wins together.',
    descriptionAr: 'شارك صور تحولك وإنجازاتك. احتفل بالانتصارات معاً.',
    color: '#F97316',
  },
  {
    icon: 'users',
    title: 'Training Partners',
    titleAr: 'شركاء التدريب',
    description: 'Find athletes in your city with similar goals and training schedules.',
    descriptionAr: 'ابحث عن رياضيين في مدينتك يشاركونك أهدافك وجداول تدريبهم.',
    color: '#10B981',
  },
]

export default function CommunityScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'

  return (
    <Screen>
      <IonPageHeader
        eyebrow="COMING SOON"
        title={isRtl ? 'المجتمع' : 'Community'}
        subtitle={isRtl ? 'تدرّب معاً. ادفع بقوة أكبر. انمُ بشكل أسرع.' : 'Train together. Push harder. Grow faster.'}
      />

      {/* Hero card */}
      <View style={[styles.heroCard, { borderColor: `${color.spark}33` }]}>
        {/* Ambient glow */}
        <View style={[styles.heroGlow, { backgroundColor: `${color.spark}0F` }]} pointerEvents="none" />

        <View style={[styles.heroIcon, { backgroundColor: `${color.spark}26`, borderColor: `${color.spark}4D` }]}>
          <Feather name="users" size={28} color={color.spark} />
        </View>

        <Text style={[styles.heroTitle, { color: color.text }]}>
          {isRtl ? 'مجتمع SYNAP' : 'The SYNAP Community'}
        </Text>
        <Text style={[styles.heroBody, { color: color.muted }]}>
          {isRtl
            ? 'نحن نبني مجتمعاً من الرياضيين الجادين. تحديات أسبوعية، وخيوط تدريب، ومساءلة حقيقية — قريباً.'
            : "We're building a community of serious athletes. Weekly challenges, training threads, and real accountability — launching soon."}
        </Text>

        <View style={[styles.devBadge, { backgroundColor: color.elevated, borderColor: color.border }]}>
          <Feather name="lock" size={12} color={color.dim} />
          <Text style={[styles.devBadgeText, { color: color.dim }]}>
            {isRtl ? 'قيد التطوير' : 'In Development'}
          </Text>
        </View>
      </View>

      {/* What's coming label */}
      <Text style={[styles.sectionLabel, { color: color.dim, textAlign: align }]}>
        {isRtl ? 'ما القادم' : "WHAT'S COMING"}
      </Text>

      {/* Feature cards */}
      {UPCOMING_FEATURES.map((f, i) => (
        <View key={i} style={[styles.featureCard, { backgroundColor: color.surface, borderColor: color.border }]}>
          <View style={[styles.featureIcon, { backgroundColor: `${f.color}18`, borderColor: `${f.color}30` }]}>
            <Feather name={f.icon as any} size={18} color={f.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.featureTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? f.titleAr : f.title}
            </Text>
            <Text style={[styles.featureDesc, { color: color.muted, textAlign: align }]}>
              {isRtl ? f.descriptionAr : f.description}
            </Text>
          </View>
        </View>
      ))}

      {/* Early access note (informational only — no purchase CTA) */}
      <View style={[styles.ctaCard, { backgroundColor: `${color.spark}0F`, borderColor: `${color.spark}26` }]}>
        <Feather name="bell" size={18} color={color.spark} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.ctaTitle, { color: color.text }]}>
            {isRtl ? 'قريباً' : 'Coming soon'}
          </Text>
          <Text style={[styles.ctaBody, { color: color.muted }]}>
            {isRtl
              ? 'يحصل أعضاء Elite على أول وصول عند إطلاق المجتمع.'
              : 'Elite members get first access when Community launches.'}
          </Text>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
    backgroundColor: 'rgba(187,92,246,0.04)',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 300,
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  devBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  ctaBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
})
