'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Clock, Dumbbell, Trophy, Play, RotateCcw,
  PlayCircle, Pause, ExternalLink,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import confetti from 'canvas-confetti'

const YouTube = dynamic(() => import('react-youtube'), { ssr: false })

export const dynamic = 'force-dynamic'

// ── Curated exercise → YouTube video ID map ──────────────
const YOUTUBE_IDS: Record<string, string> = {
  // Chest
  'bench press': 'rT7DgCr-3pg',
  'chest press': 'rT7DgCr-3pg',
  'incline bench press': 'DbFgADa2PL8',
  'incline press': 'DbFgADa2PL8',
  'decline bench press': 'LfyQTdG13eU',
  'decline press': 'LfyQTdG13eU',
  'push up': '_l3ySVKYVJ8',
  'pushup': '_l3ySVKYVJ8',
  'chest fly': 'eozdVDA78K0',
  'dumbbell fly': 'eozdVDA78K0',
  'cable fly': 'Iwe6AmxVf7o',
  'pec deck': 'Iwe6AmxVf7o',
  'chest dip': '2z8JmcrW-As',
  // Back
  'pull up': 'eGo4IYlbE5g',
  'pullup': 'eGo4IYlbE5g',
  'chin up': 'eGo4IYlbE5g',
  'deadlift': 'op9kVnSso6Q',
  'romanian deadlift': 'JCXUYuzwNrM',
  'rdl': 'JCXUYuzwNrM',
  'stiff leg deadlift': 'JCXUYuzwNrM',
  'barbell row': 'kBWAon7ItDw',
  'bent over row': 'kBWAon7ItDw',
  'bent-over row': 'kBWAon7ItDw',
  'dumbbell row': 'pYcpY20QaE8',
  'one arm row': 'pYcpY20QaE8',
  'lat pulldown': 'CAwf7n6Luuc',
  'cable row': 'GZbfZ033f74',
  'seated row': 'GZbfZ033f74',
  't-bar row': 'KDEl3MrezQE',
  'face pull': 'rep-qVOkqgk',
  'hyperextension': 'ph3pMpfD6Mk',
  'back extension': 'ph3pMpfD6Mk',
  // Shoulders
  'overhead press': 'QAQ64hK4d00',
  'shoulder press': 'qEwKCR5JCog',
  'military press': 'QAQ64hK4d00',
  'ohp': 'QAQ64hK4d00',
  'lateral raise': '3VcKaXpzqRo',
  'side lateral': '3VcKaXpzqRo',
  'side raise': '3VcKaXpzqRo',
  'front raise': 'gVDqkSEJnk4',
  'arnold press': '6Z15_WdXmVw',
  'upright row': 'VcGxJVQm1mU',
  'shrug': 'TE8JILCS4i0',
  'rear delt fly': 'EA7u4Q_8HQ0',
  'rear delt raise': 'EA7u4Q_8HQ0',
  'cable lateral': '3VcKaXpzqRo',
  // Biceps
  'dumbbell curl': 'ykJmrZ5v0Oo',
  'barbell curl': 'kwG2ipFRgfo',
  'bicep curl': 'kwG2ipFRgfo',
  'biceps curl': 'kwG2ipFRgfo',
  'hammer curl': 'zC3nLlEvin4',
  'preacher curl': 'fIWP-FRFNU0',
  'concentration curl': '0AUJ7oSVS-s',
  'incline curl': 'soxrZlIl35U',
  'cable curl': 'NFzTWp2qpiE',
  'ez bar curl': 'kwG2ipFRgfo',
  // Triceps
  'tricep dip': '0326dy_-CzM',
  'dip': '0326dy_-CzM',
  'tricep pushdown': 'vB5OHsJ3EME',
  'triceps pushdown': 'vB5OHsJ3EME',
  'cable pushdown': 'vB5OHsJ3EME',
  'pushdown': 'vB5OHsJ3EME',
  'skull crusher': 'd_KpSHiZOl0',
  'lying tricep extension': 'd_KpSHiZOl0',
  'overhead tricep extension': 'YbX7Wd8jQ-Q',
  'tricep extension': 'YbX7Wd8jQ-Q',
  'close grip bench': 'nEF0bv2FW7s',
  'diamond push': 'J0DnG1_S92I',
  'tricep kickback': '6SS6K3lAwZ8',
  'rope pushdown': 'vB5OHsJ3EME',
  // Legs
  'squat': 'ultWZbUMPL8',
  'back squat': 'ultWZbUMPL8',
  'front squat': 'uYumuL_G_V0',
  'goblet squat': 'MxsFDhcyFyE',
  'sumo squat': 'MxsFDhcyFyE',
  'leg press': 'IZxyjW7MPJQ',
  'lunge': 'QOVaHwm-Q6U',
  'walking lunge': 'L8fvypPrzzs',
  'reverse lunge': 'xrjCHIKdLfA',
  'bulgarian split squat': 'HRam-4iqsfw',
  'split squat': 'HRam-4iqsfw',
  'leg extension': 'ljO4jkwv8AA',
  'leg curl': 'Orxowest56U',
  'hamstring curl': 'Orxowest56U',
  'lying leg curl': 'Orxowest56U',
  'calf raise': 'gwLzBJYoWlQ',
  'standing calf raise': 'gwLzBJYoWlQ',
  'seated calf raise': 'gwLzBJYoWlQ',
  'hip thrust': 'LM8XfLVEJY0',
  'glute bridge': 'wPM8icPu6H8',
  'sumo deadlift': 'ql_4M3G0Flg',
  'hack squat': 'bD9jT5k2Q2s',
  'good morning': 'M_EjpB_hDWA',
  'sissy squat': 'ZbBYdwH_GBo',
  'step up': 'Vu2fON1dPyYI',
  'box squat': 'ultWZbUMPL8',
  // Core
  'plank': 'ASdvN_XEl_c',
  'crunch': 'Xyd_fa5zoEU',
  'sit up': 'iFpIoSGTCiU',
  'situp': 'iFpIoSGTCiU',
  'ab rollout': 'jbd4L-iVRAY',
  'ab wheel': 'jbd4L-iVRAY',
  'russian twist': '_oEJYT13RoU',
  'hanging leg raise': 'Pr1ieGZ5atk',
  'leg raise': 'Pr1ieGZ5atk',
  'cable crunch': 'taI4XduLpTk',
  'mountain climber': 'nmwgirgXLYM',
  'bicycle crunch': '9FGilxCbdz8',
  'dead bug': 'tIlbMpHMULo',
  'wood chop': 'WrBh-1bG2M4',
  'pallof press': 'j0Y0RaK63sE',
  // Cardio/compound
  'burpee': 'dZgVxmf6jkA',
  'jumping jack': 'c4DAnQ6DtF8',
  'box jump': 'hxldG9CXBas',
  'kettlebell swing': 'YSxHifyI6s8',
  'battle rope': '6tHPs0TGjvA',
  'jump rope': 'FJmRQ5iTXKE',
  'high knee': 'pMDJFtEFRcE',
  'jump squat': 'U4s4mEQ5VIU',
}

function getYouTubeId(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [key, id] of Object.entries(YOUTUBE_IDS)) {
    if (lower.includes(key)) return id
  }
  return null
}

function getSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise tutorial form')}`
}

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
  const [videoExercise, setVideoExercise] = useState<number | null>(null)
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
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#22D3EE', letterSpacing: '0.14em' }}>TODAY · {todayName.toUpperCase()}</p>
        <h1 className="font-heading font-bold text-2xl text-white">{todayPlan.muscle_focus || "Today's Workout"}</h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#64748B' }}>
          <Clock size={11} className="inline mr-1" />{todayPlan.duration_min} min &nbsp;·&nbsp;
          <Dumbbell size={11} className="inline mr-1" />{exercises.length} exercises
        </p>
      </div>

      {/* Restored session banner */}
      {sessionRestored && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <span className="text-sm">⏸</span>
          <p className="font-heading text-sm flex-1" style={{ color: '#A78BFA' }}>Previous session restored — tap Resume to continue</p>
        </div>
      )}

      {/* Timer card */}
      <div
        className="glass-card p-5 mb-6 flex items-center justify-between"
        style={{ borderColor: workoutStarted ? (isPaused ? 'rgba(245,158,11,0.25)' : 'rgba(34,211,238,0.2)') : 'rgba(255,255,255,0.05)' }}
      >
        {workoutStarted ? (
          <>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="font-heading font-bold text-3xl" style={{ color: isPaused ? '#F59E0B' : '#22D3EE' }}>
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
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: completedExercises.has(i) ? '#22D3EE' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>

              {/* Pause/Resume button */}
              <button
                onClick={isPaused ? resumeWorkout : pauseWorkout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-heading font-bold text-xs transition-all"
                style={isPaused
                  ? { background: '#22D3EE', color: '#080810' }
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
          const searchUrl = getSearchUrl(ex.name)

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
                      <span className="font-heading text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>
                        {ex.muscle_group}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Video: embed if known ID, else open YouTube search */}
                  {ytId ? (
                    <button
                      onClick={() => setVideoExercise(isVideoOpen ? null : i)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: isVideoOpen ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', color: isVideoOpen ? '#FF4444' : '#475569' }}
                      title="Watch demo"
                    >
                      <PlayCircle size={15} />
                    </button>
                  ) : (
                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#475569' }}
                      title="Watch tutorial on YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <button onClick={() => setExpandedExercise(isExpanded ? null : i)} className="p-1.5">
                    {isExpanded
                      ? <ChevronUp size={14} style={{ color: '#475569' }} />
                      : <ChevronDown size={14} style={{ color: '#475569' }} />
                    }
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
                  {!ytId && (
                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-1 text-xs font-heading font-semibold transition-colors"
                      style={{ color: '#64748B' }}
                    >
                      <ExternalLink size={11} /> Watch tutorial on YouTube
                    </a>
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
            background: (allDone && !isPaused) ? 'linear-gradient(135deg, #7C3AED, #22D3EE)' : 'rgba(255,255,255,0.04)',
            color: (allDone && !isPaused) ? 'white' : '#2D3748',
            letterSpacing: '0.1em',
            boxShadow: (allDone && !isPaused) ? '0 0 30px rgba(124,58,237,0.4)' : 'none',
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
            <p className="font-heading font-bold text-3xl" style={{ color: '#22D3EE' }}>{mins}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>MINUTES</p>
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#7C3AED' }}>{completed}</p>
            <p className="font-heading text-xs" style={{ color: '#475569' }}>EXERCISES</p>
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-3xl" style={{ color: '#10B981' }}>{pct}</p>
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
