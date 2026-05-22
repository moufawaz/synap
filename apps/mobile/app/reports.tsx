import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { getMonthlySummary, getWeeklyReports } from '@/features/tools'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

export default function ReportsScreen() {
  const { color } = useTheme()
  const weekly = useAsyncData(getWeeklyReports, [])
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  async function monthly() {
    setLoadingSummary(true)
    try {
      const res = await getMonthlySummary()
      setSummary(res.summary)
    } finally {
      setLoadingSummary(false)
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="REPORTS" title="Reports" subtitle="Weekly Elite reports and monthly Ion summaries." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Monthly Summary</Text>
        <Pressable onPress={monthly} style={[styles.primary, { backgroundColor: color.spark }]}>{loadingSummary ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Generate summary</Text>}</Pressable>
        {summary ? <Text style={[styles.body, { color: color.text }]}>{summary}</Text> : null}
      </Card>
      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: color.text }]}>Weekly Reports</Text>
        {weekly.loading ? <ActivityIndicator color={color.spark} /> : null}
        {weekly.error ? <Text style={[styles.body, { color: color.danger }]}>{weekly.error}</Text> : null}
        {(weekly.data?.reports || []).map(report => <Text key={report.id} style={[styles.body, { color: color.text }]}>{report.week_start}: {report.report_md || report.report_json?.summary || 'Report available'}</Text>)}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({ cardGap: { marginTop: 14 }, title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 10 }, primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900' } })
