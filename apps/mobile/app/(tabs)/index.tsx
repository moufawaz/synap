import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonAvatar } from '@/components/IonAvatar'
import { Screen } from '@/components/Screen'
import { Skeleton } from '@/components/Skeleton'
import { SynapLogo } from '@/components/SynapLogo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getChatHistory } from '@/features/chat'
import { loadConnectedHealthSummary } from '@/features/health'
import { getMealLogs } from '@/features/nutrition'
import { getProfile } from '@/features/profile'
import { getSubscriptionStatus } from '@/features/subscription'
import { runAdaptationCheck } from '@/features/tools'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

function timeGreeting(isRtl: boolean) {
  const h = new Date().getHours()
  if (isRtl) return h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور'
  return h < 12 ? 'GOOD MORNING' : h < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING'
}

export default function DashboardScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const subscription = useAsyncData(getSubscriptionStatus, [], { cacheKey: 'subscription' })
  const plan         = useAsyncData(getPlanHistory,        [], { cacheKey: 'plan-history' })
  const meals        = useAsyncData(getMealLogs,           [], { cacheKey: 'meal-logs-today', cacheTtlMs: 2 * 60 * 1000 })
  const profile      = useAsyncData(getProfile,           [], { cacheKey: 'profile', cacheTtlMs: 10 * 60 * 1000 })
  const chat         = useAsyncData(() => getChatHistory(10), [], { cacheKey: 'chat-last10' })
  const health       = useAsyncData(loadConnectedHealthSummary, [], { cacheKey: 'health-summary', cacheTtlMs: 5 * 60 * 1000 })

  useFocusEffect(
    useCallback(() => {
      // Silent refresh on tab focus — cached data stays visible, updates quietly
      meals.silentRefresh()
      plan.silentRefresh()
      chat.silentRefresh()
      health.silentRefresh()
      // Run adaptation check at most once per day — fires smart push notifications
      // (plateau alerts, streak milestones, plan renewal warnings, Ion messages)
      AsyncStorage.getItem('@sdc:adaptation-last').then(last => {
        const today = new Date().toISOString().slice(0, 10)
        if (last !== today) {
          runAdaptationCheck()
            .then(() => AsyncStorage.setItem('@sdc:adaptation-last', today))
            .catch(() => {})
        }
      })
    }, [])
  )

  const tier         = subscription.data?.tier ?? 'starter'
  const name         = profile.data?.profile?.name || 'Athlete'
  const goal         = profile.data?.profile?.goal || ''
  const workout      = plan.data?.todayWorkout
  const mealLogs     = meals.data?.logs ?? []
  const activeDiet   = plan.data?.activeDietPlan?.plan_json
  const plannedMeals = Array.isArray(activeDiet?.meals) ? activeDiet.meals : []
  const caloriesLogged = mealLogs.reduce((sum, item) => sum + (item.calories_estimated || 0), 0)
  const calorieTarget  = Number(activeDiet?.daily_calories ?? activeDiet?.calories_per_day ?? 0)
  const completedMeals = plannedMeals.filter((meal: any) => {
    const key = String(meal.name || meal.meal_name || '').toLowerCase()
    // Guard: an empty meal name would startsWith('')-match every log.
    return !!key && mealLogs.some(log => (log.meal_name || '').toLowerCase().startsWith(key))
  }).length
  const trainingDays = plan.data?.timing?.workout?.label ?? ''

  const hasPlan = !plan.loading && !!plan.data?.activeWorkoutPlan
  const profileMeasurements: Array<{ weight_kg?: number }> = (profile.data as any)?.measurements ?? []
  // Weight priority must be ACCOUNT-specific first: this account's measurement,
  // then this account's onboarding weight. Apple Health weight is device-level
  // (shared across every account signed in on this phone), so it comes LAST —
  // otherwise a fresh account shows the device owner's Health weight.
  const profileWeight: number | undefined =
    profile.data?.profile?.weight_kg != null && Number.isFinite(Number(profile.data.profile.weight_kg))
      ? Number(profile.data.profile.weight_kg)
      : undefined
  const latestWeight: number | undefined =
    profileMeasurements[0]?.weight_kg ?? profileWeight ?? health.data?.latestWeightKg
  const prevWeight:   number | undefined = profileMeasurements[1]?.weight_kg
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight) : null

  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Fat', build_muscle: 'Build Muscle',
    recomposition: 'Recomp', improve_fitness: 'Fitness', be_healthier: 'Health',
  }

  // Last Ion message — parsed from chat history
  const lastIonMessage: string | null = (() => {
    const msgs = chat.data?.messages ?? []
    const last = [...msgs].reverse().find(m => m.role === 'assistant' || m.role === 'ion')
    if (!last) return null
    try {
      const parsed = JSON.parse(last.content)
      return parsed.message ?? parsed.reply ?? parsed.content ?? null
    } catch {
      return last.content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim() || null
    }
  })()

  const align  = isRtl ? 'right' : 'left'
  const rowDir = isRtl ? 'row-reverse' : 'row'

  return (
    <Screen>
      {/* Ambient glow */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={[styles.glow, { backgroundColor: color.spark }]} />
      </View>

      {/* Header row */}
      <View style={[styles.headerRow, { flexDirection: rowDir }]}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: color.spark }]}>{timeGreeting(isRtl)}</Text>
          <Text style={[styles.name, { color: color.text }]}>{name}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/chat')}
          style={[styles.avatarBtn, { backgroundColor: color.sparkSoft, borderColor: 'rgba(187,92,246,0.22)' }]}
        >
          <IonAvatar size="sm" showStatus={false} />
        </Pressable>
      </View>

      {/* Stat chips */}
      <View style={[styles.statRow, { flexDirection: rowDir }]}>
        <StatChip icon="target"      label={isRtl ? 'الهدف' : 'GOAL'}      value={goalLabels[goal] || 'Active'}            color={color.spark}      bg={color.surface} border={color.border} labelColor={color.muted} valueColor={color.text} />
        <StatChip icon="zap"         label={isRtl ? 'السعرات' : 'CALORIES'} value={calorieTarget ? `${calorieTarget} kcal` : '-'} color={color.flame} bg={color.surface} border={color.border} labelColor={color.muted} valueColor={color.text} />
        <StatChip icon="activity"    label={isRtl ? 'هذا الأسبوع' : 'TRAINING'} value={trainingDays || '-'}               color={color.sparkLight} bg={color.surface} border={color.border} labelColor={color.muted} valueColor={color.text} />
        <StatChip icon="trending-up" label={isRtl ? 'الوزن' : 'WEIGHT'}    value={latestWeight ? `${Math.round(latestWeight * 10) / 10} kg` : '-'} color={color.pulse}  bg={color.surface} border={color.border} labelColor={color.muted} valueColor={color.text} />
      </View>

      {/* No-plan CTA — guides users who haven't generated a plan yet */}
      {!hasPlan && !plan.loading ? (
        <Pressable onPress={() => router.push('/onboarding')} style={styles.bigCardWrap}>
          <LinearGradient
            colors={[color.spark, '#7B2FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.noPlanCard}
          >
            <View style={[styles.noPlanRow, { flexDirection: rowDir }]}>
              <Feather name="zap" size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noPlanTitle, { textAlign: align }]}>
                  {isRtl ? 'لنبنِ خطتك' : "Let's build your plan"}
                </Text>
                <Text style={[styles.noPlanSub, { textAlign: align }]}>
                  {isRtl ? 'أجب على أسئلة آيون لتحصل على خطة تمرين وتغذية مخصصة.' : 'Answer a few questions and Ion builds your custom training + nutrition plan.'}
                </Text>
              </View>
              <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={18} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {/* Ion coaching engine — always visible */}
      <Pressable
        onPress={() => router.push('/(tabs)/chat')}
        style={[styles.ionPreview, { backgroundColor: color.sparkSoft, borderColor: 'rgba(187,92,246,0.22)' }]}
      >
        <View style={[styles.ionPreviewInner, { flexDirection: rowDir }]}>
          <IonAvatar size="sm" showStatus={false} />
          <View style={styles.ionPreviewText}>
            <Text style={[styles.ionLabel, { color: color.sparkLight }]}>✦ ION</Text>
            {chat.loading ? (
              <Text style={[styles.ionMsg, { color: color.dim, textAlign: align }]}>…</Text>
            ) : lastIonMessage ? (
              <Text style={[styles.ionMsg, { color: color.muted, textAlign: align }]} numberOfLines={2}>
                {lastIonMessage}
              </Text>
            ) : (
              <Text style={[styles.ionMsg, { color: color.muted, textAlign: align }]}>
                {isRtl
                  ? 'مرحباً — أنا Ion، مدربك الذكي. اسألني أي شيء.'
                  : "Hey — I'm Ion, your AI coach. Ask me anything."}
              </Text>
            )}
          </View>
          <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={14} color={color.dim} />
        </View>
      </Pressable>

      {/* Today workout card */}
      <Pressable onPress={() => router.push('/(tabs)/train')} style={styles.bigCardWrap}>
        <Card accent>
          <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(187,92,246,0.12)', borderColor: 'rgba(187,92,246,0.25)' }]}>
              <Feather name="activity" size={16} color={color.spark} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.eyebrow, { color: color.sparkLight }]}>{isRtl ? 'اليوم' : 'TODAY'}</Text>
              <Text style={[styles.cardTitle, { color: color.text }]}>
                {plan.loading ? '…' : workout?.day_name || (isRtl ? 'لا خطة بعد' : 'No plan yet')}
              </Text>
            </View>
            <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={14} color={color.dim} />
          </View>
          {plan.loading && !plan.data ? (
            <View style={styles.exercisePreview}>
              <Skeleton height={36} radius={10} />
              <Skeleton height={36} radius={10} />
              <Skeleton height={36} radius={10} />
            </View>
          ) : workout && !workout.is_rest_day ? (
            <View style={styles.exercisePreview}>
              {(workout.exercises || []).slice(0, 3).map((ex: any, i: number) => (
                <View key={i} style={[styles.exRow, { backgroundColor: color.elevated, borderColor: color.border }]}>
                  <Text style={[styles.exName, { color: color.text }]}>{ex.name}</Text>
                  <Text style={[styles.exMeta, { color: color.sparkLight }]}>{ex.sets}×{ex.reps}</Text>
                </View>
              ))}
              {(workout.exercises || []).length > 3 ? (
                <Text style={[styles.moreText, { color: color.dim }]}>+{workout.exercises.length - 3} more exercises</Text>
              ) : null}
            </View>
          ) : workout?.is_rest_day ? (
            <Text style={[styles.restText, { color: color.muted }]}>
              {isRtl ? '🛌 يوم راحة — التعافي جزء من الخطة' : '🛌 Rest day — recovery is part of the plan'}
            </Text>
          ) : (
            <Text style={[styles.restText, { color: color.muted }]}>
              {isRtl ? 'أكمل الإعداد أو اسأل Ion لإنشاء خطة.' : 'Finish onboarding or ask Ion to create a plan.'}
            </Text>
          )}
        </Card>
      </Pressable>

      {/* Today nutrition card */}
      <Pressable onPress={() => router.push('/(tabs)/nutrition')} style={styles.bigCardWrap}>
        <Card>
          <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.25)' }]}>
              <Feather name="coffee" size={16} color={color.flame} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.eyebrow, { color: color.flame }]}>{isRtl ? 'التغذية' : 'NUTRITION'}</Text>
              <Text style={[styles.cardTitle, { color: color.text }]}>
                {calorieTarget ? `${caloriesLogged} / ${calorieTarget} kcal` : `${caloriesLogged} kcal`}
              </Text>
            </View>
            <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={14} color={color.dim} />
          </View>
          {calorieTarget > 0 ? (
            <View style={[styles.barTrack, { backgroundColor: color.elevated, marginTop: 12 }]}>
              <LinearGradient
                colors={[color.flame, color.spark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.barFill, { width: `${Math.min(100, Math.round((caloriesLogged / calorieTarget) * 100))}%` }]}
              />
            </View>
          ) : null}
          <Text style={[styles.moreText, { color: color.muted, marginTop: 8, textAlign: align }]}>
            {plannedMeals.length ? `${completedMeals}/${plannedMeals.length} ${isRtl ? 'وجبات مسجلة' : 'planned meals logged'}` : `${mealLogs.length} ${isRtl ? 'أطعمة مسجلة اليوم' : 'foods logged today'}`}
          </Text>
        </Card>
      </Pressable>

      {/* Apple Health card — only when connected and there's data to show */}
      {health.data && (health.data.stepsToday != null || health.data.activeEnergyToday != null || health.data.latestWeightKg != null || health.data.restingHeartRate != null) ? (
        <View style={styles.bigCardWrap}>
          <Card>
            <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)' }]}>
                <Feather name="heart" size={16} color={color.pulse} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.eyebrow, { color: color.pulse }]}>{isRtl ? 'آبل هيلث' : 'APPLE HEALTH'}</Text>
                <Text style={[styles.cardTitle, { color: color.text }]}>{isRtl ? 'نشاط اليوم' : "Today's activity"}</Text>
              </View>
            </View>
            <View style={[styles.healthGrid, { flexDirection: rowDir }]}>
              <HealthMetric label={isRtl ? 'خطوات' : 'STEPS'} value={health.data.stepsToday != null ? health.data.stepsToday.toLocaleString() : '—'} color={color} />
              <HealthMetric label={isRtl ? 'سعرات' : 'KCAL'} value={health.data.activeEnergyToday != null ? String(health.data.activeEnergyToday) : '—'} color={color} />
              <HealthMetric label={isRtl ? 'الوزن' : 'WEIGHT'} value={health.data.latestWeightKg != null ? `${health.data.latestWeightKg.toFixed(1)}kg` : '—'} color={color} />
              <HealthMetric label={isRtl ? 'النبض' : 'HR'} value={health.data.restingHeartRate != null ? `${Math.round(health.data.restingHeartRate)}` : '—'} color={color} />
            </View>
          </Card>
        </View>
      ) : null}

      {/* Weight delta */}
      {weightDelta !== null ? (
        <View style={[styles.weightRow, { flexDirection: rowDir }]}>
          <Feather name="trending-up" size={13} color={weightDelta <= 0 ? color.pulse : color.flame} />
          <Text style={[styles.weightDelta, { color: weightDelta <= 0 ? color.pulse : color.flame }]}>
            {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg {isRtl ? 'من القياس السابق' : 'from previous'}
          </Text>
        </View>
      ) : null}

      {/* Quick actions */}
      <View style={[styles.quickRow, { flexDirection: rowDir }]}>
        <QuickAction icon="message-circle" label={isRtl ? 'اسأل Ion' : 'ASK ION'}     color={color.spark} bg={color.sparkSoft}       labelColor={color.text} onPress={() => router.push('/(tabs)/chat')} />
        <QuickAction icon="bar-chart-2"    label={isRtl ? 'سجل الوزن' : 'LOG WEIGHT'} color={color.pulse} bg="rgba(16,185,129,0.12)"  labelColor={color.text} onPress={() => router.push('/(tabs)/progress')} />
        <QuickAction icon="zap"            label={isRtl ? 'ابدأ التمرين' : 'START'}   color={color.flame} bg="rgba(249,115,22,0.12)"  labelColor={color.text} onPress={() => router.push('/(tabs)/train')} />
      </View>

      {/* Subscription banner */}
      {!subscription.loading && subscription.data?.tier === 'starter' ? (
        <Pressable
          onPress={() => router.push('/billing')}
          style={[styles.upgradeBanner, { backgroundColor: color.sparkSoft, borderColor: 'rgba(187,92,246,0.25)', flexDirection: rowDir }]}
        >
          <View style={[styles.upgradeBannerIcon, { backgroundColor: 'rgba(187,92,246,0.15)' }]}>
            <Feather name="star" size={16} color={color.spark} />
          </View>
          <View style={styles.upgradeBannerText}>
            <Text style={[styles.upgradeBannerTitle, { color: color.text, textAlign: align }]}>
              {isRtl ? 'أنت على خطة Starter' : "You're on the Starter plan"}
            </Text>
            <Text style={[styles.upgradeBannerSub, { color: color.muted, textAlign: align }]}>
              {isRtl ? 'اعرض تفاصيل خطتك' : 'View your plan details'}
            </Text>
          </View>
          <Feather name={isRtl ? 'arrow-left' : 'arrow-right'} size={14} color={color.spark} />
        </Pressable>
      ) : !subscription.loading && subscription.data ? (
        <View style={[styles.accessBanner, { backgroundColor: color.elevated, borderColor: color.border, flexDirection: rowDir }]}>
          <SynapLogo size="sm" />
          <Text style={[styles.accessText, { color: color.muted }]}>
            {`${tier.toUpperCase()} — ${subscription.data.planName || text.launchAccess}`}
          </Text>
        </View>
      ) : null}
    </Screen>
  )
}

function StatChip({ icon, label, value, color, bg, border, labelColor, valueColor }: { icon: string; label: string; value: string; color: string; bg: string; border: string; labelColor: string; valueColor: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg, borderColor: border }]}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  )
}

function HealthMetric({ label, value, color }: { label: string; value: string; color: any }) {
  return (
    <View style={[styles.healthMetric, { backgroundColor: color.elevated, borderColor: color.border }]}>
      <Text style={[styles.healthMetricLabel, { color: color.dim }]}>{label}</Text>
      <Text style={[styles.healthMetricValue, { color: color.text }]}>{value}</Text>
    </View>
  )
}

function QuickAction({ icon, label, color, bg, labelColor, onPress }: { icon: string; label: string; color: string; bg: string; labelColor: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.quickAction, { backgroundColor: bg, borderColor: `${color}30` }]}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: labelColor }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  glowContainer: { position: 'absolute', top: -80, left: -60, width: 340, height: 340, zIndex: 0 },
  glow: { flex: 1, borderRadius: 999, opacity: 0.06 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerText: { flex: 1 },
  greeting: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: '900', letterSpacing: 0.4 },
  avatarBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statRow: { gap: 8, marginBottom: 14 },
  statChip: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 10, gap: 4, alignItems: 'flex-start', minWidth: 0 },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: '900' },
  ionPreview: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 14 },
  ionPreviewInner: { alignItems: 'center', gap: 10 },
  ionPreviewText: { flex: 1 },
  ionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  ionMsg: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  bigCardWrap: { marginBottom: 12 },
  noPlanCard: { borderRadius: 18, padding: 16 },
  noPlanRow: { alignItems: 'center', gap: 12 },
  noPlanTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  noPlanSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  cardHeader: { alignItems: 'center', gap: 12, marginBottom: 4 },
  iconBadge: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  exercisePreview: { marginTop: 12, gap: 6 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  exName: { fontSize: 12, fontWeight: '600', flex: 1 },
  exMeta: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  restText: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  moreText: { fontSize: 12, fontWeight: '600' },
  healthGrid: { flexWrap: 'wrap', gap: 8, marginTop: 12 },
  healthMetric: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', minWidth: '22%' },
  healthMetricLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  healthMetricValue: { fontSize: 15, fontWeight: '900', marginTop: 3 },
  barTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  weightRow: { alignItems: 'center', gap: 6, marginBottom: 14, paddingHorizontal: 4 },
  weightDelta: { fontSize: 12, fontWeight: '800' },
  quickRow: { gap: 10, marginTop: 4, marginBottom: 16 },
  quickAction: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 8 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  accessBanner: { alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  accessText: { fontSize: 12, fontWeight: '700' },
  upgradeBanner: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 4 },
  upgradeBannerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  upgradeBannerText: { flex: 1, gap: 2 },
  upgradeBannerTitle: { fontSize: 14, fontWeight: '900' },
  upgradeBannerSub: { fontSize: 12, fontWeight: '600' },
})
