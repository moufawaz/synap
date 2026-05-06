'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Clock, Dumbbell, Trophy, Play, RotateCcw, Pause,
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { VideoButton } from '@/components/ui/ExerciseVideoModal'

export const dynamic = 'force-dynamic'

// ── Session persistence ───────────────────────────────────
const SESSION_KEY = 'synap_workout_session'

interface WorkoutSession {
  date: string
  dayName: string
  totalMs: number
  resumeAt: number | null
  isPaused: boolean
  completedExercises: number[]
}

function saveSession(data: WorkoutSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch {}
}

function loadSession(dayName: string): WorkoutSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data: WorkoutSession = JSON.parse(raw)
    if (data.date !== new Date().toDateString() || data.dayName !== dayName) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch { return null }
}

// ── Main component ────────────────────────────────────────
export default function WorkoutTodayPage() {
  const [plan, setPlan] = useState<any>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [totalMs, setTotalMs] = useState(0)
  const [resumeAt, setResumeAt] = useState<number | null>(null)
  const [displaySecs, setDisplaySecs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sessionRestored, setSessionRestored] = useState(false)
  const confettiFired = useRef(false)

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

  useEffect(() => { loadData() }, [])

  // Timer tick
  useEffect(() => {
    if (!workoutStarted || workoutDone || isPaused || !resumeAt) return
    const interval = setInterval(() => {
      setDisplaySecs(Math.floor((totalMs + (Date.now() - resumeAt)) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [workoutStarted, workoutDone, isPaused, resumeAt, totalMs])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [planRes, profileRes] = await Promise.all([
      supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
    ])

    const planData = planRes.data?.plan_json || null
    setPlan(planData)
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)

    // Restore paused session if same day
    if (planData) {
      const saved = loadSession(todayName)
      if (saved) {
        setCompletedExercises(new Set(saved.completedExercises))
        const ms = saved.isPaused
          ? saved.totalMs
          : saved.totalMs + (saved.resumeAt ? Date.now() - saved.resumeAt : 0)
        setTotalMs(saved.totalMs)
        setDisplaySecs(Math.floor(ms / 1000))
        setWorkoutStarted(true)
        setIsPaused(true) // always resume as paused — user taps Resume
        setSessionRestored(true)
      }
    }
    setLoading(false)
  }

  const todayPlan = plan?.days?.find((d: any) => d.day_name === todayName)
  const exercises: any[] = todayPlan?.exercises || []
  const allDone = exercises.length > 0 && exercises.every((_: any, i: number) => completedExercises.has(i))

  function buildSession(completed: Set<number>, ms: number, rAt: number | null, paused: boolean): WorkoutSession {
    return { date: new Date().toDateString(), dayName: todayName, totalMs: ms, resumeAt: rAt, isPaused: paused, completedExercises: Array.from(completed) }
  }

  function toggleComplete(i: number) {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      const ms = resumeAt ? totalMs + (Date.now() - resumeAt) : totalMs
      saveSession(buildSession(next, ms, resumeAt, isPaused))
      return next
    })
  }

  function startWorkout() {
    const now = Date.now()
    setWorkoutStarted(true)
    setIsPaused(false)
    setResumeAt(now)
    setTotalMs(0)
    setDisplaySecs(0)
    setCompletedExercises(new Set())
    setSessionRestored(false)
    saveSession({ date: new Date().toDateString(), dayName: todayName, totalMs: 0, resumeAt: now, isPaused: false, completedExercises: [] })
  }

  function pauseWorkout() {
    const acc = totalMs + (resumeAt ? Date.now() - resumeAt : 0)
    setTotalMs(acc)
    setResumeAt(null)
    setIsPaused(true)
    setDisplaySecs(Math.floor(acc / 1000))
    saveSession(buildSession(completedExercises, acc, null, true))
  }

  function resumeWorkout() {
    const now = Date.now()
    setResumeAt(now)
    setIsPaused(false)
    saveSession(buildSession(completedExercises, totalMs, now, false))
  }

  async function finishWorkout() {
    const finalSecs = resumeAt ? Math.floor((totalMs + (Date.now() - resumeAt)) / 1000) : displaySecs
    setDisplaySecs(finalSecs)
    setWorkoutDone(true)
    localStorage.removeItem(SESSION_KEY)

    if (!confettiFired.current) {
      confettiFired.current = true
      const end = Date.now() + 3000
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#BB5CF6', '#D88BFF', '#7B2FFF'] })
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#BB5CF6', '#108981', '#D88BFF'] })
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
        duration_min: Math.round(finalSecs / 60),
        exercises_completed: completedExercises.size,
        exercises_total: exercises.length,
      }),
    })
  }

  function fmt(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
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

  if (workoutDone) return (
    <FinishedScreen
      elapsed={displaySecs}
      completed={completedExercises.size}
      total={exercises.length}
      gender={gender}
      onReset={() => {
        setWorkoutDone(false); setWorkoutStarted(false)
        confettiFired.current = false; setCompletedExercises(new Set())
        setTotalMs(0); setDisplaySecs(0)
      }}
    />
  )

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
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>TODAY · {todayName.toUpperCase()}</p>
        <h1 className="font-heading font-bold text-2xl text-white">{todayPlan.muscle_focus || "Today's Workout"}</h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#64748B' }}>
          <Clock size={11} className="inline mr-1" />{todayPlan.duration_min} min &nbsp;·&nbsp;
          <Dumbbell size={11} className="inline mr-1" />{exercises.length} exercises
        </p>
      </div>

      {/* Restored session banner */}
      {sessionRestored && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(187,92,246,0.1)', border: '1px solid rgba(187,92,246,0.25)' }}>
          <span className="text-sm">⏸</span>
          <p className="font-heading text-sm flex-1" style={{ color: '#D88BFF' }}>Previous session restored — tap Resume to continue</p>
        </div>
      )}

      {/* Timer card */}
      <div
        className="glass-card p-5 mb-6 flex items-center justify-between"
        style={{ borderColor: workoutStarted ? (isPaused ? 'rgba(245,158,11,0.25)' : 'rgba(187,92,246,0.2)') : 'rgba(255,255,255,0.05)' }}
      >
        {workoutStarted ? (
          <>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="font-heading font-bold text-3xl" style={{ color: isPaused ? '#F59E0B' : '#BB5CF6' }}>
                  {fmt(displaySecs)}
                </p>
                {isPaused && (
                  <span className="font-heading text-xs font-bold tracking-widest" style={{ color: '#F59E0B' }}>PAUSED</span>
                )}
              </div>
              <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>
                {completedExercises.size}/{exercises.length} completed
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Progress dots */}
              <div className="flex gap-1.5 flex-wrap justify-end max-w-[140px]">
                {Array.from({ length: Math.min(exercises.length, 14) }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: completedExercises.has(i) ? '#BB5CF6' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>

              {/* Pause/Resume button */}
              <button
                onClick={isPaused ? resumeWorkout : pauseWorkout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-heading font-bold text-xs transition-all"
                style={isPaused
                  ? { background: '#BB5CF6', color: '#080808' }
                  : { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                }
              >
                {isPaused
                  ? <><Play size={10} fill="currentColor" /> RESUME</>
                  : <><Pause size={10} /> PAUSE</>
                }
              </button>
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
              style={{ background: '#BB5CF6', color: 'white', boxShadow: '0 0 20px rgba(187,92,246,0.4)' }}
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

          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: done ? 'rgba(16,185,129,0.06)' : '#0E0E0E',
                border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              {/* Main row */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => workoutStarted && !isPaused && toggleComplete(i)}
                  disabled={!workoutStarted || isPaused}
                  className="flex-shrink-0 transition-transform active:scale-90"
                >
                  {done
                    ? <CheckCircle2 size={22} style={{ color: '#10B981' }} />
                    : <Circle size={22} style={{ color: (workoutStarted && !isPaused) ? '#475569' : '#2D3748' }} />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm text-white">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-heading text-xs" style={{ color: done ? '#10B981' : '#64748B' }}>
                      {ex.sets} × {ex.reps}
                    </span>
                    {ex.rest_sec && (
                      <span className="font-heading text-xs" style={{ color: '#2D3748' }}>{ex.rest_sec}s rest</span>
                    )}
                    {ex.muscle_group && (
                      <span className="font-heading text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.1)', color: '#D88BFF' }}>
                        {ex.muscle_group}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <VideoButton exerciseName={ex.name} videoId={ex.video_id} />

                  <button onClick={() => setExpandedExercise(isExpanded ? null : i)} className="p-1.5">
                    {isExpanded
                      ? <ChevronUp size={14} style={{ color: '#475569' }} />
                      : <ChevronDown size={14} style={{ color: '#475569' }} />
                    }
                  </button>
                </div>
              </div>

              {/* Form tips + weight guidance */}
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
          disabled={!allDone || isPaused}
          className="w-full py-4 rounded-2xl font-heading font-bold text-sm tracking-wider transition-all mb-6"
          style={{
            background: (allDone && !isPaused) ? 'linear-gradient(135deg, #BB5CF6, #BB5CF6)' : 'rgba(255,255,255,0.04)',
            color: (allDone && !isPaused) ? 'white' : '#2D3748',
            letterSpacing: '0.1em',
            boxShadow: (allDone && !isPaused) ? '0 0 30px rgba(187,92,246,0.4)' : 'none',
          }}
        >
          {isPaused ? 'RESUME TO FINISH' : allDone ? '🏆 FINISH WORKOUT' : `${completedExercises.size} / ${exercises.length} COMPLETED`}
        </button>
      )}
    </div>
  )
}

// ── Finished Screen ────────────────────────────────────────
function FinishedScreen({ elapsed, completed, total, gender, onReset }: any) {
  const mins = Math.round(elapsed / 60)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

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
            <p className="font-heading font-bold text-3xl" style={{ color: '#BB5CF6' }}>{mins}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>MINUTES</p>
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#BB5CF6' }}>{completed}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>EXERCISES</p>
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#10B981' }}>{pct}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>%</p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <a href="/chat" className="flex-1 py-2.5 rounded-xl font-heading font-semibold text-sm text-center transition-all" style={{ background: 'rgba(187,92,246,0.15)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.2)' }}>
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
