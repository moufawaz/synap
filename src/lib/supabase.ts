import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── Browser client for 'use client' components ────────────
export function createBrowserClient() {
  return createSSRBrowserClient(supabaseUrl, supabaseAnonKey)
}

// ── Singleton for non-component use ──────────────────────
let _client: ReturnType<typeof createSSRBrowserClient> | null = null
export function getSupabase() {
  if (!_client) {
    _client = createSSRBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

// ── Database types ────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          language: 'en' | 'ar'
          ion_gender: 'male' | 'female'
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number
          gender: 'male' | 'female'
          weight_kg: number
          height_cm: number
          goal: string
          goal_target: string | null
          goal_date: string | null
          activity_level: string
          training_time: string
          training_days: number
          session_duration: number
          gym_access: boolean
          equipment: string[]
          work_schedule: string
          wake_time: string
          sleep_time: string
          lunch_break_time: string | null
          stress_level: string
          sleep_quality: string
          injuries: string | null
          medical_conditions: string | null
          supplements: string[]
          dietary_preference: string[]
          allergies: string | null
          foods_loved: string
          foods_hated: string
          meals_per_day: number
          cooking_ability: string
          food_budget: string
          training_experience: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      measurements: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number | null
          neck_cm: number | null
          shoulders_cm: number | null
          chest_cm: number | null
          bicep_left_cm: number | null
          bicep_right_cm: number | null
          forearm_left_cm: number | null
          forearm_right_cm: number | null
          waist_cm: number | null
          hips_cm: number | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          wrist_cm: number | null
          ankle_cm: number | null
          body_fat_pct: number | null
          photo_url: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['measurements']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['measurements']['Insert']>
      }
    }
  }
}
