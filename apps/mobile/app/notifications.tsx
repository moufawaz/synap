import { useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Screen } from '@/components/Screen'
import { registerDeviceToken, requestTestPush } from '@/features/tools'
import { useTheme } from '@/theme/ThemeProvider'

export default function NotificationsScreen() {
  const { color } = useTheme()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function enable() {
    setLoading(true)
    try {
      if (!Device.isDevice) {
        Alert.alert('Push', 'Push notifications require a real iPhone build.')
        return
      }
      const permission = await Notifications.requestPermissionsAsync()
      if ((permission as any).status !== 'granted' && !(permission as any).granted) return Alert.alert('Push', 'Permission was not granted.')
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId
      const res = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
      setToken(res.data)
      await registerDeviceToken({ token: res.data, platform: Platform.OS })
      Alert.alert('Push enabled', 'This device is registered for push notifications.')
    } catch (error) {
      Alert.alert('Push', error instanceof Error ? error.message : 'Could not enable push.')
    } finally {
      setLoading(false)
    }
  }

  async function test() {
    try {
      await requestTestPush()
      Alert.alert('Push', 'Backend test request sent.')
    } catch (error) {
      Alert.alert('Push', error instanceof Error ? error.message : 'Could not send backend push.')
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="PUSH" title="Notifications" subtitle="Native permission flow and backend push test." />
      <Card>
        <Text style={[styles.title, { color: color.text }]}>Push status</Text>
        <Text style={[styles.body, { color: color.muted }]}>{token || 'No native token yet.'}</Text>
        <Pressable onPress={enable} style={[styles.primary, { backgroundColor: color.spark }]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enable push</Text>}</Pressable>
        <Pressable onPress={test} style={[styles.secondary, { borderColor: color.cyan }]}><Text style={[styles.secondaryText, { color: color.cyan }]}>Send backend test</Text></Pressable>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, body: { fontSize: 15, lineHeight: 23, fontWeight: '700' }, primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, primaryText: { color: '#fff', fontWeight: '900' }, secondary: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, secondaryText: { fontWeight: '900' } })
