import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { getMealLogs } from '@/features/nutrition'
import { getSubscriptionStatus } from '@/features/subscription'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function DashboardScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const subscription = useAsyncData(getSubscriptionStatus, [])
  const plan = useAsyncData(getPlanHistory, [])
  const meals = useAsyncData(getMealLogs, [])
  const tier = subscription.data?.tier ?? 'starter'
  const workout = plan.data?.todayWorkout
  const mealLogs = meals.data?.logs ?? []
  const activeDiet = plan.data?.activeDietPlan?.plan_json
  const plannedMeals = Array.isArray(activeDiet?.meals) ? activeDiet.meals : []
  const caloriesLogged = mealLogs.reduce((sum, item) => sum + (item.calories_estimated || 0), 0)
  const calorieTarget = Number(activeDiet?.daily_calories ?? activeDiet?.calories_per_day ?? 0)
  const completedMeals = plannedMeals.filter((meal: any) =>
    mealLogs.some(log => (log.meal_name || '').toLowerCase().startsWith(String(meal.name || meal.meal_name || '').toLowerCase()))
  ).length

  return (
    <Screen>
      <PageHeader eyebrow="SYNAP" title={text.dashboard} subtitle={text.launchAccess} />
      <View style={styles.grid}>
        <Card style={{ borderColor: tier === 'elite' ? color.spark : color.border }}>
          <Text style={[styles.label, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>Access</Text>
          <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
            {subscription.loading ? 'Checking access...' : `${tier.toUpperCase()} access`}
          </Text>
          <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
            {subscription.error || subscription.data?.planName || text.launchAccess}
          </Text>
        </Card>

        <Pressable onPress={() => router.push('/(tabs)/train')}>
          <Card>
            <Text style={[styles.label, { color: color.flame, textAlign: isRtl ? 'right' : 'left' }]}>{text.todayWorkout}</Text>
            <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
              {plan.loading ? 'Loading session...' : workout?.day_name || text.noWorkoutPlan}
            </Text>
            <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {workout
                ? workout.is_rest_day
                  ? text.recoveryNote
                  : `${workout.exercises.length} exercises${workout.duration_min ? ` - ${workout.duration_min} min` : ''}`
                : text.finishOnboarding}
            </Text>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push('/(tabs)/nutrition')}>
          <Card>
            <Text style={[styles.label, { color: color.pulse, textAlign: isRtl ? 'right' : 'left' }]}>{text.todaysMeals}</Text>
            <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>
              {calorieTarget ? `${caloriesLogged}/${calorieTarget} kcal` : `${caloriesLogged} kcal logged`}
            </Text>
            <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {plannedMeals.length ? `${completedMeals}/${plannedMeals.length} planned meals logged today.` : `${mealLogs.length} foods logged today.`}
            </Text>
          </Card>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: {
    gap: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
})
