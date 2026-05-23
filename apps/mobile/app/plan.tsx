import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { generateMealRecipe } from '@/features/nutrition'
import { applyRenewalPreview, getPlanHistory, renewPlan, rollbackPlan } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

type Tab = 'diet' | 'workout'

function mealFoods(meal: any) {
  const foods = Array.isArray(meal?.foods) ? meal.foods : Array.isArray(meal?.ingredients) ? meal.ingredients : []
  return foods.map((food: any) => typeof food === 'string' ? food : `${food.item ?? food.name ?? food.food ?? 'Food'} ${food.amount ?? food.quantity ?? ''}`.trim())
}

function workoutDays(plan: any) {
  if (Array.isArray(plan?.days)) return plan.days
  if (Array.isArray(plan?.weeks)) return plan.weeks.flatMap((week: any) => week.days || [])
  return []
}

function planName(plan: any, fallback: string) {
  return plan?.name || plan?.plan_name || plan?.program_name || fallback
}

export default function PlanScreen() {
  const { color } = useTheme()
  const plan = useAsyncData(getPlanHistory, [])
  const [tab, setTab] = useState<Tab>('diet')
  const [busy, setBusy] = useState<string | null>(null)
  const diet = plan.data?.activeDietPlan?.plan_json
  const workout = plan.data?.activeWorkoutPlan?.plan_json
  const meals = Array.isArray(diet?.meals) ? diet.meals : []
  const days = workoutDays(workout)
  const history = tab === 'diet' ? (plan.data?.diet || []) : (plan.data?.workout || [])
  const activeTiming = tab === 'diet' ? plan.data?.timing?.diet : plan.data?.timing?.workout
  const previousPlan = useMemo(() => history.find((item: any) => !item.active), [history])

  async function recipe(meal: any) {
    try {
      const res = await generateMealRecipe(meal)
      Alert.alert(res.recipe?.title || 'Recipe', (res.recipe?.steps || []).join('\n'))
    } catch (error) {
      Alert.alert('Recipe', error instanceof Error ? error.message : 'Could not generate recipe.')
    }
  }

  async function previewRenewal(planType: Tab) {
    setBusy(`renew-${planType}`)
    try {
      const res = await renewPlan(planType)
      const message = res.preview?.message || 'Ion prepared a renewed plan preview.'
      Alert.alert('Renewal preview', message, [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Apply new plan',
          onPress: async () => {
            setBusy(`apply-${planType}`)
            try {
              await applyRenewalPreview(res.previewId)
              await plan.reload()
              Alert.alert('Plan renewed', 'Your new cycle is now active.')
            } catch (error) {
              Alert.alert('Renewal', error instanceof Error ? error.message : 'Could not apply renewal.')
            } finally {
              setBusy(null)
            }
          },
        },
      ])
    } catch (error) {
      Alert.alert('Renewal', error instanceof Error ? error.message : 'Could not create preview.')
    } finally {
      setBusy(null)
    }
  }

  async function restorePrevious(planType: Tab) {
    if (!previousPlan?.id) return Alert.alert('Rollback', 'No previous cycle was found.')
    Alert.alert('Restore previous plan?', 'This will make the previous cycle active again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          setBusy(`rollback-${planType}`)
          try {
            await rollbackPlan(planType, previousPlan.id)
            await plan.reload()
            Alert.alert('Restored', 'The previous cycle is active again.')
          } catch (error) {
            Alert.alert('Rollback', error instanceof Error ? error.message : 'Could not restore previous plan.')
          } finally {
            setBusy(null)
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <PageHeader eyebrow="PLAN" title="Current Plan" subtitle={activeTiming?.label || 'Diet and workout cycles with history and rollback.'} />
      {plan.loading ? <ActivityIndicator color={color.spark} /> : null}
      {plan.error ? <Text style={[styles.body, { color: color.danger }]}>{plan.error}</Text> : null}

      <View style={styles.tabs}>
        {(['diet', 'workout'] as const).map(item => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, { borderColor: tab === item ? color.spark : color.border, backgroundColor: tab === item ? color.sparkSoft : color.surface }]}>
            <Text style={[styles.tabText, { color: tab === item ? color.spark : color.text }]}>{item === 'diet' ? 'Diet' : 'Workout'}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={[styles.title, { color: color.text }]}>{tab === 'diet' ? planName(diet, 'Nutrition cycle') : planName(workout, 'Workout cycle')}</Text>
        <Text style={[styles.body, { color: color.muted }]}>{activeTiming?.label || 'Active cycle'}</Text>
        <View style={styles.actionRow}>
          <Pressable disabled={Boolean(busy)} onPress={() => previewRenewal(tab)} style={[styles.actionButton, { borderColor: color.spark }]}>
            <Text style={[styles.actionText, { color: color.spark }]}>{busy?.startsWith('renew') ? 'Preparing...' : 'Renew with Ion'}</Text>
          </Pressable>
          <Pressable disabled={Boolean(busy)} onPress={() => restorePrevious(tab)} style={[styles.actionButton, { borderColor: previousPlan ? color.flame : color.border }]}>
            <Text style={[styles.actionText, { color: previousPlan ? color.flame : color.dim }]}>Restore previous</Text>
          </Pressable>
        </View>
      </Card>

      {tab === 'diet' ? (
        <Card style={styles.cardGap}>
          <Text style={[styles.sectionTitle, { color: color.text }]}>Nutrition</Text>
          <Text style={[styles.body, { color: color.muted }]}>
            {diet?.daily_calories ?? diet?.calories_per_day ?? '-'} kcal - P:{diet?.macros?.protein_g ?? diet?.protein_g ?? '-'} C:{diet?.macros?.carbs_g ?? diet?.carbs_g ?? '-'} F:{diet?.macros?.fat_g ?? diet?.fat_g ?? diet?.fats_g ?? '-'}
          </Text>
          {diet?.pre_workout ? <Text style={[styles.body, { color: color.text }]}>Pre-workout: {diet.pre_workout}</Text> : null}
          {diet?.post_workout ? <Text style={[styles.body, { color: color.text }]}>Post-workout: {diet.post_workout}</Text> : null}
          {meals.map((meal: any, index: number) => (
            <View key={`${meal.name}-${index}`} style={[styles.block, { borderColor: color.border }]}>
              <Text style={[styles.itemTitle, { color: color.text }]}>{meal.name || meal.meal_name || `Meal ${index + 1}`}</Text>
              <Text style={[styles.body, { color: color.muted }]}>{meal.time || meal.meal_time || ''} {meal.calories ? `- ${meal.calories} kcal` : ''}</Text>
              {mealFoods(meal).map((food: string, foodIndex: number) => <Text key={foodIndex} style={[styles.body, { color: color.text }]}>• {food}</Text>)}
              <Pressable onPress={() => recipe(meal)} style={[styles.smallButton, { borderColor: color.flame }]}>
                <Text style={[styles.smallButtonText, { color: color.flame }]}>Recipe</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : (
        <Card style={styles.cardGap}>
          <Text style={[styles.sectionTitle, { color: color.text }]}>Workout</Text>
          <Text style={[styles.body, { color: color.muted }]}>{workout?.split_type || workout?.training_split || workout?.schedule || 'Workout cycle'}</Text>
          {days.map((day: any, index: number) => (
            <View key={`${day.day || day.day_name}-${index}`} style={[styles.block, { borderColor: color.border }]}>
              <Text style={[styles.itemTitle, { color: color.text }]}>{day.day_name || day.day || `Day ${index + 1}`}</Text>
              <Text style={[styles.body, { color: color.muted }]}>{day.muscle_focus || day.focus || day.session_goal || ''}</Text>
              {(day.exercises || []).length ? (day.exercises || []).map((exercise: any, exIndex: number) => (
                <Text key={exIndex} style={[styles.body, { color: color.text }]}>
                  • {exercise.name || exercise.title} - {exercise.sets ?? '-'} x {exercise.reps ?? '-'}
                </Text>
              )) : <Text style={[styles.body, { color: color.muted }]}>Rest day</Text>}
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.cardGap}>
        <Text style={[styles.sectionTitle, { color: color.text }]}>Plan history</Text>
        {history.map((item: any, index: number) => (
          <View key={item.id || index} style={[styles.historyRow, { borderColor: color.border }]}>
            <Text style={[styles.body, { color: item.active ? color.pulse : color.text }]}>{item.active ? 'Current Plan' : `Previous Cycle ${index}`}</Text>
            <Text style={[styles.body, { color: color.muted }]}>{item.start_date || item.created_at?.slice(0, 10)} → {item.end_date || '-'}</Text>
            <Text style={[styles.body, { color: color.muted }]}>{item.summary?.name || item.summary?.split || 'Cycle'}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  tabText: { fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  itemTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  block: { borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 3 },
  cardGap: { marginTop: 14 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  actionText: { fontWeight: '900' },
  smallButton: { marginTop: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  smallButtonText: { fontWeight: '900' },
  historyRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
})
