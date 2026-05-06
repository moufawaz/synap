'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChefHat, Clock, Flame, Loader2, X } from 'lucide-react'

type FoodItem = {
  item?: string
  name?: string
  food?: string
  amount?: string
  quantity?: string
  serving?: string
  calories?: number
  kcal?: number
}

function getMealName(meal: any) {
  return meal.meal_name || meal.name || 'Meal'
}

function getFoods(meal: any): FoodItem[] {
  return Array.isArray(meal.foods) ? meal.foods : Array.isArray(meal.items) ? meal.items : []
}

function foodName(food: FoodItem) {
  return food.item || food.name || food.food || (typeof food === 'string' ? food : '')
}

function foodAmount(food: FoodItem) {
  return food.amount || food.quantity || food.serving || ''
}

function buildFallbackRecipe(meal: any) {
  const foods = getFoods(meal)
  const ingredients = foods
    .map(food => {
      const name = foodName(food)
      if (!name) return null
      const amount = foodAmount(food)
      return amount ? `${amount} ${name}` : name
    })
    .filter(Boolean) as string[]

  const foodNames = ingredients.join(', ')
  const hasOats = /oats?|granola/i.test(foodNames)
  const hasEgg = /egg/i.test(foodNames)
  const hasChicken = /chicken/i.test(foodNames)
  const hasFish = /fish|salmon|tuna|shrimp/i.test(foodNames)
  const hasBeef = /beef|steak|meat/i.test(foodNames)
  const hasRice = /rice|quinoa|pasta|potato/i.test(foodNames)
  const hasDairy = /yogurt|milk|cheese|labneh|cottage/i.test(foodNames)

  let steps = meal.recipe_steps || meal.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    if (hasOats || hasDairy) {
      steps = [
        `Add ${ingredients.join(', ')} to a bowl or jar.`,
        'Mix well until the texture is even. Add cinnamon, vanilla, or zero-calorie sweetener if you like.',
        'Eat immediately, or chill for 20-30 minutes if you prefer it thicker.',
      ]
    } else if (hasEgg) {
      steps = [
        'Heat a non-stick pan on medium heat and lightly season the eggs.',
        `Cook the egg portion from the plan, then prepare the remaining ingredients: ${ingredients.filter(i => !/egg/i.test(i)).join(', ') || 'the sides'}.`,
        'Plate everything together and keep the listed portions unchanged.',
      ]
    } else if (hasChicken || hasFish || hasBeef) {
      const protein = hasChicken ? 'chicken' : hasFish ? 'fish/seafood' : 'beef'
      steps = [
        `Season the ${protein} with salt, pepper, garlic, lemon, and spices you like.`,
        `Cook the ${protein} in a pan, oven, grill, or air fryer until fully cooked.`,
        hasRice
          ? `Prepare the carb portion from the plan, then plate it with the cooked ${protein} and the remaining ingredients.`
          : `Plate the cooked ${protein} with the remaining ingredients: ${ingredients.filter(i => !new RegExp(protein.split('/')[0], 'i').test(i)).join(', ') || 'your sides'}.`,
      ]
    } else {
      steps = [
        `Prepare these planned ingredients: ${ingredients.join(', ')}.`,
        'Cook any raw items first, then slice or assemble the ready-to-eat items.',
        'Season lightly, plate the meal, and keep the planned portions unchanged.',
      ]
    }
  }

  return {
    title: getMealName(meal),
    prep_time_min: meal.prep_time_min || 5,
    cook_time_min: meal.cook_time_min || 10,
    ingredients,
    steps,
    tips: meal.recipe_tips || meal.tips || 'Keep the portions the same so your calories and macros stay accurate.',
  }
}

function normalizeRecipe(meal: any) {
  const recipe = meal.recipe && typeof meal.recipe === 'object' ? meal.recipe : {}
  const fallback = buildFallbackRecipe(meal)

  return {
    title: recipe.title || meal.recipe_title || fallback.title,
    prep_time_min: recipe.prep_time_min || meal.prep_time_min || fallback.prep_time_min,
    cook_time_min: recipe.cook_time_min || meal.cook_time_min || fallback.cook_time_min,
    ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
      ? recipe.ingredients
      : fallback.ingredients,
    steps: Array.isArray(recipe.steps) && recipe.steps.length > 0
      ? recipe.steps
      : fallback.steps,
    tips: recipe.tips || meal.recipe_tips || fallback.tips,
  }
}

function RecipeModal({ meal, onClose }: { meal: any; onClose: () => void }) {
  const fallbackRecipe = useMemo(() => normalizeRecipe(meal), [meal])
  const [recipe, setRecipe] = useState(fallbackRecipe)
  const [loading, setLoading] = useState(!meal.recipe)
  const calories = meal.calories || meal.total_calories

  useEffect(() => {
    let active = true
    if (meal.recipe) {
      setRecipe(normalizeRecipe(meal))
      setLoading(false)
      return
    }

    setLoading(true)
    fetch('/api/meal-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!active) return
        setRecipe(data.recipe ? { ...fallbackRecipe, ...data.recipe } : fallbackRecipe)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setRecipe(fallbackRecipe)
        setLoading(false)
      })

    return () => { active = false }
  }, [fallbackRecipe, meal])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] overflow-hidden rounded-2xl"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <ChefHat size={18} style={{ color: '#FDBA74' }} />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-black text-sm text-white tracking-wider truncate">{recipe.title}</p>
              <p className="font-heading text-[10px] tracking-widest" style={{ color: '#64748B' }}>COOKING GUIDE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            aria-label="Close recipe"
          >
            <X size={14} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex flex-col gap-4" style={{ maxHeight: 'calc(88vh - 65px)' }}>
          <div className="grid grid-cols-3 gap-2">
            <RecipeStat icon={<Clock size={12} />} label="Prep" value={`${recipe.prep_time_min} min`} color="#BB5CF6" />
            <RecipeStat icon={<Clock size={12} />} label="Cook" value={`${recipe.cook_time_min} min`} color="#D88BFF" />
            <RecipeStat icon={<Flame size={12} />} label="Energy" value={calories ? `${calories} kcal` : 'Planned'} color="#F97316" />
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.14)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#FDBA74' }} />
              <span className="font-heading text-xs" style={{ color: '#FDBA74' }}>Building this recipe from your ingredients...</span>
            </div>
          )}

          {recipe.ingredients.length > 0 && (
            <div>
              <p className="font-heading text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748B' }}>Ingredients</p>
              <div className="flex flex-col gap-2">
                {recipe.ingredients.map((ingredient: string, index: number) => (
                  <div key={index} className="px-3 py-2 rounded-xl font-heading text-xs" style={{ background: 'rgba(255,255,255,0.03)', color: '#CBD5E1' }}>
                    {ingredient}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="font-heading text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748B' }}>Steps</p>
            <div className="flex flex-col gap-2">
              {recipe.steps.map((step: string, index: number) => (
                <div key={index} className="flex gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-heading text-[10px] font-bold" style={{ background: 'rgba(249,115,22,0.15)', color: '#FDBA74' }}>
                    {index + 1}
                  </span>
                  <p className="font-heading text-xs leading-relaxed" style={{ color: '#CBD5E1' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {recipe.tips && (
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#A7F3D0' }}>{recipe.tips}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RecipeStat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-1 mb-1" style={{ color }}>
        {icon}
        <span className="font-heading text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-heading text-xs font-bold text-white">{value}</p>
    </div>
  )
}

export function RecipeButton({ meal }: { meal: any }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-heading text-[10px] font-semibold tracking-wider transition-all"
        style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)', color: '#FDBA74' }}
      >
        <ChefHat size={11} />
        Recipe
      </button>
      {open && <RecipeModal meal={meal} onClose={() => setOpen(false)} />}
    </>
  )
}
