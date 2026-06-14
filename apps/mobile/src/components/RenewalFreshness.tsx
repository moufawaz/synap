import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Feather from '@expo/vector-icons/Feather'
import { analyzeInBodyPhoto, createMeasurement, getPlanReadiness, type PlanReadiness } from '@/features/measurements'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Renewal freshness gate. Shown when the user taps "Renew with Ion" so Ion can
 * rebuild around fresh body data (not the 6-week-old InBody from sign-up). Soft
 * design — always lets the user proceed with current data; just strongly nudges
 * a quick update. Reuses the existing measurements + InBody-scan endpoints; no
 * new server work needed for the update path.
 *
 * Thresholds:
 *   weight + measurements: 7 days
 *   InBody scan:           6 weeks (42 days)
 */

type Phase = 'gate' | 'update'

export function RenewalFreshness({
  visible,
  onClose,
  onProceed,
}: {
  visible: boolean
  onClose: () => void
  onProceed: () => void
}) {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'

  const [phase, setPhase] = useState<Phase>('gate')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PlanReadiness | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Quick-update fields
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [chest, setChest] = useState('')
  const [hips, setHips] = useState('')
  const [neck, setNeck] = useState('')
  const [bicepL, setBicepL] = useState('')
  const [bicepR, setBicepR] = useState('')
  const [thighL, setThighL] = useState('')
  const [thighR, setThighR] = useState('')

  useEffect(() => {
    if (!visible) return
    let alive = true
    setPhase('gate')
    setLoading(true)
    getPlanReadiness()
      .then(d => { if (alive) { setData(d); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [visible])

  function row(icon: string, label: string, valueText: string, fresh: boolean, daysAgo: number | null) {
    const status = daysAgo == null ? 'missing' : fresh ? 'fresh' : 'stale'
    const dot = status === 'fresh' ? '#22C55E' : status === 'missing' ? '#60A5FA' : '#F59E0B'
    const tag = status === 'fresh' ? (isRtl ? 'حديث' : 'Fresh')
      : status === 'missing' ? (isRtl ? 'غير مُسجّل' : 'Not on file')
      : (isRtl ? `قبل ${daysAgo} يوم` : `${daysAgo}d ago`)
    return (
      <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row', borderColor: color.border }]}>
        <View style={[styles.iconCell, { backgroundColor: color.elevated }]}>
          <Feather name={icon as any} size={15} color={color.spark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: color.text, textAlign: align }]}>{label}</Text>
          <Text style={[styles.rowValue, { color: color.muted, textAlign: align }]}>{valueText}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: `${dot}1F`, borderColor: `${dot}55` }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
          <Text style={[styles.tagText, { color: dot }]}>{tag}</Text>
        </View>
      </View>
    )
  }

  async function saveAndProceed() {
    const w = parseFloat(weight.replace(',', '.'))
    if (!Number.isFinite(w) || w <= 0) {
      Alert.alert(isRtl ? 'سناب' : 'SYNAP', isRtl ? 'أدخل وزنك للمتابعة.' : 'Enter your weight to continue.')
      return
    }
    setSaving(true)
    try {
      const fields: Record<string, number> = { weight_kg: w }
      const num = (s: string) => {
        const n = parseFloat(s.replace(',', '.'))
        return Number.isFinite(n) && n > 0 ? n : null
      }
      const pairs: Array<[string, string]> = [
        ['waist_cm', waist], ['chest_cm', chest], ['hips_cm', hips],
        ['neck_cm', neck], ['bicep_left_cm', bicepL], ['bicep_right_cm', bicepR],
        ['thigh_left_cm', thighL], ['thigh_right_cm', thighR],
      ]
      for (const [k, v] of pairs) { const n = num(v); if (n != null) fields[k] = n }
      await createMeasurement({
        date: new Date().toISOString().slice(0, 10),
        ...fields,
        notes: 'Pre-renewal update',
      } as any)
      onProceed()
    } catch (e) {
      Alert.alert(isRtl ? 'لم يُحفظ' : "Couldn't save", e instanceof Error ? e.message : (isRtl ? 'حاول مرة أخرى.' : 'Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  async function scanInBody() {
    setScanning(true)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      let asset
      if (perm.granted) {
        const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        if (shot.canceled) return
        asset = shot.assets[0]
      } else {
        const lib = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 })
        if (lib.canceled) return
        asset = lib.assets[0]
      }
      if (!asset?.base64) return
      const res = await analyzeInBodyPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      if (res.success) {
        Alert.alert(isRtl ? 'تمت إضافة الفحص ✓' : 'InBody added ✓', isRtl ? 'استخدمت قيمك الجديدة في إعادة البناء.' : 'I’ll use your new values when I rebuild.')
      }
    } catch (e) {
      Alert.alert(isRtl ? 'فحص InBody' : 'InBody scan', e instanceof Error ? e.message : (isRtl ? 'حاول مرة أخرى.' : 'Could not analyze the scan.'))
    } finally {
      setScanning(false)
    }
  }

  // ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: color.bg, borderColor: color.border }]}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: color.text }]}>
              {phase === 'gate'
                ? (isRtl ? 'لنبنيها بشكل صحيح' : "Let's get this right")
                : (isRtl ? 'تحديث سريع' : 'Quick update')}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={color.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {phase === 'gate' ? (
              <>
                <Text style={[styles.sub, { color: color.muted, textAlign: align }]}>
                  {isRtl
                    ? 'سيعيد آيون بناء خطتك حول جسمك الحالي. كلما كانت بياناتك أحدث، كانت الخطة أدق.'
                    : 'Ion will rebuild your plan around your current body. The newer your data, the better the plan.'}
                </Text>

                {loading || !data ? (
                  <ActivityIndicator color={color.spark} style={{ marginTop: 30 }} />
                ) : (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {row(
                      'activity',
                      isRtl ? 'الوزن' : 'Weight',
                      data.weight.value != null ? `${data.weight.value} kg` : (isRtl ? 'لا يوجد' : '—'),
                      data.weight.fresh,
                      data.weight.daysAgo,
                    )}
                    {row(
                      'maximize-2',
                      isRtl ? 'القياسات' : 'Measurements',
                      data.measurements.waist_cm != null ? `${isRtl ? 'الخصر' : 'Waist'} ${data.measurements.waist_cm} cm` : (isRtl ? 'لا يوجد' : '—'),
                      data.measurements.fresh,
                      data.measurements.daysAgo,
                    )}
                    {row(
                      'zap',
                      isRtl ? 'فحص InBody' : 'InBody scan',
                      data.inbody.present
                        ? `${data.inbody.body_fat_pct ?? '?'}% ${isRtl ? 'دهون' : 'body fat'}`
                        : (isRtl ? 'لم يُسجَّل بعد' : 'No scan yet'),
                      data.inbody.fresh,
                      data.inbody.daysAgo,
                    )}
                  </View>
                )}

                <Pressable
                  onPress={() => setPhase('update')}
                  style={[styles.primary, { backgroundColor: color.spark, marginTop: 18 }]}
                >
                  <Feather name="edit-3" size={16} color="#fff" />
                  <Text style={styles.primaryText}>{isRtl ? 'تحديث سريع' : 'Quick update'}</Text>
                </Pressable>
                <Pressable onPress={onProceed} style={[styles.ghost, { borderColor: color.border }]}>
                  <Text style={[styles.ghostText, { color: color.muted }]}>
                    {isRtl ? 'تابع بالبيانات الحالية' : 'Renew with current data'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.sub, { color: color.muted, textAlign: align }]}>
                  {isRtl ? 'أدخل وزنك الآن. القياسات الأخرى اختيارية لكنها تحسّن الخطة.' : "Enter today's weight. The other measurements are optional but help Ion calibrate better."}
                </Text>

                <Label color={color} align={align}>{isRtl ? 'الوزن (كغ) — مطلوب' : 'Weight (kg) — required'}</Label>
                <NumField value={weight} onChangeText={setWeight} placeholder="78.4" color={color} />

                <Label color={color} align={align}>{isRtl ? 'الخصر (سم)' : 'Waist (cm)'}</Label>
                <NumField value={waist} onChangeText={setWaist} placeholder="88" color={color} />

                <Pressable onPress={() => setShowMore(s => !s)} style={styles.moreBtn}>
                  <Feather name={showMore ? 'chevron-up' : 'chevron-down'} size={16} color={color.spark} />
                  <Text style={[styles.moreText, { color: color.spark }]}>
                    {isRtl ? (showMore ? 'إخفاء' : 'إظهار المزيد') : (showMore ? 'Show less' : 'Show more')}
                  </Text>
                </Pressable>

                {showMore ? (
                  <View style={{ gap: 8 }}>
                    <Label color={color} align={align}>{isRtl ? 'الصدر (سم)' : 'Chest (cm)'}</Label>
                    <NumField value={chest} onChangeText={setChest} placeholder="101" color={color} />
                    <Label color={color} align={align}>{isRtl ? 'الأرداف (سم)' : 'Hips (cm)'}</Label>
                    <NumField value={hips} onChangeText={setHips} placeholder="98" color={color} />
                    <Label color={color} align={align}>{isRtl ? 'الرقبة (سم)' : 'Neck (cm)'}</Label>
                    <NumField value={neck} onChangeText={setNeck} placeholder="40" color={color} />
                    <Label color={color} align={align}>{isRtl ? 'العضد يسار (سم)' : 'Bicep L (cm)'}</Label>
                    <NumField value={bicepL} onChangeText={setBicepL} placeholder="36" color={color} />
                    <Label color={color} align={align}>{isRtl ? 'العضد يمين (سم)' : 'Bicep R (cm)'}</Label>
                    <NumField value={bicepR} onChangeText={setBicepR} placeholder="36" color={color} />
                    <Label color={color} align={align}>{isRtl ? 'الفخذ يسار (سم)' : 'Thigh L (cm)'}</Label>
                    <NumField value={thighL} onChangeText={setThighL} placeholder="58" color={color} />
                    <Label color={color} align={align}>{isRtl ? 'الفخذ يمين (سم)' : 'Thigh R (cm)'}</Label>
                    <NumField value={thighR} onChangeText={setThighR} placeholder="58" color={color} />
                  </View>
                ) : null}

                {/* InBody scan */}
                <Pressable
                  onPress={scanInBody}
                  disabled={scanning}
                  style={[styles.scanBtn, { borderColor: color.spark, backgroundColor: color.elevated }]}
                >
                  {scanning
                    ? <ActivityIndicator color={color.spark} />
                    : (
                      <>
                        <Feather name="camera" size={16} color={color.spark} />
                        <Text style={[styles.scanText, { color: color.spark }]}>
                          {isRtl ? 'تصوير فحص InBody' : 'Scan InBody (optional)'}
                        </Text>
                      </>
                    )
                  }
                </Pressable>

                <Pressable
                  onPress={saveAndProceed}
                  disabled={saving}
                  style={[styles.primary, { backgroundColor: color.spark, marginTop: 14 }]}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : (
                      <>
                        <Feather name="check" size={16} color="#fff" />
                        <Text style={styles.primaryText}>{isRtl ? 'حفظ ومتابعة التجديد' : 'Save & continue to renewal'}</Text>
                      </>
                    )
                  }
                </Pressable>
                <Pressable onPress={() => setPhase('gate')} style={[styles.ghost, { borderColor: color.border }]}>
                  <Text style={[styles.ghostText, { color: color.muted }]}>{isRtl ? 'رجوع' : 'Back'}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function Label({ children, color, align }: { children: React.ReactNode; color: any; align: 'left' | 'right' }) {
  return <Text style={{ color: color.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 4, textAlign: align }}>{children}</Text>
}

function NumField({ value, onChangeText, placeholder, color }: { value: string; onChangeText: (v: string) => void; placeholder: string; color: any }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={color.dim}
      keyboardType="decimal-pad"
      style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: color.border, backgroundColor: color.elevated, paddingHorizontal: 14, color: color.text, fontWeight: '800', textAlign: 'center' }}
    />
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: '92%' },
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '900' },
  sub: { fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 4 },
  row: { alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  iconCell: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '900' },
  rowValue: { fontSize: 12, fontWeight: '600' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 14 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  ghost: { minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ghostText: { fontWeight: '800', fontSize: 13 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 4, marginBottom: 4 },
  moreText: { fontSize: 13, fontWeight: '800' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1.5, marginTop: 14 },
  scanText: { fontSize: 13, fontWeight: '900' },
})
