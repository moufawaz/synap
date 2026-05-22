import AsyncStorage from '@react-native-async-storage/async-storage'
import { GoTrueClient } from '@supabase/auth-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SYNAP] Missing Expo Supabase env vars. Copy .env.example to .env.local.')
}

const resolvedSupabaseUrl = supabaseUrl || 'https://missing.supabase.co'
const resolvedAnonKey = supabaseAnonKey || 'missing-anon-key'

export const supabase = {
  auth: new GoTrueClient({
    url: `${resolvedSupabaseUrl.replace(/\/$/, '')}/auth/v1`,
    headers: {
      apikey: resolvedAnonKey,
      Authorization: `Bearer ${resolvedAnonKey}`,
      'X-Client-Info': 'synap-mobile-auth',
    },
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }),
}
