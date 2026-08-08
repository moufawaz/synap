import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
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
    // PKCE is the secure OAuth flow for native: signInWithOAuth stores a code
    // verifier in AsyncStorage and the provider redirect returns ?code=…, which
    // we hand to exchangeCodeForSession (see signInWithGoogle in AuthProvider).
    flowType: 'pkce',
  }),
}

// ── Background/foreground auto-refresh (React Native gotcha) ─────────────────
// `autoRefreshToken: true` above relies on a JS setInterval ticking every few
// minutes to proactively renew the session before it expires. React Native
// SUSPENDS JS timers while the app is backgrounded — and any native modal that
// takes over the screen counts as backgrounding the JS runtime, including
// ImagePicker's camera/photo-library sheet (used for the InBody scan and
// progress photos). If a user spends real time in the camera (adjusting a
// shot, retaking it) while their token is near expiry, the interval never
// fires, so the token goes stale silently. The moment they return and the
// next apiFetch call reads that stale token, the server correctly rejects it
// with 401 "Unauthorized" — which is exactly the failure a user hit during
// onboarding's InBody step in production.
//
// This is Supabase's own documented fix for React Native: tie
// startAutoRefresh/stopAutoRefresh to AppState so the tick only runs while
// the JS runtime is actually alive, AND fires an immediate refresh check the
// moment the app becomes active again — closing the exact window above.
// See: https://supabase.com/docs/reference/javascript/initializing?example=react-native-options
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
// `addEventListener('change', ...)` only fires on future transitions, not for
// whatever state the app is ALREADY in at registration time (browser's
// `document.visibilityState` hook — which this library falls back to when
// there's no RN AppState wiring — has the same gap, it only fires on actual
// visibility CHANGES too). On a fresh cold start the app is already 'active'
// with no transition to trigger the listener above, so the ticker would
// never start at all without this explicit kick.
if (AppState.currentState === 'active') {
  supabase.auth.startAutoRefresh()
}
