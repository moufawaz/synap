import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

/** Thin, crash-safe wrappers around expo-haptics. Haptics only fire on iOS;
 *  all calls are best-effort and never throw (errors are swallowed). */

export function tapLight() {
  if (Platform.OS !== 'ios') return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

export function tapMedium() {
  if (Platform.OS !== 'ios') return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

export function notifySuccess() {
  if (Platform.OS !== 'ios') return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

export function notifyError() {
  if (Platform.OS !== 'ios') return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}
