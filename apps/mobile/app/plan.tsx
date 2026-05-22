import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { generateMealRecipe } from '@/features/nutrition'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useTheme } from '@/theme/ThemeProvider'

function mealFoods(meal: any) {
  const foods = Array.isArray(meal?.foods) ? meal.foods : Array.isArray(meal?.ingredients) ? meal.ingredients : []
  return foods.map((food: any) => typeof food === 'string' ? food : `${food.item ?? food.name ?? food.food ?? 'Food'} ${food.amount ?? food.quantity ?? ''}`.trim())
}

export default function PlanScreen() {
  const { color } = useTheme()
  const plan = useAsyncData(getPlanHistory, [])
  const diet = plan.data?.activeDietPlan?.plan_json
  const workout = plan.data?.activeWorkoutPlan?.plan_json
  const meals = Array.isArray(diet?.meals) ? diet.meals : []
  const weeks = Array.isArray(workout?.weeks) ? workout.weeks : []
  const days = weeks.length ? weeks.flatMap((week: any) => week.days || []) : (workout?.days || [])

  async function recipe(meal: any) {
    try {
      const res = await generateMealRecipe(meal)
      Alert.alert(res.recipe?.title || 'Recipe', (res.recipe?.steps || []).join('\n'))
    } catch (error) {
      Alert.alert('Recipe', error instanceof Error ? error.message : 'Could not generate recipe.')
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="PLAN" title="Current Plan" subtitle={`${plan.data?.timing?.diet?.label ?? ''} ${plan.data?.timing?.workout?.label ? `- ${plan.data.timing.workout.label}` : ''}`} />
      {plan.loading ? <ActivityIndicator color={color.spark} /> : null}
      {plan.error ? <Text style={[styles.body, { color: color.danger }]}>{plan.error}</Text> : null}

      <Card>
        <Text style={[styles.title, { color: color.text }]}>Nutrition</Text>
        <Text style={[styles.body, { color: color.muted }]}>
          {diet?.daily_calories ?? diet?.calories_per_day ?? '-'} kcal - P:{diet?.macros?.protein_g ?? diet?.protein_g ?? '-'} C:{diet?.macros?.carbs_g ?? diet?.carbs_g ?? '-'} F:{diet?.macros?.fat_g ?? diet?.fat_g ?? diet?.fats_g ?? '-'}
        </Text>
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

      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: color.text }]}>Workout</Text>
        <Text style={[styles.body, { color: color.muted }]}>{workout?.program_name || workout?.name || 'Workout cycle'}</Text>
        {days.map((day: any, index: number) => (
          <View key={`${day.day || day.day_name}-${index}`} style={[styles.block, { borderColor: color.border }]}>
            <Text style={[styles.itemTitle, { color: color.text }]}>{day.day_name || day.day || `Day ${index + 1}`}</Text>
            <Text style={[styles.body, { color: color.muted }]}>{day.muscle_focus || day.focus || ''}</Text>
            {(day.exercises || []).map((exercise: any, exIndex: number) => (
              <Text key={exIndex} style={[styles.body, { color: color.text }]}>
                • {exercise.name || exercise.title} - {exercise.sets ?? '-'} x {exercise.reps ?? '-'}
              </Text>
            ))}
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  itemTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  block: { borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 3 },
  cardGap: { marginTop: 14 },
  smallButton: { marginTop: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  smallButtonText: { fontWeight: '900' },
})
