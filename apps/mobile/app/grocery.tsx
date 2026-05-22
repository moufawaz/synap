import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { getGroceryList } from '@/features/tools'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

export default function GroceryScreen() {
  const { color } = useTheme()
  const list = useAsyncData(getGroceryList, [])
  return (
    <Screen>
      <PageHeader eyebrow="FOOD PREP" title="Grocery List" subtitle="Generated from your active diet plan." />
      {list.loading ? <ActivityIndicator color={color.spark} /> : null}
      {list.error ? <Text style={[styles.body, { color: color.danger }]}>{list.error}</Text> : null}
      {(list.data?.groups || []).map(group => (
        <Card key={group.category} style={styles.cardGap}>
          <Text style={[styles.title, { color: color.text }]}>{group.category_label}</Text>
          {group.items.map(item => <Text key={item.id} style={[styles.body, { color: color.text }]}>• {item.name} - {item.quantity}</Text>)}
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({ cardGap: { marginTop: 12 }, title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 24, fontWeight: '700' } })
