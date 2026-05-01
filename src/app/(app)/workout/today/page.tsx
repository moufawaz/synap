'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, Dumbbell, Trophy, Play, RotateCcw, PlayCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import confetti from 'canvas-confetti'

// Lazy-load YouTube player to avoid SSR issues
const YouTube = dynamic(() => import('react-youtube'), { ssr: false })

export const dynamicConfig = 'force-dynamic'

// YouTube search query → video ID map (curated exercise demos)
const YOUTUBE_IDS: Record<string, string> = {
  'bench press': 'rT7DgCr-3pg',
  'squat': 'ultWZbUMPL8',
  'deadlift': 'op9kVnSso6Q',
  'pull up': 'eGo4IYlbE5g',
  'push up': '_l3ySVKYVJ8',
  'overhead press': 'QAQ64hK4d00',
  'barbell row': 'kBWAon7ItDw',
  'dumbbell curl': 'ykJmrZ5v0Oo',
  'tricep dip': '0326dy_-CzM',
  'lunge': 'QOVaHwm-Q6U',
  'plank': 'ASdvN_XEl_c',
  'hip thrust': 'LM8XfLVEJY0',
  'lat pulldown': 'CAwf7n6Luuc',
  'cable row': 'GZbfZ033f74',
  'leg press': 'IZxyjW7MPJQ',
  'calf raise': 'gwLzBJYoWlQ',
  'face pull': 'rep-qVOkqgk',
  'incline press': 'DbFgADa2PL8',
  'romanian deadlift': 'JCXUYuzwNrM',
  'shoulder press': 'qEwKCR5JCog',
}

function getYouTubeId(exerciseName: string): string | null {
  const name = exerciseName.toLowerCase()
  for (const [key, id] of Object.entries(YOUTUBE_IDS)) {
    if (name.includes(key)) return id
  }
  return null
}

export default function WorkoutTodayPage() {
  const [plan, setPlan] = useState<any>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [videoExercise, setVideoExercise] = useState<number | null>(null)
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const confettiFired = useRef(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!workoutStarted || workoutDone) return
    const interval = setInterval(() => {
      if (startTime) setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [workoutStarted, workoutDone, startTime])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [planRes, profileRes] = await Promise.all([
      supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
    ])

    setPlan(planRes.data?.plan_json || null)
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)
    setLoading(false)
  }

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
  const todayPlan = plan?.days?.find((d: any) => d.day_name === todayName)
  const exercises: any[] = todayPlan?.exercises || []
  const allDone = exercises.length > 0 && exercises.every((_: any, i: number) => completedExercises.has(i))

  function toggleComplete(i: number) {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function startWorkout() {
    setWorkoutStarted(true)
    setStartTime(Date.now())
    setElapsed(0)
    setCompletedExercises(new Set())
  }

  async function finishWorkout() {
    setWorkoutDone(true)

    // 🎉 Confetti
    if (!confettiFired.current) {
      confettiFired.current = true
      const duration = 3000
      const end = Date.now() + duration
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#7C3AED', '#22D3EE', '#A78BFA'] })
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#7C3AED', '#22D3EE', '#10B981'] })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }

    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await fetch('/api/log-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_name: todayName,
        muscle_focus: todayPlan?.muscle_focus || '',
        duration_min: Math.round(elapsed / 60),
        exercises_completed: completedExercises.size,
        exercises_total: exercises.length,
      }),
    })
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!plan) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        <IonAvatar gender={gender} size="lg" />
        <p className="font-heading font-bold text-lg text-white">No plan yet</p>
        <p className="font-heading text-sm" style={{ color: '#64748B' }}>Complete onboarding first.</p>
        <a href="/onboarding" className="btn-primary text-sm w-full flex justify-center">Start with Ion</a>
      </div>
    </div>
  )

  if (workoutDone) return <FinishedScreen elapsed={elapsed} completed={completedExercises.size} total={exercises.length} gender={gender} onReset={() => { setWorkoutDone(false); setWorkoutStarted(false); confettiFired.current = false; setCompletedExercises(new Set()) }} />

  if (!todayPlan) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        <IonAvatar gender={gender} size="lg" />
        <p className="font-heading font-bold text-xl text-white">REST DAY</p>
        <p className="font-heading text-sm" style={{ color: '#64748B' }}>Recovery is when the gains happen. Sleep well, eat well, come back stronger.</p>
        <a href="/workout" className="btn-secondary text-sm">View Full Plan</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#22D3EE', letterSpacing: '0.14em' }}>TODAY · {todayName.toUpperCase()}</p>
        <h1 className="font-heading font-bold text-2xl text-white">{todayPlan.muscle_focus || "Today's Workout"}</h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#64748B' }}>
          <Clock size={11} className="inline mr-1" />{todayPlan.duration_min} min &nbsp;·&nbsp;
          <Dumbbell size={11} className="inline mr-1" />{exercises.length} exercises
        </p>
      </div>

      {/* Timer + start */}
      <div className="glass-card p-5 mb-6 flex items-center justify-between" style={{ borderColor: workoutStarted ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.05)' }}>
        {workoutStarted ? (
          <>
            <div>
              <p className="font-heading font-bold text-3xl" style={{ color: '#22D3EE' }}>{formatTime(elapsed)}</p>
              <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>{completedExercises.size}/{exercises.length} completed</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                {Array.from({ length: exercises.length }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: completedExercises.has(i) ? '#22D3EE' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p className="font-heading text-xs" style={{ color: '#475569' }}>
                {Math.round((completedExercises.size / exercises.length) * 100)}%
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-heading font-bold text-white">Ready to train?</p>
              <p className="font-heading text-sm" style={{ color: '#64748B' }}>Tap Start to begin timer and tracking</p>
            </div>
            <button
              onClick={startWorkout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-sm transition-all"
              style={{ background: '#7C3AED', color: 'white', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
            >
              <Play size={14} fill="white" /> START
            </button>
          </>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-3 mb-6">
        {exercises.map((ex: any, i: number) => {
          const done = completedExercises.has(i)
          const isExpanded = expandedExercise === i
          const isVideoOpen = videoExercise === i
          const ytId = getYouTubeId(ex.name)

          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: done ? 'rgba(16,185,129,0.06)' : '#121220',
                border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              {/* Main row */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => workoutStarted && toggleComplete(i)}
                  disabled={!workoutStarted}
                  className="flex-shrink-0 transition-transform active:scale-90"
                >
                  {done
                    ? <CheckCircle2 size={22} style={{ color: '#10B981' }} />
                    : <Circle size={22} style={{ color: workoutStarted ? '#475569' : '#2D3748' }} />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm text-white">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-heading text-xs" style={{ color: done ? '#10B981' : '#64748B' }}>
                      {ex.sets} × {ex.reps}
                    </span>
                    <span className="font-heading text-xs" style={{ color: '#2D3748' }}>{ex.rest_sec}s rest</span>
                    <span className="font-heading text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>
                      {ex.muscle_group}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {ytId && (
                    <button
                      onClick={() => setVideoExercise(isVideoOpen ? null : i)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: isVideoOpen ? 'rgba(255,0,0,0.15)' : 'rgba(255,255,255,0.05)', color: isVideoOpen ? '#FF4444' : '#475569' }}
                      title="Watch demo"
                    >
                      <PlayCircle size={14} />
                    </button>
                  )}
                  <button onClick={() => setExpandedExercise(isExpanded ? null : i)} className="p-1.5">
                    {isExpanded ? <ChevronUp size={13} style={{ color: '#475569' }} /> : <ChevronDown size={13} style={{ color: '#475569' }} />}
                  </button>
                </div>
              </div>

              {/* YouTube embed */}
              {isVideoOpen && ytId && (
                <div className="px-4 pb-3">
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <YouTube
                      videoId={ytId}
                      opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, modestbranding: 1, rel: 0 } }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Form tips */}
              {isExpanded && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {ex.form_tip && (
                    <div className="flex items-start gap-2 mt-3">
                      <span className="text-xs flex-shrink-0">💡</span>
                      <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{ex.form_tip}</p>
                    </div>
                  )}
                  {ex.weight_guidance && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs flex-shrink-0">⚖️</span>
                      <p className="font-heading text-xs leading-relaxed" style={{ color: '#64748B' }}>{ex.weight_guidance}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Finish button */}
      {workoutStarted && (
        <button
          onClick={finishWorkout}
          disabled={!allDone}
          className="w-full py-4 rounded-2xl font-heading font-bold text-sm tracking-wider transition-all"
          style={{
            background: allDone ? 'linear-gradient(135deg, #7C3AED, #22D3EE)' : 'rgba(255,255,255,0.04)',
            color: allDone ? 'white' : '#2D3748',
            letterSpacing: '0.1em',
            boxShadow: allDone ? '0 0 30px rgba(124,58,237,0.4)' : 'none',
          }}
        >
          {allDone ? '🏆 FINISH WORKOUT' : `${completedExercises.size} / ${exercises.length} COMPLETED`}
        </button>
      )}
    </div>
  )
}

// ── Finished Screen ────────────────────────────────────
function FinishedScreen({ elapsed, completed, total, gender, onReset }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center flex flex-col items-center gap-5" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
        <Trophy size={48} style={{ color: '#10B981' }} />
        <div>
          <p className="font-heading font-bold text-3xl text-white mb-1">WORKOUT DONE!</p>
          <p className="font-heading text-sm" style={{ color: '#64748B' }}>Ion is proud of you 💪</p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#22D3EE' }}>{Math.round(elapsed / 60)}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>MINUTES</p>
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#7C3AED' }}>{completed}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>EXERCISES</p>
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#10B981' }}>{Math.round((completed / total) * 100)}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>%</p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <a href="/chat" className="flex-1 py-2.5 rounded-xl font-heading font-semibold text-sm text-center transition-all" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
            Tell Ion
          </a>
          <button onClick={onReset} className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl font-heading text-sm" style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
            <RotateCcw size={12} /> New session
          </button>
        </div>
      </div>
    </div>
  )
}
