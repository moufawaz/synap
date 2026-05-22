import { Platform } from 'react-native'

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

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
