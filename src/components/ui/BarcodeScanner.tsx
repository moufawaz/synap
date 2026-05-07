'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, X, Loader2, AlertCircle, CheckCircle2, Search, Pencil, Sparkles } from 'lucide-react'

export interface FoodProduct {
  barcode: string
  name: string
  brand?: string
  calories_per_100g?: number
  protein_per_100g?: number
  carbs_per_100g?: number
  fat_per_100g?: number
  serving_size_g?: number
  calories_per_serving?: number
  protein_per_serving?: number
  carbs_per_serving?: number
  fat_per_serving?: number
  image_url?: string
}

interface Props {
  onScan: (product: FoodProduct, servingG: number) => void
  onClose: () => void
}

type ScanState = 'scanning' | 'loading' | 'found' | 'not_found' | 'estimating' | 'manual' | 'error'

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const readerRef   = useRef<any>(null)
  const scanningRef = useRef(false)
  const mountedRef  = useRef(true)

  const [scanState, setScanState]   = useState<ScanState>('scanning')
  const [product,   setProduct]     = useState<FoodProduct | null>(null)
  const [servingG,  setServingG]    = useState(100)
  const [error,     setError]       = useState('')
  const [cameraError, setCameraError] = useState('')
  const [aiConfidence, setAiConfidence] = useState<string>('')

  // Not-found form
  const [productNameInput, setProductNameInput] = useState('')

  // Manual entry form
  const [manual, setManual] = useState({
    name: '', brand: '',
    calories: '', protein: '', carbs: '', fat: '', serving: '100',
  })

  // ── Lookup barcode in Open Food Facts ───────────────────────
  const handleBarcode = useCallback(async (barcode: string) => {
    if (!mountedRef.current) return
    setScanState('loading')
    readerRef.current?.reset?.()

    try {
      const res  = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`)
      const data = await res.json()
      if (!mountedRef.current) return

      if (data.product) {
        setProduct(data.product)
        setServingG(data.product.serving_size_g || 100)
        setScanState('found')
      } else {
        setScanState('not_found')
      }
    } catch {
      if (!mountedRef.current) return
      setScanState('error')
      setError('Network error. Please try again.')
    }
  }, [])

  // ── Ask Ion to estimate nutrition from a product name ────────
  async function handleEstimate() {
    const name = productNameInput.trim()
    if (!name) return
    setScanState('estimating')
    try {
      const res  = await fetch('/api/barcode/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (data.product) {
        setProduct(data.product)
        setServingG(data.product.serving_size_g || 100)
        setAiConfidence(data.confidence || 'medium')
        setScanState('found')
      } else {
        // Pre-fill manual form with whatever user typed
        setManual(m => ({ ...m, name }))
        setScanState('manual')
      }
    } catch {
      setManual(m => ({ ...m, name }))
      setScanState('manual')
    }
  }

  // ── Log manually entered product ─────────────────────────────
  function handleManualLog() {
    if (!manual.name.trim() || !manual.calories) return
    const p: FoodProduct = {
      barcode:          'manual',
      name:             manual.name.trim(),
      brand:            manual.brand.trim() || undefined,
      calories_per_100g: Number(manual.calories) || undefined,
      protein_per_100g:  Number(manual.protein)  || undefined,
      carbs_per_100g:    Number(manual.carbs)     || undefined,
      fat_per_100g:      Number(manual.fat)       || undefined,
      serving_size_g:    Number(manual.serving)   || 100,
    }
    onScan(p, Number(manual.serving) || 100)
    onClose()
  }

  // ── Start ZXing continuous decode ────────────────────────────
  const startScanner = useCallback(async () => {
    if (!videoRef.current) return
    try {
      const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,  BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,  BarcodeFormat.DATA_MATRIX,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader
      scanningRef.current = false

      await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        (result: any) => {
          if (!result) return
          if (!mountedRef.current) return
          if (scanningRef.current) return
          scanningRef.current = true
          handleBarcode(result.getText())
        }
      )
    } catch (err: any) {
      if (!mountedRef.current) return
      const msg = err?.message || ''
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.')
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError('Could not access camera.')
      }
    }
  }, [handleBarcode])

  useEffect(() => {
    mountedRef.current = true
    startScanner()
    return () => { mountedRef.current = false; readerRef.current?.reset?.() }
  }, [startScanner])

  // ── Helpers ──────────────────────────────────────────────────
  function calcNutrition(per100: number | undefined, g: number) {
    if (!per100) return null
    return Math.round((per100 * g) / 100)
  }

  function handleLog() {
    if (!product) return
    onScan(product, servingG)
    onClose()
  }

  function rescan() {
    setProduct(null)
    setServingG(100)
    setError('')
    setCameraError('')
    setAiConfidence('')
    setProductNameInput('')
    setManual({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', serving: '100' })
    setScanState('scanning')
    scanningRef.current = false
    setTimeout(() => startScanner(), 50)
  }

  const cal  = product ? calcNutrition(product.calories_per_100g, servingG) : null
  const pro  = product ? calcNutrition(product.protein_per_100g,  servingG) : null
  const carb = product ? calcNutrition(product.carbs_per_100g,    servingG) : null
  const fat  = product ? calcNutrition(product.fat_per_100g,      servingG) : null

  const isLoading = scanState === 'loading' || scanState === 'estimating'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <Camera size={18} style={{ color: '#F97316' }} />
          <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.08em' }}>
            BARCODE SCANNER
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
          <X size={20} style={{ color: '#64748B' }} />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Camera view */}
        <div className="relative bg-black flex-shrink-0" style={{ height: '55vw', maxHeight: 340, minHeight: 200 }}>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {/* Scan overlay */}
          {scanState === 'scanning' && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-40">
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-8 h-8`} style={{
                    borderColor: '#F97316',
                    borderTopWidth:    i < 2      ? 3 : 0,
                    borderBottomWidth: i >= 2     ? 3 : 0,
                    borderLeftWidth:   i % 2 === 0 ? 3 : 0,
                    borderRightWidth:  i % 2 === 1 ? 3 : 0,
                  }} />
                ))}
                <div className="absolute inset-x-2 h-0.5 animate-pulse"
                  style={{ top: '50%', background: 'rgba(249,115,22,0.7)' }} />
              </div>
            </div>
          )}

          {/* Loading / estimating */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin" style={{ color: '#F97316' }} />
                <p className="font-heading text-sm text-white">
                  {scanState === 'estimating' ? 'Ion is estimating nutrition…' : 'Looking up product…'}
                </p>
              </div>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6">
              <div className="text-center">
                <AlertCircle size={36} style={{ color: '#EF4444' }} className="mx-auto mb-3" />
                <p className="font-heading text-sm text-white mb-1">Camera Unavailable</p>
                <p className="font-heading text-xs" style={{ color: '#64748B' }}>{cameraError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status / results */}
        <div className="px-4 py-4 flex-1 flex flex-col gap-4">

          {/* Scanning hint */}
          {scanState === 'scanning' && !cameraError && (
            <p className="font-heading text-sm text-center" style={{ color: '#64748B' }}>
              Point your camera at a barcode
            </p>
          )}

          {/* ── Not found — ask for product name ── */}
          {scanState === 'not_found' && (
            <div className="flex flex-col gap-3">
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} style={{ color: '#BB5CF6' }} />
                  <p className="font-heading font-bold text-sm text-white">Product Not in Database</p>
                </div>
                <p className="font-heading text-xs mb-4" style={{ color: '#64748B' }}>
                  This barcode isn&apos;t in Open Food Facts. Type the product name and Ion will estimate the nutrition.
                </p>
                <input
                  type="text"
                  placeholder="e.g. Almarai Full Fat Laban, Pringles Sour Cream…"
                  value={productNameInput}
                  onChange={e => setProductNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEstimate()}
                  className="w-full px-4 py-3 rounded-xl font-heading text-sm text-white bg-transparent outline-none mb-3"
                  style={{ border: '1px solid rgba(187,92,246,0.3)', background: 'rgba(187,92,246,0.05)' }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleEstimate} disabled={!productNameInput.trim()}
                    className="flex-1 py-3 rounded-xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-opacity"
                    style={{ background: productNameInput.trim() ? '#BB5CF6' : 'rgba(187,92,246,0.2)', color: 'white', opacity: productNameInput.trim() ? 1 : 0.5 }}>
                    <Search size={14} /> Ask Ion
                  </button>
                  <button onClick={() => { setManual(m => ({ ...m, name: productNameInput })); setScanState('manual') }}
                    className="px-4 py-3 rounded-xl font-heading text-sm flex items-center gap-2"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                    <Pencil size={14} /> Manual
                  </button>
                  <button onClick={rescan}
                    className="px-4 py-3 rounded-xl font-heading text-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                    Rescan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Manual entry form ── */}
          {scanState === 'manual' && (
            <div className="glass-card p-5 flex flex-col gap-3">
              <p className="font-heading font-bold text-sm text-white mb-1">Enter Nutrition Manually</p>

              {[
                { label: 'PRODUCT NAME', key: 'name', placeholder: 'e.g. Almarai Yogurt', type: 'text', required: true },
                { label: 'BRAND', key: 'brand', placeholder: 'e.g. Almarai', type: 'text', required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="font-heading text-[10px] tracking-widest block mb-1" style={{ color: '#64748B' }}>{f.label}{f.required ? ' *' : ''}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(manual as any)[f.key]}
                    onChange={e => setManual(m => ({ ...m, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl font-heading text-sm text-white bg-transparent outline-none"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }} />
                </div>
              ))}

              <p className="font-heading text-[10px] tracking-widest mt-1" style={{ color: '#64748B' }}>NUTRITION PER 100g</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Calories (kcal)', key: 'calories', color: '#F97316' },
                  { label: 'Protein (g)',     key: 'protein',  color: '#BB5CF6' },
                  { label: 'Carbs (g)',       key: 'carbs',    color: '#3B82F6' },
                  { label: 'Fat (g)',         key: 'fat',      color: '#F59E0B' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-heading text-[10px] block mb-1" style={{ color: f.color }}>{f.label}</label>
                    <input type="number" min="0" value={(manual as any)[f.key]}
                      onChange={e => setManual(m => ({ ...m, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl font-heading text-sm text-white bg-transparent outline-none"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }} />
                  </div>
                ))}
              </div>

              <div>
                <label className="font-heading text-[10px] tracking-widest block mb-1" style={{ color: '#64748B' }}>SERVING SIZE (g)</label>
                <input type="number" min="1" value={manual.serving}
                  onChange={e => setManual(m => ({ ...m, serving: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl font-heading text-sm text-white bg-transparent outline-none"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }} />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={rescan}
                  className="flex-1 py-3 rounded-xl font-heading font-bold text-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                  Cancel
                </button>
                <button onClick={handleManualLog} disabled={!manual.name.trim() || !manual.calories}
                  className="flex-[2] py-3 rounded-xl font-heading font-black text-sm transition-opacity"
                  style={{ background: '#F97316', color: 'white', opacity: manual.name.trim() && manual.calories ? 1 : 0.4 }}>
                  Log to My Day
                </button>
              </div>
            </div>
          )}

          {/* ── Network error ── */}
          {scanState === 'error' && (
            <div className="glass-card p-5 text-center">
              <AlertCircle size={28} style={{ color: '#EF4444' }} className="mx-auto mb-3" />
              <p className="font-heading font-bold text-sm text-white mb-1">Error</p>
              <p className="font-heading text-xs mb-4" style={{ color: '#64748B' }}>{error}</p>
              <button onClick={rescan} className="px-5 py-2.5 rounded-xl font-heading font-bold text-sm"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                Try Again
              </button>
            </div>
          )}

          {/* ── Product found ── */}
          {scanState === 'found' && product && (
            <div className="flex flex-col gap-4">
              <div className="glass-card p-5">

                {/* AI estimated badge */}
                {aiConfidence && (
                  <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg w-fit"
                    style={{ background: 'rgba(187,92,246,0.08)', border: '1px solid rgba(187,92,246,0.15)' }}>
                    <Sparkles size={11} style={{ color: '#BB5CF6' }} />
                    <p className="font-heading text-[10px]" style={{ color: '#BB5CF6' }}>
                      Ion estimated — {aiConfidence} confidence
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-4">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name}
                      className="w-14 h-14 object-contain rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm text-white leading-tight">{product.name}</p>
                    {product.brand && <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>{product.brand}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle2 size={12} style={{ color: '#10B981' }} />
                      <p className="font-heading text-[10px]" style={{ color: '#10B981' }}>
                        {aiConfidence ? 'Nutrition estimated by Ion' : 'Product found'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Serving size input */}
                <div className="mb-4">
                  <label className="font-heading text-xs tracking-wider block mb-2" style={{ color: '#64748B' }}>
                    SERVING SIZE (grams)
                  </label>
                  <input type="number" min="1" max="2000" value={servingG}
                    onChange={e => setServingG(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl font-heading text-sm text-white bg-transparent outline-none"
                    style={{ border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.05)' }} />
                </div>

                {/* Nutrition preview */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: cal,  unit: 'kcal', color: '#F97316' },
                    { label: 'Protein',  value: pro,  unit: 'g',    color: '#BB5CF6' },
                    { label: 'Carbs',    value: carb, unit: 'g',    color: '#3B82F6' },
                    { label: 'Fat',      value: fat,  unit: 'g',    color: '#F59E0B' },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="text-center p-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-heading font-black text-base" style={{ color }}>{value ?? '—'}</p>
                      <p className="font-heading text-[9px] mt-0.5" style={{ color: '#475569' }}>{unit}</p>
                      <p className="font-heading text-[9px]" style={{ color: '#334155' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={rescan}
                  className="flex-1 py-3.5 rounded-xl font-heading font-bold text-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                  Rescan
                </button>
                <button onClick={handleLog}
                  className="flex-2 flex-grow-[2] py-3.5 rounded-xl font-heading font-black text-sm"
                  style={{ background: '#F97316', color: 'white', boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}>
                  Log to My Day
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
