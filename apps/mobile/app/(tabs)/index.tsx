import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonAvatar } from '@/components/IonAvatar'
import { Screen } from '@/components/Screen'
import { SynapLogo } from '@/components/SynapLogo'
import { getMealLogs } from '@/features/nutrition'
import { getProfile } from '@/features/profile'
import { getSubscriptionStatus } from '@/features/subscription'
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
  const subscription = useAsyncData(getSubscriptionStatus, [])
  const plan = useAsyncData(getPlanHistory, [])
  const meals = useAsyncData(getMealLogs, [])
  const profile = useAsyncData(getProfile, [])

  const tier = subscription.data?.tier ?? 'launch'
  const name = profile.data?.profile?.name || 'Athlete'
  const goal = profile.data?.profile?.goal || ''
  const workout = plan.data?.todayWorkout
  const mealLogs = meals.data?.logs ?? []
  const activeDiet = plan.data?.activeDietPlan?.plan_json
  const plannedMeals = Array.isArray(activeDiet?.meals) ? activeDiet.meals : []
  const caloriesLogged = mealLogs.reduce((sum, item) => sum + (item.calories_estimated || 0), 0)
  const calorieTarget = Number(activeDiet?.daily_calories ?? activeDiet?.calories_per_day ?? 0)
  const completedMeals = plannedMeals.filter((meal: any) =>
    mealLogs.some(log => (log.meal_name || '').toLowerCase().startsWith(String(meal.name || meal.meal_name || '').toLowerCase()))
  ).length
  const trainingDays = plan.data?.timing?.workout?.label ?? ''
  // weight delta comes from the profile response which may carry recent measurements
  const profileMeasurements: Array<{ weight_kg?: number }> = (profile.data as any)?.measurements ?? []
  const latestWeight: number | undefined = profileMeasurements[0]?.weight_kg
  const prevWeight: number | undefined = profileMeasurements[1]?.weight_kg
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight) : null

  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Fat', build_muscle: 'Build Muscle',
    recomposition: 'Recomp', improve_fitness: 'Fitness', be_healthier: 'Health',
  }

  // Ion last message: available if plan history API surfaces it, else skip preview
  const lastIonMessage: string | null = (plan.data as any)?.lastIonMessage ?? null

  const align = isRtl ? 'right' : 'left'
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
        <StatChip icon="target" label={isRtl ? 'الهدف' : 'GOAL'} value={goalLabels[goal] || 'Active'} color={color.spark} bg={color.surface} border={color.border} />
        <StatChip icon="zap" label={isRtl ? 'السعرات' : 'CALORIES'} value={calorieTarget ? `${calorieTarget} kcal` : '-'} color={color.flame} bg={color.surface} border={color.border} />
        <StatChip icon="activity" label={isRtl ? 'هذا الأسبوع' : 'TRAINING'} value={trainingDays || '-'} color={color.sparkLight} bg={color.surface} border={color.border} />
        <StatChip icon="trending-up" label={isRtl ? 'الوزن' : 'WEIGHT'} value={latestWeight ? `${latestWeight} kg` : '-'} color={color.pulse} bg={color.surface} border={color.border} />
      </View>

      {/* Ion last message preview */}
      {lastIonMessage ? (
        <Pressable onPress={() => router.push('/(tabs)/chat')} style={[styles.ionPreview, { backgroundColor: color.sparkSoft, borderColor: 'rgba(187,92,246,0.22)' }]}>
          <View style={[styles.ionPreviewInner, { flexDirection: rowDir }]}>
            <IonAvatar size="sm" showStatus={false} />
            <View style={styles.ionPreviewText}>
              <Text style={[styles.ionLabel, { color: color.sparkLight }]}>✦ ION SAYS</Text>
              <Text style={[styles.ionMsg, { color: color.muted, textAlign: align }]} numberOfLines={2}>{lastIonMessage}</Text>
            </View>
            <Feather name="chevron-right" size={14} color={color.dim} />
          </View>
        </Pressable>
      ) : null}

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
            <Feather name="chevron-right" size={14} color={color.dim} />
          </View>
          {workout && !workout.is_rest_day ? (
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
            <Feather name="chevron-right" size={14} color={color.dim} />
          </View>
          {/* Simple calorie progress bar */}
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
        <QuickAction icon="message-circle" label={isRtl ? 'اسأل Ion' : 'ASK ION'} color={color.spark} bg={color.sparkSoft} onPress={() => router.push('/(tabs)/chat')} />
        <QuickAction icon="bar-chart-2" label={isRtl ? 'سجل الوزن' : 'LOG WEIGHT'} color={color.pulse} bg="rgba(16,185,129,0.12)" onPress={() => router.push('/(tabs)/progress')} />
        <QuickAction icon="zap" label={isRtl ? 'ابدأ التمرين' : 'START'} color={color.flame} bg="rgba(249,115,22,0.12)" onPress={() => router.push('/(tabs)/train')} />
      </View>

      {/* Subscription / access banner */}
      <View style={[styles.accessBanner, { backgroundColor: color.elevated, borderColor: color.border }]}>
        <SynapLogo size="sm" />
        <Text style={[styles.accessText, { color: color.muted }]}>
          {subscription.loading ? 'Checking access…' : `${tier.toUpperCase()} — ${subscription.data?.planName || text.launchAccess}`}
        </Text>
      </View>
    </Screen>
  )
}

function StatChip({ icon, label, value, color, bg, border }: { icon: string; label: string; value: string; color: string; bg: string; border: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg, borderColor: border }]}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.statLabel, { color: '#475569' }]}>{label}</Text>
      <Text style={[styles.statValue, { color: '#F8FAFC' }]}>{value}</Text>
    </View>
  )
}

function QuickAction({ icon, label, color, bg, onPress }: { icon: string; label: string; color: string; bg: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.quickAction, { backgroundColor: bg, borderColor: `${color}30` }]}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: '#F8FAFC' }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  glowContainer: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 340,
    height: 340,
    zIndex: 0,
  },
  glow: {
    flex: 1,
    borderRadius: 999,
    opacity: 0.06,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    gap: 8,
    marginBottom: 14,
  },
  statChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 4,
    alignItems: 'flex-start',
    minWidth: 0,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  ionPreview: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  ionPreviewInner: {
    alignItems: 'center',
    gap: 10,
  },
  ionPreviewText: {
    flex: 1,
  },
  ionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  ionMsg: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  bigCardWrap: {
    marginBottom: 12,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  exercisePreview: {
    marginTop: 12,
    gap: 6,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  exName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  exMeta: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  restText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  weightRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  weightDelta: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickRow: {
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  accessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  accessText: {
    fontSize: 12,
    fontWeight: '700',
  },
})
