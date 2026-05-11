import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { normalizeAiLanguage } from '@/lib/ai-language'
import { NextResponse } from 'next/server'

type GroceryItem = {
  id: string
  name: string
  category: string
  quantity: string
  amount: number | null
  unit: string | null
  sources: string[]
}

const CATEGORY_ORDER = [
  'Protein',
  'Carbs',
  'Fruits & vegetables',
  'Dairy',
  'Fats',
  'Pantry & spices',
  'Drinks & supplements',
  'Other',
]

const CATEGORY_LABEL_AR: Record<string, string> = {
  Protein: 'البروتين',
  Carbs: 'الكربوهيدرات',
  'Fruits & vegetables': 'الفواكه والخضار',
  Dairy: 'الألبان',
  Fats: 'الدهون الصحية',
  'Pantry & spices': 'المؤونة والبهارات',
  'Drinks & supplements': 'المشروبات والمكملات',
  Other: 'أخرى',
}

const CATEGORY_KEYWORDS: Array<[string, RegExp]> = [
  ['Protein', /\b(chicken|beef|steak|turkey|fish|salmon|tuna|shrimp|egg|eggs|tofu|tempeh|lentil|lentils|beans|chickpea|protein|whey)\b/i],
  ['Carbs', /\b(rice|oat|oats|bread|pasta|potato|potatoes|sweet potato|quinoa|couscous|tortilla|noodle|cereal|granola|flour)\b/i],
  ['Fruits & vegetables', /\b(apple|banana|berry|berries|orange|date|dates|grape|mango|vegetable|salad|lettuce|spinach|broccoli|carrot|tomato|cucumber|pepper|onion|garlic|zucchini|fruit)\b/i],
  ['Dairy', /\b(milk|yogurt|yoghurt|greek yogurt|cheese|cottage|labneh|laban|kefir)\b/i],
  ['Fats', /\b(oil|olive oil|avocado|nuts|almond|walnut|peanut|cashew|butter|tahini|seed|seeds)\b/i],
  ['Drinks & supplements', /\b(water|coffee|tea|electrolyte|creatine|multivitamin|supplement|pre-workout|pre workout)\b/i],
  ['Pantry & spices', /\b(salt|pepper|spice|spices|sauce|honey|jam|cinnamon|paprika|cumin|vinegar|mustard|ketchup)\b/i],
]

function classify(name: string) {
  return CATEGORY_KEYWORDS.find(([, regex]) => regex.test(name))?.[0] ?? 'Other'
}

function normalizeName(name: string) {
  return name
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(raw|cooked|grilled|boiled|fresh|frozen|low fat|full fat|organic)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAmount(amountText: string | undefined) {
  if (!amountText) return { amount: null, unit: null, display: '' }
  const text = String(amountText).trim()
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|ml|l|liter|liters|tbsp|tsp|cup|cups|piece|pieces|slice|slices|egg|eggs|serving|servings)?/i)
  if (!match) return { amount: null, unit: null, display: text }

  let amount = Number(match[1])
  let unit = (match[2] || '').toLowerCase()
  if (!Number.isFinite(amount)) return { amount: null, unit: null, display: text }

  if (unit === 'kg') {
    amount *= 1000
    unit = 'g'
  } else if (unit === 'gram' || unit === 'grams') {
    unit = 'g'
  } else if (unit === 'l' || unit === 'liter' || unit === 'liters') {
    amount *= 1000
    unit = 'ml'
  } else if (unit === 'egg' || unit === 'eggs' || unit === 'piece' || unit === 'pieces' || unit === 'slice' || unit === 'slices' || unit === 'serving' || unit === 'servings') {
    unit = 'pcs'
  }

  return { amount, unit: unit || null, display: text }
}

function formatQuantity(amount: number | null, unit: string | null, fallback: string) {
  if (amount == null || !unit) return fallback || 'As needed'
  if (unit === 'g' && amount >= 1000) return `${Number((amount / 1000).toFixed(1))} kg`
  if (unit === 'ml' && amount >= 1000) return `${Number((amount / 1000).toFixed(1))} L`
  if (unit === 'pcs') return `${Math.ceil(amount)} pcs`
  if (['tbsp', 'tsp', 'cup', 'cups'].includes(unit)) return `${Number(amount.toFixed(1))} ${unit}`
  return `${Math.round(amount)} ${unit}`
}

function extractFoodsFromMeal(meal: any) {
  const foods = Array.isArray(meal?.foods)
    ? meal.foods
    : Array.isArray(meal?.ingredients)
      ? meal.ingredients
      : []

  return foods.map((food: any) => {
    if (typeof food === 'string') {
      const split = food.split(/[-–—:]/)
      return { item: split[0]?.trim() || food, amount: split.slice(1).join('-').trim() }
    }
    return {
      item: food.item ?? food.name ?? food.food ?? food.ingredient ?? '',
      amount: food.amount ?? food.quantity ?? food.serving ?? '',
    }
  }).filter((food: any) => food.item)
}

function collectMeals(plan: any) {
  if (Array.isArray(plan?.weeks) && plan.weeks.length > 0) {
    const firstWeek = plan.weeks[0]
    return (firstWeek.days || []).flatMap((day: any) => day.meals || [])
  }
  if (Array.isArray(plan?.days) && plan.days.length > 0) {
    return plan.days.flatMap((day: any) => day.meals || [])
  }
  return Array.isArray(plan?.meals) ? plan.meals.flatMap((meal: any) => Array(7).fill(meal)) : []
}

function buildGroceryList(plan: any, language: 'en' | 'ar' = 'en') {
  const meals = collectMeals(plan)
  const map = new Map<string, GroceryItem & { fallbackParts: string[] }>()

  meals.forEach((meal: any) => {
    const mealName = meal?.name ?? meal?.meal_name ?? 'Meal'
    extractFoodsFromMeal(meal).forEach((food: any) => {
      const name = normalizeName(String(food.item))
      if (!name) return
      const parsed = parseAmount(food.amount)
      const key = `${name.toLowerCase()}::${parsed.unit ?? parsed.display.toLowerCase()}`
      const existing = map.get(key)

      if (existing && parsed.amount != null && parsed.unit && existing.unit === parsed.unit) {
        existing.amount = (existing.amount ?? 0) + parsed.amount
        existing.quantity = formatQuantity(existing.amount, existing.unit, parsed.display)
        if (!existing.sources.includes(mealName)) existing.sources.push(mealName)
        return
      }

      if (existing && parsed.amount == null) {
        existing.fallbackParts.push(parsed.display || 'as needed')
        existing.quantity = existing.fallbackParts.join(' + ')
        if (!existing.sources.includes(mealName)) existing.sources.push(mealName)
        return
      }

      map.set(key, {
        id: key.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(),
        name,
        category: classify(name),
        quantity: formatQuantity(parsed.amount, parsed.unit, parsed.display),
        amount: parsed.amount,
        unit: parsed.unit,
        sources: [mealName],
        fallbackParts: parsed.amount == null ? [parsed.display || 'as needed'] : [],
      })
    })
  })

  const items = [...map.values()]
    .map(({ fallbackParts, ...item }) => item)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name))

  const groups = CATEGORY_ORDER
    .map(category => ({
      category,
      category_label: language === 'ar' ? CATEGORY_LABEL_AR[category] ?? category : category,
      items: items.filter(item => item.category === category),
    }))
    .filter(group => group.items.length > 0)

  return { groups, items }
}

export async function GET() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [dietRes, profileRes, userLangRes] = await Promise.all([
    admin.from('diet_plans').select('plan_json, created_at').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('profiles').select('language, dietary_preference, food_allergies').eq('user_id', user.id).maybeSingle(),
    admin.from('users').select('language').eq('id', user.id).maybeSingle(),
  ])

  if (!dietRes.data?.plan_json) {
    return NextResponse.json({ error: 'No active diet plan found' }, { status: 404 })
  }

  const language = normalizeAiLanguage(userLangRes.data?.language ?? profileRes.data?.language)
  const list = buildGroceryList(dietRes.data.plan_json, language)
  return NextResponse.json({
    ...list,
    generated_at: new Date().toISOString(),
    plan_created_at: dietRes.data.created_at,
    context: {
      language,
      dietary_preference: profileRes.data?.dietary_preference ?? null,
      food_allergies: profileRes.data?.food_allergies ?? null,
      localization: 'global-first',
    },
  })
}
