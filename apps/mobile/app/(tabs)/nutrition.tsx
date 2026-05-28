import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import Feather from '@expo/vector-icons/Feather'
import { Card } from '@/components/Card'
import { IonPageHeader } from '@/components/IonPageHeader'
import { Screen } from '@/components/Screen'
import {
  createMealLog,
  deleteMealLog,
  estimateBarcodeProduct,
  getBarcodeProduct,
  getHydration,
  getMealLogs,
  MealLog,
  saveHydration,
  scanFoodPhoto,
  updateMealLog,
} from '@/features/nutrition'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ── Helpers ───────────────────────────────────────────────

/** Safely convert any recipe/instruction value (string, object, array) to a displayable string. */
function safeText(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) {
    return val.map((v: unknown) => (typeof v === 'string' ? v : safeText(v))).filter(Boolean).join('\n')
  }
  if (typeof val === 'object') {
    const r = val as Record<string, unknown>
    const parts: string[] = []
    if (r.title && typeof r.title === 'string') parts.push(r.title)
    if (r.steps) parts.push(safeText(r.steps))
    if (r.instructions) parts.push(safeText(r.instructions))
    if (r.tips) parts.push('Tips: ' + safeText(r.tips))
    if (r.prep_time_min) parts.push(`Prep: ${r.prep_time_min} min`)
    if (r.cook_time_min) parts.push(`Cook: ${r.cook_time_min} min`)
    // If nothing structured, fall back to top-level string values
    if (parts.length === 0) {
      Object.values(r).forEach(v => { if (typeof v === 'string' && v) parts.push(v) })
    }
    return parts.filter(Boolean).join('\n')
  }
  return String(val)
}

/** Safely extract an ingredient line from any shape (string, object). */
function safeIngredient(ing: unknown): string {
  if (typeof ing === 'string') return ing.trim()
  if (ing && typeof ing === 'object') {
    const o = ing as Record<string, unknown>
    const name = o.name ?? o.item ?? o.food ?? ''
    const amount = o.amount ?? o.quantity ?? o.serving ?? ''
    const cal = o.calories ? ` · ${o.calories} kcal` : ''
    return `${name}${amount ? '  ' + amount : ''}${cal}`.trim()
  }
  return String(ing ?? '')
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function numberOrNull(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function pct(current: number, target: number) {
  if (!target || target <= 0) return 0
  return Math.max(0, Math.min(100, (current / target) * 100))
}

// ── Simple circle progress (no react-native-svg needed) ───

function CalorieRing({ eaten, total, color }: { eaten: number; total: number; color: any }) {
  const SIZE = 80
  const pctVal = pct(eaten, total)
  // Simulate a ring with a thick border + rotate overlay trick using Views
  // We'll draw an arc indicator using border-radius and transform
  const deg = Math.round(pctVal * 3.6) // 0–360

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: 7, borderColor: color.elevated,
      }} />
      {/* Progress ring — we overlay two half-circle clips */}
      {deg > 0 ? (
        <View style={{ position: 'absolute', width: SIZE, height: SIZE }}>
          {/* Left half */}
          <View style={{
            position: 'absolute', width: SIZE, height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 7,
            borderColor: 'transparent',
            borderLeftColor: deg > 180 ? color.flame : 'transparent',
            borderBottomColor: deg > 180 ? color.flame : 'transparent',
            transform: [{ rotate: deg > 180 ? `${((deg - 180) * 1)}deg` : '0deg' }],
          }} />
          {/* Right half */}
          <View style={{
            position: 'absolute', width: SIZE, height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 7,
            borderColor: 'transparent',
            borderRightColor: color.flame,
            borderTopColor: color.flame,
            transform: [{ rotate: `${Math.min(deg, 180)}deg` }],
          }} />
        </View>
      ) : null}
      {/* Center text */}
      <Text style={{ fontSize: 16, fontWeight: '900', color: color.text }}>{eaten}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: color.dim, letterSpacing: 0.5 }}>EATEN</Text>
    </View>
  )
}

// ── Quick action button ───────────────────────────────────

function QuickLink({ icon, label, labelAr, color: c, borderColor, onPress, isRtl }: {
  icon: string; label: string; labelAr?: string; color: any; borderColor: string; onPress: () => void; isRtl: boolean
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickLink, { backgroundColor: c.surface, borderColor, opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.quickLinkIcon, { backgroundColor: `${borderColor}1A`, borderColor: `${borderColor}33` }]}>
        <Feather name={icon as any} size={16} color={borderColor} />
      </View>
      <Text style={[styles.quickLinkText, { color: c.text, textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
        {isRtl && labelAr ? labelAr : label}
      </Text>
      <Text style={[styles.quickLinkOpen, { color: borderColor }]}>{isRtl ? 'افتح' : 'OPEN'}</Text>
    </Pressable>
  )
}

// ── Macro bar ─────────────────────────────────────────────

function MacroBar({ label, eaten, total, barColor, color }: { label: string; eaten: number; total: number; barColor: string; color: any }) {
  const p = pct(eaten, total)
  return (
    <View style={styles.macroLine}>
      <View style={styles.macroHeader}>
        <Text style={[styles.body, { color: color.text }]}>{label}</Text>
        <Text style={[styles.body, { color: color.muted }]}>{Math.round(eaten)}/{total || '—'}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: color.elevated }]}>
        <View style={[styles.barFill, { width: `${p}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────

export default function NutritionScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const logs = useAsyncData(getMealLogs, [])
  const plan = useAsyncData(getPlanHistory, [])
  const hydration = useAsyncData(getHydration, [])

  // Reload logs every time this tab comes into focus so food logged from
  // eating-out, chat, or any other screen appears immediately on return.
  useFocusEffect(
    useCallback(() => {
      logs.reload()
      hydration.reload()
    }, [])
  )

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [barcode, setBarcode] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<MealLog | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcodeLocked, setBarcodeLocked] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [expandedMeals, setExpandedMeals] = useState<Record<number, boolean>>({})
  const [logPanelOpen, setLogPanelOpen] = useState(false)

  const align = isRtl ? 'right' : 'left'

  function toggleMealExpand(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpandedMeals(prev => ({ ...prev, [index]: !prev[index] }))
  }

  // ── Data ────────────────────────────────────────────────

  const activeDiet = plan.data?.activeDietPlan?.plan_json
  const plannedMeals: any[] = Array.isArray(activeDiet?.meals) ? activeDiet.meals : []
  const mealTimingNote: string = safeText(activeDiet?.meal_timing_note)
  const preWorkout: string = safeText(activeDiet?.pre_workout)
  const postWorkout: string = safeText(activeDiet?.post_workout)
  const targets = {
    calories: Number(activeDiet?.daily_calories ?? activeDiet?.calories_per_day ?? 0),
    protein: Number(activeDiet?.macros?.protein_g ?? activeDiet?.protein_g ?? 0),
    carbs: Number(activeDiet?.macros?.carbs_g ?? activeDiet?.carbs_g ?? 0),
    fat: Number(activeDiet?.macros?.fat_g ?? activeDiet?.fat_g ?? activeDiet?.fats_g ?? 0),
    water: Number(activeDiet?.hydration_liters ?? activeDiet?.water_l ?? 3),
  }

  const allLogs = logs.data?.logs ?? []
  const totalCalories = allLogs.reduce((s, l) => s + (l.calories_estimated || 0), 0)
  const totalProtein = allLogs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const totalCarbs = allLogs.reduce((s, l) => s + (l.carbs_g || 0), 0)
  const totalFat = allLogs.reduce((s, l) => s + (l.fats_g || 0), 0)
  const glasses = hydration.data?.hydration?.glasses ?? 0

  // ── Actions ─────────────────────────────────────────────

  function clearForm() {
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setEditing(null)
  }

  async function handleSave() {
    const mealName = name.trim()
    const kcal = Number(calories)
    if (!mealName || !Number.isFinite(kcal)) {
      Alert.alert('Nutrition', isRtl ? 'أدخل اسم الطعام والسعرات.' : 'Enter food name and calories.')
      return
    }
    const macros = {
      protein_g: numberOrNull(protein) ?? undefined,
      carbs_g:   numberOrNull(carbs)   ?? undefined,
      fats_g:    numberOrNull(fat)     ?? undefined,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateMealLog({ id: editing.id, meal_name: mealName, calories_estimated: Math.round(kcal), ...macros })
      } else {
        await createMealLog({ meal_name: mealName, calories_estimated: Math.round(kcal), ...macros, source: 'mobile_manual' })
      }
      clearForm()
      await logs.reload()
    } catch (error: any) {
      Alert.alert('Nutrition', error?.message || 'Could not save food')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    try {
      await deleteMealLog(id)
      await logs.reload()
    } catch (error: any) {
      Alert.alert('Nutrition', error?.message || 'Could not delete food')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(log: MealLog) {
    setEditing(log)
    setName(log.meal_name || '')
    setCalories(String(log.calories_estimated || ''))
    setProtein(log.protein_g != null ? String(log.protein_g) : '')
    setCarbs(log.carbs_g != null ? String(log.carbs_g) : '')
    setFat(log.fats_g != null ? String(log.fats_g) : '')
    setLogPanelOpen(true)
  }

  async function handlePhotoScan() {
    setScanning(true)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(isRtl ? 'مطلوب إذن الكاميرا' : 'Camera permission needed', isRtl ? 'اسمح للكاميرا لمسح الطعام.' : 'Allow camera access to scan food packaging.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.75 })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset?.base64) { Alert.alert('Nutrition', 'Could not read photo.'); return }
      const response = await scanFoodPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      if (!response.product) { Alert.alert(isRtl ? 'لم يُعثر على الطعام' : 'Food not found', response.reason || 'Ion could not identify this food.'); return }
      const serving = response.product.serving_size_g || 100
      const scale = serving / 100
      setName(response.product.brand ? `${response.product.name} (${response.product.brand}) - ${serving}g` : `${response.product.name} - ${serving}g`)
      setCalories(String(Math.round((response.product.calories_per_100g || 0) * scale)))
      setProtein(response.product.protein_per_100g != null ? String(Math.round(response.product.protein_per_100g * scale * 10) / 10) : '')
      setCarbs(response.product.carbs_per_100g != null ? String(Math.round(response.product.carbs_per_100g * scale * 10) / 10) : '')
      setFat(response.product.fat_per_100g != null ? String(Math.round(response.product.fat_per_100g * scale * 10) / 10) : '')
      setLogPanelOpen(true)
      Alert.alert(isRtl ? 'تم العثور على الطعام' : 'Food found', isRtl ? 'راجع القيم ثم اضغط تسجيل.' : 'Review the values, then tap Log food.')
    } catch (error) {
      Alert.alert('Photo scan failed', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setScanning(false)
    }
  }

  async function logPlannedMeal(meal: any) {
    const mealKey = String(meal.name || meal.meal_name || '').toLowerCase()
    const existing = allLogs.find(log => (log.meal_name || '').toLowerCase().startsWith(mealKey))
    if (existing) {
      await deleteMealLog(existing.id)
      await logs.reload()
      return
    }
    await createMealLog({
      meal_name: meal.name || meal.meal_name || 'Planned meal',
      meal_time: meal.time || meal.meal_time,
      calories_estimated: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fats_g: meal.fat_g ?? meal.fats_g,
      source: 'mobile_plan_meal',
    })
    await logs.reload()
  }

  async function addWater(delta: number) {
    const current = hydration.data?.hydration?.glasses ?? 0
    await saveHydration({ glasses: Math.max(0, current + delta), target_liters: targets.water })
    await hydration.reload()
  }

  async function lookupBarcode() {
    if (!barcode.trim()) return
    try { await applyBarcodeProduct(barcode.trim()) } catch (error) {
      Alert.alert('Barcode', error instanceof Error ? error.message : 'Could not look up barcode.')
    }
  }

  async function applyBarcodeProduct(code: string) {
    let product = (await getBarcodeProduct(code)).product
    if (!product) {
      // Barcode not in database — try AI estimate as fallback (same as web)
      product = (await estimateBarcodeProduct(code).catch(() => ({ product: null }))).product
    }
    if (!product) { Alert.alert('Barcode', isRtl ? 'المنتج غير موجود.' : 'Product not found.'); return false }
    const serving = product.serving_size_g || 100
    const scale = serving / 100
    setBarcode(code)
    setName(product.brand ? `${product.name} (${product.brand}) - ${serving}g` : `${product.name} - ${serving}g`)
    setCalories(String(Math.round((product.calories_per_100g || 0) * scale)))
    setProtein(product.protein_per_100g != null ? String(Math.round(product.protein_per_100g * scale * 10) / 10) : '')
    setCarbs(product.carbs_per_100g != null ? String(Math.round(product.carbs_per_100g * scale * 10) / 10) : '')
    setFat(product.fat_per_100g != null ? String(Math.round(product.fat_per_100g * scale * 10) / 10) : '')
    setLogPanelOpen(true)
    Alert.alert(isRtl ? 'تم العثور على المنتج' : 'Food found', isRtl ? 'راجع القيم ثم اضغط تسجيل.' : 'Review the values, then tap Log food.')
    return true
  }

  async function openBarcodeScanner() {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission()
    if (!permission?.granted) { Alert.alert(isRtl ? 'مطلوب إذن الكاميرا' : 'Camera permission needed', isRtl ? 'اسمح للكاميرا لمسح الباركود.' : 'Allow camera access to scan barcodes.'); return }
    setBarcodeLocked(false)
    setScannerOpen(true)
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (barcodeLocked) return
    const scannedCode = String(result.data || '').trim()
    if (!scannedCode) return
    setBarcodeLocked(true)
    try {
      const found = await applyBarcodeProduct(scannedCode)
      if (found) setScannerOpen(false)
    } catch (error) {
      Alert.alert('Barcode', error instanceof Error ? error.message : 'Could not look up barcode.')
    } finally {
      setTimeout(() => setBarcodeLocked(false), 1200)
    }
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <Screen>
      <IonPageHeader
        eyebrow="NUTRITION"
        title={text.nutrition}
        subtitle={`${Math.round(totalCalories)}${targets.calories ? `/${targets.calories}` : ''} kcal · P ${Math.round(totalProtein)}g`}
      />

      {/* ── Macro summary ── */}
      <Card>
        <View style={[styles.macroSummary, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <CalorieRing eaten={Math.round(totalCalories)} total={targets.calories} color={color} />
          <View style={{ flex: 1, paddingLeft: isRtl ? 0 : 14, paddingRight: isRtl ? 14 : 0 }}>
            <View style={styles.macroHeader}>
              <Text style={[styles.body, { color: color.text }]}>{isRtl ? 'السعرات' : 'Calories'}</Text>
              <Text style={[styles.body, { color: color.muted }]}>{Math.round(totalCalories)}/{targets.calories || '—'}</Text>
            </View>
            <MacroBar label={isRtl ? 'بروتين' : 'Protein'} eaten={totalProtein} total={targets.protein} barColor={color.spark} color={color} />
            <MacroBar label={isRtl ? 'كربوهيدرات' : 'Carbs'} eaten={totalCarbs} total={targets.carbs} barColor={color.flame} color={color} />
            <MacroBar label={isRtl ? 'دهون' : 'Fat'} eaten={totalFat} total={targets.fat} barColor={'#3B82F6'} color={color} />
          </View>
        </View>

        {/* Water tracker */}
        <View style={[styles.waterRow, { borderTopColor: color.border }]}>
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="droplet" size={13} color="#3B82F6" />
            <Text style={[styles.body, { color: color.text }]}>{isRtl ? 'ماء' : 'Water'}</Text>
            <Text style={[styles.body, { color: color.muted }]}>{glasses} / {targets.water}L</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable onPress={() => addWater(1)} style={[styles.waterBtn, { backgroundColor: '#3B82F61A', borderColor: '#3B82F633' }]}>
              <Text style={{ color: '#3B82F6', fontWeight: '900', fontSize: 13 }}>+ </Text>
              <Feather name="droplet" size={11} color="#3B82F6" />
            </Pressable>
            <Pressable onPress={() => addWater(-1)} style={[styles.waterBtn, { backgroundColor: color.elevated, borderColor: color.border }]}>
              <Text style={{ color: color.muted, fontWeight: '900', fontSize: 13 }}>–</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {/* ── Quick links ── */}
      <View style={styles.quickLinks}>
        <QuickLink icon="shopping-bag" label="Grocery List" labelAr="قائمة التسوق" color={color} borderColor={color.pulse} onPress={() => router.push('/grocery')} isRtl={isRtl} />
        <QuickLink icon="map-pin" label="Eating Out" labelAr="الأكل خارجاً" color={color} borderColor={color.flame} onPress={() => router.push('/eating-out')} isRtl={isRtl} />
      </View>

      {/* ── Meal timing note ── */}
      {mealTimingNote ? (
        <View style={[styles.noteBanner, { backgroundColor: `${color.spark}0F`, borderColor: `${color.spark}26` }]}>
          <Feather name="clock" size={13} color={color.sparkLight} />
          <Text style={[styles.noteText, { color: color.muted }]}>{mealTimingNote}</Text>
        </View>
      ) : null}

      {/* ── Planned meals ── */}
      {plannedMeals.length ? (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: color.text, textAlign: align }]}>{isRtl ? 'وجبات اليوم' : "Today's meals"}</Text>
          {plannedMeals.map((meal: any, index: number) => {
            const mealKey = String(meal.name || meal.meal_name || '').toLowerCase()
            const done = allLogs.some(log => (log.meal_name || '').toLowerCase().startsWith(mealKey))
            const expanded = expandedMeals[index] ?? false

            // Extract food items (web uses meal.foods or meal.items)
            const foodItems: any[] = Array.isArray(meal.foods) ? meal.foods
              : Array.isArray(meal.items) ? meal.items
              : []

            // Extract ingredients
            const rawIngredients: unknown[] = Array.isArray(meal.ingredients) ? meal.ingredients : []
            const ingredients: string[] = rawIngredients.map(safeIngredient).filter(Boolean)

            // Recipe text — safely handle object or string
            const recipeText = safeText(meal.recipe || meal.instructions || meal.description || '')

            const macros = {
              protein: meal.protein_g ?? meal.protein ?? null,
              carbs: meal.carbs_g ?? meal.carbs ?? null,
              fat: meal.fat_g ?? meal.fats_g ?? meal.fat ?? null,
            }

            const hasDetails = foodItems.length > 0 || ingredients.length > 0 || recipeText

            return (
              <View key={index} style={[styles.mealRow, { borderColor: done ? color.pulse : color.border }]}>
                {/* Main tap row */}
                <View style={styles.mealMainRow}>
                  <Pressable onPress={() => logPlannedMeal(meal)} style={[styles.mealCheck, { borderColor: done ? color.pulse : color.dim, backgroundColor: done ? color.pulse : 'transparent' }]}>
                    {done ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                  </Pressable>
                  <Pressable onPress={() => logPlannedMeal(meal)} style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: color.text, textAlign: align }]}>
                      {meal.name || meal.meal_name || `Meal ${index + 1}`}
                    </Text>
                    <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
                      {[meal.time || meal.meal_time, meal.calories ? `${meal.calories} kcal` : null,
                        macros.protein != null ? `P ${macros.protein}g` : null,
                        macros.carbs != null ? `C ${macros.carbs}g` : null,
                        macros.fat != null ? `F ${macros.fat}g` : null,
                      ].filter(Boolean).join('  ·  ')}
                    </Text>
                    <Text style={[styles.logHint, { color: done ? color.pulse : color.dim }]}>
                      {done ? (isRtl ? '✓ اضغط لإلغاء التسجيل' : '✓ Tap to unlog') : (isRtl ? 'اضغط للتسجيل' : 'Tap to log')}
                    </Text>
                  </Pressable>
                  {hasDetails ? (
                    <Pressable onPress={() => toggleMealExpand(index)} style={styles.expandBtn} hitSlop={8}>
                      <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={color.muted} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Expanded detail */}
                {expanded && hasDetails ? (
                  <View style={[styles.recipeSection, { borderTopColor: color.border }]}>
                    {/* Food items list (web-style breakdown) */}
                    {foodItems.length > 0 ? (
                      <>
                        <Text style={[styles.recipeSectionTitle, { color: color.spark }]}>
                          {isRtl ? 'الأطعمة' : 'FOODS'}
                        </Text>
                        {foodItems.map((food: any, fi: number) => (
                          <View key={fi} style={[styles.foodItem, { backgroundColor: color.elevated }]}>
                            <Text style={[styles.foodItemName, { color: color.text }]}>
                              {food.item || food.name || food.food || String(food)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {food.amount || food.quantity || food.serving
                                ? <Text style={[styles.foodItemAmount, { color: color.muted }]}>{food.amount || food.quantity || food.serving}</Text>
                                : null}
                              {food.calories
                                ? <Text style={[styles.foodItemCal, { color: color.flame }]}>{food.calories} kcal</Text>
                                : null}
                            </View>
                          </View>
                        ))}
                      </>
                    ) : null}

                    {/* Ingredients */}
                    {ingredients.length > 0 ? (
                      <>
                        <Text style={[styles.recipeSectionTitle, { color: color.spark, marginTop: foodItems.length > 0 ? 10 : 0 }]}>
                          {isRtl ? 'المكوّنات' : 'INGREDIENTS'}
                        </Text>
                        {ingredients.map((ing, i) => (
                          <Text key={i} style={[styles.ingredientLine, { color: color.muted, textAlign: align }]}>·  {ing}</Text>
                        ))}
                      </>
                    ) : null}

                    {/* Recipe */}
                    {recipeText ? (
                      <>
                        <Text style={[styles.recipeSectionTitle, { color: color.spark, marginTop: (foodItems.length > 0 || ingredients.length > 0) ? 10 : 0 }]}>
                          {isRtl ? 'طريقة التحضير' : 'RECIPE'}
                        </Text>
                        <Text style={[styles.body, { color: color.muted, textAlign: align, lineHeight: 20 }]}>{recipeText}</Text>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          })}
        </Card>
      ) : null}

      {/* ── Pre / Post workout ── */}
      {(preWorkout || postWorkout) ? (
        <View style={styles.section}>
          {preWorkout ? (
            <View style={[styles.noteBanner, { backgroundColor: `${color.pulse}0F`, borderColor: `${color.pulse}26` }]}>
              <Text style={[styles.recipeSectionTitle, { color: color.pulse }]}>{isRtl ? 'قبل التمرين' : 'PRE-WORKOUT'}</Text>
              <Text style={[styles.body, { color: color.muted }]}>{preWorkout}</Text>
            </View>
          ) : null}
          {postWorkout ? (
            <View style={[styles.noteBanner, { backgroundColor: `${color.spark}0F`, borderColor: `${color.spark}26`, marginTop: 8 }]}>
              <Text style={[styles.recipeSectionTitle, { color: color.sparkLight }]}>{isRtl ? 'بعد التمرين' : 'POST-WORKOUT'}</Text>
              <Text style={[styles.body, { color: color.muted }]}>{postWorkout}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Log food panel toggle ── */}
      <Card style={styles.section}>
        <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setLogPanelOpen(p => !p) }}
          style={[styles.logPanelHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { color: color.text, marginBottom: 0 }]}>{isRtl ? 'تسجيل طعام' : 'Log food'}</Text>
          <Feather name={logPanelOpen ? 'chevron-up' : 'chevron-down'} size={18} color={color.muted} />
        </Pressable>

        {logPanelOpen ? (
          <View style={styles.form}>
            <TextInput value={barcode} onChangeText={setBarcode} placeholder={isRtl ? 'رقم الباركود' : 'Barcode number'} placeholderTextColor={color.dim}
              keyboardType="number-pad" style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: align }]} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={lookupBarcode} style={[styles.secondaryHalf, { borderColor: '#3B82F6', backgroundColor: color.elevated }]}>
                <Text style={[styles.secondaryText, { color: '#3B82F6' }]}>{isRtl ? 'بحث' : 'Lookup'}</Text>
              </Pressable>
              <Pressable onPress={openBarcodeScanner} style={[styles.secondaryHalf, { borderColor: color.pulse, backgroundColor: color.elevated }]}>
                <Feather name="camera" size={14} color={color.pulse} />
                <Text style={[styles.secondaryText, { color: color.pulse }]}>{isRtl ? 'مسح' : 'Scan'}</Text>
              </Pressable>
            </View>
            <TextInput value={name} onChangeText={setName} placeholder={isRtl ? 'اسم الطعام' : 'Food name'} placeholderTextColor={color.dim}
              style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: align }]} />
            <TextInput value={calories} onChangeText={setCalories} placeholder={isRtl ? 'السعرات (kcal)' : 'Calories (kcal)'} placeholderTextColor={color.dim}
              keyboardType="numeric" style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: align }]} />
            {/* Macros row */}
            <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', gap: 8 }}>
              <TextInput value={protein} onChangeText={setProtein} placeholder={isRtl ? 'بروتين (g)' : 'Protein (g)'} placeholderTextColor={color.dim}
                keyboardType="numeric" style={[styles.input, { flex: 1, backgroundColor: color.elevated, borderColor: color.spark + '66', color: color.text, textAlign: align }]} />
              <TextInput value={carbs} onChangeText={setCarbs} placeholder={isRtl ? 'كارب (g)' : 'Carbs (g)'} placeholderTextColor={color.dim}
                keyboardType="numeric" style={[styles.input, { flex: 1, backgroundColor: color.elevated, borderColor: color.flame + '66', color: color.text, textAlign: align }]} />
              <TextInput value={fat} onChangeText={setFat} placeholder={isRtl ? 'دهون (g)' : 'Fat (g)'} placeholderTextColor={color.dim}
                keyboardType="numeric" style={[styles.input, { flex: 1, backgroundColor: color.elevated, borderColor: '#3B82F666', color: color.text, textAlign: align }]} />
            </View>
            <Pressable disabled={saving} onPress={handleSave} style={[styles.primary, { backgroundColor: color.flame }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{editing ? (isRtl ? 'حفظ التعديلات' : 'Save changes') : (isRtl ? 'تسجيل الطعام' : 'Log food')}</Text>}
            </Pressable>
            <Pressable disabled={scanning} onPress={handlePhotoScan} style={[styles.secondaryFull, { borderColor: color.flame, backgroundColor: color.elevated }]}>
              {scanning ? <ActivityIndicator color={color.flame} /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="camera" size={14} color={color.flame} />
                  <Text style={[styles.secondaryText, { color: color.flame }]}>{isRtl ? 'تصوير الطعام' : 'Scan food photo'}</Text>
                </View>
              )}
            </Pressable>
          </View>
        ) : null}
      </Card>

      {/* ── Logged foods ── */}
      <View style={styles.list}>
        {logs.loading ? <ActivityIndicator color={color.spark} /> : null}
        {logs.error ? <Text style={[styles.body, { color: color.danger }]}>{logs.error}</Text> : null}
        {allLogs.length > 0 ? (
          <View style={[styles.section]}>
            <Text style={[styles.sectionTitle, { color: color.text, textAlign: align, marginBottom: 8 }]}>
              {isRtl ? 'الأطعمة المسجلة' : 'LOGGED FOODS'}
              <Text style={[styles.body, { color: color.spark }]}>  {allLogs.length}</Text>
            </Text>
            {allLogs.map(log => (
              <Card key={log.id} style={{ marginBottom: 8 }}>
                <Text style={[styles.itemTitle, { color: color.text, textAlign: align, fontSize: 15 }]}>{log.meal_name || 'Food'}</Text>
                <Text style={[styles.body, { color: color.muted, textAlign: align }]}>
                  {log.calories_estimated || 0} kcal{log.protein_g ? `  ·  P ${log.protein_g}g` : ''}{log.carbs_g ? `  C ${log.carbs_g}g` : ''}{log.fats_g ? `  F ${log.fats_g}g` : ''}
                </Text>
                <View style={[styles.row, { marginTop: 8 }]}>
                  <Pressable onPress={() => startEdit(log)} style={[styles.secondary, { borderColor: color.border }]}>
                    <Text style={[styles.secondaryText, { color: color.text }]}>{isRtl ? 'تعديل' : 'Edit'}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(log.id)} style={[styles.secondary, { borderColor: color.danger }]}>
                    <Text style={[styles.secondaryText, { color: color.danger }]}>{isRtl ? 'حذف' : 'Delete'}</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </View>

      {/* ── Barcode camera modal ── */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={[styles.scannerRoot, { backgroundColor: color.bg }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'] }}
            onBarcodeScanned={barcodeLocked ? undefined : handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={[styles.scannerFrame, { borderColor: color.flame }]} />
            <Text style={styles.scannerHelp}>{isRtl ? 'ضع الباركود داخل الإطار' : 'Place the barcode inside the frame'}</Text>
            <Pressable onPress={() => setScannerOpen(false)} style={[styles.closeScanner, { backgroundColor: color.elevated, borderColor: color.border }]}>
              <Text style={[styles.secondaryText, { color: color.text }]}>{isRtl ? 'إغلاق' : 'Close scanner'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginTop: 12,
  },
  // Macro summary
  macroSummary: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  macroLine: {
    marginTop: 6,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  // Water row
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  waterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  // Quick links
  quickLinks: {
    gap: 8,
    marginTop: 12,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  quickLinkOpen: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Note banners
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  // Meal rows
  mealRow: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
    overflow: 'hidden',
  },
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  mealCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  logHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  expandBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Recipe/food expanded section
  recipeSection: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  recipeSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  foodItemName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  foodItemAmount: {
    fontSize: 11,
  },
  foodItemCal: {
    fontSize: 12,
    fontWeight: '800',
  },
  ingredientLine: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  // Log panel
  logPanelHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  form: {
    gap: 10,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
  },
  primary: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  secondary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
  },
  secondaryFull: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontWeight: '900',
    fontSize: 13,
  },
  list: {
    marginTop: 4,
  },
  // Scanner
  scannerRoot: { flex: 1 },
  scannerOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scannerFrame: { width: '88%', maxWidth: 360, aspectRatio: 1.7, borderWidth: 3, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.08)' },
  scannerHelp: { marginTop: 18, color: '#FFFFFF', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 8 },
  closeScanner: { position: 'absolute', bottom: 42, left: 24, right: 24, minHeight: 52, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
})
