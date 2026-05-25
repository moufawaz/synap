import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { SynapLogo } from '@/components/SynapLogo'
import { useAuth } from '@/auth/AuthProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function ResetScreen() {
  const { resetPassword } = useAuth()
  const { text, isRtl } = useLanguage()
  const { color } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert('SYNAP', 'Enter your email first.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(email.trim())
      Alert.alert('SYNAP', 'Password reset email sent.')
      router.replace('/(auth)/login')
    } catch (error: any) {
      Alert.alert('SYNAP', error?.message || 'Could not send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: color.bg }]}>
      <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.border }]}>
        <View style={[styles.logo, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
          <SynapLogo size="md" showTagline />
        </View>
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.forgotPassword}</Text>
        <Text style={[styles.subtitle, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>
          Enter your email and we will send a secure reset link.
        </Text>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder={text.email}
            placeholderTextColor={color.dim}
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
          />

          <Pressable disabled={loading} onPress={handleReset} style={styles.buttonWrap}>
            <LinearGradient colors={[color.spark, '#7B2FFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{text.sendResetLink}</Text>}
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.linkText, { color: color.spark, textAlign: isRtl ? 'right' : 'left' }]}>{text.login}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  form: {
    gap: 14,
    marginTop: 28,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonWrap: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '800',
  },
})
