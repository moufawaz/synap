import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { router } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/auth/AuthProvider'
import { getProfile } from '@/features/profile'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

/**
 * Google + Sign in with Apple buttons, shared by the login and signup screens.
 * - Google: browser-based Supabase OAuth (same provider as the web app).
 * - Apple: native Sign in with Apple, shown only on iOS where it's available.
 *   Apple's guideline 4.8 requires offering Sign in with Apple whenever another
 *   third-party sign-in (Google) is offered.
 */
export function SocialAuthButtons() {
  const { signInWithGoogle, signInWithApple } = useAuth()
  const { isRtl } = useLanguage()
  const { color, mode } = useTheme()
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null)

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {})
    }
  }, [])

  // After a successful social sign-in, send brand-new accounts (no profile yet)
  // through onboarding — otherwise they land on a dataless dashboard where every
  // API call fails. Returning users (profile exists) go straight to the app.
  async function routeAfterAuth() {
    try {
      const { profile } = await getProfile()
      const onboarded = !!profile && Object.keys(profile).length > 0
      router.replace(onboarded ? '/(tabs)' : '/onboarding')
    } catch {
      router.replace('/onboarding')
    }
  }

  async function handleGoogle() {
    setBusy('google')
    try {
      await signInWithGoogle()
      await routeAfterAuth()
    } catch (e: any) {
      Alert.alert('SYNAP', e?.message || 'Google sign-in failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleApple() {
    setBusy('apple')
    try {
      await signInWithApple()
      await routeAfterAuth()
    } catch (e: any) {
      // User tapping Cancel on the Apple sheet is not an error.
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') {
        setBusy(null)
        return
      }
      Alert.alert('SYNAP', e?.message || 'Apple sign-in failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: color.border }]} />
        <Text style={[styles.or, { color: color.dim }]}>{isRtl ? 'أو' : 'or'}</Text>
        <View style={[styles.line, { backgroundColor: color.border }]} />
      </View>

      {/* Google */}
      <Pressable
        disabled={!!busy}
        onPress={handleGoogle}
        style={[styles.googleBtn, { backgroundColor: '#FFFFFF', borderColor: '#DADCE0', opacity: busy && busy !== 'google' ? 0.6 : 1 }]}
      >
        {busy === 'google' ? (
          <ActivityIndicator color="#3C4043" />
        ) : (
          <>
            <FontAwesome name="google" size={18} color="#4285F4" />
            <Text style={styles.googleText}>{isRtl ? 'المتابعة عبر Google' : 'Continue with Google'}</Text>
          </>
        )}
      </Pressable>

      {/* Apple — iOS only, native button per Apple HIG */}
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            mode === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={16}
          style={styles.appleBtn}
          onPress={handleApple}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18, gap: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  or: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
  },
  googleText: { color: '#3C4043', fontSize: 15, fontWeight: '800' },
  appleBtn: { height: 52, width: '100%' },
})
