'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, PlayCircle, Search } from 'lucide-react'
import { getYouTubeId, getSearchUrl } from '@/lib/exercises'

interface Props {
  exerciseName: string
  onClose: () => void
}

export default function ExerciseVideoModal({ exerciseName, onClose }: Props) {
  const videoId = getYouTubeId(exerciseName)
  const searchUrl = getSearchUrl(exerciseName)
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : searchUrl
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="font-heading font-black text-sm text-white tracking-wider capitalize">{exerciseName}</p>
            <p className="font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>EXERCISE TUTORIAL</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={14} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Thumbnail + open on YouTube */}
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative group"
          style={{ aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}
        >
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={exerciseName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}

          {/* Dark overlay + play button */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-200"
            style={{ background: thumbnailUrl ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.85)' }}
          >
            {/* YouTube-style play button */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-transform duration-150 group-hover:scale-110"
              style={{ background: '#FF0000' }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="font-heading font-bold text-sm text-white tracking-wider">
              Watch on YouTube
            </span>
          </div>
        </a>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-heading text-[10px]" style={{ color: '#334155' }}>Focus on form over weight</p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-heading text-xs transition-all"
            style={{ color: '#475569' }}
          >
            <Search size={10} />
            More tutorials
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Inline trigger button — drop next to any exercise ────────
export function VideoButton({ exerciseName }: { exerciseName: string }) {
  const [open, setOpen] = useState(false)
  const hasVideo = !!getYouTubeId(exerciseName)

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg font-heading text-[10px] font-semibold tracking-wider transition-all flex-shrink-0"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#FCA5A5',
        }}
        title="Watch tutorial"
      >
        <PlayCircle size={11} />
        Watch
      </button>

      {open && <ExerciseVideoModal exerciseName={exerciseName} onClose={() => setOpen(false)} />}
    </>
  )
}
