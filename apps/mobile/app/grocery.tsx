import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getGroceryList } from '@/features/tools'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

const CHECKED_KEY = 'synap_grocery_checked_v1'

export default function GroceryScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const list = useAsyncData(getGroceryList, [])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [sharing, setSharing] = useState(false)

  const align = isRtl ? 'right' : 'left'

  // Load persisted checked state
  useEffect(() => {
    AsyncStorage.getItem(CHECKED_KEY)
      .then(val => {
        if (val) setChecked(new Set(JSON.parse(val)))
      })
      .catch(() => {})
  }, [])

  async function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      AsyncStorage.setItem(CHECKED_KEY, JSON.stringify([...next])).catch(() => {})
      return next
    })
  }

  async function clearChecked() {
    setChecked(new Set())
    await AsyncStorage.removeItem(CHECKED_KEY).catch(() => {})
  }

  const allItems = (list.data?.groups ?? []).flatMap(g => g.items)
  const checkedCount = allItems.filter(item => checked.has(item.id)).length
  const progress = allItems.length ? checkedCount / allItems.length : 0

  function listText() {
    return (list.data?.groups ?? [])
      .map(group => {
        const rows = group.items.map(item => `${checked.has(item.id) ? '[✓]' : '[ ]'} ${item.name} — ${item.quantity}`)
        return `${group.category_label || group.category}\n${rows.join('\n')}`
      })
      .join('\n\n')
  }

  async function shareList() {
    setSharing(true)
    try {
      await Share.share({
        title: isRtl ? 'قائمة البقالة — SYNAP' : 'SYNAP Weekly Grocery List',
        message: `${isRtl ? 'قائمة البقالة الأسبوعية — SYNAP' : 'SYNAP Weekly Grocery List'}\n\n${listText()}`,
      })
    } catch {
      // user cancelled or error
    } finally {
      setSharing(false)
    }
  }

  return (
    <Screen>
      <IonPageHeader
        eyebrow={isRtl ? 'التغذية' : 'FOOD PREP'}
        title={isRtl ? 'قائمة البقالة' : 'Grocery List'}
        subtitle={isRtl ? 'مُنشأة من خطة النظام الغذائي النشط.' : 'Generated from your active diet plan.'}
      />

      {list.loading ? <ActivityIndicator color={color.spark} style={{ marginTop: 20 }} /> : null}
      {list.error ? (
        <Card>
          <Text style={[styles.body, { color: color.danger, textAlign: align }]}>{list.error}</Text>
        </Card>
      ) : null}

      {!list.loading && !list.error && allItems.length > 0 ? (
        <>
          {/* Progress bar */}
          <Card style={styles.progressCard}>
            <View style={[styles.progressHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.progressLabel, { color: color.text }]}>
                {isRtl ? `${checkedCount} من ${allItems.length} عنصر` : `${checkedCount} / ${allItems.length} items`}
              </Text>
              <Text style={[styles.progressPct, { color: color.spark }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: color.elevated }]}>
              <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color.spark }]} />
            </View>
            {checkedCount > 0 ? (
              <Pressable onPress={() => Alert.alert(
                isRtl ? 'إزالة التحديد' : 'Clear checked',
                isRtl ? 'هل تريد إزالة تحديد جميع العناصر؟' : 'Uncheck all items?',
                [
                  { text: isRtl ? 'إلغاء' : 'Cancel', style: 'cancel' },
                  { text: isRtl ? 'إزالة' : 'Clear', onPress: clearChecked },
                ]
              )} style={{ alignSelf: isRtl ? 'flex-start' : 'flex-end', marginTop: 8 }}>
                <Text style={[styles.clearText, { color: color.dim }]}>
                  {isRtl ? 'إزالة التحديد' : 'Clear checked'}
                </Text>
              </Pressable>
            ) : null}
          </Card>

          {/* Share button */}
          <Pressable
            onPress={shareList}
            disabled={sharing}
            style={[styles.shareBtn, { backgroundColor: color.elevated, borderColor: color.border }]}
          >
            <Feather name="share-2" size={16} color={color.spark} />
            <Text style={[styles.shareBtnText, { color: color.text }]}>
              {isRtl ? 'مشاركة القائمة' : 'Share list'}
            </Text>
          </Pressable>

          {/* Categories */}
          {(list.data?.groups ?? []).map(group => (
            <Card key={group.category} style={styles.cardGap}>
              <Text style={[styles.categoryTitle, { color: color.text, textAlign: align }]}>
                {group.category_label || group.category}
              </Text>
              {group.items.map((item: any) => {
                const isChecked = checked.has(item.id)
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    style={({ pressed }) => [
                      styles.itemRow,
                      { flexDirection: isRtl ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={[styles.checkbox, {
                      borderColor: isChecked ? color.pulse : color.border,
                      backgroundColor: isChecked ? color.pulse : 'transparent',
                    }]}>
                      {isChecked ? <Feather name="check" size={12} color="#fff" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, {
                        color: isChecked ? color.dim : color.text,
                        textAlign: align,
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                      }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemQty, { color: color.muted, textAlign: align }]}>
                        {item.quantity}
                      </Text>
                    </View>
                    {item.sources?.length ? (
                      <Text style={[styles.sourceTag, { color: color.dim }]} numberOfLines={1}>
                        {item.sources[0]}
                      </Text>
                    ) : null}
                  </Pressable>
                )
              })}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  progressCard: { marginBottom: 8 },
  progressHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '800' },
  progressPct: { fontSize: 14, fontWeight: '900' },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  clearText: { fontSize: 12, fontWeight: '700' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  shareBtnText: { fontSize: 14, fontWeight: '900' },
  cardGap: { marginTop: 10 },
  categoryTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  itemRow: { alignItems: 'center', gap: 12, paddingVertical: 9, borderRadius: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemName: { fontSize: 15, fontWeight: '800', marginBottom: 1 },
  itemQty: { fontSize: 12, fontWeight: '600' },
  sourceTag: { fontSize: 10, fontWeight: '700', maxWidth: 70 },
  body: { fontSize: 15, fontWeight: '700' },
})
