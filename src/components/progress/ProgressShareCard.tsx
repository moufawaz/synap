'use client'

import { useRef, useState } from 'react'
import { Download, Image as ImageIcon, Share2 } from 'lucide-react'

export default function ProgressShareCard({ measurements, workoutLogs }: { measurements: any[]; workoutLogs: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const first = measurements[0]
  const latest = measurements[measurements.length - 1]
  const hasData = measurements.length >= 1

  async function generateCard() {
    if (!hasData) return
    setBusy(true)
    const canvas = canvasRef.current || document.createElement('canvas')
    canvasRef.current = canvas
    canvas.width = 1080
    canvas.height = 1350
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const weightChange = first?.weight_kg != null && latest?.weight_kg != null
      ? Number(latest.weight_kg) - Number(first.weight_kg)
      : null
    const waistChange = first?.waist_cm != null && latest?.waist_cm != null
      ? Number(latest.waist_cm) - Number(first.waist_cm)
      : null
    const bodyFatChange = first?.body_fat_pct != null && latest?.body_fat_pct != null
      ? Number(latest.body_fat_pct) - Number(first.body_fat_pct)
      : null

    const grd = ctx.createLinearGradient(0, 0, 1080, 1350)
    grd.addColorStop(0, '#0A0A0A')
    grd.addColorStop(0.55, '#171022')
    grd.addColorStop(1, '#081915')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 1080, 1350)

    ctx.fillStyle = 'rgba(187,92,246,0.18)'
    ctx.beginPath()
    ctx.arc(900, 160, 260, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(16,185,129,0.13)'
    ctx.beginPath()
    ctx.arc(120, 1180, 280, 0, Math.PI * 2)
    ctx.fill()

    roundRect(ctx, 70, 70, 940, 1210, 42, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.14)')

    ctx.fillStyle = '#D88BFF'
    ctx.font = '700 32px Arial'
    ctx.fillText('SYNAP PROGRESS', 120, 145)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 68px Arial'
    ctx.fillText('Weekly Progress', 120, 230)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '400 30px Arial'
    const dateLabel = latest?.date ? new Date(latest.date).toLocaleDateString() : new Date().toLocaleDateString()
    ctx.fillText(dateLabel, 120, 282)

    const stats = [
      ['Weight', latest?.weight_kg != null ? `${latest.weight_kg} kg` : '-', weightChange, 'kg'],
      ['Waist', latest?.waist_cm != null ? `${latest.waist_cm} cm` : '-', waistChange, 'cm'],
      ['Body Fat', latest?.body_fat_pct != null ? `${latest.body_fat_pct}%` : '-', bodyFatChange, '%'],
      ['Workouts', String(workoutLogs.length || 0), null, 'logged'],
    ]

    stats.forEach((stat, i) => {
      const x = 120 + (i % 2) * 430
      const y = 360 + Math.floor(i / 2) * 220
      roundRect(ctx, x, y, 380, 160, 28, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.12)')
      ctx.fillStyle = '#94A3B8'
      ctx.font = '700 24px Arial'
      ctx.fillText(String(stat[0]).toUpperCase(), x + 34, y + 48)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '800 44px Arial'
      ctx.fillText(String(stat[1]), x + 34, y + 104)
      if (stat[2] != null) {
        const change = Number(stat[2])
        ctx.fillStyle = change <= 0 ? '#10B981' : '#F59E0B'
        ctx.font = '700 24px Arial'
        ctx.fillText(`${change > 0 ? '+' : ''}${change.toFixed(1)} ${stat[3]}`, x + 34, y + 138)
      }
    })

    roundRect(ctx, 120, 850, 840, 220, 32, 'rgba(187,92,246,0.12)', 'rgba(187,92,246,0.25)')
    ctx.fillStyle = '#D88BFF'
    ctx.font = '800 28px Arial'
    ctx.fillText('Ion note', 160, 910)
    ctx.fillStyle = '#E2E8F0'
    ctx.font = '500 34px Arial'
    const note = buildNote(weightChange, waistChange, bodyFatChange, workoutLogs.length)
    wrapText(ctx, note, 160, 965, 760, 44)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 34px Arial'
    ctx.fillText('synapfit.app', 120, 1185)
    ctx.fillStyle = '#64748B'
    ctx.font = '500 24px Arial'
    ctx.fillText('AI personal training that remembers.', 120, 1225)

    const url = canvas.toDataURL('image/png')
    setPreviewUrl(url)
    setBusy(false)
  }

  async function shareCard() {
    if (!previewUrl) await generateCard()
    const url = canvasRef.current?.toDataURL('image/png')
    if (!url) return
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], 'synap-progress.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'SYNAP Progress' })
      return
    }
    downloadCard()
  }

  function downloadCard() {
    const url = canvasRef.current?.toDataURL('image/png') || previewUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = 'synap-progress.png'
    a.click()
  }

  return (
    <div className="glass-card p-5 mb-6" style={{ borderColor: 'rgba(16,185,129,0.18)' }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.24)', color: '#10B981' }}>
            <ImageIcon size={18} />
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-white">Progress Share Card</p>
            <p className="font-heading text-xs mt-1" style={{ color: '#64748B' }}>Generate a clean weekly image for sharing or saving.</p>
          </div>
        </div>
        <button
          onClick={generateCard}
          disabled={!hasData || busy}
          title={!hasData ? 'Log at least one body measurement to generate your share card' : undefined}
          className="px-3 py-2 rounded-xl font-heading text-xs font-bold"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', opacity: hasData ? 1 : 0.5, cursor: hasData ? 'pointer' : 'not-allowed' }}
        >
          {busy ? 'Generating...' : 'Generate'}
        </button>
        {!hasData && (
          <p className="font-heading text-[10px] mt-2 text-center" style={{ color: '#475569' }}>
            Log at least one body measurement to generate your share card
          </p>
        )}
      </div>

      {previewUrl && (
        <div>
          <img src={previewUrl} alt="Generated progress share card" className="w-full rounded-2xl border mb-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          <div className="flex gap-2">
            <button onClick={shareCard} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-xs font-bold" style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)', color: '#D88BFF' }}>
              <Share2 size={14} /> Share
            </button>
            <button onClick={downloadCard} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-xs font-bold" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

function buildNote(weight: number | null, waist: number | null, fat: number | null, workouts: number) {
  if (fat != null && fat < 0) return `Body fat is trending down. Keep the plan steady and protect your protein target.`
  if (waist != null && waist < 0) return `Waist is moving in the right direction. This is exactly the kind of signal Ion tracks.`
  if (weight != null && weight < 0) return `Weight is down this week. Stay consistent and keep logging meals for cleaner adjustments.`
  if (workouts > 0) return `${workouts} workouts logged. Momentum is built by showing up, then adjusting intelligently.`
  return 'Progress compounds when you measure, train, eat, and adjust with intention.'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      y += lineHeight
      line = word
    } else {
      line = test
    }
  })
  if (line) ctx.fillText(line, x, y)
}
