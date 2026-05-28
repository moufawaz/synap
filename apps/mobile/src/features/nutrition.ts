import { apiFetch } from '@/lib/api'

export type MealLog = {
  id: string
  meal_name: string | null
  meal_time: string | null
  calories_estimated: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
  logged_at: string
}

export type MealLogInput = {
  id?: string
  meal_name?: string
  description?: string
  meal_time?: string
  calories_estimated?: number
  protein_g?: number
  carbs_g?: number
  fats_g?: number
  fiber_g?: number
  source?: string
}

export async function getMealLogs(date = new Date().toISOString().split('T')[0]) {
  return apiFetch<{ logs: MealLog[] }>(`/api/log-meal?date=${date}`)
}

export async function createMealLog(input: MealLogInput) {
  return apiFetch<{ log: MealLog }>('/api/log-meal', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateMealLog(input: MealLogInput & { id: string }) {
  return apiFetch<{ log: MealLog }>('/api/log-meal', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteMealLog(id: string) {
  return apiFetch<{ ok: true }>('/api/log-meal', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export type PhotoFoodProduct = {
  name: string
  brand?: string
  calories_per_100g?: number
  protein_per_100g?: number
  carbs_per_100g?: number
  fat_per_100g?: number
  serving_size_g?: number
}

export async function scanFoodPhoto(image: string, mimeType = 'image/jpeg') {
  return apiFetch<{ product: PhotoFoodProduct | null; confidence?: string; reason?: string }>('/api/barcode/photo', {
    method: 'POST',
    body: JSON.stringify({ image, mimeType }),
  })
}

export async function getBarcodeProduct(code: string) {
  return apiFetch<{ product: PhotoFoodProduct | null }>(`/api/barcode?code=${encodeURIComponent(code)}`)
}

/** AI-powered fallback: estimates nutrition for a food/product name when barcode lookup returns nothing */
export async function estimateBarcodeProduct(name: string) {
  return apiFetch<{ product: PhotoFoodProduct | null; confidence?: string; ai_estimated?: boolean }>('/api/barcode/estimate', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function getHydration(date = new Date().toISOString().split('T')[0]) {
  return apiFetch<{ hydration: { date: string; glasses: number; liters?: number | null; target_liters?: number | null } }>(`/api/hydration?date=${date}`)
}

export async function saveHydration(input: { date?: string; glasses: number; liters?: number | null; target_liters?: number | null }) {
  return apiFetch<{ hydration: { date: string; glasses: number; liters?: number | null; target_liters?: number | null } }>('/api/hydration', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function generateMealRecipe(meal: unknown) {
  return apiFetch<{ recipe: any }>('/api/meal-recipe', {
    method: 'POST',
    body: JSON.stringify({ meal }),
  })
}
