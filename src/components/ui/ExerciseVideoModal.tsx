'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, PlayCircle, AlertCircle, Search } from 'lucide-react'
import { getSearchUrl } from '@/lib/exercises'

function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <iframe
      key={videoId}
      width="100%"
      height="100%"
      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white`}
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

interface ModalProps {
  exerciseName: string
  videoId?: string | null
  onClose: () => void
}

export default function ExerciseVideoModal({ exerciseName, videoId: propVideoId, onClose }: ModalProps) {
  const [videoId, setVideoId] = useState<string | null>(propVideoId ?? null)
  const [loading, setLoading] = useState(!propVideoId)
  const moreVideosUrl = getSearchUrl(exerciseName)

  useEffect(() => {
    if (propVideoId) {
      setVideoId(propVideoId)
      setLoading(false)
      return
    }

    setLoading(true)
    const params = new URLSearchParams({ name: exerciseName })

    fetch(`/api/exercise-video?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setVideoId(d.videoId ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [exerciseName, propVideoId])

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
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="font-heading font-black text-sm text-white tracking-wider capitalize">
              {exerciseName}
            </p>
            <p className="font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>
              EXERCISE TUTORIAL
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            aria-label="Close tutorial"
          >
            <X size={14} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: '#FF0000' }} />
              <span className="font-heading text-xs tracking-wider" style={{ color: '#64748b' }}>
                Finding verified tutorial...
              </span>
            </div>
          )}

          {!loading && videoId && (
            <YouTubeEmbed videoId={videoId} title={exerciseName} />
          )}

          {!loading && !videoId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="flex items-center justify-center rounded-2xl shadow-2xl"
                style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertCircle size={28} style={{ color: '#FCA5A5' }} />
              </div>
              <span className="font-heading font-bold text-sm text-white tracking-wider">
                Tutorial unavailable
              </span>
              <span className="font-heading text-xs text-center px-6" style={{ color: '#64748B' }}>
                Ion could not find a verified playable video for this exercise yet.
              </span>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-heading text-[10px]" style={{ color: '#334155' }}>
            Focus on form over weight
          </p>
          <a
            href={moreVideosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-heading text-[10px] uppercase tracking-widest transition-colors"
            style={{ color: '#64748B' }}
            onClick={e => e.stopPropagation()}
          >
            <Search size={10} />
            More videos
          </a>
        </div>
      </div>
    </div>
  )
}

export function VideoButton({
  exerciseName,
  videoId,
}: {
  exerciseName: string
  videoId?: string | null
}) {
  const [open, setOpen] = useState(false)

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

      {open && (
        <ExerciseVideoModal
          exerciseName={exerciseName}
          videoId={videoId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
