'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, PlayCircle } from 'lucide-react'
import { getYouTubeId, getSearchUrl } from '@/lib/exercises'

interface Props {
  exerciseName: string
  onClose: () => void
}

export default function ExerciseVideoModal({ exerciseName, onClose }: Props) {
  const videoId = getYouTubeId(exerciseName)
  const searchUrl = getSearchUrl(exerciseName)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
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
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={14} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Video */}
        {videoId ? (
          <div className="w-full" style={{ aspectRatio: '16/9', background: '#000' }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
            <PlayCircle size={40} style={{ color: '#334155' }} />
            <div>
              <p className="font-heading font-semibold text-sm text-white mb-1">No embedded video found</p>
              <p className="font-heading text-xs" style={{ color: '#475569' }}>
                Search YouTube for a tutorial on this exercise
              </p>
            </div>
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider transition-all"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
            >
              <ExternalLink size={12} />
              Search on YouTube
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-heading text-[10px]" style={{ color: '#334155' }}>Focus on form over weight</p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-heading text-xs transition-all"
            style={{ color: '#475569' }}
          >
            <ExternalLink size={10} />
            More videos
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Inline trigger button — drop this next to any exercise ───
export function VideoButton({ exerciseName }: { exerciseName: string }) {
  const [open, setOpen] = useState(false)
  const hasVideo = !!getYouTubeId(exerciseName)

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg font-heading text-[10px] font-semibold tracking-wider transition-all flex-shrink-0"
        style={{
          background: hasVideo ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasVideo ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)'}`,
          color: hasVideo ? '#FCA5A5' : '#475569',
        }}
        title={hasVideo ? 'Watch tutorial' : 'Search on YouTube'}
      >
        <PlayCircle size={11} />
        {hasVideo ? 'Watch' : 'Search'}
      </button>

      {open && <ExerciseVideoModal exerciseName={exerciseName} onClose={() => setOpen(false)} />}
    </>
  )
}
