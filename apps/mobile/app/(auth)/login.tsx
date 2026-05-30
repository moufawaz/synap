import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { SynapLogo } from '@/components/SynapLogo'
import { SocialAuthButtons } from '@/components/SocialAuthButtons'
import { useAuth } from '@/auth/AuthProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const { text, isRtl } = useLanguage()
  const { color } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      router.replace('/(tabs)')
    } catch (error: any) {
      Alert.alert('SYNAP', error?.message || 'Login failed')
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
        <Text style={[styles.title, { color: color.text, textAlign: isRtl ? 'right' : 'left' }]}>{text.loginTitle}</Text>
        <Text style={[styles.subtitle, { color: color.muted, textAlign: isRtl ? 'right' : 'left' }]}>{text.loginSubtitle}</Text>

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
          <TextInput
            secureTextEntry
            placeholder={text.password}
            placeholderTextColor={color.dim}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { backgroundColor: color.elevated, borderColor: color.border, color: color.text, textAlign: isRtl ? 'right' : 'left' }]}
          />

          <Pressable disabled={loading} onPress={handleLogin} style={styles.buttonWrap}>
            <LinearGradient colors={[color.spark, '#7B2FFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{text.login}</Text>}
            </LinearGradient>
          </Pressable>
          <View style={[styles.links, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text style={[styles.linkText, { color: color.spark }]}>{text.needAccount} {text.signup}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/reset')}>
              <Text style={[styles.linkText, { color: color.muted }]}>{text.forgotPassword}</Text>
            </Pressable>
          </View>

          <SocialAuthButtons onSuccess={() => router.replace('/(tabs)')} />
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
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
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
  links: {
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '800',
  },
})
