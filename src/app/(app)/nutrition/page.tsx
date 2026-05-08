'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Droplets, Flame, Camera, X } from 'lucide-react'
import IonAvatar from '@/components/ui/IonAvatar'
import { RecipeButton } from '@/components/ui/RecipeModal'
import type { FoodProduct } from '@/components/ui/BarcodeScanner'

const FoodPhotoScanner = lazy(() => import('@/components/ui/FoodPhotoScanner'))

export const dynamic = 'force-dynamic'

// Per-day localStorage helpers
const TODAY = new Date().toISOString().split('T')[0]
const CHECKED_KEY = `synap_nutrition_checked_${TODAY}`
const SCANNED_KEY = `synap_nutrition_scanned_${TODAY}`
const WATER_KEY   = `synap_nutrition_water_${TODAY}`

interface ScannedItem {
  id: string        // local temp ID
  dbId?: string     // UUID from DB (for delete)
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  servingG: number
}

function loadChecked(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(CHECKED_KEY) || '[]')) } catch { return new Set() }
}
function saveChecked(s: Set<number>) {
  try { localStorage.setItem(CHECKED_KEY, JSON.stringify([...s])) } catch {}
}
function loadScanned(): ScannedItem[] {
  try { return JSON.parse(localStorage.getItem(SCANNED_KEY) || '[]') } catch { return [] }
}
function saveScanned(items: ScannedItem[]) {
  try { localStorage.setItem(SCANNED_KEY, JSON.stringify(items)) } catch {}
}
function loadWater(): number {
  try { return Number(localStorage.getItem(WATER_KEY) || '0') } catch { return 0 }
}
function saveWater(n: number) {
  try { localStorage.setItem(WATER_KEY, String(n)) } catch {}
}

export default function NutritionPage() {
  const [plan,              setPlan]              = useState<any>(null)
  const [gender,            setGender]            = useState<'male' | 'female'>('male')
  const [checkedMeals,      setCheckedMeals]      = useState<Set<number>>(new Set())
  const [checkedMealDbIds,  setCheckedMealDbIds]  = useState<Map<number, string>>(new Map())
  const [expandedMeals,     setExpandedMeals]     = useState<Set<number>>(new Set())
  const [water,             setWater]             = useState(0)
  const [scannedItems,      setScannedItems]      = useState<ScannedItem[]>([])
  const [loading,           setLoading]           = useState(true)
  const [scannerOpen,       setScannerOpen]       = useState(false)

  useEffect(() => {
    // Restore today's state instantly from localStorage while DB loads
    setCheckedMeals(loadChecked())
    setScannedItems(loadScanned())
    setWater(loadWater())
    loadData()
  }, [])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [planRes, profileRes, logsRes, hydrationRes] = await Promise.all([
      supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
      fetch(`/api/log-meal?date=${TODAY}`).then(r => r.json()).catch(() => ({ logs: [] })),
      fetch(`/api/hydration?date=${TODAY}`).then(r => r.json()).catch(() => ({ hydration: null })),
    ])

    const planData = planRes.data?.plan_json || null
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)
    setPlan(planData)

    const dbWater = Number(hydrationRes.hydration?.glasses)
    if (Number.isFinite(dbWater) && dbWater >= 0) {
      setWater(dbWater)
      saveWater(dbWater)
    }

    // Rebuild checked + scanned from DB (cross-device source of truth)
    const logs: any[] = logsRes.logs || []
    if (logs.length > 0) {
      const meals: any[] = planData?.meals || []
      const newChecked  = new Set<number>()
      const newDbIds    = new Map<number, string>()
      const unmatched: ScannedItem[] = []

      logs.forEach(log => {
        const logName = log.meal_name || ''
        // Try to match against a plan meal by exact name prefix
        const matchIdx = meals.findIndex((m: any) => {
          const name = (m.name || m.meal_name || '').trim()
          return name && (logName === name || logName.startsWith(name))
        })
        if (matchIdx >= 0 && !newChecked.has(matchIdx)) {
          newChecked.add(matchIdx)
          newDbIds.set(matchIdx, log.id)
        } else {
          // Scanned/extra food: parse "Name - 150g" or older em-dash rows.
          const servingMatch = logName.match(/\s+[^0-9]+(\d+(?:\.\d+)?)g$/)
          const servingG = servingMatch ? parseFloat(servingMatch[1]) : 100
          unmatched.push({
            id:        log.id,
            dbId:      log.id,
            name:      logName.replace(/\s+[^0-9]+\d+(?:\.\d+)?g$/, '') || logName,
            calories:  log.calories_estimated || 0,
            protein_g: log.protein_g         || 0,
            carbs_g:   log.carbs_g           || 0,
            fat_g:     log.fats_g            || 0,
            servingG,
          })
        }
      })

      setCheckedMeals(newChecked)
      setCheckedMealDbIds(newDbIds)
      setScannedItems(unmatched)
      saveChecked(newChecked)
      saveScanned(unmatched)
    }

    setLoading(false)
  }

  // Toggle plan meal checked state
  async function toggleMeal(index: number, meal: any) {
    const isChecked = checkedMeals.has(index)

    if (isChecked) {
      // Uncheck: remove from state + DB
      const next = new Set(checkedMeals)
      next.delete(index)
      setCheckedMeals(next)
      saveChecked(next)

      const dbId = checkedMealDbIds.get(index)
      if (dbId) {
        const newIds = new Map(checkedMealDbIds)
        newIds.delete(index)
        setCheckedMealDbIds(newIds)
        fetch('/api/log-meal', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: dbId }),
        }).catch(() => {})
      }
    } else {
      // Check: add to state + DB
      const next = new Set(checkedMeals)
      next.add(index)
      setCheckedMeals(next)
      saveChecked(next)

      fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_name:          meal.name || meal.meal_name,
          meal_time:          meal.time,
          calories_estimated: meal.calories,
          protein_g:          meal.protein_g,
          carbs_g:            meal.carbs_g,
          fats_g:             meal.fat_g,
        }),
      }).then(r => r.json()).then(data => {
        if (data.log?.id) {
          setCheckedMealDbIds(prev => new Map(prev).set(index, data.log.id))
        }
      }).catch(() => {})
    }
  }

  // Water tracker
  function handleWater(i: number) {
    const next = i < water ? i : i + 1
    setWater(next)
    saveWater(next)
    fetch('/api/hydration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: TODAY,
        glasses: next,
        target_liters: plan?.hydration_liters || plan?.water_l || 3,
      }),
    }).catch(() => {})
  }

  // Barcode scan result
  async function handleScanResult(product: FoodProduct, servingG: number) {
    const round = (v?: number) => v ? Math.round((v * servingG) / 100) : 0
    const item: ScannedItem = {
      id:        Date.now().toString(),
      name:      [product.name, product.brand ? `(${product.brand})` : ''].filter(Boolean).join(' '),
      calories:  round(product.calories_per_100g),
      protein_g: round(product.protein_per_100g),
      carbs_g:   round(product.carbs_per_100g),
      fat_g:     round(product.fat_per_100g),
      servingG,
    }

    // Log to DB and capture DB id for later delete
    try {
      const res = await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_name:          `${item.name} - ${servingG}g`,
          calories_estimated: item.calories,
          protein_g:          item.protein_g,
          carbs_g:            item.carbs_g,
          fats_g:             item.fat_g,
        }),
      })
      const data = await res.json()
      if (data.log?.id) item.dbId = data.log.id
    } catch {}

    const updated = [...scannedItems, item]
    setScannedItems(updated)
    saveScanned(updated)
  }

  async function removeScanned(id: string) {
    const item = scannedItems.find(i => i.id === id)
    const updated = scannedItems.filter(i => i.id !== id)
    setScannedItems(updated)
    saveScanned(updated)

    const dbId = item?.dbId
    if (dbId) {
      fetch('/api/log-meal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dbId }),
      }).catch(() => {})
    }
  }

  // Macro totals
  const meals        = plan?.meals || []
  const checkedList  = [...checkedMeals]
  const mealCal      = checkedList.reduce((s, i) => s + (meals[i]?.calories || 0), 0)
  const mealPro      = checkedList.reduce((s, i) => s + (meals[i]?.protein_g || 0), 0)
  const mealCarb     = checkedList.reduce((s, i) => s + (meals[i]?.carbs_g || 0), 0)
  const mealFat      = checkedList.reduce((s, i) => s + (meals[i]?.fat_g || 0), 0)
  const scanCal      = scannedItems.reduce((s, i) => s + i.calories, 0)
  const scanPro      = scannedItems.reduce((s, i) => s + i.protein_g, 0)
  const scanCarb     = scannedItems.reduce((s, i) => s + i.carbs_g, 0)
  const scanFat      = scannedItems.reduce((s, i) => s + i.fat_g, 0)
  const consumedCalories = mealCal + scanCal
  const consumedProtein  = mealPro + scanPro
  const consumedCarbs    = mealCarb + scanCarb
  const consumedFat      = mealFat + scanFat
  const totalCalories    = plan?.daily_calories || 2000
  const caloriesPct      = Math.min((consumedCalories / totalCalories) * 100, 100)

  if (loading) return <LoadingState />
  if (!plan)   return <NoPlanState gender={gender} />

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Food photo scanner overlay */}
      {scannerOpen && (
        <Suspense fallback={null}>
          <FoodPhotoScanner
            onScan={handleScanResult}
            onClose={() => setScannerOpen(false)}
          />
        </Suspense>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#F97316', letterSpacing: '0.14em' }}>NUTRITION PLAN</p>
          <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
            Today&apos;s Meals
          </h1>
          <p className="font-heading text-sm mt-1" style={{ color: '#475569' }}>
            {plan.daily_calories} kcal - {plan.macros?.protein_g || plan.protein_g}g protein
          </p>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider flex-shrink-0 mt-1"
          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#F97316' }}
        >
          <Camera size={14} /> PHOTO SCAN
        </button>
      </div>

      {/* Macro Summary */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-5 mb-4">
          {/* Calorie ring */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="32" fill="none" stroke="#F97316" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - caloriesPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-black text-sm text-white">{consumedCalories}</span>
              <span className="font-heading text-[9px]" style={{ color: '#475569' }}>eaten</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-heading text-xs font-bold text-white">Calories</span>
              <span className="font-heading text-xs" style={{ color: '#475569' }}>{consumedCalories} / {plan.daily_calories}</span>
            </div>
            <MacroRow label="Protein" eaten={consumedProtein} total={plan.macros?.protein_g || plan.protein_g || 0} color="#BB5CF6" />
            <MacroRow label="Carbs"   eaten={consumedCarbs}   total={plan.macros?.carbs_g   || plan.carbs_g   || 0} color="#F97316" />
            <MacroRow label="Fat"     eaten={consumedFat}     total={plan.macros?.fat_g     || plan.fat_g     || 0} color="#3B82F6" />
          </div>
        </div>

        {/* Water */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Droplets size={14} style={{ color: '#3B82F6' }} />
            <span className="font-heading text-xs font-semibold text-white">Water</span>
            <span className="font-heading text-xs" style={{ color: '#475569' }}>{water} / {plan.hydration_liters || plan.water_l || 3}L</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: plan.hydration_liters || plan.water_l || 3 }).map((_, i) => (
              <button key={i} onClick={() => handleWater(i)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: i < water ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i < water ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <Droplets size={12} style={{ color: i < water ? '#3B82F6' : '#2D3748' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Meal timing note */}
      {plan.meal_timing_note && (
        <div className="px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
          <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{plan.meal_timing_note}</p>
        </div>
      )}

      {/* Plan meals */}
      {meals.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {meals.map((meal: any, i: number) => {
            const checked  = checkedMeals.has(i)
            const expanded = expandedMeals.has(i)
            return (
              <div key={i} className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: checked ? 'rgba(16,137,129,0.06)' : '#111111',
                  border: `1px solid ${checked ? 'rgba(16,137,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
                }}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => toggleMeal(i, meal)} className="flex-shrink-0 transition-transform active:scale-90">
                    {checked
                      ? <CheckCircle2 size={22} style={{ color: '#108981' }} />
                      : <Circle      size={22} style={{ color: '#475569' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-bold text-sm text-white" style={{ letterSpacing: '0.04em' }}>
                        {meal.name || meal.meal_name}
                      </p>
                      {meal.time && (
                        <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                          {meal.time}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="font-heading text-xs" style={{ color: checked ? '#108981' : '#475569' }}>
                        <Flame size={10} className="inline mr-0.5" />{meal.calories} kcal
                      </span>
                      <span className="font-heading text-[10px]" style={{ color: '#2D3748' }}>
                        P:{meal.protein_g}g C:{meal.carbs_g}g F:{meal.fat_g}g
                      </span>
                    </div>
                  </div>
                  <button onClick={() => {
                    const next = new Set(expandedMeals)
                    next.has(i) ? next.delete(i) : next.add(i)
                    setExpandedMeals(next)
                  }} className="flex-shrink-0 p-1">
                    {expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
                  </button>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 flex flex-col gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-end pt-3">
                      <RecipeButton meal={meal} />
                    </div>
                    {(meal.foods || meal.items || []).map((food: any, fi: number) => (
                      <div key={fi} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="min-w-0">
                          <p className="font-heading text-xs font-semibold text-white">{food.item || food.name || food.food}</p>
                          <p className="font-heading text-[10px]" style={{ color: '#475569' }}>{food.amount || food.quantity || food.serving}</p>
                        </div>
                        <p className="font-heading text-xs font-bold" style={{ color: '#F97316' }}>{food.calories} kcal</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Scanned / logged foods */}
      {scannedItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Camera size={13} style={{ color: '#F97316' }} />
            <p className="font-heading text-xs font-bold tracking-widest uppercase" style={{ color: '#F97316', letterSpacing: '0.12em' }}>
              LOGGED FOODS
            </p>
            <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
              {scannedItems.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {scannedItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-2xl"
                style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm text-white truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="font-heading text-xs" style={{ color: '#F97316' }}>
                      <Flame size={10} className="inline mr-0.5" />{item.calories} kcal
                    </span>
                    <span className="font-heading text-[10px]" style={{ color: '#475569' }}>
                      {item.servingG}g - P:{item.protein_g}g C:{item.carbs_g}g F:{item.fat_g}g
                    </span>
                  </div>
                </div>
                <button onClick={() => removeScanned(item.id)}
                  className="p-1.5 rounded-lg flex-shrink-0 hover:bg-white/5"
                  style={{ color: '#475569' }}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre/Post workout */}
      {(plan.pre_workout || plan.post_workout) && (
        <div className="flex flex-col gap-3">
          {plan.pre_workout && (
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(16,137,129,0.06)', border: '1px solid rgba(16,137,129,0.15)' }}>
              <p className="font-heading font-bold text-xs mb-1" style={{ color: '#108981' }}>PRE-WORKOUT</p>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{plan.pre_workout}</p>
            </div>
          )}
          {plan.post_workout && (
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
              <p className="font-heading font-bold text-xs mb-1" style={{ color: '#BB5CF6' }}>POST-WORKOUT</p>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{plan.post_workout}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MacroRow({ label, eaten, total, color }: { label: string; eaten: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((eaten / total) * 100, 100) : 0
  return (
    <div className="mb-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="font-heading text-[10px]" style={{ color: '#475569' }}>{label}</span>
        <span className="font-heading text-[10px]" style={{ color: '#475569' }}>{eaten}g / {total}g</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#F97316', borderTopColor: 'transparent' }} />
        <p className="font-heading text-sm" style={{ color: '#475569' }}>Loading nutrition plan...</p>
      </div>
    </div>
  )
}

function NoPlanState({ gender }: { gender: 'male' | 'female' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center">
        <IonAvatar gender={gender} size="lg" />
        <p className="font-heading font-black text-lg text-white mt-4 mb-2 tracking-wider">No plan yet</p>
        <p className="font-heading text-sm mb-4" style={{ color: '#475569' }}>Complete onboarding to get your personalized meal plan.</p>
        <a href="/onboarding" className="btn-primary text-sm w-full flex justify-center">Complete Onboarding</a>
      </div>
    </div>
  )
}
