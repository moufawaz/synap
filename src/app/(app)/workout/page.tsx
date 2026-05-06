'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import { Dumbbell, CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, RotateCcw, Trophy } from 'lucide-react'
import { VideoButton } from '@/components/ui/ExerciseVideoModal'

export const dynamic = 'force-dynamic'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function WorkoutPage() {
  const [plan, setPlan] = useState<any>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()])
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

    const [planRes, profileRes, logsRes] = await Promise.all([
      supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
      supabase.from('workout_log').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10),
    ])

    setPlan(planRes.data?.plan_json || null)
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)
    setLogs(logsRes.data || [])
    setLoading(false)
  }

  const todayPlan = plan?.days?.find((d: any) => d.day_name === selectedDay)
  const isRestDay = !todayPlan
  const exercises = todayPlan?.exercises || []
  const allDone = exercises.length > 0 && exercises.every((_: any, i: number) => completedExercises.has(`${selectedDay}-${i}`))

  function toggleExercise(key: string) {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleExpand(key: string) {
    setExpandedExercises(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
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
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await fetch('/api/log-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_name: selectedDay,
        muscle_focus: todayPlan?.muscle_focus || '',
        duration_min: Math.round(elapsed / 60),
        exercises_completed: completedExercises.size,
        exercises_total: exercises.length,
      }),
    })
    loadData()
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) return <LoadingState />

  if (!plan) return <NoPlanState gender={gender} />

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#108981', letterSpacing: '0.14em' }}>WORKOUT PLAN</p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
          {plan.name}
        </h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#475569' }}>
          {plan.schedule} • {plan.split_type?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {DAYS.map(day => {
          const hasWorkout = plan?.days?.some((d: any) => d.day_name === day)
          const isToday = day === DAYS[new Date().getDay()]
          const isSelected = day === selectedDay
          return (
            <button
              key={day}
              onClick={() => { setSelectedDay(day); setWorkoutStarted(false); setWorkoutDone(false); setCompletedExercises(new Set()) }}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
              style={{
                background: isSelected ? 'rgba(16,137,129,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? 'rgba(16,137,129,0.4)' : isToday ? 'rgba(187,92,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                minWidth: '60px',
              }}
            >
              <span className="font-heading text-[10px] font-bold tracking-wider" style={{ color: isSelected ? '#108981' : '#475569' }}>
                {day.slice(0, 3).toUpperCase()}
              </span>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: hasWorkout ? (isSelected ? '#108981' : '#475569') : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {isRestDay ? (
        <RestDayCard gender={gender} />
      ) : workoutDone ? (
        <WorkoutDoneCard
          elapsed={elapsed}
          completed={completedExercises.size}
          total={exercises.length}
          gender={gender}
          onReset={() => { setWorkoutDone(false); setWorkoutStarted(false); setCompletedExercises(new Set()) }}
        />
      ) : (
        <div>
          {/* Workout Header */}
          <div className="glass-card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
                {todayPlan.muscle_focus}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-heading text-xs" style={{ color: '#475569' }}>
                  <Clock size={11} className="inline mr-1" />{todayPlan.duration_min} min
                </span>
                <span className="font-heading text-xs" style={{ color: '#475569' }}>
                  <Dumbbell size={11} className="inline mr-1" />{exercises.length} exercises
                </span>
              </div>
            </div>
            {workoutStarted ? (
              <div className="text-right">
                <p className="font-heading font-black text-xl" style={{ color: '#108981' }}>{formatTime(elapsed)}</p>
                <p className="font-heading text-xs" style={{ color: '#475569' }}>{completedExercises.size}/{exercises.length} done</p>
              </div>
            ) : (
              <button
                onClick={startWorkout}
                className="px-4 py-2 rounded-xl font-heading font-black text-xs tracking-wider transition-all"
                style={{ background: '#108981', color: 'white', letterSpacing: '0.08em', boxShadow: '0 0 16px rgba(16,137,129,0.35)' }}
              >
                START
              </button>
            )}
          </div>

          {/* Exercise List */}
          <div className="flex flex-col gap-3">
            {exercises.map((ex: any, i: number) => {
              const key = `${selectedDay}-${i}`
              const done = completedExercises.has(key)
              const expanded = expandedExercises.has(key)
              return (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: done ? 'rgba(16,137,129,0.08)' : '#111111',
                    border: `1px solid ${done ? 'rgba(16,137,129,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => workoutStarted && toggleExercise(key)}
                      disabled={!workoutStarted}
                      className="flex-shrink-0 transition-transform active:scale-90"
                    >
                      {done
                        ? <CheckCircle2 size={22} style={{ color: '#108981' }} />
                        : <Circle size={22} style={{ color: workoutStarted ? '#475569' : '#2D3748' }} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.04em' }}>
                        {ex.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-heading text-xs" style={{ color: done ? '#108981' : '#475569' }}>
                          {ex.sets} sets × {ex.reps}
                        </span>
                        <span className="font-heading text-xs" style={{ color: '#2D3748' }}>
                          {ex.rest_sec}s rest
                        </span>
                        <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.08)', color: '#BB5CF6' }}>
                          {ex.muscle_group}
                        </span>
                      </div>
                    </div>
                    <VideoButton exerciseName={ex.name} />
                    <button onClick={() => toggleExpand(key)} className="flex-shrink-0 p-1">
                      {expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
                    </button>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 flex flex-col gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {ex.form_tip && (
                        <div className="flex items-start gap-2 mt-3">
                          <span className="text-xs">💡</span>
                          <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{ex.form_tip}</p>
                        </div>
                      )}
                      {ex.weight_guidance && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs">⚖️</span>
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
              className="w-full mt-6 py-4 rounded-2xl font-heading font-black text-sm tracking-wider transition-all"
              style={{
                background: allDone ? '#108981' : 'rgba(255,255,255,0.04)',
                color: allDone ? 'white' : '#2D3748',
                letterSpacing: '0.1em',
                boxShadow: allDone ? '0 0 25px rgba(16,137,129,0.4)' : 'none',
              }}
            >
              {allDone ? '✓ FINISH WORKOUT' : `${completedExercises.size} / ${exercises.length} COMPLETED`}
            </button>
          )}
        </div>
      )}

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="mt-8">
          <p className="font-heading font-black text-xs tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.14em' }}>
            RECENT WORKOUTS
          </p>
          <div className="flex flex-col gap-2">
            {logs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-4 rounded-xl" style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="font-heading font-bold text-xs text-white">{log.day_name} — {log.muscle_focus}</p>
                  <p className="font-heading text-[10px]" style={{ color: '#475569' }}>
                    {new Date(log.logged_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-xs" style={{ color: '#108981' }}>{log.duration_min} min</p>
                  <p className="font-heading text-[10px]" style={{ color: '#475569' }}>{log.exercises_completed}/{log.exercises_total}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RestDayCard({ gender }: { gender: 'male' | 'female' }) {
  return (
    <div className="glass-card p-8 flex flex-col items-center text-center gap-4">
      <IonAvatar gender={gender} size="lg" />
      <div>
        <p className="font-heading font-black text-xl text-white tracking-wider mb-2" style={{ letterSpacing: '0.08em' }}>REST DAY</p>
        <p className="font-heading text-sm" style={{ color: '#64748B' }}>
          Recovery is when the gains actually happen. Sleep well, eat well, and come back stronger tomorrow.
        </p>
      </div>
    </div>
  )
}

function WorkoutDoneCard({ elapsed, completed, total, gender, onReset }: any) {
  return (
    <div className="glass-card p-8 flex flex-col items-center text-center gap-5" style={{ border: '1px solid rgba(16,137,129,0.3)' }}>
      <Trophy size={40} style={{ color: '#108981' }} />
      <div>
        <p className="font-heading font-black text-2xl text-white tracking-wider mb-1" style={{ letterSpacing: '0.08em' }}>WORKOUT DONE!</p>
        <p className="font-heading text-sm" style={{ color: '#64748B' }}>
          {Math.round(elapsed / 60)} minutes • {completed}/{total} exercises
        </p>
      </div>
      <div className="flex gap-4">
        <div className="text-center">
          <p className="font-heading font-black text-2xl" style={{ color: '#108981' }}>{Math.round(elapsed / 60)}</p>
          <p className="font-heading text-xs" style={{ color: '#475569' }}>MINUTES</p>
        </div>
        <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="text-center">
          <p className="font-heading font-black text-2xl" style={{ color: '#BB5CF6' }}>{completed}</p>
          <p className="font-heading text-xs" style={{ color: '#475569' }}>EXERCISES</p>
        </div>
      </div>
      <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-semibold" style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
        <RotateCcw size={12} /> Log another
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
        <p className="font-heading text-sm" style={{ color: '#475569' }}>Loading your plan...</p>
      </div>
    </div>
  )
}

function NoPlanState({ gender }: { gender: 'male' | 'female' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center">
        <IonAvatar gender={gender} size="lg" />
        <p className="font-heading font-black text-lg text-white mt-4 mb-2 tracking-wider">No plan yet</p>
        <p className="font-heading text-sm mb-4" style={{ color: '#475569' }}>Complete onboarding so Ion can build your workout plan.</p>
        <a href="/onboarding" className="btn-primary text-sm w-full flex justify-center">Complete Onboarding</a>
      </div>
    </div>
  )
}
