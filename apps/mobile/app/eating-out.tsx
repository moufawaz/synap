import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { BackButton } from '@/components/BackButton'
import { createMealLog } from '@/features/nutrition'
import { getEatingOutRecommendation } from '@/features/tools'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function EatingOutScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'
  const [situation, setSituation] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [logging, setLogging] = useState(false)

  async function generate() {
    if (!situation.trim()) return
    setLoading(true)
    try {
      setResult(await getEatingOutRecommendation(situation))
    } catch (error) {
      Alert.alert(isRtl ? 'الأكل خارج المنزل' : 'Eating out', error instanceof Error ? error.message : (isRtl ? 'تعذّر اقتراح طلب.' : 'Could not generate order.'))
    } finally {
      setLoading(false)
    }
  }

  async function logBest() {
    const best = result?.recommendation?.best_order
    if (!best) return
    setLogging(true)
    try {
      const macros = best.estimated_macros || {}
      await createMealLog({
        meal_name: best.title || 'Eating out',
        description: (best.items || []).join(', '),
        calories_estimated: macros.calories ?? macros.kcal ?? undefined,
        protein_g: macros.protein_g ?? macros.protein ?? undefined,
        carbs_g: macros.carbs_g ?? macros.carbs ?? undefined,
        fats_g: macros.fat_g ?? macros.fats_g ?? macros.fat ?? undefined,
        source: 'mobile_eating_out',
      })
      Alert.alert(
        isRtl ? 'تم التسجيل ✓' : 'Logged ✓',
        isRtl ? `تمت إضافة "${best.title}" إلى سجل تغذية اليوم.` : `"${best.title}" was added to today's nutrition log.`,
      )
    } catch (error) {
      Alert.alert(isRtl ? 'تعذّر التسجيل' : 'Could not log', error instanceof Error ? error.message : (isRtl ? 'حاول مرة أخرى بعد قليل.' : 'Try again in a moment.'))
    } finally {
      setLogging(false)
    }
  }

  const best = result?.recommendation?.best_order
  const backup = result?.recommendation?.backup_order

  return (
    <Screen>
      <BackButton />
      <PageHeader
        eyebrow={isRtl ? 'الأكل خارج المنزل' : 'EATING OUT'}
        title={isRtl ? 'وضع المطاعم' : 'Restaurant Mode'}
        subtitle={isRtl ? 'إرشادات للمطاعم والتوصيل والمقاهي والمطارات وأي مطبخ حول العالم.' : 'Global restaurant, delivery, cafe, airport, or cuisine guidance.'}
      />
      <Card>
        <TextInput value={situation} onChangeText={setSituation} placeholder={isRtl ? 'مثال: طلب سوشي، فطور في المطار، البيك...' : 'Example: ordering sushi, airport breakfast, Al Baik...'} placeholderTextColor={color.dim} style={[styles.input, { color: color.text, backgroundColor: color.elevated, borderColor: color.border, textAlign: align }]} />
        <Pressable onPress={generate} disabled={loading} style={[styles.primary, { backgroundColor: color.spark }]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRtl ? 'اعثر على أفضل طلب' : 'Find best order'}</Text>}</Pressable>
      </Card>
      {best ? (
        <Card style={styles.cardGap}>
          <Text style={[styles.title, { color: color.text, textAlign: align }]}>{best.title}</Text>
          <Text style={[styles.body, { color: color.muted, textAlign: align }]}>{result.recommendation.context_note}</Text>
          {(best.items || []).map((item: string, index: number) => <Text key={index} style={[styles.body, { color: color.text, textAlign: align }]}>• {item}</Text>)}
          <Text style={[styles.body, { color: color.spark, textAlign: align }]}>~{best.estimated_macros?.calories} {isRtl ? 'سعرة' : 'kcal'} {isRtl ? 'ب' : 'P'}:{best.estimated_macros?.protein_g} {isRtl ? 'ك' : 'C'}:{best.estimated_macros?.carbs_g} {isRtl ? 'د' : 'F'}:{best.estimated_macros?.fat_g}</Text>
          <Text style={[styles.body, { color: color.text, textAlign: align }]}>{best.why}</Text>
          <Pressable onPress={logBest} disabled={logging} style={[styles.secondary, { borderColor: color.pulse, opacity: logging ? 0.6 : 1, alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
            {logging ? <ActivityIndicator color={color.pulse} size="small" /> : <Text style={[styles.secondaryText, { color: color.pulse }]}>{isRtl ? 'سجّل هذا الطعام' : 'Log this food'}</Text>}
          </Pressable>
        </Card>
      ) : null}
      {backup ? <Card style={styles.cardGap}><Text style={[styles.title, { color: color.text, textAlign: align }]}>{isRtl ? 'خيار بديل' : 'Backup'}</Text><Text style={[styles.body, { color: color.text, textAlign: align }]}>{backup.title}</Text></Card> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: { minHeight: 54, borderWidth: 1, borderRadius: 14, padding: 14, fontWeight: '800' },
  primary: { minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { borderWidth: 1, borderRadius: 12, padding: 12, alignSelf: 'flex-start', marginTop: 12 },
  secondaryText: { fontWeight: '900' },
  cardGap: { marginTop: 14 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '700' },
})
