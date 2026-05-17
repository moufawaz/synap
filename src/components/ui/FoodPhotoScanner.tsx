'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, RotateCcw, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react'
import type { FoodProduct } from '@/components/ui/BarcodeScanner'

interface FoodPhotoScannerProps {
  onScan: (product: FoodProduct, servingG: number) => void | Promise<void>
  onClose: () => void
}

type Step = 'capture' | 'scanning' | 'result' | 'error'

interface ScanResult {
  product: FoodProduct
  confidence: 'high' | 'medium' | 'low'
  ai_estimated: boolean
}

interface EditableFoodItem {
  id: string
  name: string
  brand?: string
  servingG: number
  caloriesPer100g: string
  proteinPer100g: string
  carbsPer100g: string
  fatPer100g: string
}

export default function FoodPhotoScanner({ onScan, onClose }: FoodPhotoScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep]               = useState<Step>('capture')
  const [preview, setPreview]         = useState<string | null>(null)
  const [result, setResult]           = useState<ScanResult | null>(null)
  const [error, setError]             = useState<string>('')
  const [items, setItems]             = useState<EditableFoodItem[]>([])
  const [editMode, setEditMode]       = useState(false)
  const [logging, setLogging]         = useState(false)
  const [logError, setLogError]       = useState('')

  // Resize + compress image to ≤1200px / 80% JPEG before base64-encoding.
  // Phone photos can be 5–10 MB; this brings them to ~200–500 KB so the
  // JSON body stays well under the 4 MB Next.js body-parser limit.
  const compressImage = (file: File): Promise<{ base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else                { width  = Math.round(width  * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = url
    })

  const handleFile = useCallback(async (file: File) => {
    // Show preview immediately
    const url = URL.createObjectURL(file)
    setPreview(url)
    setStep('scanning')
    setError('')

    try {
      const { base64, mimeType } = await compressImage(file)

      const res = await fetch('/api/barcode/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(
          res.status === 401
            ? 'Please log in again before using food photo scan.'
            : res.status === 403
              ? 'Food photo scan is available on Pro, Elite, or during launch access.'
              : data.error || 'Ion could not read this image right now. Please try again.'
        )
        setStep('error')
        return
      }

      if (!data.product) {
        setError(data.reason || "Couldn't identify this food. Try a clearer photo of the packaging or nutrition label.")
        setStep('error')
        return
      }

      setResult(data)
      setItems([productToEditable(data.product)])
      setStep('result')
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('error')
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = '' // reset so same file can be re-selected
  }

  const handleConfirm = async () => {
    if (!result || items.length === 0) return
    setLogging(true)
    setLogError('')
    try {
      for (const item of items) {
        const product = editableToProduct(item)
        await onScan(product, item.servingG)
      }
      onClose()
    } catch (err: any) {
      setLogError(err?.message || 'Food could not be saved. Please try again.')
      setLogging(false)
    }
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStep('capture')
    setResult(null)
    setError('')
    setLogError('')
    setEditMode(false)
    setItems([])
  }

  function updateItem(id: string, patch: Partial<EditableFoodItem>) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function addFoodItem() {
    setEditMode(true)
    setItems(prev => [...prev, {
      id: `${Date.now()}-${prev.length}`,
      name: 'Extra food',
      servingG: 100,
      caloriesPer100g: '0',
      proteinPer100g: '0',
      carbsPer100g: '0',
      fatPer100g: '0',
    }])
  }

  function removeFoodItem(id: string) {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev)
  }

  const totals = items.reduce((acc, item) => {
    const macros = itemMacros(item)
    return {
      cal: acc.cal + macros.cal,
      pro: acc.pro + macros.pro,
      carb: acc.carb + macros.carb,
      fat: acc.fat + macros.fat,
    }
  }, { cal: 0, pro: 0, carb: 0, fat: 0 })

  const confidenceColor: Record<string, string> = {
    high: '#10B981', medium: '#F59E0B', low: '#EF4444',
  }
  const confidenceLabel: Record<string, string> = {
    high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence - please verify',
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Camera size={16} style={{ color: '#F97316' }} />
            <p className="font-heading font-bold text-sm tracking-wider" style={{ color: '#F97316', letterSpacing: '0.1em' }}>
              {step === 'scanning' ? 'IDENTIFYING...' : step === 'result' ? 'FOOD FOUND' : step === 'error' ? 'TRY AGAIN' : 'PHOTO SCAN'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#475569' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1">

          {/* ── CAPTURE step ── */}
          {step === 'capture' && (
            <div className="p-6 flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)', border: '2px dashed rgba(249,115,22,0.3)' }}>
                <Camera size={36} style={{ color: '#F97316' }} />
              </div>
              <div className="text-center">
                <p className="font-heading font-bold text-white text-base mb-1">Scan Your Food</p>
                <p className="font-heading text-sm leading-relaxed" style={{ color: '#64748B' }}>
                  Take a photo or upload an image of the food or packaging. Ion will identify it and estimate the nutrition.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                {/* Camera capture */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-3 py-4 rounded-2xl font-heading font-bold text-sm w-full transition-all active:scale-[0.98]"
                  style={{ background: '#F97316', color: 'white', boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}
                >
                  <Camera size={18} /> Take Photo
                </button>
                {/* Gallery upload */}
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture')
                      fileInputRef.current.click()
                      // Restore capture after selection
                      setTimeout(() => fileInputRef.current?.setAttribute('capture', 'environment'), 500)
                    }
                  }}
                  className="flex items-center justify-center gap-3 py-4 rounded-2xl font-heading font-bold text-sm w-full transition-all"
                  style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#F97316' }}
                >
                  <Upload size={16} /> Upload from Gallery
                </button>
              </div>
              <p className="font-heading text-[10px] text-center" style={{ color: '#2D3748' }}>
                Best results: clear photo of nutrition label or recognisable packaging
              </p>
            </div>
          )}

          {/* ── SCANNING step ── */}
          {step === 'scanning' && (
            <div className="p-6 flex flex-col items-center gap-5">
              {preview && (
                <div className="w-full max-h-52 rounded-2xl overflow-hidden">
                  <img src={preview} alt="Food preview" className="w-full h-52 object-cover" />
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin" style={{ color: '#F97316' }} />
                <p className="font-heading font-bold text-white">Ion is analysing...</p>
                <p className="font-heading text-sm" style={{ color: '#64748B' }}>Reading nutrition information</p>
              </div>
            </div>
          )}

          {/* ── ERROR step ── */}
          {step === 'error' && (
            <div className="p-6 flex flex-col items-center gap-5">
              {preview && (
                <div className="w-full max-h-52 rounded-2xl overflow-hidden opacity-40">
                  <img src={preview} alt="Food preview" className="w-full h-52 object-cover" />
                </div>
              )}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertCircle size={28} style={{ color: '#EF4444' }} />
                </div>
                <p className="font-heading font-bold text-white">Couldn't identify food</p>
                <p className="font-heading text-sm leading-relaxed" style={{ color: '#64748B' }}>{error}</p>
              </div>
              <button onClick={reset} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-heading font-bold text-sm w-full justify-center" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#F97316' }}>
                <RotateCcw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* ── RESULT step ── */}
          {step === 'result' && result && (
            <div className="p-5 flex flex-col gap-4">
              {/* Preview + product name */}
              {preview && (
                <div className="w-full h-36 rounded-2xl overflow-hidden relative">
                  <img src={preview} alt="Food" className="w-full h-full object-cover" />
                  {/* confidence badge */}
                  <div
                    className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-heading font-bold"
                    style={{ background: 'rgba(0,0,0,0.7)', color: confidenceColor[result.confidence] || '#F59E0B' }}
                  >
                    {confidenceLabel[result.confidence] || 'Estimated'}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-xs font-bold" style={{ color: '#94A3B8' }}>DETECTED ITEMS</p>
                  {result.ai_estimated && (
                    <p className="font-heading text-[10px] mt-1" style={{ color: '#F59E0B' }}>AI-estimated nutrition - edit each item if needed</p>
                  )}
                </div>
                <button
                  onClick={addFoodItem}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-heading font-bold text-[10px]"
                  style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#F97316' }}
                >
                  <Plus size={12} /> ITEM
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {items.map((item, index) => {
                  const macros = itemMacros(item)
                  return (
                    <div key={item.id} className="rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                      {editMode ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-heading font-bold text-white bg-transparent"
                              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                              value={item.name}
                              onChange={e => updateItem(item.id, { name: e.target.value })}
                              placeholder="Food name"
                            />
                            <button
                              onClick={() => removeFoodItem(item.id)}
                              disabled={items.length === 1}
                              className="w-10 rounded-xl flex items-center justify-center disabled:opacity-30"
                              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <NumberField label="Serving g" value={String(item.servingG)} onChange={value => updateItem(item.id, { servingG: Math.max(1, parseFloat(value) || 1) })} />
                            <NumberField label="Cal/100g" value={item.caloriesPer100g} onChange={value => updateItem(item.id, { caloriesPer100g: value })} />
                            <NumberField label="Protein/100g" value={item.proteinPer100g} onChange={value => updateItem(item.id, { proteinPer100g: value })} />
                            <NumberField label="Carbs/100g" value={item.carbsPer100g} onChange={value => updateItem(item.id, { carbsPer100g: value })} />
                            <NumberField label="Fat/100g" value={item.fatPer100g} onChange={value => updateItem(item.id, { fatPer100g: value })} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-bold text-white text-base leading-tight">{item.name}</p>
                            {item.brand && <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>{item.brand}</p>}
                            <p className="font-heading text-[10px] mt-1" style={{ color: '#64748B' }}>
                              {item.servingG}g - {macros.cal} kcal · P:{macros.pro}g C:{macros.carb}g F:{macros.fat}g
                            </p>
                          </div>
                          <span className="font-heading text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8' }}>
                            #{index + 1}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Macro preview */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', val: totals.cal, unit: 'kcal', color: '#F97316' },
                  { label: 'Protein',  val: totals.pro,  unit: 'g',    color: '#BB5CF6' },
                  { label: 'Carbs',    val: totals.carb, unit: 'g',    color: '#3B82F6' },
                  { label: 'Fat',      val: totals.fat,  unit: 'g',    color: '#F59E0B' },
                ].map(({ label, val, unit, color }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="font-heading font-bold text-base" style={{ color }}>{val}</p>
                    <p className="font-heading text-[9px]" style={{ color: '#64748B' }}>{unit}</p>
                    <p className="font-heading text-[9px] mt-0.5" style={{ color: '#2D3748' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Edit / Retake toggle */}
              <div className="flex gap-2">
                <button onClick={() => setEditMode(e => !e)}
                  className="flex-1 py-2.5 rounded-xl font-heading font-bold text-xs"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                  {editMode ? 'DONE EDITING' : 'EDIT VALUES'}
                </button>
                <button onClick={reset}
                  className="flex-1 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                  <RotateCcw size={11} /> RETAKE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {step === 'result' && (
          <div
            className="sticky bottom-0 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0E0E0E' }}
          >
            <button
              onClick={handleConfirm}
              disabled={logging}
              className="w-full py-4 rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: logging ? '#9A3412' : '#F97316', color: 'white', boxShadow: '0 0 24px rgba(249,115,22,0.35)', letterSpacing: '0.08em' }}
            >
              {logging ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {logging ? 'SAVING...' : `LOG ${items.length} ITEM${items.length === 1 ? '' : 'S'}`}
            </button>
            {logError && (
              <p className="font-heading text-xs text-center mt-2" style={{ color: '#F87171' }}>{logError}</p>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  )
}

function productToEditable(product: FoodProduct): EditableFoodItem {
  return {
    id: `${Date.now()}-0`,
    name: product.name || 'Detected food',
    brand: product.brand,
    servingG: Number(product.serving_size_g) || 100,
    caloriesPer100g: String(product.calories_per_100g ?? 0),
    proteinPer100g: String(product.protein_per_100g ?? 0),
    carbsPer100g: String(product.carbs_per_100g ?? 0),
    fatPer100g: String(product.fat_per_100g ?? 0),
  }
}

function editableToProduct(item: EditableFoodItem): FoodProduct {
  return {
    barcode: 'photo',
    name: item.name.trim() || 'Detected food',
    brand: item.brand,
    calories_per_100g: Number(item.caloriesPer100g) || 0,
    protein_per_100g: Number(item.proteinPer100g) || 0,
    carbs_per_100g: Number(item.carbsPer100g) || 0,
    fat_per_100g: Number(item.fatPer100g) || 0,
    serving_size_g: item.servingG,
  }
}

function itemMacros(item: EditableFoodItem) {
  const factor = (Number(item.servingG) || 0) / 100
  return {
    cal: Math.round((Number(item.caloriesPer100g) || 0) * factor),
    pro: Math.round((Number(item.proteinPer100g) || 0) * factor),
    carb: Math.round((Number(item.carbsPer100g) || 0) * factor),
    fat: Math.round((Number(item.fatPer100g) || 0) * factor),
  }
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <p className="font-heading text-[10px] mb-1" style={{ color: '#64748B' }}>{label}</p>
      <input
        type="number"
        inputMode="decimal"
        className="w-full px-3 py-2 rounded-xl text-sm font-heading text-white bg-transparent"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}
