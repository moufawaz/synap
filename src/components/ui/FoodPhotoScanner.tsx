'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import type { FoodProduct } from '@/components/ui/BarcodeScanner'

interface FoodPhotoScannerProps {
  onScan: (product: FoodProduct, servingG: number) => void
  onClose: () => void
}

type Step = 'capture' | 'scanning' | 'result' | 'error'

interface ScanResult {
  product: FoodProduct
  confidence: 'high' | 'medium' | 'low'
  ai_estimated: boolean
}

export default function FoodPhotoScanner({ onScan, onClose }: FoodPhotoScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep]               = useState<Step>('capture')
  const [preview, setPreview]         = useState<string | null>(null)
  const [result, setResult]           = useState<ScanResult | null>(null)
  const [error, setError]             = useState<string>('')
  const [servingG, setServingG]       = useState(100)
  const [customName, setCustomName]   = useState('')
  const [customCal, setCustomCal]     = useState('')
  const [customPro, setCustomPro]     = useState('')
  const [customCarb, setCustomCarb]   = useState('')
  const [customFat, setCustomFat]     = useState('')
  const [editMode, setEditMode]       = useState(false)

  // Convert File to base64 string (no data-URI prefix)
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleFile = useCallback(async (file: File) => {
    // Show preview immediately
    const url = URL.createObjectURL(file)
    setPreview(url)
    setStep('scanning')
    setError('')

    try {
      const base64 = await toBase64(file)
      const mimeType = file.type || 'image/jpeg'

      const res = await fetch('/api/barcode/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })

      const data = await res.json()

      if (!data.product) {
        setError(data.reason || "Couldn't identify this food. Try a clearer photo of the packaging or nutrition label.")
        setStep('error')
        return
      }

      setResult(data)
      setServingG(data.product.serving_size_g || 100)
      // Pre-fill editable fields
      setCustomName(data.product.name)
      setCustomCal(String(data.product.calories_per_100g ?? ''))
      setCustomPro(String(data.product.protein_per_100g ?? ''))
      setCustomCarb(String(data.product.carbs_per_100g ?? ''))
      setCustomFat(String(data.product.fat_per_100g ?? ''))
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

  const handleConfirm = () => {
    if (!result) return
    const product = editMode ? {
      ...result.product,
      name:              customName || result.product.name,
      calories_per_100g: parseFloat(customCal)  || result.product.calories_per_100g,
      protein_per_100g:  parseFloat(customPro)  || result.product.protein_per_100g,
      carbs_per_100g:    parseFloat(customCarb) || result.product.carbs_per_100g,
      fat_per_100g:      parseFloat(customFat)  || result.product.fat_per_100g,
    } : result.product
    onScan(product, servingG)
    onClose()
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStep('capture')
    setResult(null)
    setError('')
    setEditMode(false)
  }

  // Computed macros for current serving
  const p = result?.product
  const factor = servingG / 100
  const cal  = Math.round((p?.calories_per_100g  || parseFloat(customCal)  || 0) * factor)
  const pro  = Math.round((p?.protein_per_100g   || parseFloat(customPro)  || 0) * factor)
  const carb = Math.round((p?.carbs_per_100g     || parseFloat(customCarb) || 0) * factor)
  const fat  = Math.round((p?.fat_per_100g       || parseFloat(customFat)  || 0) * factor)

  const confidenceColor: Record<string, string> = {
    high: '#10B981', medium: '#F59E0B', low: '#EF4444',
  }
  const confidenceLabel: Record<string, string> = {
    high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence - please verify',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
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

              {/* Product info */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                {editMode ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="w-full px-3 py-2 rounded-xl text-sm font-heading font-bold text-white bg-transparent"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Food name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Cal/100g', val: customCal, set: setCustomCal },
                        { label: 'Protein/100g', val: customPro, set: setCustomPro },
                        { label: 'Carbs/100g', val: customCarb, set: setCustomCarb },
                        { label: 'Fat/100g', val: customFat, set: setCustomFat },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <p className="font-heading text-[10px] mb-1" style={{ color: '#64748B' }}>{label}</p>
                          <input
                            type="number"
                            inputMode="decimal"
                            className="w-full px-3 py-2 rounded-xl text-sm font-heading text-white bg-transparent"
                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                            value={val}
                            onChange={e => set(e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-heading font-bold text-white text-base leading-tight">{result.product.name}</p>
                    {result.product.brand && (
                      <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>{result.product.brand}</p>
                    )}
                    {result.ai_estimated && (
                      <p className="font-heading text-[10px] mt-1" style={{ color: '#F59E0B' }}>
                        AI-estimated nutrition - edit if needed
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Serving size */}
              <div>
                <p className="font-heading text-xs font-bold mb-2" style={{ color: '#94A3B8' }}>SERVING SIZE</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServingG(g => Math.max(10, g - 25))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                    -
                  </button>
                  <div className="flex-1 flex items-center gap-1.5 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={servingG}
                      onChange={e => setServingG(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-transparent text-center font-heading font-bold text-xl text-white w-16 outline-none"
                    />
                    <span className="font-heading text-sm" style={{ color: '#64748B' }}>g</span>
                  </div>
                  <button onClick={() => setServingG(g => g + 25)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                    +
                  </button>
                </div>
              </div>

              {/* Macro preview */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', val: cal, unit: 'kcal', color: '#F97316' },
                  { label: 'Protein',  val: pro,  unit: 'g',    color: '#BB5CF6' },
                  { label: 'Carbs',    val: carb, unit: 'g',    color: '#3B82F6' },
                  { label: 'Fat',      val: fat,  unit: 'g',    color: '#F59E0B' },
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
            className="px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom)+96px)] sm:pb-6 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={handleConfirm}
              className="w-full py-4 rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: '#F97316', color: 'white', boxShadow: '0 0 24px rgba(249,115,22,0.35)', letterSpacing: '0.08em' }}
            >
              <Check size={16} /> LOG {servingG}g
            </button>
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
