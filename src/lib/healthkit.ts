'use client'

import { registerPlugin } from '@capacitor/core'
import { getPlatform, isNativePlatform } from './platform'

export type HealthKitSummary = {
  available: boolean
  authorized: boolean
  stepsToday: number | null
  activeEnergyKcalToday: number | null
  latestHeartRateBpm: number | null
  latestWeightKg: number | null
  latestWeightDate: string | null
  latestHeartRateDate: string | null
}

type NativeHealthKitPlugin = {
  isAvailable(): Promise<{ available: boolean }>
  requestAuthorization(): Promise<{ authorized: boolean }>
  readSummary(): Promise<HealthKitSummary>
}

const NativeHealthKit = registerPlugin<NativeHealthKitPlugin>('SynapHealthKit')

export function canUseAppleHealth(): boolean {
  return isNativePlatform() && getPlatform() === 'ios'
}

export async function isAppleHealthAvailable(): Promise<boolean> {
  if (!canUseAppleHealth()) return false
  try {
    const result = await NativeHealthKit.isAvailable()
    return !!result.available
  } catch {
    return false
  }
}

export async function requestAppleHealthAccess(): Promise<boolean> {
  if (!canUseAppleHealth()) return false
  try {
    const result = await NativeHealthKit.requestAuthorization()
    return !!result.authorized
  } catch {
    return false
  }
}

export async function readAppleHealthSummary(): Promise<HealthKitSummary> {
  if (!canUseAppleHealth()) {
    return emptySummary(false)
  }
  try {
    const summary = await NativeHealthKit.readSummary()
    return {
      ...emptySummary(summary.available),
      ...summary,
      stepsToday: normalizeNumber(summary.stepsToday),
      activeEnergyKcalToday: normalizeNumber(summary.activeEnergyKcalToday),
      latestHeartRateBpm: normalizeNumber(summary.latestHeartRateBpm),
      latestWeightKg: normalizeNumber(summary.latestWeightKg),
    }
  } catch {
    return emptySummary(await isAppleHealthAvailable())
  }
}

function emptySummary(available: boolean): HealthKitSummary {
  return {
    available,
    authorized: false,
    stepsToday: null,
    activeEnergyKcalToday: null,
    latestHeartRateBpm: null,
    latestWeightKg: null,
    latestWeightDate: null,
    latestHeartRateDate: null,
  }
}

function normalizeNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}
