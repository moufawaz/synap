import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

/** Persisted flag: the user has connected Apple Health at least once.
 *  HealthKit authorization itself is permanent at the OS level, so once this is
 *  set we can silently re-read on every launch without prompting again. */
const HEALTH_CONNECTED_KEY = '@synap:health-connected'

export async function isHealthConnected(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HEALTH_CONNECTED_KEY)) === '1'
  } catch {
    return false
  }
}

export async function setHealthConnected(connected: boolean): Promise<void> {
  try {
    if (connected) await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, '1')
    else await AsyncStorage.removeItem(HEALTH_CONNECTED_KEY)
  } catch { /* non-fatal */ }
}

export type HealthSummary = {
  available: boolean
  authorized: boolean
  stepsToday: number | null
  activeEnergyToday: number | null
  latestWeightKg: number | null
  latestBodyFatPct: number | null
  restingHeartRate: number | null
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierRestingHeartRate',
] as const

async function loadHealthKit(): Promise<HealthKitModule | null> {
  if (Platform.OS !== 'ios') return null
  return import('@kingstinct/react-native-healthkit')
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

async function sumToday(health: HealthKitModule, identifier: string, unit: string) {
  const samples = await health.queryQuantitySamples(identifier as any, {
    unit: unit as any,
    limit: 0,
    ascending: false,
    filter: {
      date: {
        startDate: startOfToday(),
        endDate: new Date(),
      },
    },
  } as any)

  return samples.reduce((sum: number, sample: any) => sum + Number(sample.quantity || 0), 0)
}

async function latestQuantity(health: HealthKitModule, identifier: string, unit: string) {
  const sample = await health.getMostRecentQuantitySample(identifier as any, unit as any)
  return sample?.quantity != null ? Number(sample.quantity) : null
}

export async function requestHealthAccessAndRead(): Promise<HealthSummary> {
  const health = await loadHealthKit()
  if (!health) {
    return {
      available: false,
      authorized: false,
      stepsToday: null,
      activeEnergyToday: null,
      latestWeightKg: null,
      latestBodyFatPct: null,
      restingHeartRate: null,
    }
  }

  const available = await health.isHealthDataAvailableAsync()
  if (!available) {
    return {
      available,
      authorized: false,
      stepsToday: null,
      activeEnergyToday: null,
      latestWeightKg: null,
      latestBodyFatPct: null,
      restingHeartRate: null,
    }
  }

  const authorized = await health.requestAuthorization({ toRead: READ_TYPES })
  if (!authorized) {
    return {
      available,
      authorized,
      stepsToday: null,
      activeEnergyToday: null,
      latestWeightKg: null,
      latestBodyFatPct: null,
      restingHeartRate: null,
    }
  }

  const [stepsToday, activeEnergyToday, latestWeightKg, latestBodyFatPct, restingHeartRate] = await Promise.all([
    sumToday(health, 'HKQuantityTypeIdentifierStepCount', 'count').catch(() => null),
    sumToday(health, 'HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal').catch(() => null),
    latestQuantity(health, 'HKQuantityTypeIdentifierBodyMass', 'kg').catch(() => null),
    latestQuantity(health, 'HKQuantityTypeIdentifierBodyFatPercentage', '%').catch(() => null),
    latestQuantity(health, 'HKQuantityTypeIdentifierRestingHeartRate', 'count/min').catch(() => null),
  ])

  return {
    available,
    authorized,
    stepsToday: stepsToday != null ? Math.round(stepsToday) : null,
    activeEnergyToday: activeEnergyToday != null ? Math.round(activeEnergyToday) : null,
    latestWeightKg,
    latestBodyFatPct,
    restingHeartRate,
  }
}

/** Dashboard loader: returns a fresh Health summary only when the user has
 *  previously connected Apple Health. Returns null otherwise (non-iOS, never
 *  connected, or read failed) so the dashboard can hide the card cleanly.
 *  Does not prompt — authorization is already granted by the time this runs. */
export async function loadConnectedHealthSummary(): Promise<HealthSummary | null> {
  if (Platform.OS !== 'ios') return null
  if (!(await isHealthConnected())) return null
  try {
    return await requestHealthAccessAndRead()
  } catch {
    return null
  }
}
