import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Medical/health disclaimer + citations to the authoritative sources behind the
 * app's nutrition and training guidance. Required by App Store Guideline 1.4.1
 * (health/medical information must cite its sources, and the citations must be
 * easy to find). Rendered at the bottom of the Nutrition and Train screens.
 */

type Source = { label: string; url: string }

const SOURCES: Source[] = [
  { label: 'WHO — Healthy diet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  { label: 'Dietary Guidelines for Americans 2020–2025', url: 'https://www.dietaryguidelines.gov/' },
  { label: 'NIH Office of Dietary Supplements', url: 'https://ods.od.nih.gov/factsheets/list-all/' },
  { label: 'ISSN protein & exercise position stand', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8' },
  { label: 'ACSM physical activity guidelines', url: 'https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines' },
]

export function MedicalDisclaimer({ context = 'nutrition' }: { context?: 'nutrition' | 'training' }) {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'

  const intro = isRtl
    ? 'المعلومات الغذائية والتدريبية في سناب لأغراض تعليمية عامة وليست نصيحة طبية. استشر طبيبك أو اختصاصي تغذية قبل تغيير نظامك الغذائي أو التدريبي، خاصة مع وجود حالة صحية. تستند توصياتنا إلى الإرشادات المنشورة من الجهات التالية:'
    : 'SYNAP’s nutrition and training information is for general educational purposes and is not medical advice. Consult a physician or registered dietitian before changing your diet or training, especially with a medical condition. Our recommendations are based on published guidance from the sources below:'

  return (
    <View style={[styles.wrap, { borderColor: color.border, backgroundColor: color.elevated }]}>
      <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Feather name="info" size={14} color={color.muted} />
        <Text style={[styles.title, { color: color.text, textAlign: align }]}>
          {isRtl ? 'مصادر طبية وإخلاء مسؤولية' : 'Sources & medical disclaimer'}
        </Text>
      </View>

      <Text style={[styles.body, { color: color.muted, textAlign: align, writingDirection: isRtl ? 'rtl' : 'ltr' }]}>
        {intro}
      </Text>

      <View style={styles.links}>
        {SOURCES.map(s => (
          <Pressable
            key={s.url}
            onPress={() => Linking.openURL(s.url).catch(() => {})}
            style={[styles.linkRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            hitSlop={6}
          >
            <Feather name="external-link" size={12} color={color.spark} />
            <Text style={[styles.linkText, { color: color.spark, textAlign: align }]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, marginTop: 16 },
  header: { alignItems: 'center', gap: 7 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  body: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  links: { gap: 8, marginTop: 2 },
  linkRow: { alignItems: 'center', gap: 7 },
  linkText: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
})
