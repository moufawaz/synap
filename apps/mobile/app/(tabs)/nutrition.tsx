import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { createMealLog, deleteMealLog, getBarcodeProduct, getHydration, getMealLogs, MealLog, saveHydration, scanFoodPhoto, updateMealLog } from '@/features/nutrition'
import { getPlanHistory } from '@/features/workout'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function NutritionScreen() {
  const { color } = useTheme()
  const { text, isRtl } = useLanguage()
  const logs = useAsyncData(getMealLogs, [])
  const plan = useAsyncData(getPlanHistory, [])
  const hydration = useAsyncData(getHydration, [])
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [barcode, setBarcode] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<MealLog | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcodeLocked, setBarcodeLocked] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

  async function handleSave() {
    const mealName = name.trim()
    const kcal = Number(calories)
    if (!mealName || !Number.isFinite(kcal)) {
      Alert.alert('Nutrition', 'Enter food name and calories.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateMealLog({ id: editing.id, meal_name: mealName, calories_estimated: Math.round(kcal) })
      } else {
        await createMealLog({ meal_name: mealName, calories_estimated: Math.round(kcal), source: 'mobile_manual' })
      }
      setName('')
      setCalories('')
      setEditing(null)
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
  }

  async function handlePhotoScan() {
    setScanning(true)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to scan food packaging.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.75,
        allowsEditing: false,
      })
      if (result.canceled) return

      const asset = result.assets[0]
      if (!asset?.base64) {
        Alert.alert('Nutrition', 'Could not read the photo. Please try again.')
        return
      }

      const response = await scanFoodPhoto(asset.base64, asset.mimeType || 'image/jpeg')
      if (!response.product) {
        Alert.alert('Food not found', response.reason || 'Ion could not identify this food photo.')
        return
      }

      const serving = response.product.serving_size_g || 100
      const caloriesPer100 = response.product.calories_per_100g || 0
      setName(response.product.brand ? `${response.product.name} (${response.product.brand}) - ${serving}g` : `${response.product.name} - ${serving}g`)
      setCalories(String(Math.round((caloriesPer100 * serving) / 100)))
      Alert.alert('Food found', 'Review the values, then tap Log food.')
    } catch (error) {
      Alert.alert('Photo scan failed', error instanceof Error ? error.message : 'Try again in a moment.')
    } finally {
      setScanning(false)
    }
  }

  const totalCalories = (logs.data?.logs ?? []).reduce((sum, item) => sum + (item.calories_estimated || 0), 0)
  const activeDiet = plan.data?.activeDietPlan?.plan_json
  const plannedMeals = Array.isArray(activeDiet?.meals) ? activeDiet.meals : []
  const totalProtein = (logs.data?.logs ?? []).reduce((sum, item) => sum + (item.protein_g || 0), 0)
  const totalCarbs = (logs.data?.logs ?? []).reduce((sum, item) => sum + (item.carbs_g || 0), 0)
  const totalFat = (logs.data?.logs ?? []).reduce((sum, item) => sum + (item.fats_g || 0), 0)
  const targets = {
    calories: Number(activeDiet?.daily_calories ?? activeDiet?.calories_per_day ?? 0),
    protein: Number(activeDiet?.macros?.protein_g ?? activeDiet?.protein_g ?? 0),
    carbs: Number(activeDiet?.macros?.carbs_g ?? activeDiet?.carbs_g ?? 0),
    fat: Number(activeDiet?.macros?.fat_g ?? activeDiet?.fat_g ?? activeDiet?.fats_g ?? 0),
    water: Number(activeDiet?.hydration_liters ?? 3),
  }

  async function logPlannedMeal(meal: any) {
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
    try {
      await applyBarcodeProduct(barcode.trim())
    } catch (error) {
      Alert.alert('Barcode', error instanceof Error ? error.message : 'Could not look up barcode.')
    }
  }

  async function applyBarcodeProduct(code: string) {
    const res = await getBarcodeProduct(code)
    if (!res.product) {
      Alert.alert('Barcode', 'Product not found. Use photo scan or manual entry.')
      return false
    }
    const serving = res.product.serving_size_g || 100
    setBarcode(code)
    setName(res.product.brand ? `${res.product.name} (${res.product.brand}) - ${serving}g` : `${res.product.name} - ${serving}g`)
    setCalories(String(Math.round(((res.product.calories_per_100g || 0) * serving) / 100)))
    Alert.alert('Food found', 'Review the values, then tap Log food.')
    return true
  }

  async function openBarcodeScanner() {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission()
    if (!permission?.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to scan barcodes.')
      return
    }
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

  return (
    <Screen>
      <PageHeader eyebrow="NUTRITION" title={text.nutrition} subtitle={`${totalCalories}/${targets.calories || '-'} kcal - P:${Math.round(totalProtein)}/${targets.protein || '-'} C:${Math.round(totalCarbs)}/${targets.carbs || '-'} F:${Math.round(totalFat)}/${targets.fat || '-'}`} />
      <Card>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>Macro progress</Text>
        <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
          Calories {totalCalories}/{targets.calories || '-'} - Water {hydration.data?.hydration?.glasses ?? 0} glasses / {targets.water}L target
        </Text>
        <View style={styles.row}>
          <Pressable onPress={() => addWater(1)} style={[styles.secondary, { borderColor: color.cyan }]}><Text style={[styles.secondaryText, { color: color.cyan }]}>+ Water</Text></Pressable>
          <Pressable onPress={() => addWater(-1)} style={[styles.secondary, { borderColor: color.border }]}><Text style={[styles.secondaryText, { color: color.text }]}>- Water</Text></Pressable>
        </View>
      </Card>
      {plannedMeals.length ? (
        <Card style={styles.section}>
          <Text style={[styles.title, { color: color.text }]}>Meal checklist</Text>
          {plannedMeals.map((meal: any, index: number) => {
            const done = (logs.data?.logs || []).some(log => (log.meal_name || '').toLowerCase().startsWith(String(meal.name || meal.meal_name || '').toLowerCase()))
            return (
              <Pressable key={index} onPress={() => logPlannedMeal(meal)} style={[styles.mealRow, { borderColor: done ? color.pulse : color.border }]}>
                <Text style={[styles.itemTitle, { color: color.text }]}>{done ? '✓ ' : ''}{meal.name || meal.meal_name || `Meal ${index + 1}`}</Text>
                <Text style={[styles.body, { color: color.muted }]}>{meal.time || ''} {meal.calories ? `- ${meal.calories} kcal` : ''}</Text>
              </Pressable>
            )
          })}
        </Card>
      ) : null}
      <Card style={styles.section}>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>Log food</Text>
        <View style={styles.form}>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Barcode number"
            placeholderTextColor={color.dim}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
          />
          <Pressable onPress={lookupBarcode} style={[styles.secondaryFull, { borderColor: color.cyan, backgroundColor: color.elevated }]}>
            <Text style={[styles.secondaryText, { color: color.cyan }]}>Lookup barcode</Text>
          </Pressable>
          <Pressable onPress={openBarcodeScanner} style={[styles.secondaryFull, { borderColor: color.pulse, backgroundColor: color.elevated }]}>
            <Text style={[styles.secondaryText, { color: color.pulse }]}>Scan live barcode</Text>
          </Pressable>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Food name"
            placeholderTextColor={color.dim}
            style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
          />
          <TextInput
            value={calories}
            onChangeText={setCalories}
            placeholder="Calories"
            placeholderTextColor={color.dim}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
          />
          <Pressable disabled={saving} onPress={handleSave} style={[styles.primary, { backgroundColor: color.flame }]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{editing ? 'Save changes' : 'Log food'}</Text>}
          </Pressable>
          <Pressable disabled={scanning} onPress={handlePhotoScan} style={[styles.secondaryFull, { borderColor: color.flame, backgroundColor: color.elevated }]}>
            {scanning ? <ActivityIndicator color={color.flame} /> : <Text style={[styles.secondaryText, { color: color.flame }]}>Scan food photo</Text>}
          </Pressable>
        </View>
      </Card>
      <View style={styles.list}>
        {logs.loading ? <ActivityIndicator color={color.spark} /> : null}
        {logs.error ? <Text style={[styles.body, { color: color.danger }]}>{logs.error}</Text> : null}
        {(logs.data?.logs ?? []).map(log => (
          <Card key={log.id}>
            <Text style={[styles.itemTitle, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{log.meal_name || 'Food'}</Text>
            <Text style={[styles.body, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
              {log.calories_estimated || 0} kcal - P:{log.protein_g || 0} C:{log.carbs_g || 0} F:{log.fats_g || 0}
            </Text>
            <View style={styles.row}>
              <Pressable onPress={() => startEdit(log)} style={[styles.secondary, { borderColor: color.border }]}>
                <Text style={[styles.secondaryText, { color: color.text }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(log.id)} style={[styles.secondary, { borderColor: color.danger }]}>
                <Text style={[styles.secondaryText, { color: color.danger }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </View>
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
            <Text style={styles.scannerHelp}>Place the barcode inside the frame</Text>
            <Pressable onPress={() => setScannerOpen(false)} style={[styles.closeScanner, { backgroundColor: color.elevated, borderColor: color.border }]}>
              <Text style={[styles.secondaryText, { color: color.text }]}>Close scanner</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 10,
    marginTop: 16,
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
  list: {
    gap: 12,
    marginTop: 14,
  },
  section: {
    marginTop: 14,
  },
  mealRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  },
  scannerRoot: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scannerFrame: {
    width: '88%',
    maxWidth: 360,
    aspectRatio: 1.7,
    borderWidth: 3,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  scannerHelp: {
    marginTop: 18,
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 8,
  },
  closeScanner: {
    position: 'absolute',
    bottom: 42,
    left: 24,
    right: 24,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
