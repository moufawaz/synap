import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { BackButton } from '@/components/BackButton'
import { generateSupplementRecommendations, getSupplementRecommendations } from '@/features/profile'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

export default function SupplementsScreen() {
  const { color } = useTheme()
  const recs = useAsyncData(getSupplementRecommendations, [], { cacheKey: 'supplement-recs', cacheTtlMs: 30 * 60 * 1000 })
  const [generating, setGenerating] = useState(false)
  const recommendation = recs.data?.recommendation
  // DB stores the full AI JSON in `recommendations` column — the array is nested under `.supplements`
  const recData = recommendation?.recommendations
  const items: any[] = Array.isArray(recData?.supplements)
    ? recData.supplements
    : Array.isArray(recData)
      ? recData  // legacy shape fallback
      : []

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

  // ── Loading skeleton ──────────────────────────────────────
  if (recs.loading && !recs.data) {
    return (
      <Screen>
      <BackButton />
        <PageHeader eyebrow="ELITE" title="Supplement Stack" subtitle="Personalized timing, dosage, rationale, and purchase guidance." />
        <View style={styles.centered}>
          <ActivityIndicator color={color.spark} size="large" />
          <Text style={[styles.loadingText, { color: color.muted }]}>Loading recommendations…</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <BackButton />
      <PageHeader eyebrow="ELITE" title="Supplement Stack" subtitle="Personalized timing, dosage, rationale, and purchase guidance." />

      {recs.error ? (
        <Card style={styles.errorCard}>
          <Text style={[styles.errorText, { color: color.danger }]}>{recs.error}</Text>
        </Card>
      ) : null}

      {/* Empty state or regen */}
      <Card>
        {items.length === 0 && !generating ? (
          <>
            <Text style={[styles.title, { color: color.text }]}>Your supplement stack</Text>
            <Text style={[styles.body, { color: color.muted }]}>
              {recommendation?.generated_at
                ? `Last generated ${new Date(recommendation.generated_at).toLocaleDateString('en-GB')}. Regenerate to refresh with your current plan.`
                : 'Ion will analyse your profile, goal, and active plan to build a personalised supplement stack with timing, dosage, and rationale.'}
            </Text>
          </>
        ) : items.length > 0 ? (
          <Text style={[styles.body, { color: color.muted }]}>
            {recommendation?.generated_at ? `Generated ${new Date(recommendation.generated_at).toLocaleDateString('en-GB')} · ` : ''}{items.length} supplements
          </Text>
        ) : null}

        {generating ? (
          <View style={styles.generatingRow}>
            <ActivityIndicator color={color.spark} />
            <Text style={[styles.body, { color: color.muted, flex: 1 }]}>
              Ion is analysing your profile and building your stack… this takes about 30 seconds.
            </Text>
          </View>
        ) : (
          <Pressable onPress={generate} style={[styles.primary, { backgroundColor: color.spark }]}>
            <Text style={styles.primaryText}>{items.length ? 'Regenerate stack' : 'Generate my stack'}</Text>
          </Pressable>
        )}
      </Card>

      {/* Supplement cards */}
      {items.map((item: any, index: number) => (
        <Card key={`${item.name}-${index}`} style={styles.cardGap}>
          <Text style={[styles.itemTitle, { color: color.text }]}>{item.name || `Supplement ${index + 1}`}</Text>
          <View style={styles.pillRow}>
            {item.dose || item.dosage ? (
              <View style={[styles.pill, { backgroundColor: `${color.spark}18`, borderColor: `${color.spark}40` }]}>
                <Text style={[styles.pillText, { color: color.spark }]}>💊 {item.dose || item.dosage}</Text>
              </View>
            ) : null}
            {item.timing ? (
              <View style={[styles.pill, { backgroundColor: `${color.pulse}18`, borderColor: `${color.pulse}40` }]}>
                <Text style={[styles.pillText, { color: color.pulse }]}>🕐 {item.timing}</Text>
              </View>
            ) : null}
          </View>
          {item.benefit || item.rationale || item.why ? (
            <Text style={[styles.body, { color: color.muted, marginTop: 8 }]}>{item.benefit || item.rationale || item.why}</Text>
          ) : null}
          {item.notes ? (
            <Text style={[styles.body, { color: color.dim, marginTop: 4 }]}>💡 {item.notes}</Text>
          ) : null}
          {item.where_to_buy ? (
            <Text style={[styles.body, { color: color.dim, marginTop: 4 }]}>🛒 {item.where_to_buy}</Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  errorCard: { marginBottom: 12 },
  errorText: { fontSize: 14, fontWeight: '700' },
  cardGap: { marginTop: 14 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  itemTitle: { fontSize: 17, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12,
    borderRadius: 12, backgroundColor: 'rgba(187,92,246,0.06)' },
  primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '800' },
})
