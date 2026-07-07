import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { BackButton } from '@/components/BackButton'
import { Card } from '@/components/Card'
import { DataError } from '@/components/DataError'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import { getSparks, redeemSparks } from '@/features/sparks'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { notifySuccess, tapLight } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * ⚡ Sparks rewards screen. Balance hero, redeemable rewards (free Elite
 * days), how-to-earn list, and recent activity. Earning happens automatically
 * server-side as users log workouts/meals/etc — this screen is where they
 * spend and where the loop becomes visible.
 */

const REWARD_LABELS: Record<string, { en: string; ar: string }> = {
  elite_3d:  { en: '3 days of Elite',  ar: '3 أيام Elite' },
  elite_7d:  { en: '1 week of Elite',  ar: 'أسبوع Elite' },
  elite_30d: { en: '1 month of Elite', ar: 'شهر Elite' },
}

const EARN_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  workout_completed:  { en: 'Complete a workout (1/day)',          ar: 'أكمل تمريناً (مرة/يوم)',            icon: 'activity' },
  meal_logged:        { en: 'Log a meal (up to 3/day)',            ar: 'سجّل وجبة (حتى 3/يوم)',             icon: 'coffee' },
  streak_week:        { en: 'Hit your weekly session target',      ar: 'حقق هدف جلسات الأسبوع',             icon: 'zap' },
  pr:                 { en: 'Set a new PR (up to 2/week)',         ar: 'سجّل رقماً قياسياً (حتى 2/أسبوع)',   icon: 'trending-up' },
  renewal_fresh:      { en: 'Renew your plan with fresh data',     ar: 'جدّد خطتك ببيانات محدّثة',           icon: 'refresh-cw' },
  progress_photo:     { en: 'Add a progress photo (1/month)',      ar: 'أضف صورة تقدم (مرة/شهر)',           icon: 'camera' },
  measurement_logged: { en: 'Log measurements (1/week)',           ar: 'سجّل قياساتك (مرة/أسبوع)',          icon: 'bar-chart-2' },
}

const HISTORY_LABELS: Record<string, { en: string; ar: string }> = {
  workout_completed:  { en: 'Workout completed', ar: 'تمرين مكتمل' },
  meal_logged:        { en: 'Meal logged',       ar: 'وجبة مسجلة' },
  streak_week:        { en: 'Weekly target hit', ar: 'هدف الأسبوع' },
  pr:                 { en: 'New PR',            ar: 'رقم قياسي' },
  renewal_fresh:      { en: 'Fresh renewal',     ar: 'تجديد محدّث' },
  progress_photo:     { en: 'Progress photo',    ar: 'صورة تقدم' },
  measurement_logged: { en: 'Measurements',      ar: 'قياسات' },
  redemption:         { en: 'Redeemed reward',   ar: 'استبدال مكافأة' },
}

export default function RewardsScreen() {
  const { color } = useTheme()
  const { isRtl } = useLanguage()
  const align = isRtl ? 'right' : 'left'
  const sparks = useAsyncData(getSparks, [], { cacheKey: 'sparks', cacheTtlMs: 5 * 60 * 1000 })
  const [redeeming, setRedeeming] = useState<string | null>(null)

  const balance = sparks.data?.balance ?? 0
  const bonusUntil = sparks.data?.bonusEliteUntil
  const bonusActive = bonusUntil && new Date(bonusUntil) > new Date()

  function confirmRedeem(key: string, cost: number, days: number) {
    tapLight()
    const label = REWARD_LABELS[key] ? (isRtl ? REWARD_LABELS[key].ar : REWARD_LABELS[key].en) : key
    Alert.alert(
      isRtl ? 'تأكيد الاستبدال' : 'Confirm redemption',
      isRtl
        ? `استبدال ${cost} ⚡ بـ${label}؟ إذا كان لديك اشتراك مدفوع، تُضاف الأيام بعد نهاية فترتك الحالية — لا تُهدر أبداً.`
        : `Redeem ${cost} ⚡ for ${label}? If you have a paid subscription, the days are banked to start after your current period — they're never wasted.`,
      [
        { text: isRtl ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRtl ? 'استبدل' : 'Redeem',
          onPress: async () => {
            setRedeeming(key)
            try {
              const res = await redeemSparks(key)
              notifySuccess()
              Alert.alert(
                isRtl ? '⚡ تم!' : '⚡ Done!',
                isRtl
                  ? `${days} أيام Elite مفعّلة حتى ${res.bonusEliteUntil.slice(0, 10)}.`
                  : `${days} Elite days active until ${res.bonusEliteUntil.slice(0, 10)}.`,
              )
              await sparks.reload()
            } catch (e) {
              Alert.alert('SYNAP', e instanceof Error ? e.message : (isRtl ? 'تعذّر الاستبدال.' : 'Could not redeem.'))
            } finally {
              setRedeeming(null)
            }
          },
        },
      ],
    )
  }

  return (
    <Screen>
      <BackButton />
      <IonPageHeader
        eyebrow={isRtl ? 'المكافآت' : 'REWARDS'}
        title={isRtl ? 'شرارات ⚡' : 'Sparks ⚡'}
        subtitle={isRtl ? 'تقدّمك يدفع ثمن اشتراكك.' : 'Your consistency pays for your subscription.'}
      />

      {sparks.loading ? <ActivityIndicator color={color.spark} /> : null}
      <DataError error={sparks.error} status={sparks.errorStatus} isRtl={isRtl} />

      {!sparks.loading && sparks.data ? (
        <>
          {/* Balance hero */}
          <Card accent>
            <Text style={[styles.balanceLabel, { color: color.sparkLight, textAlign: align }]}>
              {isRtl ? 'رصيدك' : 'YOUR BALANCE'}
            </Text>
            <Text style={[styles.balanceValue, { color: color.text, textAlign: align }]}>⚡ {balance}</Text>
            {bonusActive ? (
              <Text style={[styles.bonusNote, { color: color.pulse, textAlign: align }]}>
                {isRtl
                  ? `أيام Elite المجانية مفعّلة حتى ${String(bonusUntil).slice(0, 10)}`
                  : `Free Elite active until ${String(bonusUntil).slice(0, 10)}`}
              </Text>
            ) : null}
          </Card>

          {/* How it works — the full loop in 4 lines so nobody has to guess.
              The banking rule especially must be visible BEFORE the redeem
              dialog, not only inside it. */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'كيف تعمل الشرارات؟' : 'How Sparks work'}
            </Text>
            {([
              {
                icon: 'zap',
                en: 'Train, log meals, and track progress — Sparks are added automatically. No claiming, no codes.',
                ar: 'تمرّن وسجّل وجباتك وتابع تقدمك — الشرارات تُضاف تلقائياً. بدون خطوات إضافية أو أكواد.',
              },
              {
                icon: 'gift',
                en: 'Redeem Sparks below for free Elite days — the full toolkit: unlimited Ion, form check, supplements, everything.',
                ar: 'استبدل شراراتك بالأسفل بأيام Elite مجانية — كل الميزات: آيون بلا حدود، تحليل الأداء، المكملات، كل شيء.',
              },
              {
                icon: 'clock',
                en: 'Free days activate instantly. Already subscribed? They bank and start after your paid period ends — never wasted.',
                ar: 'الأيام المجانية تُفعَّل فوراً. مشترك بالفعل؟ تُحفَظ وتبدأ بعد نهاية فترتك المدفوعة — لا تضيع أبداً.',
              },
              {
                icon: 'shield',
                en: "Sparks never expire, and they're earned by consistency — not by weight on the scale.",
                ar: 'الشرارات لا تنتهي صلاحيتها أبداً، وتُكسَب بالالتزام — لا بوزنك على الميزان.',
              },
            ] as const).map((row, i) => (
              <View key={i} style={[styles.howRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <View style={[styles.earnIcon, { backgroundColor: color.elevated }]}>
                  <Feather name={row.icon as any} size={14} color={color.spark} />
                </View>
                <Text style={[styles.howText, { color: color.muted, textAlign: align }]}>
                  {isRtl ? row.ar : row.en}
                </Text>
              </View>
            ))}
          </Card>

          {/* Redeem */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'استبدل شراراتك' : 'Redeem your Sparks'}
            </Text>
            {Object.entries(sparks.data.rewards).map(([key, r]) => {
              const label = REWARD_LABELS[key] ? (isRtl ? REWARD_LABELS[key].ar : REWARD_LABELS[key].en) : key
              const affordable = balance >= r.cost
              return (
                <View key={key} style={[styles.rewardRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderColor: color.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rewardName, { color: color.text, textAlign: align }]}>{label}</Text>
                    <Text style={[styles.rewardCost, { color: color.muted, textAlign: align }]}>⚡ {r.cost}</Text>
                  </View>
                  <Pressable
                    disabled={!affordable || redeeming === key}
                    onPress={() => confirmRedeem(key, r.cost, r.days)}
                    style={[styles.redeemBtn, {
                      backgroundColor: affordable ? color.spark : color.elevated,
                      borderColor: affordable ? color.spark : color.border,
                      opacity: redeeming === key ? 0.6 : 1,
                    }]}
                  >
                    {redeeming === key
                      ? <ActivityIndicator size="small" color="#fff" />
                      : (
                        <Text style={[styles.redeemText, { color: affordable ? '#fff' : color.dim }]}>
                          {isRtl ? 'استبدل' : 'Redeem'}
                        </Text>
                      )}
                  </Pressable>
                </View>
              )
            })}
          </Card>

          {/* How to earn */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'كيف تكسب الشرارات' : 'How to earn'}
            </Text>
            {Object.entries(sparks.data.earning).map(([key, e]) => {
              const meta = EARN_LABELS[key]
              if (!meta) return null
              return (
                <View key={key} style={[styles.earnRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.earnIcon, { backgroundColor: color.elevated }]}>
                    <Feather name={meta.icon as any} size={14} color={color.spark} />
                  </View>
                  <Text style={[styles.earnLabel, { color: color.text, textAlign: align }]}>
                    {isRtl ? meta.ar : meta.en}
                  </Text>
                  <Text style={[styles.earnPoints, { color: color.spark }]}>+{e.points} ⚡</Text>
                </View>
              )
            })}
          </Card>

          {/* Recent activity */}
          {sparks.data.history.length ? (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>
                {isRtl ? 'آخر النشاط' : 'Recent activity'}
              </Text>
              {sparks.data.history.map((h, i) => {
                const meta = HISTORY_LABELS[h.event_type]
                return (
                  <View key={i} style={[styles.historyRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.historyLabel, { color: color.muted, textAlign: align }]}>
                      {meta ? (isRtl ? meta.ar : meta.en) : h.event_type} · {String(h.created_at).slice(0, 10)}
                    </Text>
                    <Text style={[styles.historyPoints, { color: h.points >= 0 ? color.pulse : color.flame }]}>
                      {h.points >= 0 ? `+${h.points}` : h.points} ⚡
                    </Text>
                  </View>
                )
              })}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 10 },
  balanceLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  balanceValue: { fontSize: 40, fontWeight: '900', marginTop: 4 },
  bonusNote: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  rewardRow: { alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  rewardName: { fontSize: 14, fontWeight: '900' },
  rewardCost: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  redeemBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1, minWidth: 86, alignItems: 'center' },
  redeemText: { fontSize: 13, fontWeight: '900' },
  howRow: { alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  howText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  earnRow: { alignItems: 'center', gap: 10, paddingVertical: 7 },
  earnIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  earnLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  earnPoints: { fontSize: 13, fontWeight: '900' },
  historyRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  historyLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  historyPoints: { fontSize: 13, fontWeight: '900' },
})
