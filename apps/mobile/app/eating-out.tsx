import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { createMealLog } from '@/features/nutrition'
import { getEatingOutRecommendation } from '@/features/tools'
import { useTheme } from '@/theme/ThemeProvider'

export default function EatingOutScreen() {
  const { color } = useTheme()
  const [situation, setSituation] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!situation.trim()) return
    setLoading(true)
    try {
      setResult(await getEatingOutRecommendation(situation))
    } catch (error) {
      Alert.alert('Eating out', error instanceof Error ? error.message : 'Could not generate order.')
    } finally {
      setLoading(false)
    }
  }

  async function logBest() {
    const best = result?.recommendation?.best_order
    if (!best) return
    const macros = best.estimated_macros || {}
    await createMealLog({
      meal_name: best.title,
      description: (best.items || []).join(', '),
      calories_estimated: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fats_g: macros.fat_g,
      source: 'mobile_eating_out',
    })
    Alert.alert('Logged', 'Best order was added to today.')
  }

  const best = result?.recommendation?.best_order
  const backup = result?.recommendation?.backup_order

  return (
    <Screen>
      <PageHeader eyebrow="EATING OUT" title="Restaurant Mode" subtitle="Global restaurant, delivery, cafe, airport, or cuisine guidance." />
      <Card>
        <TextInput value={situation} onChangeText={setSituation} placeholder="Example: ordering sushi, airport breakfast, Al Baik..." placeholderTextColor={color.dim} style={[styles.input, { color: color.text, backgroundColor: color.elevated, borderColor: color.border }]} />
        <Pressable onPress={generate} disabled={loading} style={[styles.primary, { backgroundColor: color.spark }]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Find best order</Text>}</Pressable>
      </Card>
      {best ? (
        <Card style={styles.cardGap}>
          <Text style={[styles.title, { color: color.text }]}>{best.title}</Text>
          <Text style={[styles.body, { color: color.muted }]}>{result.recommendation.context_note}</Text>
          {(best.items || []).map((item: string, index: number) => <Text key={index} style={[styles.body, { color: color.text }]}>• {item}</Text>)}
          <Text style={[styles.body, { color: color.spark }]}>~{best.estimated_macros?.calories} kcal P:{best.estimated_macros?.protein_g} C:{best.estimated_macros?.carbs_g} F:{best.estimated_macros?.fat_g}</Text>
          <Text style={[styles.body, { color: color.text }]}>{best.why}</Text>
          <Pressable onPress={logBest} style={[styles.secondary, { borderColor: color.pulse }]}><Text style={[styles.secondaryText, { color: color.pulse }]}>Log this food</Text></Pressable>
        </Card>
      ) : null}
      {backup ? <Card style={styles.cardGap}><Text style={[styles.title, { color: color.text }]}>Backup</Text><Text style={[styles.body, { color: color.text }]}>{backup.title}</Text></Card> : null}
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
