import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { registerDeviceToken } from '@/features/tools'
import { cancelSynapReminders, getSynapScheduledReminders, syncSynapReminders } from '@/features/notifications'
import { useTheme } from '@/theme/ThemeProvider'

const PUSH_TOKEN_KEY = '@synap:push-token'

export default function NotificationsScreen() {
  const { color } = useTheme()
  const [token, setToken] = useState<string | null>(null)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Restore the real push/reminder status whenever the screen is focused, so
  // returning to this page doesn't show "not enabled" after it was enabled.
  useFocusEffect(
    useCallback(() => {
      let active = true
      ;(async () => {
        try {
          if (!Device.isDevice) return
          const { status } = await Notifications.getPermissionsAsync()
          if (status === 'granted') {
            const saved = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
            if (active && saved) setToken(saved)
          } else if (active) {
            // Permission was revoked in iOS Settings — reflect that
            setToken(null)
            await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {})
          }
          const scheduled = await getSynapScheduledReminders()
          if (active) setScheduledCount(scheduled.length)
        } catch { /* non-fatal */ }
      })()
      return () => { active = false }
    }, []),
  )

  async function enable() {
    setLoading(true)
    try {
      if (!Device.isDevice) {
        Alert.alert('Push', 'Push notifications require a real iPhone build.')
        return
      }
      const permission = await Notifications.requestPermissionsAsync()
      if ((permission as any).status !== 'granted' && !(permission as any).granted) return Alert.alert('Push', 'Permission was not granted.')
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        (Constants as any).easConfig?.projectId ||
        '5fb169d2-85c2-48ef-990f-960a395e7c6a' // fallback for Direct Builds
      const res = await Notifications.getExpoPushTokenAsync({ projectId })
      setToken(res.data)
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, res.data).catch(() => {})
      await registerDeviceToken({ token: res.data, platform: Platform.OS })
      const { scheduled } = await syncSynapReminders(true)
      setScheduledCount(scheduled)
      Alert.alert('Notifications enabled', `Push is registered and ${scheduled} smart reminders are scheduled — water, meals, training, and daily check-ins.`)
    } catch (error) {
      Alert.alert('Push', error instanceof Error ? error.message : 'Could not enable push.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshScheduled() {
    const scheduled = await getSynapScheduledReminders()
    setScheduledCount(scheduled.length)
    Alert.alert('Local reminders', `${scheduled.length} SYNAP reminder(s) are scheduled.`)
  }

  async function disableLocal() {
    await cancelSynapReminders()
    setScheduledCount(0)
    Alert.alert('Local reminders', 'Daily SYNAP reminders were cancelled on this device.')
  }

  return (
    <Screen>
      <PageHeader eyebrow="PUSH" title="Notifications" subtitle="Remote push, local reminders, and tap routing." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Push status</Text>
        <Text style={[styles.body, { color: token ? color.pulse : color.muted }]}>
          {token ? '✓ Device registered for push notifications' : 'Push notifications not yet enabled on this device.'}
        </Text>
        <Text style={[styles.body, { color: color.muted }]}>Local reminders: {scheduledCount ?? 'not checked'}</Text>
        <Pressable onPress={enable} style={[styles.primary, { backgroundColor: color.spark }]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enable push</Text>}</Pressable>
        <Pressable onPress={refreshScheduled} style={[styles.secondary, { borderColor: color.pulse }]}><Text style={[styles.secondaryText, { color: color.pulse }]}>Check local reminders</Text></Pressable>
        <Pressable onPress={disableLocal} style={[styles.secondary, { borderColor: color.danger }]}><Text style={[styles.secondaryText, { color: color.danger }]}>Cancel local reminders</Text></Pressable>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 23, fontWeight: '700' }, primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, primaryText: { color: '#fff', fontWeight: '900' }, secondary: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, secondaryText: { fontWeight: '900' } })
