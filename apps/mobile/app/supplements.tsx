import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { generateSupplementRecommendations, getSupplementRecommendations } from '@/features/profile'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

export default function SupplementsScreen() {
  const { color } = useTheme()
  const recs = useAsyncData(getSupplementRecommendations, [])
  const [generating, setGenerating] = useState(false)
  const recommendation = recs.data?.recommendation
  const items = Array.isArray(recommendation?.recommendations) ? recommendation.recommendations : []

  async function generate() {
    setGenerating(true)
    try {
      await generateSupplementRecommendations()
      await recs.reload()
    } catch (error) {
      Alert.alert('Supplements', error instanceof Error ? error.message : 'Could not generate recommendations.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="ELITE" title="Supplement Stack" subtitle="Personalized timing, dosage, rationale, and purchase guidance." />
      {recs.loading ? <ActivityIndicator color={color.spark} /> : null}
      {recs.error ? <Text style={[styles.body, { color: color.danger }]}>{recs.error}</Text> : null}
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Recommendations</Text>
        <Text style={[styles.body, { color: color.muted }]}>
          {recommendation?.generated_at ? `Generated ${new Date(recommendation.generated_at).toLocaleDateString()}` : 'Generate a stack from your profile and active plan.'}
        </Text>
        <Pressable disabled={generating} onPress={generate} style={[styles.primary, { backgroundColor: color.spark }]}>
          {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{items.length ? 'Regenerate' : 'Generate stack'}</Text>}
        </Pressable>
      </Card>
      {items.map((item: any, index: number) => (
        <Card key={`${item.name}-${index}`} style={styles.cardGap}>
          <Text style={[styles.itemTitle, { color: color.text }]}>{item.name || `Supplement ${index + 1}`}</Text>
          <Text style={[styles.body, { color: color.spark }]}>Dose: {item.dose || item.dosage || '-'}</Text>
          <Text style={[styles.body, { color: color.pulse }]}>Timing: {item.timing || '-'}</Text>
          <Text style={[styles.body, { color: color.text }]}>{item.rationale || item.why || ''}</Text>
          {item.where_to_buy ? <Text style={[styles.body, { color: color.muted }]}>Where to buy: {item.where_to_buy}</Text> : null}
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cardGap: { marginTop: 14 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  itemTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 4 },
  primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
})
