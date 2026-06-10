import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { BackButton } from '@/components/BackButton'
import { runMacroAdjustment } from '@/features/profile'
import { useTheme } from '@/theme/ThemeProvider'

export default function MacroAdjustmentScreen() {
  const { color } = useTheme()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function run() {
    setLoading(true)
    try {
      const res = await runMacroAdjustment()
      setResult(res)
      if (res.message) Alert.alert('Macro adjustment', res.message)
    } catch (error) {
      Alert.alert('Macro adjustment', error instanceof Error ? error.message : 'Could not adjust macros.')
    } finally {
      setLoading(false)
    }
  }

  const adjustment = result?.adjustment
  const previous = result?.previousTargets

  return (
    <Screen>
      <BackButton />
      <PageHeader eyebrow="ELITE" title="Macro Adjustment" subtitle="Ion reviews recent trend, workouts, and meals before adjusting targets." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Weekly micro-adjustment</Text>
        <Text style={[styles.body, { color: color.muted }]}>
          This applies a small diet-plan adjustment when your data shows it is needed.
        </Text>
        <Pressable disabled={loading} onPress={run} style={[styles.primary, { backgroundColor: color.spark }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Run adjustment</Text>}
        </Pressable>
      </Card>
      {adjustment ? (
        <Card style={styles.cardGap}>
          <Text style={[styles.title, { color: color.text }]}>Updated targets</Text>
          <View style={styles.grid}>
            <Metric label="Calories" before={previous?.calories} after={adjustment.adjusted_calories} color={color.flame} bg={color.elevated} valueColor={color.text} />
            <Metric label="Protein" before={previous?.protein} after={adjustment.adjusted_protein_g} color={color.spark} bg={color.elevated} valueColor={color.text} />
            <Metric label="Carbs" before={previous?.carbs} after={adjustment.adjusted_carbs_g} color={color.cyan} bg={color.elevated} valueColor={color.text} />
            <Metric label="Fat" before={previous?.fat} after={adjustment.adjusted_fat_g} color={color.pulse} bg={color.elevated} valueColor={color.text} />
          </View>
          <Text style={[styles.body, { color: color.text }]}>{adjustment.rationale}</Text>
        </Card>
      ) : null}
    </Screen>
  )
}

function Metric({ label, before, after, color, bg, valueColor }: { label: string; before: unknown; after: unknown; color: string; bg: string; valueColor: string }) {
  return (
    <View style={[styles.metric, { backgroundColor: bg }]}>
      <Text style={[styles.metricLabel, { color }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{String(before ?? '-')} → {String(after ?? '-')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  cardGap: { marginTop: 14 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 6 },
  primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  grid: { gap: 10, marginVertical: 10 },
  metric: { borderRadius: 12, padding: 12 },
  metricLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  metricValue: { fontSize: 18, fontWeight: '900', marginTop: 3 },
})
