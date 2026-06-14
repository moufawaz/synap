import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { getPlanReadiness, type PlanReadiness, type PlanReadinessLift } from '@/features/measurements'
import type { RenewalContext } from '@/features/workout'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Workout renewal freshness gate. Same UX shape as the nutrition one but the
 * questions are different — Ion progresses workouts off **logged numbers**, not
 * body composition. Shows compliance %, last logged session, and per-main-lift
 * freshness. Quick update form collects today's working sets + any "flags"
 * (shoulder pain, less time, want more cardio, etc.). All saved into a
 * RenewalContext that the server prompt uses as hard constraints when
 * generating the new cycle.
 *
 * Thresholds:
 *   last session: 7 days
 *   per-lift:    14 days
 *   compliance:  >=70% of expected sessions = good adherence
 */

type Phase = 'gate' | 'update'

const FLAG_OPTIONS = [
  { key: 'shoulder_pain',     en: 'Shoulder pain',         ar: 'ألم في الكتف' },
  { key: 'lower_back_tight',  en: 'Lower back tight',      ar: 'شد في أسفل الظهر' },
  { key: 'knee_niggle',       en: 'Knee niggle',           ar: 'مشكلة في الركبة' },
  { key: 'less_time',         en: 'Less time available',   ar: 'وقت أقل متاح' },
  { key: 'want_more_cardio',  en: 'Want more cardio',      ar: 'أريد كارديو أكثر' },
  { key: 'want_less_volume',  en: 'Want less volume',      ar: 'أريد حجم تدريب أقل' },
]

export function WorkoutRenewalFreshness({
  visible,
  onClose,
  onProceed,
}: {
  visible: boolean
  onClose: () => void
  onProceed: (context: RenewalContext) => void
}) {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'

  const [phase, setPhase] = useState<Phase>('gate')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PlanReadiness | null>(null)
  const [saving, setSaving] = useState(false)

  // Per-lift inputs (keyed by exercise name). Pre-filled with the last logged
  // values if available so the user only updates what changed.
  const [liftWeights, setLiftWeights] = useState<Record<string, string>>({})
  const [liftReps, setLiftReps] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!visible) return
    let alive = true
    setPhase('gate')
    setFlags(new Set())
    setLoading(true)
    getPlanReadiness()
      .then(d => {
        if (!alive) return
        setData(d)
        // Pre-fill inputs from the last logged values so users only touch what changed
        const w: Record<string, string> = {}
        const r: Record<string, string> = {}
        for (const l of d.workout?.lifts || []) {
          if (l.weight_kg != null) w[l.name] = String(l.weight_kg)
          if (l.reps != null) r[l.name] = String(l.reps)
        }
        setLiftWeights(w)
        setLiftReps(r)
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [visible])

  const goalLabel = useMemo(() => {
    const g = data?.workout?.goal || ''
    if (!g) return ''
    return g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }, [data])

  function row(icon: string, label: string, valueText: string, fresh: boolean, daysAgo: number | null, neutralLabel?: string) {
    const status = daysAgo == null ? 'missing' : fresh ? 'fresh' : 'stale'
    const dot = status === 'fresh' ? '#22C55E' : status === 'missing' ? '#60A5FA' : '#F59E0B'
    const tag = status === 'fresh' ? (isRtl ? 'حديث' : 'Fresh')
      : status === 'missing' ? (neutralLabel || (isRtl ? 'غير مُسجَّل' : 'Not logged'))
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

  function toggleFlag(k: string) {
    setFlags(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  function saveAndProceed() {
    setSaving(true)
    try {
      const lifts: Array<{ name: string; weight_kg: number; reps: number }> = []
      for (const l of data?.workout?.lifts || []) {
        const wRaw = (liftWeights[l.name] || '').replace(',', '.').trim()
        const rRaw = (liftReps[l.name] || '').replace(',', '.').trim()
        const w = parseFloat(wRaw)
        const r = parseInt(rRaw, 10)
        if (Number.isFinite(w) && w > 0) {
          lifts.push({ name: l.name, weight_kg: w, reps: Number.isFinite(r) && r > 0 ? r : 0 })
        }
      }
      const flagLabels: string[] = []
      for (const k of flags) {
        const f = FLAG_OPTIONS.find(o => o.key === k)
        if (f) flagLabels.push(isRtl ? f.ar : f.en)
      }
      onProceed({ lifts, flags: flagLabels })
    } catch (e) {
      Alert.alert(isRtl ? 'سناب' : 'SYNAP', e instanceof Error ? e.message : 'Could not proceed.')
    } finally {
      setSaving(false)
    }
  }

  // ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: color.bg, borderColor: color.border }]}>
          <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: color.text }]}>
              {phase === 'gate'
                ? (isRtl ? 'لنُدرّج تمارينك بدقة' : "Let's progress your training right")
                : (isRtl ? 'تحديث سريع — التمرين' : 'Quick update — training')}
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
                    ? 'يبني آيون التمرين الجديد بناءً على أرقامك الفعلية. كلّما كانت بياناتك أحدث، تدرّجت الأوزان بشكل صحيح.'
                    : "Ion progresses your next cycle off your real numbers. The fresher the logs, the smarter the load jumps."}
                </Text>

                {loading || !data?.workout ? (
                  <ActivityIndicator color={color.spark} style={{ marginTop: 30 }} />
                ) : (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {/* Compliance */}
                    <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row', borderColor: color.border }]}>
                      <View style={[styles.iconCell, { backgroundColor: color.elevated }]}>
                        <Feather name="check-circle" size={15} color={color.spark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowLabel, { color: color.text, textAlign: align }]}>
                          {isRtl ? 'الالتزام' : 'Compliance'}
                        </Text>
                        <Text style={[styles.rowValue, { color: color.muted, textAlign: align }]}>
                          {isRtl
                            ? `${data.workout.compliance.actual} من ${data.workout.compliance.expected} جلسة (آخر 6 أسابيع)`
                            : `${data.workout.compliance.actual} / ${data.workout.compliance.expected} sessions (last 6 weeks)`}
                        </Text>
                      </View>
                      <View style={[styles.tag, { backgroundColor: `${data.workout.compliance.fresh ? '#22C55E' : '#F59E0B'}1F`, borderColor: `${data.workout.compliance.fresh ? '#22C55E' : '#F59E0B'}55` }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: data.workout.compliance.fresh ? '#22C55E' : '#F59E0B' }} />
                        <Text style={[styles.tagText, { color: data.workout.compliance.fresh ? '#22C55E' : '#F59E0B' }]}>
                          {`${data.workout.compliance.pct}%`}
                        </Text>
                      </View>
                    </View>

                    {/* Last session */}
                    {row(
                      'activity',
                      isRtl ? 'آخر جلسة مُسجَّلة' : 'Last logged session',
                      data.workout.lastSession.date
                        ? (isRtl ? `بتاريخ ${data.workout.lastSession.date}` : data.workout.lastSession.date)
                        : (isRtl ? 'لم تُسجَّل جلسات' : 'No sessions yet'),
                      data.workout.lastSession.fresh,
                      data.workout.lastSession.daysAgo,
                    )}

                    {/* Per-lift rows */}
                    {data.workout.lifts.map((l: PlanReadinessLift) => row(
                      'trending-up',
                      l.name,
                      l.weight_kg != null
                        ? (isRtl ? `${l.weight_kg} كغ × ${l.reps ?? '?'} عدّة` : `${l.weight_kg} kg × ${l.reps ?? '?'} reps`)
                        : (isRtl ? 'بدون أرقام' : 'No numbers'),
                      l.fresh,
                      l.daysAgo,
                    ))}

                    {/* Goal */}
                    {goalLabel ? (
                      <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row', borderColor: color.border }]}>
                        <View style={[styles.iconCell, { backgroundColor: color.elevated }]}>
                          <Feather name="target" size={15} color={color.spark} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowLabel, { color: color.text, textAlign: align }]}>
                            {isRtl ? 'الهدف الحالي' : 'Current goal'}
                          </Text>
                          <Text style={[styles.rowValue, { color: color.muted, textAlign: align }]}>{goalLabel}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}

                <Pressable onPress={() => setPhase('update')} style={[styles.primary, { backgroundColor: color.spark, marginTop: 18 }]}>
                  <Feather name="edit-3" size={16} color="#fff" />
                  <Text style={styles.primaryText}>{isRtl ? 'تحديث سريع' : 'Quick update'}</Text>
                </Pressable>
                <Pressable onPress={() => onProceed({})} style={[styles.ghost, { borderColor: color.border }]}>
                  <Text style={[styles.ghostText, { color: color.muted }]}>
                    {isRtl ? 'تابع بالبيانات الحالية' : 'Renew with current data'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.sub, { color: color.muted, textAlign: align }]}>
                  {isRtl
                    ? 'حدِّث أحسن مجموعة عمل لكل تمرين، وضع علامة على أي شيء يجب أن يتجنّبه آيون.'
                    : 'Update your best working set for each lift, and flag anything Ion should program around.'}
                </Text>

                {(data?.workout?.lifts || []).length === 0 ? (
                  <Text style={[styles.empty, { color: color.muted, textAlign: align }]}>
                    {isRtl ? 'لم نعثر على تمارين رئيسية في خطتك الحالية.' : "We couldn't detect main lifts on your current plan."}
                  </Text>
                ) : (
                  (data?.workout?.lifts || []).map(l => (
                    <View key={l.name} style={{ marginTop: 12 }}>
                      <Text style={[styles.liftLabel, { color: color.text, textAlign: align }]}>{l.name}</Text>
                      <View style={[styles.liftRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.smallLabel, { color: color.muted, textAlign: align }]}>{isRtl ? 'الوزن (كغ)' : 'Weight (kg)'}</Text>
                          <TextInput
                            value={liftWeights[l.name] || ''}
                            onChangeText={v => setLiftWeights(prev => ({ ...prev, [l.name]: v }))}
                            placeholder="80"
                            placeholderTextColor={color.dim}
                            keyboardType="decimal-pad"
                            style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: color.border, backgroundColor: color.elevated, paddingHorizontal: 14, color: color.text, fontWeight: '800', textAlign: 'center' }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.smallLabel, { color: color.muted, textAlign: align }]}>{isRtl ? 'التكرارات' : 'Reps'}</Text>
                          <TextInput
                            value={liftReps[l.name] || ''}
                            onChangeText={v => setLiftReps(prev => ({ ...prev, [l.name]: v }))}
                            placeholder="8"
                            placeholderTextColor={color.dim}
                            keyboardType="number-pad"
                            style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: color.border, backgroundColor: color.elevated, paddingHorizontal: 14, color: color.text, fontWeight: '800', textAlign: 'center' }}
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}

                <Text style={[styles.smallLabel, { color: color.muted, textAlign: align, marginTop: 18, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }]}>
                  {isRtl ? 'هل من شيء يحتاج آيون لتعديله؟' : 'Anything Ion should program around?'}
                </Text>
                <View style={styles.flagsWrap}>
                  {FLAG_OPTIONS.map(f => {
                    const on = flags.has(f.key)
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => toggleFlag(f.key)}
                        style={[
                          styles.flagChip,
                          {
                            borderColor: on ? color.spark : color.border,
                            backgroundColor: on ? `${color.spark}26` : color.elevated,
                          },
                        ]}
                      >
                        {on ? <Feather name="check" size={12} color={color.spark} /> : null}
                        <Text style={[styles.flagText, { color: on ? color.spark : color.text }]}>
                          {isRtl ? f.ar : f.en}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                <Pressable onPress={saveAndProceed} disabled={saving} style={[styles.primary, { backgroundColor: color.spark, marginTop: 18 }]}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : (
                      <>
                        <Feather name="check" size={16} color="#fff" />
                        <Text style={styles.primaryText}>{isRtl ? 'حفظ ومتابعة التجديد' : 'Save & continue to renewal'}</Text>
                      </>
                    )}
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
  liftLabel: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  liftRow: { gap: 10 },
  smallLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  empty: { fontSize: 13, marginTop: 20, fontWeight: '600' },
  flagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  flagText: { fontSize: 12, fontWeight: '800' },
})
