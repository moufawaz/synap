import type { Session, User } from '@supabase/auth-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'

// Dismiss the auth browser tab automatically when the OAuth redirect fires.
WebBrowser.maybeCompleteAuthSession()

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app',
      },
    })
    if (error) throw error
  }

  // Google — browser-based OAuth (reuses the same Google provider the web app
  // uses). signInWithOAuth builds the provider URL with skipBrowserRedirect so
  // we can open it in an in-app auth session; the redirect returns to
  // synap://auth/callback with a ?code= we exchange for a session (PKCE).
  async function signInWithGoogle() {
    const redirectTo = Linking.createURL('auth/callback')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error) throw error
    if (!data?.url) throw new Error('Could not start Google sign-in.')

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type === 'cancel' || result.type === 'dismiss') return // user backed out
    if (result.type !== 'success' || !result.url) throw new Error('Google sign-in was interrupted.')

    const params = Linking.parse(result.url).queryParams || {}
    const code = typeof params.code === 'string' ? params.code : null
    const oauthErr = typeof params.error_description === 'string' ? params.error_description : null
    if (oauthErr) throw new Error(oauthErr)
    if (!code) throw new Error('Google sign-in did not return an authorization code.')

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw exchangeError
  }

  // Apple — native Sign in with Apple (iOS only). The identity token is verified
  // by Supabase against a hashed nonce, then exchanged for a Supabase session.
  async function signInWithApple() {
    if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is only available on iOS.')

    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
    if (!credential.identityToken) throw new Error('Apple did not return an identity token.')

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    })
    if (error) throw error
  }

  async function resetPassword(email: string) {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.synapfit.app'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/reset-password`,
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
    signOut,
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
