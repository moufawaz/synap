'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

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

type ScanState = 'scanning' | 'loading' | 'found' | 'not_found' | 'error'

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [product, setProduct] = useState<FoodProduct | null>(null)
  const [servingG, setServingG] = useState(100)
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')

  // Start camera & ZXing reader
  useEffect(() => {
    let mounted = true

    async function startCamera() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })

        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        // Poll for barcodes every 500ms
        reader.decodeFromVideoElement(videoRef.current!, async (result, err) => {
          if (result && mounted && scanState === 'scanning') {
            await handleBarcode(result.getText())
          }
        })
      } catch (err: any) {
        if (mounted) {
          setCameraError(err?.message?.includes('Permission') ? 'Camera permission denied. Please allow camera access and try again.' : 'Could not access camera.')
        }
      }
    }

    startCamera()

    return () => {
      mounted = false
      stopCamera()
    }
  }, []) // eslint-disable-line

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    readerRef.current?.reset?.()
  }

  const handleBarcode = useCallback(async (barcode: string) => {
    setScanState('loading')
    stopCamera()

    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`)
      const data = await res.json()

      if (data.product) {
        setProduct(data.product)
        setServingG(data.product.serving_size_g || 100)
        setScanState('found')
      } else {
        setScanState('not_found')
      }
    } catch {
      setScanState('error')
      setError('Network error. Please try again.')
    }
  }, [])

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
    setScanState('scanning')
    // Restart camera
    async function restart() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        reader.decodeFromVideoElement(videoRef.current!, async (result) => {
          if (result) await handleBarcode(result.getText())
        })
      } catch {}
    }
    restart()
  }

  const cal = product ? calcNutrition(product.calories_per_100g, servingG) : null
  const pro = product ? calcNutrition(product.protein_per_100g, servingG) : null
  const carb = product ? calcNutrition(product.carbs_per_100g, servingG) : null
  const fat = product ? calcNutrition(product.fat_per_100g, servingG) : null

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

      {/* Camera / result area */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Camera view */}
        <div className="relative bg-black flex-shrink-0" style={{ height: '55vw', maxHeight: 340, minHeight: 200 }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scan overlay */}
          {scanState === 'scanning' && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-40">
                {/* Corner brackets */}
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-8 h-8`}
                    style={{
                      borderColor: '#F97316',
                      borderTopWidth: i < 2 ? 3 : 0,
                      borderBottomWidth: i >= 2 ? 3 : 0,
                      borderLeftWidth: i % 2 === 0 ? 3 : 0,
                      borderRightWidth: i % 2 === 1 ? 3 : 0,
                    }} />
                ))}
                {/* Scan line */}
                <div className="absolute inset-x-2 h-0.5 animate-pulse" style={{ top: '50%', background: 'rgba(249,115,22,0.7)' }} />
              </div>
            </div>
          )}

          {/* Loading spinner */}
          {scanState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin" style={{ color: '#F97316' }} />
                <p className="font-heading text-sm text-white">Looking up product...</p>
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

        {/* Status messages */}
        <div className="px-4 py-4 flex-1 flex flex-col gap-4">

          {scanState === 'scanning' && !cameraError && (
            <p className="font-heading text-sm text-center" style={{ color: '#64748B' }}>
              Point your camera at a barcode
            </p>
          )}

          {scanState === 'not_found' && (
            <div className="glass-card p-5 text-center">
              <AlertCircle size={28} style={{ color: '#F59E0B' }} className="mx-auto mb-3" />
              <p className="font-heading font-bold text-sm text-white mb-1">Product Not Found</p>
              <p className="font-heading text-xs mb-4" style={{ color: '#64748B' }}>
                This barcode isn't in our database yet. Try another product.
              </p>
              <button onClick={rescan}
                className="px-5 py-2.5 rounded-xl font-heading font-bold text-sm"
                style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#F97316' }}>
                Scan Again
              </button>
            </div>
          )}

          {scanState === 'error' && (
            <div className="glass-card p-5 text-center">
              <AlertCircle size={28} style={{ color: '#EF4444' }} className="mx-auto mb-3" />
              <p className="font-heading font-bold text-sm text-white mb-1">Error</p>
              <p className="font-heading text-xs mb-4" style={{ color: '#64748B' }}>{error}</p>
              <button onClick={rescan}
                className="px-5 py-2.5 rounded-xl font-heading font-bold text-sm"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                Try Again
              </button>
            </div>
          )}

          {/* ── Product found ── */}
          {scanState === 'found' && product && (
            <div className="flex flex-col gap-4">
              {/* Product info */}
              <div className="glass-card p-5">
                <div className="flex items-start gap-3 mb-4">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-14 h-14 object-contain rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm text-white leading-tight">{product.name}</p>
                    {product.brand && <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>{product.brand}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle2 size={12} style={{ color: '#10B981' }} />
                      <p className="font-heading text-[10px]" style={{ color: '#10B981' }}>Product found</p>
                    </div>
                  </div>
                </div>

                {/* Serving size input */}
                <div className="mb-4">
                  <label className="font-heading text-xs tracking-wider block mb-2" style={{ color: '#64748B' }}>
                    SERVING SIZE (grams)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={servingG}
                    onChange={e => setServingG(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl font-heading text-sm text-white bg-transparent outline-none"
                    style={{ border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.05)' }}
                  />
                </div>

                {/* Nutrition preview */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: cal, unit: 'kcal', color: '#F97316' },
                    { label: 'Protein', value: pro, unit: 'g', color: '#BB5CF6' },
                    { label: 'Carbs', value: carb, unit: 'g', color: '#3B82F6' },
                    { label: 'Fat', value: fat, unit: 'g', color: '#F59E0B' },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
